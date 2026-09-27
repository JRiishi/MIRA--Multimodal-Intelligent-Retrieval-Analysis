import sys
sys.path.insert(0, './backend')
import urllib.request, urllib.error
from app.services.cloudinary_service import CloudinaryService
from app.database import SessionLocal
from app.models.media import MediaAssetDB

db = SessionLocal()
asset = db.query(MediaAssetDB).first()
pub_id = asset.cloudinary_public_id if asset and asset.cloudinary_public_id else "sample"
orig_url = asset.cloudinary_url if asset else ""

print("Testing with asset public_id:", pub_id)
print("Original URL:", orig_url)

url_opt = CloudinaryService.get_optimized_url(pub_id)
url_badge = CloudinaryService.get_verified_badge_url(pub_id, "Solar Project", 28.61, 77.20, "2026-09-27")
aspects = CloudinaryService.get_campaign_aspect_urls(pub_id)

urls = [
    ("Original URL", orig_url),
    ("Optimized URL", url_opt),
    ("Verified Badge URL", url_badge),
    ("Square 1:1 Aspect", aspects.get("square_1_1")),
    ("Landscape 16:9 Aspect", aspects.get("landscape_16_9")),
    ("Story 9:16 Aspect", aspects.get("story_9_16")),
]

for name, u in urls:
    if not u:
        print(f"{name}: Empty URL")
        continue
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req)
        print(f"SUCCESS {name} -> HTTP {res.getcode()} | URL: {u}")
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        print(f"FAILED {name} -> HTTP {e.code} | Error: {err_msg[:200]} | URL: {u}")
    except Exception as e:
        print(f"ERROR {name} -> {e} | URL: {u}")

db.close()
