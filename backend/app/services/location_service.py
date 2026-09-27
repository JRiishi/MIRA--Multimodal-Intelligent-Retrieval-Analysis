import math
import io
from typing import Tuple, Optional
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS


class LocationService:
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points on the Earth
        using the Haversine formula. Returns distance in kilometers (km).
        """
        # Earth radius in kilometers
        R = 6371.0

        # Convert decimal degrees to radians
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        distance = R * c
        return round(distance, 4)

    @staticmethod
    def validate_coordinates(lat: Optional[float], lon: Optional[float]) -> bool:
        """
        Validate latitude (-90 to 90) and longitude (-180 to 180).
        """
        if lat is None or lon is None:
            return False
        try:
            lat = float(lat)
            lon = float(lon)
            return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0
        except (ValueError, TypeError):
            return False

    @classmethod
    def extract_exif_gps(cls, image_bytes: bytes) -> Tuple[Optional[float], Optional[float], str]:
        """
        Extract GPS coordinates from image EXIF metadata.
        Returns (latitude, longitude, location_source) where location_source is 'EXIF' or 'NONE'.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            exif_data = image._getexif()
            if not exif_data:
                return None, None, "NONE"

            gps_info = {}
            for tag_id, value in exif_data.items():
                tag_name = TAGS.get(tag_id, tag_id)
                if tag_name == "GPSInfo":
                    for key in value:
                        sub_tag_name = GPSTAGS.get(key, key)
                        gps_info[sub_tag_name] = value[key]

            if not gps_info:
                return None, None, "NONE"

            # Parse Latitude
            lat_val = gps_info.get("GPSLatitude")
            lat_ref = gps_info.get("GPSLatitudeRef", "N")
            # Parse Longitude
            lon_val = gps_info.get("GPSLongitude")
            lon_ref = gps_info.get("GPSLongitudeRef", "E")

            if not lat_val or not lon_val:
                return None, None, "NONE"

            def _convert_dms_to_degrees(dms) -> float:
                d = float(dms[0])
                m = float(dms[1])
                s = float(dms[2])
                return d + (m / 60.0) + (s / 3600.0)

            lat = _convert_dms_to_degrees(lat_val)
            if lat_ref != "N":
                lat = -lat

            lon = _convert_dms_to_degrees(lon_val)
            if lon_ref != "E":
                lon = -lon

            if cls.validate_coordinates(lat, lon):
                return round(lat, 6), round(lon, 6), "EXIF"

        except Exception as e:
            print(f"[LOCATION] Warning: Failed to parse EXIF GPS: {e}")

        return None, None, "NONE"
