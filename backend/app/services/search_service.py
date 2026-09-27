import re
import json
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.schemas.search import SearchRequest, SearchResponse, SearchResultItem
from app.models.project import ProjectDB
from app.models.media import VisualEvidenceDB



def normalize_text(text: str) -> str:
    """Normalize text for embedding and search."""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text.strip().lower())


def build_searchable_document(
    project_name: Optional[str] = None,
    activity: Optional[str] = None,
    scene: Optional[str] = None,
    objects: Optional[any] = None,
    description: Optional[str] = None,
    project_signals: Optional[any] = None,
    location_name: Optional[str] = None
) -> str:
    """
    Construct a single normalized semantic search document combining all structured evidence fields.
    """
    parts = []
    
    if project_name and project_name.strip():
        parts.append(f"Project: {project_name.strip()}")
    if activity and activity.strip():
        parts.append(f"Activity: {activity.strip()}")
    if scene and scene.strip():
        parts.append(f"Scene: {scene.strip()}")
    
    # Process objects
    if objects:
        if isinstance(objects, str):
            try:
                objs_list = json.loads(objects)
                if isinstance(objs_list, list):
                    objs_str = ", ".join(str(o) for o in objs_list if str(o).strip())
                else:
                    objs_str = str(objects)
            except Exception:
                objs_str = objects
        elif isinstance(objects, list):
            objs_str = ", ".join(str(o) for o in objects if str(o).strip())
        else:
            objs_str = str(objects)
        if objs_str:
            parts.append(f"Objects: {objs_str}")

    if description and description.strip():
        parts.append(f"Description: {description.strip()}")

    # Process project signals
    if project_signals:
        if isinstance(project_signals, str):
            try:
                sig_list = json.loads(project_signals)
                if isinstance(sig_list, list):
                    sig_str = ", ".join(str(s) for s in sig_list if str(s).strip())
                else:
                    sig_str = str(project_signals)
            except Exception:
                sig_str = project_signals
        elif isinstance(project_signals, list):
            sig_str = ", ".join(str(s) for s in project_signals if str(s).strip())
        else:
            sig_str = str(project_signals)
        if sig_str:
            parts.append(f"Project Signals: {sig_str}")

    if location_name and location_name.strip():
        parts.append(f"Location: {location_name.strip()}")

    doc = ". ".join(parts)
    return doc if doc else "Field visual evidence."


class SearchService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.embedding_service = EmbeddingService.get_instance()
        self.qdrant_service = QdrantService.get_instance()

    def search(self, request: SearchRequest, db: Optional[Session] = None) -> SearchResponse:
        """
        Execute semantic similarity search over visual evidence documents with metadata filters.
        """
        query_text = normalize_text(request.query)
        if not query_text:
            return SearchResponse(query=request.query, results=[], count=0)

        min_threshold = request.min_score if request.min_score is not None else 0.35
        print(f"[SEARCH] Query: '{request.query}' (Normalized: '{query_text}') | top_k: {request.top_k} | min_score: {min_threshold}")
        if request.project_id:
            print(f"[SEARCH] Filter project_id: {request.project_id}")
        if request.activity:
            print(f"[SEARCH] Filter activity: {request.activity}")
        if request.location:
            print(f"[SEARCH] Filter location: {request.location}")

        # 1. Generate query vector using MiniLM
        query_vector = self.embedding_service.get_embedding(query_text)

        # 2. Search Qdrant
        # Retrieve extra hits if date filtering is requested
        fetch_limit = request.top_k * 2 if (request.date_from or request.date_to) else request.top_k
        hits = self.qdrant_service.search_evidence(
            vector=query_vector,
            limit=fetch_limit,
            project_id=request.project_id,
            activity=request.activity,
            location=request.location
        )

        print(f"[SEARCH] Qdrant returned {len(hits)} raw hits.")

        # Cache project names if DB session is available
        project_name_map = {}
        if db:
            try:
                projects = db.query(ProjectDB).all()
                project_name_map = {p.id: p.name for p in projects}
            except Exception as e:
                print(f"[SEARCH] Warning: Could not pre-fetch project names from DB: {e}")

        # 3. Format and filter results
        formatted_results: List[SearchResultItem] = []

        for hit in hits:
            payload = hit.payload or {}
            score = round(float(hit.score), 4)
            asset_id = payload.get("asset_id", str(hit.id))
            proj_id = payload.get("project_id")

            # Strict threshold check: Only display images crossing threshold
            if score < min_threshold:
                print(f"[SEARCH]   Filtered out hit {asset_id} (score {score:.4f} < threshold {min_threshold})")
                continue

            
            # Resolve project name
            proj_name = payload.get("project_name")
            if not proj_name and proj_id and proj_id in project_name_map:
                proj_name = project_name_map[proj_id]

            loc_str = payload.get("location_name") or payload.get("location") or ""
            act_str = payload.get("activity") or ""

            # Flexible location filtering (case-insensitive substring)
            if request.location and request.location.strip().lower() not in loc_str.lower():
                continue

            # Flexible activity filtering (case-insensitive substring)
            if request.activity and request.activity.strip().lower() not in act_str.lower():
                continue

            timestamp_str = payload.get("timestamp")
            
            # Optional date filtering
            if request.date_from and timestamp_str and timestamp_str < request.date_from:
                continue
            if request.date_to and timestamp_str and timestamp_str > request.date_to:
                continue


            # Parse objects list safely
            raw_objects = payload.get("objects", [])
            if isinstance(raw_objects, str):
                try:
                    objects_list = json.loads(raw_objects)
                except Exception:
                    objects_list = [raw_objects] if raw_objects else []
            elif isinstance(raw_objects, list):
                objects_list = raw_objects
            else:
                objects_list = []

            # Parse project signals safely
            raw_signals = payload.get("project_signals", [])
            if isinstance(raw_signals, str):
                try:
                    signals_list = json.loads(raw_signals)
                except Exception:
                    signals_list = [raw_signals] if raw_signals else []
            elif isinstance(raw_signals, list):
                signals_list = raw_signals
            else:
                signals_list = []

            item = SearchResultItem(
                asset_id=asset_id,
                project_id=proj_id,
                project_name=proj_name,
                cloudinary_url=payload.get("cloudinary_url", ""),
                description=payload.get("description", ""),
                activity=payload.get("activity"),
                scene=payload.get("scene"),
                objects=objects_list,
                project_signals=signals_list,
                timestamp=timestamp_str,
                location=payload.get("location_name") or payload.get("location"),
                latitude=payload.get("latitude"),
                longitude=payload.get("longitude"),
                score=score
            )
            formatted_results.append(item)
            print(f"[SEARCH]   Hit: asset={asset_id} | score={score:.4f} | project='{proj_name}' | desc='{item.description[:60]}...'")

            if len(formatted_results) >= request.top_k:
                break

        return SearchResponse(
            query=request.query,
            results=formatted_results,
            count=len(formatted_results)
        )

    def sync_all_from_db(self, db: Session) -> int:
        """
        Sync all existing visual evidence from SQLite DB to Qdrant.
        Ensures in-memory or newly initialized Qdrant instances have all historical records indexed.
        """
        try:
            evidence_list = db.query(VisualEvidenceDB).all()
            projects = {p.id: p for p in db.query(ProjectDB).all()}
            
            count = 0
            for ev in evidence_list:
                if not ev.description and not ev.activity:
                    continue
                
                proj = projects.get(ev.project_id)
                proj_name = proj.name if proj else None
                loc_name = proj.location_name if proj else ev.location
                
                doc = build_searchable_document(
                    project_name=proj_name,
                    activity=ev.activity,
                    scene=ev.scene,
                    objects=ev.objects,
                    description=ev.description,
                    project_signals=ev.project_signals,
                    location_name=loc_name
                )
                
                vector = self.embedding_service.get_embedding(doc)
                
                # Parse objects
                raw_objects = ev.objects
                if isinstance(raw_objects, str):
                    try:
                        objs = json.loads(raw_objects)
                    except Exception:
                        objs = [raw_objects] if raw_objects else []
                elif isinstance(raw_objects, list):
                    objs = raw_objects
                else:
                    objs = []

                # Parse signals
                raw_signals = ev.project_signals
                if isinstance(raw_signals, str):
                    try:
                        signals = json.loads(raw_signals)
                    except Exception:
                        signals = [raw_signals] if raw_signals else []
                elif isinstance(raw_signals, list):
                    signals = raw_signals
                else:
                    signals = []

                payload = {
                    "asset_id": ev.asset_id,
                    "evidence_id": ev.id,
                    "project_id": ev.project_id,
                    "project_name": proj_name,
                    "description": ev.description,
                    "activity": ev.activity,
                    "scene": ev.scene,
                    "objects": objs,
                    "project_signals": signals,
                    "timestamp": ev.created_at.isoformat() if ev.created_at else None,
                    "location": loc_name,
                    "location_name": loc_name,
                    "latitude": ev.latitude,
                    "longitude": ev.longitude,
                    "location_source": ev.location_source,
                    "location_match_distance": ev.location_match_distance,
                    "cloudinary_url": ev.cloudinary_url,
                    "routing_confidence": ev.routing_confidence,
                }
                
                self.qdrant_service.store_evidence(vector, payload, point_id=ev.asset_id)
                count += 1
                
            print(f"[SEARCH] Synced {count} evidence items from SQLite to Qdrant.")
            return count
        except Exception as e:
            print(f"[SEARCH] Warning during Qdrant sync: {e}")
            return 0

