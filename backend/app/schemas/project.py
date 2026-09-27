from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str = Field(..., description="Name of the project")
    description: Optional[str] = Field(None, description="Description of the project")
    tags: List[str] = Field(default_factory=list, description="Tags associated with the project")
    latitude: Optional[float] = Field(None, description="Project latitude coordinate (-90 to 90)")
    longitude: Optional[float] = Field(None, description="Project longitude coordinate (-180 to 180)")
    location_name: Optional[str] = Field(None, description="Human-readable location name (e.g. Mayur Vihar, Delhi)")

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str = Field(..., description="Unique project identifier")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True

