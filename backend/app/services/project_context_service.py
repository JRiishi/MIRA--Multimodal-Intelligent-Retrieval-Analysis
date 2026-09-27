from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.project import ProjectDB
from app.models.media import VisualEvidenceDB
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.schemas.chat import ChatEvidenceItem, ProjectTimelineItem
import json


class ProjectContextService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.embedding_service = EmbeddingService.get_instance()
        self.qdrant_service = QdrantService.get_instance()

    def get_project(self, project_id: str, db: Session) -> Optional[ProjectDB]:
        return db.query(ProjectDB).filter(ProjectDB.id == project_id).first()

    def get_latest_evidence(self, project_id: str, db: Session, limit: int = 5) -> List[VisualEvidenceDB]:
        """Fetch latest visual evidence records for this specific project."""
        return (
            db.query(VisualEvidenceDB)
            .filter(VisualEvidenceDB.project_id == project_id)
            .order_by(VisualEvidenceDB.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_all_project_evidence(self, project_id: str, db: Session) -> List[VisualEvidenceDB]:
        """Fetch all visual evidence for this project ordered by date."""
        return (
            db.query(VisualEvidenceDB)
            .filter(VisualEvidenceDB.project_id == project_id)
            .order_by(VisualEvidenceDB.created_at.asc())
            .all()
        )

    def get_timeline(self, project_id: str, db: Session) -> List[ProjectTimelineItem]:
        """Get chronological timeline of project observations."""
        evidence_list = self.get_all_project_evidence(project_id, db)
        items: List[ProjectTimelineItem] = []
        for ev in evidence_list:
            date_str = ev.timestamp or (ev.created_at.strftime("%Y-%m-%d") if ev.created_at else "Unknown Date")
            items.append(
                ProjectTimelineItem(
                    asset_id=ev.asset_id,
                    date=date_str,
                    activity=ev.activity or "Unspecified Activity",
                    description=ev.description or "",
                    scene=ev.scene or "",
                    location=ev.location or "",
                    cloudinary_url=ev.cloudinary_url
                )
            )
        return items

    def get_earliest_and_latest(self, project_id: str, db: Session) -> Tuple[Optional[VisualEvidenceDB], Optional[VisualEvidenceDB]]:
        """Get earliest and latest evidence for before/after comparison."""
        earliest = (
            db.query(VisualEvidenceDB)
            .filter(VisualEvidenceDB.project_id == project_id)
            .order_by(VisualEvidenceDB.created_at.asc())
            .first()
        )
        latest = (
            db.query(VisualEvidenceDB)
            .filter(VisualEvidenceDB.project_id == project_id)
            .order_by(VisualEvidenceDB.created_at.desc())
            .first()
        )
        return earliest, latest

    def search_project_evidence(
        self, 
        project_id: str, 
        query: str, 
        limit: int = 5, 
        min_score: float = 0.25
    ) -> List[ChatEvidenceItem]:
        """
        Search visual evidence vectors strictly isolated to this project_id in Qdrant.
        """
        if not query.strip():
            return []

        query_vec = self.embedding_service.get_embedding(query.strip())
        hits = self.qdrant_service.search_evidence(
            vector=query_vec,
            limit=limit * 2,
            project_id=project_id
        )

        evidence_items: List[ChatEvidenceItem] = []
        seen_assets = set()

        for hit in hits:
            payload = hit.payload or {}
            score = round(float(hit.score), 4)

            # Strict project isolation check
            hit_proj_id = payload.get("project_id")
            if hit_proj_id and hit_proj_id != project_id:
                continue

            asset_id = payload.get("asset_id", str(hit.id))
            if asset_id in seen_assets:
                continue
            seen_assets.add(asset_id)

            if score < min_score:
                continue

            evidence_items.append(
                ChatEvidenceItem(
                    asset_id=asset_id,
                    cloudinary_url=payload.get("cloudinary_url", ""),
                    description=payload.get("description", ""),
                    timestamp=payload.get("timestamp"),
                    location=payload.get("location_name") or payload.get("location"),
                    activity=payload.get("activity"),
                    scene=payload.get("scene"),
                    score=score
                )
            )
            if len(evidence_items) >= limit:
                break

        return evidence_items
