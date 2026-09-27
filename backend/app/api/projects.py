from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from app.database import get_db
from app.models.project import ProjectDB
from app.schemas.project import Project, ProjectCreate

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=Project)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = ProjectDB(
        name=project.name,
        description=project.description,
        tags=json.dumps(project.tags),
        latitude=project.latitude,
        longitude=project.longitude,
        location_name=project.location_name
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return Project(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        tags=json.loads(db_project.tags) if db_project.tags else [],
        latitude=db_project.latitude,
        longitude=db_project.longitude,
        location_name=db_project.location_name,
        created_at=db_project.created_at
    )

@router.get("/", response_model=List[Project])
def get_projects(db: Session = Depends(get_db)):
    db_projects = db.query(ProjectDB).all()
    return [
        Project(
            id=p.id,
            name=p.name,
            description=p.description,
            tags=json.loads(p.tags) if p.tags else [],
            latitude=p.latitude,
            longitude=p.longitude,
            location_name=p.location_name,
            created_at=p.created_at
        ) for p in db_projects
    ]

@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return Project(
        id=p.id,
        name=p.name,
        description=p.description,
        tags=json.loads(p.tags) if p.tags else [],
        latitude=p.latitude,
        longitude=p.longitude,
        location_name=p.location_name,
        created_at=p.created_at
    )

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    from app.models.media import MediaAssetDB, VisualEvidenceDB

    p = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    # Unlink any media assets assigned to this project
    db.query(MediaAssetDB).filter(MediaAssetDB.project_id == project_id).update(
        {"project_id": None, "processing_status": "UNASSIGNED"}
    )
    # Unlink any visual evidence assigned to this project
    db.query(VisualEvidenceDB).filter(VisualEvidenceDB.project_id == project_id).update(
        {"project_id": None}
    )

    db.delete(p)
    db.commit()
    return {"message": "Project deleted successfully", "id": project_id}

