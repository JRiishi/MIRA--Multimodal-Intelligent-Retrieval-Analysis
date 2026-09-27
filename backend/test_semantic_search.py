import os
import sys
import json
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.search_service import SearchService, build_searchable_document
from app.schemas.search import SearchRequest


def run_tests():
    print("=" * 65)
    print("MIRA SEMANTIC IMAGE SEARCH TEST SUITE")
    print("=" * 65)

    embed_service = EmbeddingService.get_instance()
    qdrant_service = QdrantService.get_instance()
    search_service = SearchService.get_instance()

    # 1. Populate Sample Evidence Dataset across 3 Domains
    # Domain A: Solar Installation (Mayur Vihar)
    # Domain B: Road Development (Mayur Vihar & Janakpuri)
    # Domain C: Water Cleanup (Yamuna River)
    sample_dataset = [
        # Solar 1
        {
            "asset_id": "asset_solar_001",
            "project_id": "proj_solar_mv",
            "project_name": "Mayur Vihar Solar Rooftop",
            "activity": "solar panel installation",
            "scene": "rooftop residential solar site",
            "objects": ["solar panels", "inverter", "workers", "mounting brackets"],
            "description": "Technicians and workers installing photovoltaic solar panels on residential building rooftops.",
            "project_signals": ["solar power", "clean energy", "photovoltaic"],
            "location_name": "Mayur Vihar, Delhi",
            "latitude": 28.6015,
            "longitude": 77.2995,
            "cloudinary_url": "https://res.cloudinary.com/demo/image/upload/solar_install_1.jpg",
            "timestamp": (datetime.utcnow() - timedelta(days=2)).isoformat(),
        },
        # Solar 2
        {
            "asset_id": "asset_solar_002",
            "project_id": "proj_solar_mv",
            "project_name": "Mayur Vihar Solar Rooftop",
            "activity": "solar battery connection",
            "scene": "electrical room and inverter station",
            "objects": ["lithium battery bank", "inverter", "cables", "multimeter"],
            "description": "Electrician wiring battery storage systems and high capacity inverter units for rooftop solar project.",
            "project_signals": ["battery storage", "solar grid", "inverter"],
            "location_name": "Mayur Vihar, Delhi",
            "latitude": 28.6018,
            "longitude": 77.2990,
            "cloudinary_url": "https://res.cloudinary.com/demo/image/upload/solar_battery_2.jpg",
            "timestamp": (datetime.utcnow() - timedelta(days=5)).isoformat(),
        },
        # Road 1 (Mayur Vihar)
        {
            "asset_id": "asset_road_001",
            "project_id": "proj_road_mv",
            "project_name": "Mayur Vihar Road Development",
            "activity": "asphalt road laying and steam rolling",
            "scene": "urban avenue road resurfacing",
            "objects": ["steam roller", "asphalt paver", "hot mix asphalt", "construction workers"],
            "description": "Heavy steam roller compacting freshly laid hot asphalt layer on Main Avenue with road workers.",
            "project_signals": ["road paving", "asphalt compaction", "highway"],
            "location_name": "Mayur Vihar, Delhi",
            "latitude": 28.6010,
            "longitude": 77.2990,
            "cloudinary_url": "https://res.cloudinary.com/demo/image/upload/road_paving_1.jpg",
            "timestamp": (datetime.utcnow() - timedelta(days=1)).isoformat(),
        },
        # Road 2 (Janakpuri)
        {
            "asset_id": "asset_road_002",
            "project_id": "proj_road_jp",
            "project_name": "Janakpuri Road Development",
            "activity": "road excavation and trenching",
            "scene": "suburban road construction zone",
            "objects": ["yellow excavator", "backhoe loader", "potholes", "gravel"],
            "description": "Heavy yellow excavator digging roadside trenches and removing damaged tarmac for street expansion.",
            "project_signals": ["excavation", "heavy machinery", "road widening"],
            "location_name": "Janakpuri, Delhi",
            "latitude": 28.6210,
            "longitude": 77.0870,
            "cloudinary_url": "https://res.cloudinary.com/demo/image/upload/road_excavator_2.jpg",
            "timestamp": (datetime.utcnow() - timedelta(days=8)).isoformat(),
        },
        # Water 1
        {
            "asset_id": "asset_water_001",
            "project_id": "proj_water_yamuna",
            "project_name": "Yamuna River Clean-up Initiative",
            "activity": "river plastic waste removal",
            "scene": "riverbank ecological remediation",
            "objects": ["trash skimmer boat", "floating booms", "plastic waste", "volunteers"],
            "description": "Volunteers and trash skimmer boat collecting floating plastic debris, bottles, and hyacinth from Yamuna river.",
            "project_signals": ["water cleanup", "plastic pollution", "river remediation"],
            "location_name": "Yamuna Ghat, Delhi",
            "latitude": 28.6650,
            "longitude": 77.2310,
            "cloudinary_url": "https://res.cloudinary.com/demo/image/upload/river_cleanup_1.jpg",
            "timestamp": (datetime.utcnow() - timedelta(days=3)).isoformat(),
        },
        # Water 2
        {
            "asset_id": "asset_water_002",
            "project_id": "proj_water_yamuna",
            "project_name": "Yamuna River Clean-up Initiative",
            "activity": "water quality sensor sampling",
            "scene": "river monitoring station",
            "objects": ["water sampling probe", "test tubes", "pH meter", "researchers"],
            "description": "Environmental scientists measuring dissolved oxygen, turbidity, and water purity near the treatment outlet.",
            "project_signals": ["water quality", "pollution monitoring", "environmental testing"],
            "location_name": "Yamuna Ghat, Delhi",
            "latitude": 28.6660,
            "longitude": 77.2320,
            "cloudinary_url": "https://res.cloudinary.com/demo/image/upload/water_testing_2.jpg",
            "timestamp": (datetime.utcnow() - timedelta(days=12)).isoformat(),
        },
    ]

    print(f"\n[INDEXING] Indexing {len(sample_dataset)} sample multimodal evidence items into Qdrant...")
    for item in sample_dataset:
        doc = build_searchable_document(
            project_name=item["project_name"],
            activity=item["activity"],
            scene=item["scene"],
            objects=item["objects"],
            description=item["description"],
            project_signals=item["project_signals"],
            location_name=item["location_name"]
        )
        vec = embed_service.get_embedding(doc)
        
        payload = {
            "asset_id": item["asset_id"],
            "project_id": item["project_id"],
            "project_name": item["project_name"],
            "activity": item["activity"],
            "scene": item["scene"],
            "objects": item["objects"],
            "description": item["description"],
            "project_signals": item["project_signals"],
            "location_name": item["location_name"],
            "latitude": item["latitude"],
            "longitude": item["longitude"],
            "cloudinary_url": item["cloudinary_url"],
            "timestamp": item["timestamp"],
        }
        qdrant_service.store_evidence(vec, payload, point_id=item["asset_id"])

    print("  -> Indexing completed.")

    # 2. Test Idempotent Upsert (Indexing same item twice should not duplicate)
    print("\n[TEST 1] Testing Idempotency (Upserting asset_solar_001 again)")
    qdrant_service.store_evidence(vec, payload, point_id="asset_water_002")
    res_idempotent = search_service.search(SearchRequest(query="water quality testing probe", top_k=10))
    water_test_ids = [r.asset_id for r in res_idempotent.results if r.asset_id == "asset_water_002"]
    assert len(water_test_ids) == 1, f"Expected 1 point, found {len(water_test_ids)} duplicates!"
    print("  -> PASSED: Point was updated in-place without generating duplicate vectors.")

    # 3. Test Natural Language Queries
    test_queries = [
        ("workers installing solar panels", "asset_solar_001", "Mayur Vihar Solar Rooftop"),
        ("road construction and asphalt paving", "asset_road_001", "Mayur Vihar Road Development"),
        ("people cleaning a river and collecting plastic waste", "asset_water_001", "Yamuna River Clean-up Initiative"),
        ("heavy construction machinery and excavator digging", "asset_road_002", "Janakpuri Road Development"),
        ("water quality testing and pollution sensors", "asset_water_002", "Yamuna River Clean-up Initiative"),
        ("images from Mayur Vihar solar project", "asset_solar_001", "Mayur Vihar Solar Rooftop"),
    ]

    print("\n[TEST 2] Running Natural Language Semantic Queries:")
    for q_text, expected_top_asset, expected_project in test_queries:
        req = SearchRequest(query=q_text, top_k=3)
        res = search_service.search(req)
        print(f"\n  Query: '{q_text}'")
        assert len(res.results) > 0, f"No results for query '{q_text}'"
        top_hit = res.results[0]
        print(f"    Top Match: [{top_hit.project_name}] score={top_hit.score:.4f} | asset={top_hit.asset_id}")
        print(f"    Description: {top_hit.description}")
        assert top_hit.asset_id == expected_top_asset or top_hit.project_name == expected_project, (
            f"Expected {expected_top_asset} ({expected_project}), got {top_hit.asset_id} ({top_hit.project_name})"
        )
        assert top_hit.score > 0.30, f"Similarity score {top_hit.score} too low for clear match"

    print("\n  -> PASSED: All natural language semantic queries accurately retrieved top relevant assets!")

    # 4. Test Query with Project Filtering
    print("\n[TEST 3] Query + Project Filter (Query: 'asphalt paving', Filter: Mayur Vihar Road)")
    req_proj_filter = SearchRequest(
        query="asphalt paving and roller compaction",
        project_id="proj_road_mv",
        top_k=5,
        min_score=0.35
    )
    res_proj = search_service.search(req_proj_filter)
    print(f"  Results returned with project_id='proj_road_mv' (score >= 0.35): {len(res_proj.results)}")
    for r in res_proj.results:
        assert r.project_id == "proj_road_mv", f"Found non-filtered project {r.project_id}"
        assert r.score >= 0.35, f"Score {r.score} is below threshold 0.35"
        print(f"    - {r.project_name} | {r.activity} (score: {r.score:.3f})")
    print("  -> PASSED: Project ID metadata filtering and threshold strictly respected.")

    # 5. Test Query with Location Filtering
    print("\n[TEST 4] Query + Location Filter (Query: 'solar power rooftop', Location: 'Mayur Vihar, Delhi')")
    req_loc_filter = SearchRequest(
        query="solar power rooftop panels",
        location="Mayur Vihar, Delhi",
        top_k=5,
        min_score=0.35
    )
    res_loc = search_service.search(req_loc_filter)
    print(f"  Results returned with location='Mayur Vihar, Delhi' (score >= 0.35): {len(res_loc.results)}")
    for r in res_loc.results:
        assert r.location == "Mayur Vihar, Delhi"
        assert r.score >= 0.35, f"Score {r.score} is below threshold 0.35"
        print(f"    - [{r.location}] {r.project_name}: {r.description[:50]}... (score: {r.score:.3f})")
    print("  -> PASSED: Location metadata filtering strictly enforced.")

    # 6. Test Query with Date Filtering
    print("\n[TEST 5] Query + Date Range Filter (Date from 3 days ago)")
    three_days_ago = (datetime.utcnow() - timedelta(days=3)).isoformat()
    req_date = SearchRequest(
        query="solar panel installation",
        date_from=three_days_ago,
        top_k=5,
        min_score=0.35
    )
    res_date = search_service.search(req_date)
    print(f"  Results within last 3 days (score >= 0.35): {len(res_date.results)}")
    for r in res_date.results:
        assert r.timestamp >= three_days_ago
        assert r.score >= 0.35, f"Score {r.score} is below threshold 0.35"
        print(f"    - {r.timestamp} | {r.project_name} | {r.activity} (score: {r.score:.3f})")
    print("  -> PASSED: Date filtering and threshold successfully applied.")

    # 7. Test Strict 0.35 Threshold Enforcement
    print("\n[TEST 6] Strict 0.35 Threshold Filtering Verification")
    # A completely unrelated query like "astronaut on mars" should return 0 results
    unrelated_req = SearchRequest(query="astronaut walking on mars space exploration", min_score=0.35)
    unrelated_res = search_service.search(unrelated_req)
    print(f"  Unrelated query returned {len(unrelated_res.results)} results (expected 0).")
    assert len(unrelated_res.results) == 0, f"Expected 0 results for unrelated query, got {len(unrelated_res.results)}"
    
    # Check all results across standard queries strictly have score >= 0.35
    standard_req = SearchRequest(query="workers installing solar panels", min_score=0.35)
    standard_res = search_service.search(standard_req)
    for r in standard_res.results:
        assert r.score >= 0.35, f"Result {r.asset_id} has score {r.score} < 0.35"
        print(f"    Valid hit: asset={r.asset_id} | score={r.score:.4f} >= 0.35")
    print("  -> PASSED: 0.35 score threshold strictly enforced across all responses.")

    print("\n" + "=" * 65)
    print("ALL SEMANTIC SEARCH TESTS PASSED!")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()

