import sys
sys.path.insert(0, './backend')
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

print("=== 1. Testing /media/ Assets ===")
res = client.get("/media/")
print("Status:", res.status_code)
assets = res.json()
print("Asset count:", len(assets))

if assets:
    first_id = assets[0]["id"]
    print(f"\n=== 2. Testing /media/{first_id}/transformations ===")
    t_res = client.get(f"/media/{first_id}/transformations")
    print("Status:", t_res.status_code)
    t_data = t_res.json()
    print("Keys:", list(t_data.keys()))
    print("Optimized Delivery URL (f_auto, q_auto):", t_data.get("optimized_url"))
    print("Verified Badge Overlay URL (GPS & Provenance):", t_data.get("verified_badge_url"))
    print("Campaign Aspects:", t_data.get("campaign_aspects"))

print("\n=== 3. Testing /media/upload/signature ===")
sig_res = client.get("/media/upload/signature")
print("Status:", sig_res.status_code)
print("Signature payload:", sig_res.json())

print("\n=== 4. Testing Hybrid Search (Cloudinary + Qdrant) ===")
search_res = client.post("/search/", json={"query": "solar panel installation", "use_cloudinary_hybrid": True, "top_k": 5})
print("Status:", search_res.status_code)
s_data = search_res.json()
print("Hybrid Mode:", s_data.get("hybrid_mode"))
print("Results count:", len(s_data.get("results", [])))
for idx, item in enumerate(s_data.get("results", [])[:3]):
    print(f"Hit {idx+1}: {item.get('project_name')} | Score: {item.get('score')} | Source: {item.get('search_source')} | Desc: {item.get('description')[:50]}")

print("\n=== 5. Testing Metadata Sync ===")
sync_res = client.post("/media/sync-all-metadata")
print("Status:", sync_res.status_code)
print("Sync result:", sync_res.json())

print("\n=== ALL CLOUDINARY INTEGRATION TESTS COMPLETED SUCCESSFULLY ===")
