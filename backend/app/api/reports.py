from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.chat import ProjectTimelineItem, ProjectReportResponse
from app.services.chat_service import ChatService
from app.services.project_context_service import ProjectContextService

router = APIRouter(tags=["reports", "timeline"])


@router.get("/projects/{project_id}/timeline", response_model=List[ProjectTimelineItem])
def get_project_timeline(project_id: str, db: Session = Depends(get_db)):
    """
    Get chronological visual evidence timeline for a project.
    """
    context_service = ProjectContextService.get_instance()
    project = context_service.get_project(project_id, db)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return context_service.get_timeline(project_id, db)


@router.post("/projects/{project_id}/report", response_model=ProjectReportResponse)
def generate_project_report(project_id: str, db: Session = Depends(get_db)):
    """
    Generate comprehensive AI-synthesized Impact & Intelligence report for a project.
    """
    chat_service = ChatService.get_instance()
    try:
        return chat_service.generate_project_report(project_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")


@router.post("/reports/{project_id}", response_model=ProjectReportResponse)
def generate_report_legacy(project_id: str, db: Session = Depends(get_db)):
    """
    Legacy report endpoint routing to project report generator.
    """
    chat_service = ChatService.get_instance()
    try:
        return chat_service.generate_project_report(project_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")
