from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import ProjectDB
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    message: str
    project_id: str

@router.post("/")
def project_chat(chat: ChatMessage, db: Session = Depends(get_db)):
    project = db.query(ProjectDB).filter(ProjectDB.id == chat.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    embed_service = EmbeddingService.get_instance()
    qdrant = QdrantService.get_instance()
    vector = embed_service.get_embedding(chat.message)
    results = qdrant.search_evidence(vector, limit=4, project_id=chat.project_id)
    
    if not results:
        return {
            "answer": "Insufficient visual evidence to determine the current status.",
            "project_id": project.id,
            "evidence": []
        }
        
    context = [hit.payload for hit in results]
    chat_service = ChatService.get_instance()
    answer = chat_service.answer_question(chat.message, context)
    
    evidence_payload = [
        {
            "asset_id": c["asset_id"],
            "cloudinary_url": c["cloudinary_url"],
            "description": c["description"]
        } for c in context
    ]
    
    return {
        "answer": answer,
        "project_id": project.id,
        "evidence": evidence_payload
    }
