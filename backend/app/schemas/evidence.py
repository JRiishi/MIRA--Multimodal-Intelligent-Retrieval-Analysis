from pydantic import BaseModel, Field
from typing import List, Optional

class VisualEvidenceBase(BaseModel):
    asset_id: str
    project_id: Optional[str] = None
    description: str
    activity: str
    scene: str
    objects: List[str]
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_source: Optional[str] = None
    location_match_distance: Optional[float] = None
    timestamp: Optional[str] = None
    routing_confidence: Optional[float] = None
    cloudinary_url: str

class VisualEvidenceCreate(VisualEvidenceBase):
    pass

class VisualEvidence(VisualEvidenceBase):
    id: str

    class Config:
        from_attributes = True

class MoondreamOutput(BaseModel):
    description: str
    activity: str
    scene: str
    objects: List[str]
    project_signals: List[str]
