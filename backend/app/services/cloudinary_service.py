import cloudinary
import cloudinary.uploader
import cloudinary.api
import cloudinary.utils
from cloudinary.search import Search
from app.core.config import settings
from typing import Optional, Dict, Any, List
import urllib.parse

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

class CloudinaryService:
    @staticmethod
    def upload_image(file_path_or_file_obj, folder="cc_hack") -> Dict[str, Any]:
        """Upload raw media asset to Cloudinary with EXIF data extraction."""
        try:
            result = cloudinary.uploader.upload(
                file_path_or_file_obj,
                folder=folder,
                image_metadata=True,
                exif=True
            )
            return {
                "public_id": result.get("public_id"),
                "url": result.get("secure_url"),
                "width": result.get("width"),
                "height": result.get("height"),
                "format": result.get("format"),
                "created_at": result.get("created_at"),
                "bytes": result.get("bytes")
            }
        except Exception as e:
            print(f"[ERROR] Cloudinary upload failed: {e}")
            raise Exception(f"Cloudinary upload failed: {e}")

    @staticmethod
    def sync_metadata(
        public_id: str,
        context: Optional[Dict[str, str]] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Write visual evidence, Laya routing confidence, project IDs, and GPS
        directly back into Cloudinary asset context and tags via explicit().
        Turns Cloudinary into the single source of truth for media intelligence.
        """
        if not public_id:
            return {}

        clean_context = {}
        if context:
            for k, v in context.items():
                if v is not None:
                    # Clean and truncate context values for Cloudinary metadata format
                    clean_context[k] = str(v).replace("|", "-").replace("=", ":")[:400]

        clean_tags = []
        if tags:
            clean_tags = [str(t).strip().replace(" ", "_")[:50] for t in tags if str(t).strip()]

        try:
            params = {
                "public_id": public_id,
                "type": "upload"
            }
            if clean_context:
                params["context"] = clean_context
            if clean_tags:
                params["tags"] = clean_tags

            result = cloudinary.uploader.explicit(**params)
            print(f"[CLOUDINARY] Synced metadata to asset '{public_id}' (Tags: {clean_tags})")
            return result
        except Exception as e:
            print(f"[CLOUDINARY] Warning: Metadata write-back failed for {public_id}: {e}")
            return {}

    @staticmethod
    def _build_transformed_url(public_id_or_url: str, transform_str: str) -> str:
        if not public_id_or_url:
            return ""
        if "/upload/" in public_id_or_url and (public_id_or_url.startswith("http://") or public_id_or_url.startswith("https://")):
            parts = public_id_or_url.split("/upload/", 1)
            return f"{parts[0]}/upload/{transform_str}/{parts[1]}"
        clean_id = public_id_or_url.strip("/")
        return f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/image/upload/{transform_str}/{clean_id}"

    @staticmethod
    def get_optimized_url(public_id_or_url: str, width: Optional[int] = None, height: Optional[int] = None, crop: str = "limit") -> str:
        """Generate bandwidth-optimized delivery URL using q_auto,f_auto."""
        if not public_id_or_url:
            return ""
        transforms = ["q_auto", "f_auto"]
        if width and height:
            transforms.append(f"w_{width},h_{height},c_{crop}")
        elif width:
            transforms.append(f"w_{width},c_{crop}")
        
        t_str = ",".join(transforms)
        return CloudinaryService._build_transformed_url(public_id_or_url, t_str)

    @staticmethod
    def get_smart_thumbnail_url(public_id_or_url: str, width: int = 400, height: int = 300) -> str:
        """Generate AI focal-point smart cropped thumbnail using g_auto,c_fill."""
        if not public_id_or_url:
            return ""
        transform = f"c_fill,g_auto,w_{width},h_{height},q_auto,f_auto"
        return CloudinaryService._build_transformed_url(public_id_or_url, transform)

    @staticmethod
    def get_verified_badge_url(
        public_id_or_url: str,
        project_name: str = "MIRA Verified",
        gps_lat: Optional[float] = None,
        gps_lon: Optional[float] = None,
        timestamp: Optional[str] = None
    ) -> str:
        """
        Dynamically burn verified provenance badges and GPS metadata into the delivery URL.
        Zero backend storage required — rendered entirely by Cloudinary CDN transformations.
        """
        if not public_id_or_url:
            return ""

        overlays = []

        # 1. Top Verified Impact Badge
        badge_text = urllib.parse.quote("MIRA VERIFIED IMPACT")
        overlays.append(f"l_text:Arial_22_bold:{badge_text}/fl_layer_apply,g_north_east,x_20,y_20")

        # 2. Bottom GPS & Provenance Stamp
        stamp_parts = []
        if gps_lat is not None and gps_lon is not None:
            stamp_parts.append(f"GPS {gps_lat:.2f}N {gps_lon:.2f}E")
        if timestamp:
            stamp_parts.append(str(timestamp)[:10])
        if project_name:
            clean_name = "".join(c for c in project_name if c.isalnum() or c in " -_")[:25].strip()
            if clean_name:
                stamp_parts.append(clean_name)

        if stamp_parts:
            safe_stamp = urllib.parse.quote(" | ".join(stamp_parts))
            overlays.append(f"l_text:Arial_16_bold:{safe_stamp}/fl_layer_apply,g_south_west,x_20,y_20")

        overlays.append("q_auto,f_auto")
        transform_path = "/".join(overlays)
        return CloudinaryService._build_transformed_url(public_id_or_url, transform_path)

    @staticmethod
    def get_before_after_composite_url(before_public_id: str, after_public_id: str, width: int = 1200, height: int = 600) -> str:
        """
        Generate a side-by-side composite comparison transformation using pure Cloudinary URLs.
        Bypasses local image manipulation libraries entirely.
        """
        if not before_public_id or not after_public_id:
            return ""

        clean_before = before_public_id.strip('/')
        escaped_after = after_public_id.strip('/').replace("/", ":")
        half_w = width // 2

        # Transform: base image left half, layer overlay right half with text tags
        transform = (
            f"c_fill,w_{width},h_{height}/"
            f"l_{escaped_after}/c_fill,w_{half_w},h_{height}/fl_layer_apply,g_east/"
            f"l_text:Arial_20_bold:BEFORE/fl_layer_apply,g_north_west,x_20,y_20/"
            f"l_text:Arial_20_bold:AFTER/fl_layer_apply,g_north_east,x_20,y_20/"
            f"q_auto,f_auto"
        )
        return f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/image/upload/{transform}/{clean_before}"

    @staticmethod
    def get_campaign_aspect_urls(public_id_or_url: str) -> Dict[str, str]:
        """
        Generate multi-aspect exports (1:1 Square, 16:9 Landscape, 9:16 Vertical Story)
        with AI focal-point smart cropping for social impact campaigns and reports.
        """
        if not public_id_or_url:
            return {}

        return {
            "square_1_1": CloudinaryService._build_transformed_url(public_id_or_url, "c_fill,g_auto,w_1080,h_1080,q_auto,f_auto"),
            "landscape_16_9": CloudinaryService._build_transformed_url(public_id_or_url, "c_fill,g_auto,w_1920,h_1080,q_auto,f_auto"),
            "story_9_16": CloudinaryService._build_transformed_url(public_id_or_url, "c_fill,g_auto,w_1080,h_1920,q_auto,f_auto")
        }

    @staticmethod
    def search_assets(expression: str, max_results: int = 30) -> List[Dict[str, Any]]:
        """
        Perform Boolean metadata and tag search directly against Cloudinary's Search API.
        Example expression: 'folder:cc_hack AND tags:verified AND context.activity:road*'
        """
        try:
            results = (
                Search()
                .expression(expression)
                .max_results(max_results)
                .execute()
            )
            resources = results.get("resources", [])
            print(f"[CLOUDINARY SEARCH] Query '{expression}' returned {len(resources)} assets.")
            return resources
        except Exception as e:
            print(f"[CLOUDINARY SEARCH] Warning: Cloudinary Search API query failed: {e}")
            return []

    @staticmethod
    def generate_upload_signature(params_to_sign: Dict[str, Any]) -> Dict[str, Any]:
        """Generate signature for authenticated direct frontend uploads."""
        try:
            signature = cloudinary.utils.api_sign_request(
                params_to_sign,
                settings.CLOUDINARY_API_SECRET
            )
            return {
                "signature": signature,
                "api_key": settings.CLOUDINARY_API_KEY,
                "cloud_name": settings.CLOUDINARY_CLOUD_NAME,
                "timestamp": params_to_sign.get("timestamp")
            }
        except Exception as e:
            print(f"[ERROR] Signature generation failed: {e}")
            raise Exception("Signature generation failed.")

    @staticmethod
    def create_upload_preset(preset_name: str = "mira_field_upload") -> Dict[str, Any]:
        """Create or configure a Cloudinary upload preset for automated field ingestion."""
        try:
            result = cloudinary.api.create_upload_preset(
                name=preset_name,
                folder="cc_hack",
                unsigned=False,
                tags=["mira_field", "field_capture"],
                transformation=[{"width": 4000, "height": 4000, "crop": "limit", "quality": "auto:good"}]
            )
            print(f"[CLOUDINARY] Created upload preset '{preset_name}'")
            return result
        except Exception as e:
            print(f"[CLOUDINARY] Upload preset notice: {e}")
            return {"preset_name": preset_name, "status": "exists_or_error", "detail": str(e)}
