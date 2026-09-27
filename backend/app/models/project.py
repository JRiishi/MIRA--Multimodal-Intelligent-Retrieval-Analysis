from sqlalchemy import Column, String, DateTime, Text, Float
from datetime import datetime
import uuid
from app.database import Base

class ProjectDB(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    tags = Column(Text, default="[]") # Stored as JSON string for SQLite simplicity
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

