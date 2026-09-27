from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import ProjectDB
from app.models.media import VisualEvidenceDB

router = APIRouter(tags=["reports", "timeline"])

@router.get("/projects/{project_id}/timeline")
def get_timeline(project_id: str, db: Session = Depends(get_db)):
    evidence = db.query(VisualEvidenceDB).filter(VisualEvidenceDB.project_id == project_id).order_by(VisualEvidenceDB.created_at.asc()).all()
    
    return [
        {
            "date": ev.timestamp or ev.created_at.strftime("%Y-%m-%d"),
            "activity": ev.activity,
            "description": ev.description,
            "cloudinary_url": ev.cloudinary_url
        } for ev in evidence
    ]

@router.post("/reports/{project_id}")
def generate_report(project_id: str, db: Session = Depends(get_db)):
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    evidence = db.query(VisualEvidenceDB).filter(VisualEvidenceDB.project_id == project_id).all()
    
    return {
        "project_overview": {
            "name": project.name,
            "description": project.description
        },
        "total_evidence": len(evidence),
        "recent_activity": evidence[-1].activity if evidence else "No activity",
        "key_evidence_images": [e.cloudinary_url for e in evidence[:5]]
    }
