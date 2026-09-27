from sqlalchemy import Column, String, DateTime, Text, Float, Boolean
from datetime import datetime
import uuid
from app.database import Base

class MediaAssetDB(Base):
    __tablename__ = "media_assets"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    cloudinary_public_id = Column(String, index=True, nullable=True)
    original_public_id = Column(String, nullable=True)
    cloudinary_url = Column(String, nullable=True)
    cloudinary_metadata_synced = Column(Boolean, default=False)
    project_id = Column(String, index=True, nullable=True)
    processing_status = Column(String, default="UPLOADED")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    captured_at = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    image_latitude = Column(Float, nullable=True)
    image_longitude = Column(Float, nullable=True)
    location_source = Column(String, default="NONE")  # EXIF, MANUAL, NONE
    location_match_distance = Column(Float, nullable=True)  # Distance to assigned project in km
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
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_source = Column(String, nullable=True)
    location_match_distance = Column(Float, nullable=True)
    timestamp = Column(String, nullable=True)
    routing_confidence = Column(Float, nullable=True)
    cloudinary_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
