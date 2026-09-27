from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/", response_model=SearchResponse)
def search_evidence(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Semantic visual evidence search using natural language query and optional metadata filters.
    """
    search_service = SearchService.get_instance()
    return search_service.search(request, db=db)


@router.get("/", response_model=SearchResponse)
def search_evidence_get(
    q: str = Query(..., description="Natural language search query"),
    project_id: Optional[str] = Query(None),
    activity: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    top_k: int = Query(10, ge=1, le=100),
    min_score: float = Query(0.35, ge=0.0, le=1.0, description="Minimum similarity threshold"),
    db: Session = Depends(get_db)
):
    """
    GET convenience endpoint for semantic search.
    """
    search_service = SearchService.get_instance()
    request = SearchRequest(
        query=q,
        project_id=project_id,
        activity=activity,
        location=location,
        top_k=top_k,
        min_score=min_score
    )
    return search_service.search(request, db=db)


