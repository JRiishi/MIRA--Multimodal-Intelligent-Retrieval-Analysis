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
        """
        Store or update an evidence vector with metadata payload.
        Idempotent: Uses deterministic UUID from point_id to update existing points in-place.
        """
        if not point_id:
            point_uuid = str(uuid.uuid4())
        else:
            try:
                point_uuid = str(uuid.UUID(str(point_id)))
            except Exception:
                point_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(point_id)))

        self.client.upsert(
            collection_name=self.collection_name,
            points=[PointStruct(id=point_uuid, vector=vector, payload=payload)]
        )
        print(f"[QDRANT] Stored point {point_uuid} (original: {point_id}) in {self.collection_name}")

        
    def search_evidence(
        self, 
        vector: list, 
        limit: int = 10, 
        project_id: str = None,
        activity: str = None,
        location: str = None
    ):
        must_conditions = []
        if project_id:
            must_conditions.append(FieldCondition(key="project_id", match=MatchValue(value=project_id)))
        if activity:
            must_conditions.append(FieldCondition(key="activity", match=MatchValue(value=activity)))
        if location:
            # Match either location or location_name
            must_conditions.append(FieldCondition(key="location_name", match=MatchValue(value=location)))
            
        query_filter = Filter(must=must_conditions) if must_conditions else None

        
        if hasattr(self.client, "query_points"):
            res = self.client.query_points(
                collection_name=self.collection_name,
                query=vector,
                query_filter=query_filter,
                limit=limit
            )
            return res.points
        else:
            return self.client.search(
                collection_name=self.collection_name,
                query_vector=vector,
                query_filter=query_filter,
                limit=limit
            )

    def delete_evidence(self, point_id: str):
        """
        Delete an evidence point from Qdrant by point_id / asset_id.
        """
        if not point_id:
            return
        try:
            try:
                point_uuid = str(uuid.UUID(str(point_id)))
            except Exception:
                point_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(point_id)))
            
            # Use points selector to delete point
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=[point_uuid]
            )
            print(f"[QDRANT] Deleted point {point_uuid} (original: {point_id})")
        except Exception as e:
            print(f"[QDRANT] Warning: Failed to delete point {point_id}: {e}")



