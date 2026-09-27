import io
import uuid
import urllib.request
from typing import Optional, Dict, Any
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Body
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models.media import MediaAssetDB, VisualEvidenceDB
from app.models.project import ProjectDB
from app.services.cloudinary_service import CloudinaryService
from app.services.moondream_service import MoondreamService
from app.services.project_router import ProjectRouter
from app.services.evidence_service import EvidenceService
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.schemas.routing import RoutingStatus

router = APIRouter(prefix="/media", tags=["media"])

def background_process_media(
    asset_id: str, 
    file_bytes: bytes, 
    content_type: str,
    manual_lat: Optional[float] = None,
    manual_lon: Optional[float] = None
):
    db = SessionLocal()
    try:
        media_asset = db.query(MediaAssetDB).filter(MediaAssetDB.id == asset_id).first()
        if not media_asset:
            return

        # 1. Cloudinary Upload & GPS Extraction (Manual or EXIF)
        media_asset.processing_status = "UPLOADING"
        db.commit()

        from app.services.location_service import LocationService
        
        # Prioritize explicitly provided GPS coordinates, fallback to EXIF
        if LocationService.validate_coordinates(manual_lat, manual_lon):
            image_lat = manual_lat
            image_lon = manual_lon
            location_source = "MANUAL"
        else:
            image_lat, image_lon, location_source = LocationService.extract_exif_gps(file_bytes)
        
        media_asset.image_latitude = image_lat
        media_asset.image_longitude = image_lon
        media_asset.location_source = location_source
        db.commit()
        
        cloud_result = CloudinaryService.upload_image(file_bytes)
        if not cloud_result:
            media_asset.processing_status = "FAILED"
            db.commit()
            return
            
        media_asset.cloudinary_public_id = cloud_result["public_id"]
        media_asset.cloudinary_url = cloud_result["url"]
        media_asset.processing_status = "ANALYZING"
        db.commit()
        
        # 2. Moondream Analysis
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        moondream_service = MoondreamService.get_instance()
        md_output = moondream_service.analyze_image(image)
        
        media_asset.processing_status = "ROUTING"
        db.commit()
        
        # 3. Project Routing (Geographic filter + Laya / Embedding decision)
        candidate_projects = db.query(ProjectDB).all()
        print(f"[PIPELINE] Routing against {len(candidate_projects)} projects with GPS ({image_lat}, {image_lon})")
        routing_res = ProjectRouter.route_evidence(
            asset_id=media_asset.id,
            evidence_data=md_output,
            candidate_projects=candidate_projects,
            image_lat=image_lat,
            image_lon=image_lon,
            location_source=location_source
        )
        
        # Persist routing result to asset
        media_asset.project_id = routing_res.selected_project_id
        media_asset.location_match_distance = routing_res.distance_km
        # Map routing status to processing status
        if routing_res.status == RoutingStatus.ASSIGNED:
            media_asset.processing_status = "INDEXING"
        elif routing_res.status == RoutingStatus.NEEDS_REVIEW:
            media_asset.processing_status = "NEEDS_REVIEW"
        else:
            media_asset.processing_status = "UNASSIGNED"
        db.commit()
        print(f"[PIPELINE] Routing complete: status={routing_res.status}, project={routing_res.selected_project_id}, confidence={routing_res.confidence}, distance={routing_res.distance_km}km")
        
        # 4. Evidence Creation — always create, regardless of routing outcome
        evidence = EvidenceService.build_evidence(
            asset_id=media_asset.id,
            cloudinary_url=cloud_result["url"],
            moondream_out=md_output,
            routing_res=routing_res,
            latitude=image_lat,
            longitude=image_lon,
            location_source=location_source,
            location_match_distance=routing_res.distance_km
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        
        # 5. Embedding & Qdrant Store (for ASSIGNED and NEEDS_REVIEW — makes both searchable)
        if routing_res.status in (RoutingStatus.ASSIGNED, RoutingStatus.NEEDS_REVIEW):
            from app.services.search_service import build_searchable_document

            embed_service = EmbeddingService.get_instance()
            qdrant_service = QdrantService.get_instance()
            
            # Fetch assigned project name if available
            assigned_project = None
            if evidence.project_id:
                assigned_project = db.query(ProjectDB).filter(ProjectDB.id == evidence.project_id).first()
            
            project_name = assigned_project.name if assigned_project else None
            location_name = assigned_project.location_name if assigned_project else None

            text_to_embed = build_searchable_document(
                project_name=project_name,
                activity=evidence.activity,
                scene=evidence.scene,
                objects=md_output.get("objects", []),
                description=evidence.description,
                project_signals=md_output.get("project_signals", []),
                location_name=location_name
            )
            
            vector = embed_service.get_embedding(text_to_embed)
            
            payload = {
                "asset_id": evidence.asset_id,
                "evidence_id": evidence.id,
                "project_id": evidence.project_id,
                "project_name": project_name,
                "description": evidence.description,
                "activity": evidence.activity,
                "scene": evidence.scene,
                "objects": md_output.get("objects", []),
                "project_signals": md_output.get("project_signals", []),
                "timestamp": evidence.created_at.isoformat() if evidence.created_at else None,
                "location": location_name,
                "location_name": location_name,
                "latitude": evidence.latitude,
                "longitude": evidence.longitude,
                "location_source": evidence.location_source,
                "location_match_distance": evidence.location_match_distance,
                "cloudinary_url": evidence.cloudinary_url,
                "routing_status": routing_res.status.value,
                "routing_confidence": routing_res.confidence,
            }
            
            # Idempotent storage: Use asset_id as point_id
            qdrant_service.store_evidence(vector, payload, point_id=evidence.asset_id)
            print(f"[PIPELINE] Indexed into Qdrant: asset_id={evidence.asset_id} | project='{project_name}'")
        
        # 6. Cloudinary Metadata Write-Back (Turns Cloudinary into the single source of truth)
        if media_asset.cloudinary_public_id:
            try:
                assigned_proj = db.query(ProjectDB).filter(ProjectDB.id == media_asset.project_id).first() if media_asset.project_id else None
                proj_name_str = assigned_proj.name if assigned_proj else "Unassigned"
                is_verified = "true" if routing_res.status == RoutingStatus.ASSIGNED else "false"

                context_dict = {
                    "description": evidence.description or "",
                    "activity": evidence.activity or "",
                    "scene": evidence.scene or "",
                    "project_name": proj_name_str,
                    "laya_confidence": str(round(routing_res.confidence, 4)),
                    "routing_status": routing_res.status.value,
                    "mira_verified": is_verified
                }
                if image_lat is not None and image_lon is not None:
                    context_dict["gps_lat"] = f"{image_lat:.5f}"
                    context_dict["gps_lon"] = f"{image_lon:.5f}"

                tag_list = ["mira_field"]
                if is_verified == "true":
                    tag_list.append("verified")
                if proj_name_str and proj_name_str != "Unassigned":
                    tag_list.append(proj_name_str.lower().replace(" ", "_")[:30])
                if evidence.activity:
                    tag_list.append(evidence.activity.lower().replace(" ", "_")[:30])

                CloudinaryService.sync_metadata(
                    public_id=media_asset.cloudinary_public_id,
                    context=context_dict,
                    tags=tag_list
                )
            except Exception as e:
                print(f"[PIPELINE] Notice: Cloudinary metadata sync deferred: {e}")

        # Final status — only ASSIGNED becomes READY; NEEDS_REVIEW stays as-is
        if routing_res.status == RoutingStatus.ASSIGNED:
            media_asset.processing_status = "READY"
        db.commit()
        print(f"[PIPELINE] Final asset status: {media_asset.processing_status}")
            
    except Exception as e:
        import traceback
        full_error = traceback.format_exc()
        print(f"[ERROR] Background pipeline failed: {full_error}")
        media_asset = db.query(MediaAssetDB).filter(MediaAssetDB.id == asset_id).first()
        if media_asset:
            media_asset.processing_status = "FAILED"
            media_asset.error_message = full_error
            db.commit()
    finally:
        db.close()


@router.post("/process")
def process_media(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        file_bytes = file.file.read()
        
        # Create Initial Pending Asset
        media_asset = MediaAssetDB(
            mime_type=file.content_type,
            processing_status="QUEUED"
        )
        db.add(media_asset)
        db.commit()
        db.refresh(media_asset)
        
        # Spawn Background Task with optional manual coordinates
        background_tasks.add_task(
            background_process_media, 
            media_asset.id, 
            file_bytes, 
            file.content_type,
            latitude,
            longitude
        )
        
        return {
            "asset_id": media_asset.id,
            "status": media_asset.processing_status,
            "message": "Processing started in background."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue processing: {str(e)}")

@router.get("/")
def get_all_media(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    # Returns the most recent media assets, optionally filtered by project
    query = db.query(MediaAssetDB)
    if project_id:
        query = query.filter(MediaAssetDB.project_id == project_id)
    assets = query.order_by(MediaAssetDB.uploaded_at.desc()).limit(100).all()
    
    results = []
    for a in assets:
        ev = db.query(VisualEvidenceDB).filter(VisualEvidenceDB.asset_id == a.id).first()
        results.append({
            "id": a.id,
            "cloudinary_url": a.cloudinary_url,
            "project_id": a.project_id,
            "processing_status": a.processing_status,
            "uploaded_at": a.uploaded_at,
            "mime_type": a.mime_type,
            "image_latitude": a.image_latitude,
            "image_longitude": a.image_longitude,
            "location_source": a.location_source,
            "location_match_distance": a.location_match_distance,
            "description": ev.description if ev else None,
            "activity": ev.activity if ev else None,
            "scene": ev.scene if ev else None,
            "routing_confidence": ev.routing_confidence if ev else None,
        })
    return results

@router.get("/{asset_id}")
def get_media(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(MediaAssetDB).filter(MediaAssetDB.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")
        
    evidence = db.query(VisualEvidenceDB).filter(VisualEvidenceDB.asset_id == asset_id).first()
    
    # Return a combined detailed response
    return {
        "id": asset.id,
        "cloudinary_url": asset.cloudinary_url,
        "project_id": asset.project_id,
        "processing_status": asset.processing_status,
        "uploaded_at": asset.uploaded_at,
        "mime_type": asset.mime_type,
        "image_latitude": asset.image_latitude,
        "image_longitude": asset.image_longitude,
        "location_source": asset.location_source,
        "location_match_distance": asset.location_match_distance,
        "evidence": {
            "description": evidence.description,
            "activity": evidence.activity,
            "scene": evidence.scene,
            "objects": evidence.objects,
            "latitude": evidence.latitude,
            "longitude": evidence.longitude,
            "location_source": evidence.location_source,
            "location_match_distance": evidence.location_match_distance,
            "routing_confidence": evidence.routing_confidence
        } if evidence else None
    }

from pydantic import BaseModel

class AssignProjectRequest(BaseModel):
    project_id: str

@router.post("/{asset_id}/assign")
def assign_media_to_project(
    asset_id: str, 
    req: AssignProjectRequest, 
    db: Session = Depends(get_db)
):
    asset = db.query(MediaAssetDB).filter(MediaAssetDB.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")
        
    project = db.query(ProjectDB).filter(ProjectDB.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    asset.project_id = project.id
    asset.processing_status = "READY"
    
    evidence = db.query(VisualEvidenceDB).filter(VisualEvidenceDB.asset_id == asset_id).first()
    if evidence:
        evidence.project_id = project.id
        evidence.routing_confidence = 1.0  # Approved by human reviewer

    db.commit()
    db.refresh(asset)
    if evidence:
        db.refresh(evidence)

    print(f"[ASSIGN] Asset '{asset.id}' successfully assigned to project '{project.name}' (Status: {asset.processing_status})")

    # Re-index into Qdrant under new project
    if evidence:
        try:
            from app.services.search_service import build_searchable_document
            from app.services.embedding_service import EmbeddingService
            from app.services.qdrant_service import QdrantService
            
            embed_service = EmbeddingService.get_instance()
            qdrant_service = QdrantService.get_instance()

            doc = build_searchable_document(
                project_name=project.name,
                activity=evidence.activity,
                scene=evidence.scene,
                objects=evidence.objects,
                description=evidence.description,
                project_signals=evidence.project_signals,
                location_name=project.location_name or evidence.location
            )
            vec = embed_service.get_embedding(doc)
            payload = {
                "asset_id": evidence.asset_id,
                "evidence_id": evidence.id,
                "project_id": project.id,
                "project_name": project.name,
                "description": evidence.description,
                "activity": evidence.activity,
                "scene": evidence.scene,
                "objects": evidence.objects,
                "project_signals": evidence.project_signals,
                "timestamp": evidence.created_at.isoformat() if evidence.created_at else None,
                "location": project.location_name or evidence.location,
                "location_name": project.location_name or evidence.location,
                "latitude": evidence.latitude,
                "longitude": evidence.longitude,
                "cloudinary_url": evidence.cloudinary_url,
                "routing_status": "ASSIGNED",
                "routing_confidence": 1.0
            }
            qdrant_service.store_evidence(vec, payload, point_id=evidence.asset_id)
            print(f"[ASSIGN] Re-indexed Qdrant vector point for asset '{evidence.asset_id}' under '{project.name}'")
        except Exception as e:
            print(f"[ASSIGN] Notice: Qdrant re-index deferred: {e}")

    # Cloudinary write-back on manual assignment
    if asset.cloudinary_public_id:
        try:
            CloudinaryService.sync_metadata(
                public_id=asset.cloudinary_public_id,
                context={
                    "project_name": project.name,
                    "routing_status": "ASSIGNED",
                    "mira_verified": "true",
                    "manual_assignment": "true"
                },
                tags=["mira_field", "verified", project.name.lower().replace(" ", "_")[:30]]
            )
        except Exception as e:
            print(f"[MEDIA] Notice: Cloudinary manual assignment sync deferred: {e}")

    return {
        "status": "success",
        "message": "Assigned successfully", 
        "asset_id": asset.id, 
        "project_id": project.id,
        "processing_status": asset.processing_status
    }


@router.get("/{asset_id}/transformations")
def get_asset_transformations(asset_id: str, db: Session = Depends(get_db)):
    """
    Get dynamic Cloudinary transformation URLs for an asset:
    - Optimized f_auto,q_auto delivery URL
    - AI-focal smart cropped thumbnail
    - Verified provenance watermark overlay badge (GPS + timestamp)
    - Multi-aspect campaign exports (1:1, 16:9, 9:16)
    """
    asset = db.query(MediaAssetDB).filter(MediaAssetDB.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")

    evidence = db.query(VisualEvidenceDB).filter(VisualEvidenceDB.asset_id == asset_id).first()
    project = db.query(ProjectDB).filter(ProjectDB.id == asset.project_id).first() if asset.project_id else None
    
    pub_id = asset.cloudinary_public_id
    if not pub_id and asset.cloudinary_url:
        # Fallback to extracting public_id from url
        try:
            parts = asset.cloudinary_url.split("/upload/")[-1].split("/")
            # skip version if present
            if len(parts) > 1 and parts[0].startswith("v"):
                pub_id = "/".join(parts[1:]).rsplit(".", 1)[0]
            else:
                pub_id = "/".join(parts).rsplit(".", 1)[0]
        except Exception:
            pub_id = None

    if not pub_id:
        raise HTTPException(status_code=400, detail="Cloudinary public ID not available for this asset")

    proj_name = project.name if project else "MIRA Verified"
    ts = evidence.created_at.strftime("%Y-%m-%d") if (evidence and evidence.created_at) else (asset.uploaded_at.strftime("%Y-%m-%d") if asset.uploaded_at else None)

    target_media = asset.cloudinary_url or pub_id

    return {
        "asset_id": asset.id,
        "public_id": pub_id,
        "original_url": asset.cloudinary_url,
        "optimized_url": CloudinaryService.get_optimized_url(target_media),
        "thumbnail_url": CloudinaryService.get_smart_thumbnail_url(target_media, width=400, height=300),
        "verified_badge_url": CloudinaryService.get_verified_badge_url(
            public_id_or_url=target_media,
            project_name=proj_name,
            gps_lat=asset.image_latitude,
            gps_lon=asset.image_longitude,
            timestamp=ts
        ),
        "campaign_aspects": CloudinaryService.get_campaign_aspect_urls(target_media)
    }


@router.get("/compare/composite-url")
def get_compare_composite(
    before_asset_id: str, 
    after_asset_id: str, 
    db: Session = Depends(get_db)
):
    """
    Generate dynamic Cloudinary side-by-side composite comparison URL
    directly from Cloudinary CDN layer with zero local image processing.
    """
    before_asset = db.query(MediaAssetDB).filter(MediaAssetDB.id == before_asset_id).first()
    after_asset = db.query(MediaAssetDB).filter(MediaAssetDB.id == after_asset_id).first()
    if not before_asset or not after_asset:
        raise HTTPException(status_code=404, detail="One or both comparison assets not found")

    before_pub = before_asset.cloudinary_public_id
    after_pub = after_asset.cloudinary_public_id

    if not before_pub or not after_pub:
        raise HTTPException(status_code=400, detail="Cloudinary public IDs required for composite transformation")

    composite_url = CloudinaryService.get_before_after_composite_url(before_pub, after_pub)
    return {
        "before_asset_id": before_asset_id,
        "after_asset_id": after_asset_id,
        "composite_url": composite_url
    }


@router.get("/upload/signature")
def get_upload_signature(timestamp: Optional[int] = None):
    """
    Generate signed upload authentication parameters for direct frontend-to-Cloudinary uploads.
    Bypasses FastAPI bandwidth while maintaining signed security.
    """
    import time
    ts = timestamp or int(time.time())
    params_to_sign = {
        "timestamp": ts,
        "folder": "cc_hack"
    }
    sig_data = CloudinaryService.generate_upload_signature(params_to_sign)
    return sig_data


@router.post("/sync-all-metadata")
def sync_all_metadata_to_cloudinary(db: Session = Depends(get_db)):
    """
    Backfill / sync visual evidence metadata and tags to Cloudinary for all existing assets.
    Guarantees Cloudinary is the synchronized media intelligence layer for all media.
    """
    assets = db.query(MediaAssetDB).filter(MediaAssetDB.cloudinary_public_id.isnot(None)).all()
    synced_count = 0
    errors = []

    for asset in assets:
        try:
            ev = db.query(VisualEvidenceDB).filter(VisualEvidenceDB.asset_id == asset.id).first()
            proj = db.query(ProjectDB).filter(ProjectDB.id == asset.project_id).first() if asset.project_id else None
            
            proj_name = proj.name if proj else "Unassigned"
            is_verified = "true" if asset.project_id else "false"

            context = {
                "description": ev.description if ev else "",
                "activity": ev.activity if ev else "",
                "scene": ev.scene if ev else "",
                "project_name": proj_name,
                "laya_confidence": str(round(ev.routing_confidence or 0.85, 4)) if ev else "0.85",
                "mira_verified": is_verified
            }
            if asset.image_latitude is not None and asset.image_longitude is not None:
                context["gps_lat"] = f"{asset.image_latitude:.5f}"
                context["gps_lon"] = f"{asset.image_longitude:.5f}"

            tags = ["mira_field"]
            if is_verified == "true":
                tags.append("verified")
            if proj_name != "Unassigned":
                tags.append(proj_name.lower().replace(" ", "_")[:30])
            if ev and ev.activity:
                tags.append(ev.activity.lower().replace(" ", "_")[:30])

            CloudinaryService.sync_metadata(
                public_id=asset.cloudinary_public_id,
                context=context,
                tags=tags
            )
            asset.cloudinary_metadata_synced = True
            synced_count += 1
        except Exception as e:
            errors.append({"asset_id": asset.id, "error": str(e)})

    db.commit()
    return {
        "status": "success",
        "synced_count": synced_count,
        "total_assets": len(assets),
        "errors": errors
    }


@router.post("/setup-preset")
def setup_upload_preset(preset_name: str = "mira_field_upload"):
    """
    Initialize Cloudinary upload preset for direct ingestion.
    """
    res = CloudinaryService.create_upload_preset(preset_name)
    return {"status": "completed", "result": res}


@router.post("/webhook")
def cloudinary_webhook(
    payload: Dict[str, Any] = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Event-driven Cloudinary webhook receiver.
    Automatically triggers MIRA pipeline when a direct upload finishes on Cloudinary.
    """
    try:
        public_id = payload.get("public_id")
        secure_url = payload.get("secure_url") or payload.get("url")
        notification_type = payload.get("notification_type", "upload")

        if not public_id or not secure_url:
            return {"status": "ignored", "reason": "No public_id or url in payload"}

        print(f"[WEBHOOK] Received Cloudinary {notification_type} for asset: {public_id}")

        # Check if already registered
        existing = db.query(MediaAssetDB).filter(MediaAssetDB.cloudinary_public_id == public_id).first()
        if existing:
            return {"status": "already_exists", "asset_id": existing.id}

        asset_id = str(uuid.uuid4())
        media_asset = MediaAssetDB(
            id=asset_id,
            file_name=f"{public_id.split('/')[-1]}.jpg",
            file_path=secure_url,
            cloudinary_url=secure_url,
            cloudinary_public_id=public_id,
            file_size=payload.get("bytes", 0),
            mime_type=f"image/{payload.get('format', 'jpeg')}",
            project_id=None,
            assignment_status="unassigned",
            processing_status="QUEUED"
        )
        db.add(media_asset)
        db.commit()

        # Download bytes and queue background pipeline
        def _fetch_and_process():
            try:
                req = urllib.request.Request(secure_url, headers={"User-Agent": "MIRA-Server/1.0"})
                with urllib.request.urlopen(req) as resp:
                    img_bytes = resp.read()
                background_process_media(asset_id, img_bytes, f"image/{payload.get('format', 'jpeg')}")
            except Exception as ex:
                print(f"[WEBHOOK] Background fetch failed: {ex}")

        background_tasks.add_task(_fetch_and_process)

        return {
            "status": "success",
            "message": "Asset ingested via Cloudinary Webhook",
            "asset_id": asset_id,
            "public_id": public_id
        }
    except Exception as e:
        print(f"[WEBHOOK] Error processing Cloudinary notification: {e}")
        return {"status": "error", "detail": str(e)}


@router.delete("/{asset_id}")
def delete_media(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(MediaAssetDB).filter(MediaAssetDB.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")
        
    evidence = db.query(VisualEvidenceDB).filter(VisualEvidenceDB.asset_id == asset_id).first()
    if evidence:
        db.delete(evidence)
        
    db.delete(asset)
    db.commit()

    # Delete point from Qdrant vector index
    try:
        qdrant_service = QdrantService.get_instance()
        qdrant_service.delete_evidence(asset_id)
    except Exception as e:
        print(f"[MEDIA] Notice: Could not delete Qdrant vector for asset {asset_id}: {e}")

    return {"message": "Deleted successfully"}


