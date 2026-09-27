from sqlalchemy import Column, String, DateTime, Text, Float
from datetime import datetime
import uuid
from app.database import Base

class MediaAssetDB(Base):
    __tablename__ = "media_assets"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    cloudinary_public_id = Column(String, index=True)
    cloudinary_url = Column(String)
    project_id = Column(String, index=True, nullable=True)
    processing_status = Column(String, default="UPLOADED")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    captured_at = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    mime_type = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    
class VisualEvidenceDB(Base):
    __tablename__ = "visual_evidence"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    asset_id = Column(String, index=True)
    project_id = Column(String, index=True, nullable=True)
    description = Column(Text)
    activity = Column(String)
    scene = Column(String)
    objects = Column(Text) # JSON string
    project_signals = Column(Text) # JSON string
    location = Column(String, nullable=True)
    timestamp = Column(String, nullable=True)
    routing_confidence = Column(Float, nullable=True)
    cloudinary_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
