from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str = Field(..., description="Name of the project")
    description: Optional[str] = Field(None, description="Description of the project")
    tags: List[str] = Field(default_factory=list, description="Tags associated with the project")

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str = Field(..., description="Unique project identifier")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True
