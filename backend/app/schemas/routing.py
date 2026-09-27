from pydantic import BaseModel
from typing import Optional
from enum import Enum

class RoutingStatus(str, Enum):
    ASSIGNED = "ASSIGNED"
    UNASSIGNED = "UNASSIGNED"
    NEEDS_REVIEW = "NEEDS_REVIEW"

class ProjectRoutingResult(BaseModel):
    asset_id: str
    selected_project_id: Optional[str] = None
    confidence: float
    reason: str
    status: RoutingStatus
