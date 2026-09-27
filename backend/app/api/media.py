from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
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

def background_process_media(asset_id: str, file_bytes: bytes, content_type: str):
    db = SessionLocal()
    try:
        media_asset = db.query(MediaAssetDB).filter(MediaAssetDB.id == asset_id).first()
        if not media_asset:
            return

        # 1. Cloudinary Upload
        media_asset.processing_status = "UPLOADING"
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
        
        # 3. Project Routing
        candidate_projects = db.query(ProjectDB).all()
        print(f"[PIPELINE] Routing against {len(candidate_projects)} projects")
        routing_res = ProjectRouter.route_evidence(media_asset.id, md_output, candidate_projects)
        
        # Persist routing result to asset
        media_asset.project_id = routing_res.selected_project_id
        # Map routing status to processing status
        if routing_res.status == RoutingStatus.ASSIGNED:
            media_asset.processing_status = "INDEXING"
        elif routing_res.status == RoutingStatus.NEEDS_REVIEW:
            media_asset.processing_status = "NEEDS_REVIEW"
        else:
            media_asset.processing_status = "UNASSIGNED"
        db.commit()
        print(f"[PIPELINE] Routing complete: status={routing_res.status}, project={routing_res.selected_project_id}, confidence={routing_res.confidence}")
        
        # 4. Evidence Creation — always create, regardless of routing outcome
        evidence = EvidenceService.build_evidence(media_asset.id, cloud_result["url"], md_output, routing_res)
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        
        # 5. Embedding & Qdrant Store (for ASSIGNED and NEEDS_REVIEW — makes both searchable)
        if routing_res.status in (RoutingStatus.ASSIGNED, RoutingStatus.NEEDS_REVIEW):
            embed_service = EmbeddingService.get_instance()
            qdrant_service = QdrantService.get_instance()
            
            text_to_embed = f"Description: {evidence.description}. Activity: {evidence.activity}. Objects: {evidence.objects}. Scene: {evidence.scene}"
            vector = embed_service.get_embedding(text_to_embed)
            
            payload = {
                "asset_id": evidence.asset_id,
                "project_id": evidence.project_id,
                "description": evidence.description,
                "activity": evidence.activity,
                "objects": evidence.objects,
                "scene": evidence.scene,
                "timestamp": evidence.timestamp,
                "location": evidence.location,
                "cloudinary_url": evidence.cloudinary_url,
                "routing_status": routing_res.status.value,
                "routing_confidence": routing_res.confidence,
            }
            
            qdrant_service.store_evidence(vector, payload, evidence.id)
            print(f"[PIPELINE] Indexed into Qdrant: evidence_id={evidence.id}")
        
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
def process_media(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
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
        
        # Spawn Background Task
        background_tasks.add_task(background_process_media, media_asset.id, file_bytes, file.content_type)
        
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
        "evidence": {
            "description": evidence.description,
            "activity": evidence.activity,
            "scene": evidence.scene,
            "objects": evidence.objects,
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
    return {"message": "Deleted successfully"}
