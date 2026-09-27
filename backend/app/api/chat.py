from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.schemas.chat import (
    ChatMessageRequest, 
    ChatMessageResponse, 
    ChatHistoryItem
)
from app.services.chat_service import ChatService

router = APIRouter(tags=["chat"])


@router.post("/projects/{project_id}/chat", response_model=ChatMessageResponse)
def project_scoped_chat(
    project_id: str, 
    chat_req: ChatMessageRequest, 
    db: Session = Depends(get_db)
):
    """
    Project-isolated AI Chat and intelligence endpoint.
    Retrieves and reasons strictly over this project's visual evidence.
    """
    chat_service = ChatService.get_instance()
    response = chat_service.handle_project_chat(
        project_id=project_id, 
        message=chat_req.message, 
        db=db
    )
    if response.intent == "ERROR":
        raise HTTPException(status_code=404, detail="Project not found")
    return response


@router.get("/projects/{project_id}/chat/history")
def get_project_chat_history(
    project_id: str, 
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Fetch isolated conversation history for this project workspace.
    """
    chat_service = ChatService.get_instance()
    return chat_service.get_chat_history(project_id, db)


@router.delete("/projects/{project_id}/chat/history")
def clear_project_chat_history(
    project_id: str, 
    db: Session = Depends(get_db)
):
    """
    Clear conversation history for this project workspace.
    """
    chat_service = ChatService.get_instance()
    chat_service.clear_chat_history(project_id, db)
    return {"message": "Chat history cleared", "project_id": project_id}


# Legacy compatibility endpoint
@router.post("/chat/", response_model=ChatMessageResponse)
def legacy_chat(
    chat_req: Dict[str, Any], 
    db: Session = Depends(get_db)
):
    project_id = chat_req.get("project_id")
    message = chat_req.get("message", "")
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id is required")
    chat_service = ChatService.get_instance()
    return chat_service.handle_project_chat(project_id, message, db)
