from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class ProcessingStatus(str, Enum):
    UPLOADED = "UPLOADED"
    ANALYZING = "ANALYZING"
    ROUTING = "ROUTING"
    INDEXING = "INDEXING"
    READY = "READY"
    FAILED = "FAILED"
    NEEDS_REVIEW = "NEEDS_REVIEW"

class MediaAssetBase(BaseModel):
    cloudinary_public_id: str
    cloudinary_url: str
    project_id: Optional[str] = None
    captured_at: Optional[datetime] = None
    location: Optional[str] = None
    mime_type: Optional[str] = None

class MediaAssetCreate(MediaAssetBase):
    pass

class MediaAsset(MediaAssetBase):
    id: str
    processing_status: ProcessingStatus = ProcessingStatus.UPLOADED
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True
