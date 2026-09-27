from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService

router = APIRouter(prefix="/search", tags=["search"])

class SearchQuery(BaseModel):
    query: str
    project_id: Optional[str] = None
    limit: int = 5

@router.post("/")
def search_evidence(query: SearchQuery):
    embed_service = EmbeddingService.get_instance()
    qdrant = QdrantService.get_instance()
    
    vector = embed_service.get_embedding(query.query)
    results = qdrant.search_evidence(vector, limit=query.limit, project_id=query.project_id)
    
    formatted = []
    for hit in results:
        formatted.append({
            "asset_id": hit.payload.get("asset_id"),
            "project_id": hit.payload.get("project_id"),
            "description": hit.payload.get("description"),
            "activity": hit.payload.get("activity"),
            "timestamp": hit.payload.get("timestamp"),
            "cloudinary_url": hit.payload.get("cloudinary_url"),
            "score": hit.score
        })
    return formatted
