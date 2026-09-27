from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime
import uuid
from app.database import Base


class ChatMessageDB(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    message = Column(Text, nullable=False)
    intent = Column(String, nullable=True, default="GENERAL")
    evidence = Column(Text, nullable=True)  # JSON string of List[ChatEvidenceItem]
    created_at = Column(DateTime, default=datetime.utcnow)
