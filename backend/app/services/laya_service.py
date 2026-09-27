import re
import json
from typing import List, Optional, Dict
from app.schemas.routing import RoutingStatus, ProjectRoutingResult


class LayaService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        print("[INFO] Loading Laya System 1 Decision Router (ModernBERT)...")
        from laya import Router
        self.router = Router()
        print("[INFO] Laya Decision Router loaded successfully.")

    def route_evidence(
        self,
        asset_id: str,
        evidence_data: dict,
        candidate_projects: list,
        distance_map: Optional[Dict[str, float]] = None,
        location_used: bool = False
    ) -> ProjectRoutingResult:
        """
        Route image evidence to a project using the non-autoregressive Laya decision model.
        Evaluates typed choice question over candidate projects in a single forward pass.
        """
        if not candidate_projects:
            print("[LAYA] No candidate projects available.")
            return ProjectRoutingResult(
                asset_id=asset_id,
                selected_project_id=None,
                confidence=0.0,
                reason="No projects exist in the system.",
                status=RoutingStatus.UNASSIGNED,
                distance_km=None,
                location_used=location_used
            )

        # 1. Build input text from the visual description and visible context
        desc = (evidence_data.get("description") or "").strip()
        activity = (evidence_data.get("activity") or "").strip()
        scene = (evidence_data.get("scene") or "").strip()
        objects = evidence_data.get("objects") or []
        
        parts = []
        if desc:
            parts.append(desc)
        if activity:
            parts.append(f"Activity: {activity}.")
        if scene:
            parts.append(f"Scene: {scene}.")
        if objects and isinstance(objects, list):
            parts.append(f"Objects: {', '.join(str(o) for o in objects)}.")
            
        input_text = " ".join(parts) if parts else "Field evidence image."
        print(f"[LAYA] Routing input text: {input_text}")

        # 2. Build candidate project criteria with semantic slugs & distance info
        proj_map: Dict[str, any] = {}
        criteria: Dict[str, str] = {}

        for p in candidate_projects:
            base_slug = re.sub(r'[^a-z0-9]+', '_', p.name.lower()).strip('_')[:25]
            slug = base_slug or "proj"
            counter = 1
            while slug in criteria:
                slug = f"{base_slug}_{counter}"
                counter += 1

            proj_map[slug] = p
            desc_clean = (p.description or "").replace("\n", " ").strip()
            
            tags_clean = ""
            if p.tags:
                if isinstance(p.tags, list):
                    tags_clean = ", ".join(p.tags)
                elif isinstance(p.tags, str):
                    try:
                        tags_clean = ", ".join(json.loads(p.tags))
                    except Exception:
                        tags_clean = p.tags

            loc_details = []
            if p.location_name:
                loc_details.append(p.location_name)
            if distance_map and p.id in distance_map:
                loc_details.append(f"~{distance_map[p.id]:.1f}km away")

            loc_str = f" ({', '.join(loc_details)})" if loc_details else ""
            criteria_text = f"{p.name}{loc_str}: {desc_clean}. Covers all project stages: baseline site condition, active construction, and completed infrastructure milestones (e.g. finished paved roads, completed solar rooftops, clean river remediation)."
            if tags_clean:
                criteria_text += f". Keywords: {tags_clean}"
            criteria[slug] = criteria_text

        # Specific unrelated_other definition to prevent completed infrastructure from being misclassified
        criteria["unrelated_other"] = "Completely non-infrastructure content such as indoor living room, personal selfie, food, pets, or unrelated consumer goods."

        print(f"[LAYA] Candidate criteria options ({len(criteria)}): {list(criteria.keys())}")

        questions = {
            "assigned_project": {
                "type": "choice",
                "instructions": "Which active or completed project at this location does this visual evidence belong to?",
                "criteria": criteria
            }
        }

        # 3. Predict via Laya
        result = self.router.predict(input_text, questions)
        ans = result.get("answers", {}).get("assigned_project", {})
        choice = ans.get("choice")
        probs = ans.get("probabilities", {})
        confidence = float(probs.get(choice, 0.0))

        print(f"[LAYA] Prediction: choice='{choice}', confidence={confidence:.4f}")
        print(f"[LAYA] All probabilities: {probs}")

        # 4. Map choice and confidence to RoutingStatus
        # If Laya selected 'unrelated_other', mark UNASSIGNED
        if choice == "unrelated_other":
            print(f"[LAYA] -> UNASSIGNED (Laya determined visual content is unrelated to local project criteria)")
            return ProjectRoutingResult(
                asset_id=asset_id,
                selected_project_id=None,
                confidence=round(confidence, 4),
                reason=f"Visual content does not match any active project at this location.",
                status=RoutingStatus.UNASSIGNED,
                distance_km=None,
                location_used=location_used
            )

        if choice in proj_map:
            selected_proj = proj_map[choice]
            dist_km = distance_map.get(selected_proj.id) if distance_map else None

            if location_used and dist_km is not None:
                assign_reason = f"Image is {dist_km:.2f} km from {selected_proj.name} and visual context matches with {confidence:.1%} confidence."
                review_reason = f"Image is {dist_km:.2f} km from {selected_proj.name}, moderate semantic match ({confidence:.1%}). Review required."
            else:
                assign_reason = f"Laya decision model chose '{selected_proj.name}' with {confidence:.1%} confidence."
                review_reason = f"Laya moderate confidence match ({confidence:.1%}) with '{selected_proj.name}'. Manual review suggested."

            # If geolocated right at the site (<= 5km), lower assignment threshold to 0.28
            effective_assign_thresh = 0.28 if (location_used and dist_km is not None and dist_km <= 5.0) else 0.35

            if confidence >= effective_assign_thresh:
                print(f"[LAYA] -> ASSIGNED to '{selected_proj.name}' ({confidence:.4f} >= {effective_assign_thresh})")
                return ProjectRoutingResult(
                    asset_id=asset_id,
                    selected_project_id=selected_proj.id,
                    confidence=round(confidence, 4),
                    reason=assign_reason,
                    status=RoutingStatus.ASSIGNED,
                    distance_km=dist_km,
                    location_used=location_used
                )
            elif confidence >= 0.20:
                print(f"[LAYA] -> NEEDS_REVIEW for '{selected_proj.name}' ({confidence:.4f})")
                return ProjectRoutingResult(
                    asset_id=asset_id,
                    selected_project_id=selected_proj.id,
                    confidence=round(confidence, 4),
                    reason=review_reason,
                    status=RoutingStatus.NEEDS_REVIEW,
                    distance_km=dist_km,
                    location_used=location_used
                )

        
        print(f"[LAYA] -> UNASSIGNED (confidence {confidence:.4f} below threshold or invalid choice)")
        return ProjectRoutingResult(
            asset_id=asset_id,
            selected_project_id=None,
            confidence=round(confidence, 4),
            reason=f"Confidence ({confidence:.1%}) below threshold or does not clearly match any candidate project.",
            status=RoutingStatus.UNASSIGNED,
            distance_km=None,
            location_used=location_used
        )
