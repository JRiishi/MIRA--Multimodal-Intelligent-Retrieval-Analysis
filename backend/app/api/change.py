from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.media import MediaAssetDB
from app.services.change_service import ChangeService
from app.services.project_context_service import ProjectContextService

router = APIRouter(tags=["change"])


class ChangeRequest(BaseModel):
    before_asset_id: Optional[str] = None
    after_asset_id: Optional[str] = None


@router.post("/change/analyze")
def analyze_change(req: ChangeRequest, db: Session = Depends(get_db)):
    if not req.before_asset_id or not req.after_asset_id:
        raise HTTPException(status_code=400, detail="before_asset_id and after_asset_id are required")
    before = db.query(MediaAssetDB).filter(MediaAssetDB.id == req.before_asset_id).first()
    after = db.query(MediaAssetDB).filter(MediaAssetDB.id == req.after_asset_id).first()
    
    if not before or not after:
        raise HTTPException(status_code=404, detail="Assets not found")
        
    result = ChangeService.analyze_change(before.cloudinary_url, after.cloudinary_url)
    result["before_asset_id"] = before.id
    result["after_asset_id"] = after.id
    result["before_url"] = before.cloudinary_url
    result["after_url"] = after.cloudinary_url
    return result


@router.post("/projects/{project_id}/change")
def project_change_analysis(
    project_id: str, 
    req: ChangeRequest, 
    db: Session = Depends(get_db)
):
    """
    Perform before/after structural change detection for a project.
    If asset IDs are omitted, automatically picks earliest and latest evidence.
    """
    context_service = ProjectContextService.get_instance()
    project = context_service.get_project(project_id, db)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if req.before_asset_id and req.after_asset_id:
        before = db.query(MediaAssetDB).filter(MediaAssetDB.id == req.before_asset_id).first()
        after = db.query(MediaAssetDB).filter(MediaAssetDB.id == req.after_asset_id).first()
    else:
        earliest_ev, latest_ev = context_service.get_earliest_and_latest(project_id, db)
        if not earliest_ev or not latest_ev:
            raise HTTPException(status_code=400, detail="Insufficient visual evidence in project for comparison.")
        before = db.query(MediaAssetDB).filter(MediaAssetDB.id == earliest_ev.asset_id).first()
        after = db.query(MediaAssetDB).filter(MediaAssetDB.id == latest_ev.asset_id).first()

    if not before or not after:
        raise HTTPException(status_code=404, detail="Comparison assets not found")

    result = ChangeService.analyze_change(before.cloudinary_url, after.cloudinary_url)
    result["project_id"] = project_id
    result["before_asset_id"] = before.id
    result["after_asset_id"] = after.id
    result["before_url"] = before.cloudinary_url
    result["after_url"] = after.cloudinary_url
    return result
