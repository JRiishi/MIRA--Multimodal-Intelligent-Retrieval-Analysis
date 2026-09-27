from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime


class ChatMessageRequest(BaseModel):
    message: str = Field(..., description="User query or prompt regarding the project")


class ChatEvidenceItem(BaseModel):
    asset_id: str
    cloudinary_url: str
    description: str
    timestamp: Optional[str] = None
    location: Optional[str] = None
    activity: Optional[str] = None
    scene: Optional[str] = None
    score: Optional[float] = None


class ChatMessageResponse(BaseModel):
    answer: str
    project_id: str
    intent: Optional[str] = "GENERAL"
    evidence: List[ChatEvidenceItem] = []


class ChatHistoryItem(BaseModel):
    id: str
    role: str
    message: str
    evidence: Optional[List[ChatEvidenceItem]] = []
    created_at: datetime


class ProjectTimelineItem(BaseModel):
    asset_id: Optional[str] = None
    date: str
    activity: Optional[str] = None
    description: Optional[str] = None
    scene: Optional[str] = None
    location: Optional[str] = None
    cloudinary_url: str


class ProjectReportResponse(BaseModel):
    project_id: str
    project_name: str
    project_description: Optional[str] = None
    location_name: Optional[str] = None
    total_evidence_count: int
    current_status: str
    recent_activity: str
    timeline_summary: List[ProjectTimelineItem]
    key_evidence: List[ChatEvidenceItem]
    before_after_summary: Optional[str] = None
    before_asset_url: Optional[str] = None
    after_asset_url: Optional[str] = None
    change_score: Optional[float] = None
    generated_at: str
