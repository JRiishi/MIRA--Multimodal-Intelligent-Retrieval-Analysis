from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
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
from PIL import Image
import io

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
    return assets

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

