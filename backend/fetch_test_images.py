"""
fetch_test_images.py

Downloads royalty-free test images from Unsplash (via direct URL) to
populate ../images/ with road/solar/water representative samples.

Run once: python fetch_test_images.py
"""
import os
import requests

IMG_DIR = os.path.join(os.path.dirname(__file__), '..', 'images')
os.makedirs(IMG_DIR, exist_ok=True)

# Royalty-free Unsplash images (direct-download URLs, no API key needed)
TEST_IMAGES = [
    # Road construction / infrastructure
    ("road_01.jpg", "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80"),
    ("road_02.jpg", "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80"),
    ("road_03.jpg", "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"),
    # Solar / renewable energy
    ("solar_01.jpg", "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80"),
    ("solar_02.jpg", "https://images.unsplash.com/photo-1624397640148-949b1732bb0a?w=800&q=80"),
    ("solar_03.jpg", "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=80"),
    # Water / environment cleanup
    ("water_01.jpg", "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80"),
    ("water_02.jpg", "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&q=80"),
    ("water_03.jpg", "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&q=80"),
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

for filename, url in TEST_IMAGES:
    out_path = os.path.join(IMG_DIR, filename)
    if os.path.exists(out_path):
        print(f"  SKIP (exists): {filename}")
        continue
    try:
        r = requests.get(url, headers=headers, timeout=20)
        if r.status_code == 200 and len(r.content) > 10000:
            with open(out_path, 'wb') as f:
                f.write(r.content)
            print(f"  OK: {filename} ({len(r.content)//1024}KB)")
        else:
            print(f"  FAIL (status={r.status_code}, size={len(r.content)}): {filename}")
    except Exception as e:
        print(f"  ERROR: {filename}: {e}")

print("\nDone. Check ../images/ for downloaded files.")
