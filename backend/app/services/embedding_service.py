from sentence_transformers import SentenceTransformer

class EmbeddingService:
    _instance = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        print("[INFO] Loading Embedding Service (MiniLM)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
    def get_embedding(self, text: str) -> list:
        return self.model.encode(text).tolist()
