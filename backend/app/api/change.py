from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.media import MediaAssetDB
from app.services.change_service import ChangeService

router = APIRouter(prefix="/change", tags=["change"])

class ChangeRequest(BaseModel):
    before_asset_id: str
    after_asset_id: str

@router.post("/analyze")
def analyze_change(req: ChangeRequest, db: Session = Depends(get_db)):
    before = db.query(MediaAssetDB).filter(MediaAssetDB.id == req.before_asset_id).first()
    after = db.query(MediaAssetDB).filter(MediaAssetDB.id == req.after_asset_id).first()
    
    if not before or not after:
        raise HTTPException(status_code=404, detail="Assets not found")
        
    result = ChangeService.analyze_change(before.cloudinary_url, after.cloudinary_url)
    result["before_asset_id"] = before.id
    result["after_asset_id"] = after.id
    return result
