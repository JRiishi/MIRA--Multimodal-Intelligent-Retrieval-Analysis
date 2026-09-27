import json
import re
from typing import List, Optional
from app.schemas.routing import RoutingStatus, ProjectRoutingResult


def _normalize_string(s: str) -> str:
    """Strip whitespace, lowercase, collapse multiple spaces."""
    if not s:
        return ""
    return re.sub(r'\s+', ' ', s.strip().lower())


def _normalize_list(items) -> List[str]:
    """Normalize a list of strings: strip, lowercase, remove empty."""
    if not items:
        return []
    if isinstance(items, str):
        # Could be a JSON string from DB
        try:
            items = json.loads(items)
        except Exception:
            items = [items]
    return [_normalize_string(i) for i in items if _normalize_string(i)]


def build_evidence_text(evidence_data: dict) -> str:
    """
    Construct a single normalized text representation of the visual evidence
    for embedding. Uses all meaningful fields from Moondream output.
    """
    description = _normalize_string(evidence_data.get("description", ""))
    activity = _normalize_string(evidence_data.get("activity", ""))
    scene = _normalize_string(evidence_data.get("scene", ""))
    objects = _normalize_list(evidence_data.get("objects", []))
    signals = _normalize_list(evidence_data.get("project_signals", []))

    parts = []
    if description:
        parts.append(f"Description: {description}")
    if activity:
        parts.append(f"Activity: {activity}")
    if scene:
        parts.append(f"Scene: {scene}")
    if objects:
        parts.append(f"Objects: {', '.join(objects)}")
    if signals:
        parts.append(f"Signals: {', '.join(signals)}")

    return ". ".join(parts)


def build_project_text(project) -> str:
    """
    Construct a normalized text representation of a project for embedding.
    Uses name + description + tags.
    """
    name = _normalize_string(project.name or "")
    description = _normalize_string(project.description or "")
    tags = _normalize_list(project.tags)

    parts = []
    if name:
        parts.append(f"Project: {name}")
    if description:
        parts.append(f"Description: {description}")
    if tags:
        parts.append(f"Tags: {', '.join(tags)}")

    return ". ".join(parts)


class ProjectRouter:
    # Set to True to use Laya System 1 decision engine (ModernBERT)
    # Set to False to use Sentence-Transformers cosine similarity
    USE_LAYA: bool = True

    # Thresholds calibrated from real score distribution (12 images, 3 categories):
    ASSIGN_THRESHOLD: float = 0.38
    REVIEW_THRESHOLD: float = 0.28

    @classmethod
    def route_evidence(
        cls,
        asset_id: str,
        evidence_data: dict,
        candidate_projects: list,
        image_lat: Optional[float] = None,
        image_lon: Optional[float] = None,
        location_source: str = "NONE",
        embed_service=None
    ) -> ProjectRoutingResult:
        """
        Route a media asset to the best matching project.
        1. If image GPS is present, filters candidate projects within PROJECT_ROUTING_RADIUS_KM.
        2. Laya System 1 decision model evaluates visual evidence over the filtered candidates.
        3. Seamless fallback to Sentence-Transformers cosine similarity if USE_LAYA is False.
        """
        if not candidate_projects:
            print(f"[ROUTER] No candidate projects available. Returning UNASSIGNED.")
            return ProjectRoutingResult(
                asset_id=asset_id,
                selected_project_id=None,
                confidence=0.0,
                reason="No projects exist in the system.",
                status=RoutingStatus.UNASSIGNED,
                distance_km=None,
                location_used=False
            )

        # 1. Geographic Candidate Filtering
        from app.services.location_service import LocationService
        from app.core.config import settings

        location_used = False
        distance_map = {}
        filtered_candidates = candidate_projects

        if LocationService.validate_coordinates(image_lat, image_lon):
            location_used = True
            print(f"[ROUTER] IMAGE GPS: lat={image_lat}, lon={image_lon} (source: {location_source})")
            print(f"[ROUTER] Filtering candidate projects within {settings.PROJECT_ROUTING_RADIUS_KM} km of image location:")

            geo_candidates = []
            for p in candidate_projects:
                if LocationService.validate_coordinates(p.latitude, p.longitude):
                    dist = LocationService.calculate_distance(image_lat, image_lon, p.latitude, p.longitude)
                    distance_map[p.id] = dist
                    if dist <= settings.PROJECT_ROUTING_RADIUS_KM:
                        print(f"[ROUTER]   -> '{p.name}': {dist:.2f} km (INCLUDED)")
                        geo_candidates.append(p)
                    else:
                        print(f"[ROUTER]   -> '{p.name}': {dist:.2f} km (EXCLUDED: > {settings.PROJECT_ROUTING_RADIUS_KM}km)")
                else:
                    print(f"[ROUTER]   -> '{p.name}': No coordinates defined (EXCLUDED from geo-filtered set)")

            if not geo_candidates:
                print(f"[ROUTER] No projects found within {settings.PROJECT_ROUTING_RADIUS_KM} km of ({image_lat}, {image_lon}). Marking UNASSIGNED.")
                return ProjectRoutingResult(
                    asset_id=asset_id,
                    selected_project_id=None,
                    confidence=0.0,
                    reason=f"No projects found within {settings.PROJECT_ROUTING_RADIUS_KM}km radius of image location ({image_lat}, {image_lon}).",
                    status=RoutingStatus.UNASSIGNED,
                    distance_km=None,
                    location_used=True
                )

            print(f"[ROUTER] Geolocation filter reduced candidates from {len(candidate_projects)} to {len(geo_candidates)} project(s).")
            filtered_candidates = geo_candidates
        else:
            print("[ROUTER] No image GPS available. Passing all project candidates to router.")

        # 2. Decision Routing (Laya or Embeddings)
        if cls.USE_LAYA:
            try:
                from app.services.laya_service import LayaService
                laya_service = LayaService.get_instance()
                return laya_service.route_evidence(
                    asset_id=asset_id,
                    evidence_data=evidence_data,
                    candidate_projects=filtered_candidates,
                    distance_map=distance_map,
                    location_used=location_used
                )
            except Exception as e:
                print(f"[ROUTER] Laya decision routing failed: {e}. Falling back to embedding router.")

        return cls.route_evidence_embeddings(
            asset_id=asset_id,
            evidence_data=evidence_data,
            candidate_projects=filtered_candidates,
            distance_map=distance_map,
            location_used=location_used,
            embed_service=embed_service
        )

    @classmethod
    def route_evidence_embeddings(
        cls,
        asset_id: str,
        evidence_data: dict,
        candidate_projects: list,
        distance_map: Optional[dict] = None,
        location_used: bool = False,
        embed_service=None
    ) -> ProjectRoutingResult:

        if embed_service is None:
            from app.services.embedding_service import EmbeddingService
            embed_service = EmbeddingService.get_instance()

        evidence_text = build_evidence_text(evidence_data)
        print(f"[ROUTER] Evidence text for embedding:\n  {evidence_text}")

        evidence_vector = embed_service.get_embedding(evidence_text)

        import numpy as np

        best_project = None
        best_score = -1.0
        scores = {}

        for project in candidate_projects:
            proj_text = build_project_text(project)
            proj_vector = embed_service.get_embedding(proj_text)

            # Cosine similarity
            ev = np.array(evidence_vector)
            pv = np.array(proj_vector)
            norm_ev = np.linalg.norm(ev)
            norm_pv = np.linalg.norm(pv)

            if norm_ev == 0 or norm_pv == 0:
                score = 0.0
            else:
                score = float(np.dot(ev, pv) / (norm_ev * norm_pv))

            scores[project.name] = round(score, 4)
            dist_str = f" (~{distance_map[project.id]:.1f}km)" if (distance_map and project.id in distance_map) else ""
            print(f"[ROUTER]   '{project.name}'{dist_str} → score={score:.4f}")

            if score > best_score:
                best_score = score
                best_project = project

        print(f"[ROUTER] All scores: {scores}")
        print(f"[ROUTER] Best: '{best_project.name if best_project else None}' @ {best_score:.4f}")

        dist_km = distance_map.get(best_project.id) if (best_project and distance_map) else None

        if best_project and best_score >= ProjectRouter.ASSIGN_THRESHOLD:
            print(f"[ROUTER] → ASSIGNED to '{best_project.name}'")
            reason = f"Image is {dist_km:.2f}km from {best_project.name} and visual similarity ({best_score:.4f}) matches." if (location_used and dist_km is not None) else f"Semantic similarity {best_score:.4f} >= {ProjectRouter.ASSIGN_THRESHOLD} with '{best_project.name}'"
            return ProjectRoutingResult(
                asset_id=asset_id,
                selected_project_id=best_project.id,
                confidence=round(best_score, 4),
                reason=reason,
                status=RoutingStatus.ASSIGNED,
                distance_km=dist_km,
                location_used=location_used
            )
        elif best_project and best_score >= ProjectRouter.REVIEW_THRESHOLD:
            print(f"[ROUTER] → NEEDS_REVIEW (score {best_score:.4f} in review band)")
            reason = f"Image is {dist_km:.2f}km from {best_project.name}, moderate similarity ({best_score:.4f}). Review required." if (location_used and dist_km is not None) else f"Low confidence match ({best_score:.4f}) with '{best_project.name}'. Manual review required."
            return ProjectRoutingResult(
                asset_id=asset_id,
                selected_project_id=best_project.id,
                confidence=round(best_score, 4),
                reason=reason,
                status=RoutingStatus.NEEDS_REVIEW,
                distance_km=dist_km,
                location_used=location_used
            )
        else:
            print(f"[ROUTER] → UNASSIGNED (score {best_score:.4f} below review threshold)")
            return ProjectRoutingResult(
                asset_id=asset_id,
                selected_project_id=None,
                confidence=round(best_score, 4),
                reason=f"Best similarity ({best_score:.4f}) is below minimum review threshold.",
                status=RoutingStatus.UNASSIGNED,
                distance_km=None,
                location_used=location_used
            )
