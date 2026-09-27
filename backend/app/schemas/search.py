from pydantic import BaseModel, Field
from typing import List, Optional


class SearchRequest(BaseModel):
    query: str
    project_id: Optional[str] = None
    activity: Optional[str] = None
    location: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    top_k: int = Field(default=10, ge=1, le=100)
    min_score: Optional[float] = Field(default=0.35, ge=0.0, le=1.0, description="Similarity score threshold")



class SearchResultItem(BaseModel):
    asset_id: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    cloudinary_url: str
    description: str
    activity: Optional[str] = None
    scene: Optional[str] = None
    objects: Optional[List[str]] = None
    project_signals: Optional[List[str]] = None
    timestamp: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
    count: int
