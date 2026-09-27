import os
from dotenv import load_dotenv

load_dotenv(override=True)

class Settings:
    PROJECT_NAME: str = "MIRA — Multimodal Intelligent Retrieval & Analysis"
    
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")
    
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    
    DATABASE_URL: str = "sqlite:///./cc_hack.db"
    PROJECT_ROUTING_RADIUS_KM: float = float(os.getenv("PROJECT_ROUTING_RADIUS_KM", "15.0"))

settings = Settings()
