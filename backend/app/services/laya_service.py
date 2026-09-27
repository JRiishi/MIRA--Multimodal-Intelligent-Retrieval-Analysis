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
        candidate_projects: list
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
                status=RoutingStatus.UNASSIGNED
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

        # 2. Build candidate project criteria with semantic slugs
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

            criteria_text = f"{p.name}: {desc_clean}"
            if tags_clean:
                criteria_text += f". Keywords: {tags_clean}"
            criteria[slug] = criteria_text

        print(f"[LAYA] Candidate criteria options: {list(criteria.keys())}")

        questions = {
            "assigned_project": {
                "type": "choice",
                "instructions": "Which active project does this visual evidence belong to?",
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
        # Equal probability across 5 projects is 0.20
        # >= 0.40: High confidence -> ASSIGNED
        # 0.28 - 0.40: Moderate confidence -> NEEDS_REVIEW
        # < 0.28: Low confidence / unrelated -> UNASSIGNED
        if choice in proj_map:
            selected_proj = proj_map[choice]
            if confidence >= 0.40:
                print(f"[LAYA] -> ASSIGNED to '{selected_proj.name}' ({confidence:.4f})")
                return ProjectRoutingResult(
                    asset_id=asset_id,
                    selected_project_id=selected_proj.id,
                    confidence=round(confidence, 4),
                    reason=f"Laya decision model chose '{selected_proj.name}' with {confidence:.1%} confidence",
                    status=RoutingStatus.ASSIGNED
                )
            elif confidence >= 0.28:
                print(f"[LAYA] -> NEEDS_REVIEW for '{selected_proj.name}' ({confidence:.4f})")
                return ProjectRoutingResult(
                    asset_id=asset_id,
                    selected_project_id=selected_proj.id,
                    confidence=round(confidence, 4),
                    reason=f"Laya moderate confidence match ({confidence:.1%}) with '{selected_proj.name}'. Manual review suggested.",
                    status=RoutingStatus.NEEDS_REVIEW
                )
        
        print(f"[LAYA] -> UNASSIGNED (confidence {confidence:.4f} below threshold or invalid choice)")
        return ProjectRoutingResult(
            asset_id=asset_id,
            selected_project_id=None,
            confidence=round(confidence, 4),
            reason=f"Confidence ({confidence:.1%}) below threshold or does not clearly match any project.",
            status=RoutingStatus.UNASSIGNED
        )
