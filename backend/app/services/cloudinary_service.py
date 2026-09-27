import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)

class CloudinaryService:
    @staticmethod
    def upload_image(file_path_or_file_obj, folder="cc_hack"):
        try:
            result = cloudinary.uploader.upload(file_path_or_file_obj, folder=folder)
            return {
                "public_id": result.get("public_id"),
                "url": result.get("secure_url"),
                "width": result.get("width"),
                "height": result.get("height"),
                "format": result.get("format")
            }
        except Exception as e:
            print(f"[ERROR] Cloudinary upload failed: {e}")
            raise Exception("Cloudinary upload failed. Check your API credentials.")
