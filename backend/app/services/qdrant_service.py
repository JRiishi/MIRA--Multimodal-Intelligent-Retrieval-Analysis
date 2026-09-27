from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from app.core.config import settings
import uuid

class QdrantService:
    _instance = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
        
    def __init__(self):
        print("[INFO] Initializing Qdrant Client...")
        # For hackathon, if qdrant is not running, fallback to memory
        try:
            self.client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
            self.collection_name = "cc_hack_evidence"
            self.client.get_collection(self.collection_name)
        except Exception:
            print("[WARNING] Qdrant server not found. Falling back to in-memory mode for easy demoing.")
            self.client = QdrantClient(location=":memory:")
            self.collection_name = "cc_hack_evidence"
            
        try:
            self.client.get_collection(self.collection_name)
        except:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            
    def store_evidence(self, vector: list, payload: dict, point_id: str = None):
        if not point_id:
            point_id = str(uuid.uuid4())
        self.client.upsert(
            collection_name=self.collection_name,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)]
        )
        
    def search_evidence(self, vector: list, limit=5, project_id=None):
        query_filter = None
        if project_id:
            query_filter = Filter(
                must=[FieldCondition(key="project_id", match=MatchValue(value=project_id))]
            )
            
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            query_filter=query_filter,
            limit=limit
        )
        return results
