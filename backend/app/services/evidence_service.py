import json
from app.models.media import VisualEvidenceDB
from app.schemas.routing import RoutingStatus


class EvidenceService:
    @staticmethod
    def build_evidence(asset_id: str, cloudinary_url: str, moondream_out: dict, routing_res) -> VisualEvidenceDB:
        # Write project_id for both ASSIGNED and NEEDS_REVIEW so evidence
        # is linked to the candidate project even when confidence is low.
        include_project = routing_res.status in (RoutingStatus.ASSIGNED, RoutingStatus.NEEDS_REVIEW)

        ev = VisualEvidenceDB(
            asset_id=asset_id,
            project_id=routing_res.selected_project_id if include_project else None,
            description=moondream_out.get("description", ""),
            activity=moondream_out.get("activity", ""),
            scene=moondream_out.get("scene", ""),
            objects=json.dumps(moondream_out.get("objects", [])),
            project_signals=json.dumps(moondream_out.get("project_signals", [])),
            routing_confidence=routing_res.confidence,
            cloudinary_url=cloudinary_url
        )
        return ev
