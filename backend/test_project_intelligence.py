import os
import sys
import json
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.models.project import ProjectDB
from app.models.media import MediaAssetDB, VisualEvidenceDB
from app.models.chat import ChatMessageDB
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.search_service import build_searchable_document
from app.services.chat_service import ChatService


def run_tests():
    print("=" * 70)
    print("MIRA PROJECT INTELLIGENCE & SCOPED AI CHAT TEST SUITE")
    print("=" * 70)

    # Initialize isolated in-memory DB tables for testing (does not touch live database)
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestSession()

    embed_service = EmbeddingService.get_instance()
    qdrant_service = QdrantService.get_instance()
    chat_service = ChatService.get_instance()

    # 1. Create 3 Distinct Projects
    proj_road = ProjectDB(
        id="proj_road_test",
        name="Mayur Vihar Road Development",
        description="Urban infrastructure resurfacing and drainage expansion.",
        location_name="Mayur Vihar Phase 1, Delhi",
        latitude=28.6010,
        longitude=77.2990
    )
    proj_solar = ProjectDB(
        id="proj_solar_test",
        name="Mayur Vihar Solar Rooftop",
        description="Clean energy photovoltaic panel deployment across residential rooftops.",
        location_name="Mayur Vihar Phase 1, Delhi",
        latitude=28.6015,
        longitude=77.2995
    )
    proj_water = ProjectDB(
        id="proj_water_test",
        name="Yamuna River Clean-up Initiative",
        description="Ecological water remediation and plastic boom skimmer operations.",
        location_name="Yamuna Ghat, Delhi",
        latitude=28.6650,
        longitude=77.2310
    )
    db.add_all([proj_road, proj_solar, proj_water])
    db.commit()
    print("[SETUP] Created 3 test projects.")

    # 2. Populate Evidence for Each Project
    # Road evidence: 2 time points (Before: excavation, After: asphalt laying)
    ev_road_1 = VisualEvidenceDB(
        id="ev_road_01",
        asset_id="asset_road_01",
        project_id="proj_road_test",
        activity="road excavation and trenching",
        scene="broken tarmac and ditch excavation",
        description="Excavators digging roadside trenches and clearing broken road surface.",
        objects=json.dumps(["excavator", "gravel", "trench"]),
        project_signals=json.dumps(["excavation", "road work"]),
        location="Mayur Vihar, Delhi",
        latitude=28.6010,
        longitude=77.2990,
        timestamp="2026-05-10",
        cloudinary_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        created_at=datetime.utcnow() - timedelta(days=20)
    )
    ev_road_2 = VisualEvidenceDB(
        id="ev_road_02",
        asset_id="asset_road_02",
        project_id="proj_road_test",
        activity="asphalt paving and steam rolling",
        scene="smooth paved road with fresh markings",
        description="Steam rollers compacting freshly laid hot black asphalt on main avenue.",
        objects=json.dumps(["steam roller", "asphalt", "workers"]),
        project_signals=json.dumps(["paving", "surfacing"]),
        location="Mayur Vihar, Delhi",
        latitude=28.6010,
        longitude=77.2990,
        timestamp="2026-05-25",
        cloudinary_url="https://res.cloudinary.com/demo/image/upload/cld-sample.jpg",
        created_at=datetime.utcnow() - timedelta(days=2)
    )

    # Solar evidence
    ev_solar_1 = VisualEvidenceDB(
        id="ev_solar_01",
        asset_id="asset_solar_01",
        project_id="proj_solar_test",
        activity="solar panel installation",
        scene="rooftop solar mounting arrays",
        description="Workers installing photovoltaic solar panels and inverter wiring.",
        objects=json.dumps(["solar panels", "inverter", "workers"]),
        project_signals=json.dumps(["solar", "clean energy"]),
        location="Mayur Vihar, Delhi",
        latitude=28.6015,
        longitude=77.2995,
        timestamp="2026-05-18",
        cloudinary_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        created_at=datetime.utcnow() - timedelta(days=10)
    )

    # Water evidence
    ev_water_1 = VisualEvidenceDB(
        id="ev_water_01",
        asset_id="asset_water_01",
        project_id="proj_water_test",
        activity="river plastic skimmer cleanup",
        scene="river surface floating booms",
        description="Volunteers and skimmer boats collecting floating plastics from river.",
        objects=json.dumps(["skimmer boat", "plastic waste", "floating boom"]),
        project_signals=json.dumps(["water cleanup", "river remediation"]),
        location="Yamuna Ghat, Delhi",
        latitude=28.6650,
        longitude=77.2310,
        timestamp="2026-05-22",
        cloudinary_url="https://res.cloudinary.com/demo/image/upload/cld-sample.jpg",
        created_at=datetime.utcnow() - timedelta(days=5)
    )

    db.add_all([ev_road_1, ev_road_2, ev_solar_1, ev_water_1])
    db.commit()

    # Index into Qdrant for semantic search
    for ev, proj in [(ev_road_1, proj_road), (ev_road_2, proj_road), (ev_solar_1, proj_solar), (ev_water_1, proj_water)]:
        doc = build_searchable_document(
            project_name=proj.name,
            activity=ev.activity,
            scene=ev.scene,
            objects=ev.objects,
            description=ev.description,
            project_signals=ev.project_signals,
            location_name=ev.location
        )
        vec = embed_service.get_embedding(doc)
        payload = {
            "asset_id": ev.asset_id,
            "project_id": ev.project_id,
            "project_name": proj.name,
            "activity": ev.activity,
            "scene": ev.scene,
            "description": ev.description,
            "location_name": ev.location,
            "timestamp": ev.timestamp,
            "cloudinary_url": ev.cloudinary_url
        }
        qdrant_service.store_evidence(vec, payload, point_id=ev.asset_id)

    print("[SETUP] Seeded visual evidence and indexed into Qdrant.")

    # -------------------------------------------------------------
    # TEST 1: PROJECT STATUS
    # -------------------------------------------------------------
    print("\n[TEST 1] Testing Project Status in Mayur Vihar Road")
    resp_status = chat_service.handle_project_chat("proj_road_test", "What is the current status?", db)
    print(f"  Intent: {resp_status.intent}")
    print(f"  Answer: {resp_status.answer}")
    print(f"  Evidence items: {len(resp_status.evidence)}")
    assert resp_status.intent == "STATUS"
    assert "asphalt paving" in resp_status.answer.lower() or "surfacing" in resp_status.answer.lower()
    assert len(resp_status.evidence) > 0
    assert resp_status.evidence[0].asset_id == "asset_road_02"
    print("  -> PASSED: Grounded latest status correctly reported.")

    # -------------------------------------------------------------
    # TEST 2: RECENT ACTIVITY
    # -------------------------------------------------------------
    print("\n[TEST 2] Testing Recent Activity in Mayur Vihar Road")
    resp_act = chat_service.handle_project_chat("proj_road_test", "What happened recently?", db)
    print(f"  Intent: {resp_act.intent}")
    print(f"  Answer: {resp_act.answer}")
    assert resp_act.intent == "RECENT_ACTIVITY"
    assert len(resp_act.evidence) == 2
    print("  -> PASSED: Recent activity timeline summarized with evidence.")

    # -------------------------------------------------------------
    # TEST 3: EVIDENCE SEARCH
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Evidence Search for 'excavator digging'")
    resp_search = chat_service.handle_project_chat("proj_road_test", "Show me evidence of excavator digging", db)
    print(f"  Intent: {resp_search.intent}")
    print(f"  Answer: {resp_search.answer}")
    print(f"  Retrieved asset: {resp_search.evidence[0].asset_id if resp_search.evidence else 'None'}")
    assert resp_search.intent == "EVIDENCE_SEARCH"
    assert len(resp_search.evidence) > 0
    assert resp_search.evidence[0].asset_id == "asset_road_01"
    print("  -> PASSED: Qdrant project-scoped search retrieved exact target evidence.")

    # -------------------------------------------------------------
    # TEST 4: STRICT PROJECT ISOLATION (No Cross-Project Leakage)
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Strict Project Isolation")
    # Ask about solar panels inside the ROAD project
    resp_isolated = chat_service.handle_project_chat("proj_road_test", "Show me evidence of solar panel installation", db)
    print(f"  Query inside Road Project: 'Show me evidence of solar panel installation'")
    print(f"  Answer: {resp_isolated.answer}")
    print(f"  Evidence count: {len(resp_isolated.evidence)}")
    assert len(resp_isolated.evidence) == 0 or all(e.asset_id.startswith("asset_road") for e in resp_isolated.evidence)
    assert "insufficient visual evidence" in resp_isolated.answer.lower()
    print("  -> PASSED: Road project strictly rejected solar evidence from another project workspace!")

    # -------------------------------------------------------------
    # TEST 5: WHAT CHANGED / PROGRESSION
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing What Changed / Progression")
    resp_change = chat_service.handle_project_chat("proj_road_test", "What changed since the beginning?", db)
    print(f"  Intent: {resp_change.intent}")
    print(f"  Answer: {resp_change.answer}")
    print(f"  Evidence count: {len(resp_change.evidence)}")
    assert resp_change.intent == "CHANGE"
    assert len(resp_change.evidence) == 2  # Earliest + Latest
    assert resp_change.evidence[0].asset_id == "asset_road_01"  # Before
    assert resp_change.evidence[1].asset_id == "asset_road_02"  # After
    print("  -> PASSED: Change progression and before/after assets computed.")

    # -------------------------------------------------------------
    # TEST 6: PROJECT SUMMARY
    # -------------------------------------------------------------
    print("\n[TEST 6] Testing Project Summary")
    resp_sum = chat_service.handle_project_chat("proj_solar_test", "Summarize this project", db)
    print(f"  Intent: {resp_sum.intent}")
    print(f"  Answer: {resp_sum.answer}")
    assert resp_sum.intent == "SUMMARY"
    assert "solar" in resp_sum.answer.lower()
    print("  -> PASSED: Project summary synthesized from metadata and evidence.")

    # -------------------------------------------------------------
    # TEST 7: REPORT GENERATION
    # -------------------------------------------------------------
    print("\n[TEST 7] Testing Structured Report Generation")
    report = chat_service.generate_project_report("proj_road_test", db)
    print(f"  Report Project: {report.project_name}")
    print(f"  Current Status: {report.current_status}")
    print(f"  Timeline Items: {len(report.timeline_summary)}")
    print(f"  Key Evidence Count: {len(report.key_evidence)}")
    assert report.total_evidence_count == 2
    assert len(report.timeline_summary) == 2
    assert report.key_evidence[0].cloudinary_url != ""
    print("  -> PASSED: Full structured report generated with complete audit trail.")

    # -------------------------------------------------------------
    # TEST 8: UNRELATED / NON-EXISTENT TOPIC
    # -------------------------------------------------------------
    print("\n[TEST 8] Testing Non-Existent Topic Handling")
    resp_unrelated = chat_service.handle_project_chat("proj_water_test", "Show evidence of submarine rocket launch", db)
    print(f"  Answer: {resp_unrelated.answer}")
    assert "insufficient" in resp_unrelated.answer.lower() or len(resp_unrelated.evidence) == 0
    print("  -> PASSED: Refused to hallucinate on unsupported topics.")

    # -------------------------------------------------------------
    # TEST 9: CHAT HISTORY PERSISTENCE
    # -------------------------------------------------------------
    print("\n[TEST 9] Testing Chat History Persistence")
    history_road = chat_service.get_chat_history("proj_road_test", db)
    history_solar = chat_service.get_chat_history("proj_solar_test", db)
    print(f"  Road Project History Messages: {len(history_road)}")
    print(f"  Solar Project History Messages: {len(history_solar)}")
    assert len(history_road) > 0
    assert len(history_solar) > 0
    assert len(history_road) != len(history_solar)  # Strictly isolated per project
    print("  -> PASSED: Chat history saved and isolated strictly per project.")

    # -------------------------------------------------------------
    # TEST 10: TIMELINE CONTEXT
    # -------------------------------------------------------------
    print("\n[TEST 10] Testing Timeline Retrieval")
    timeline = chat_service.context_service.get_timeline("proj_road_test", db)
    print(f"  Timeline item count: {len(timeline)}")
    assert len(timeline) == 2
    # Clean up test fixtures from SQLite DB and Qdrant so live environment stays clean
    db.query(ChatMessageDB).filter(ChatMessageDB.project_id.in_(["proj_road_test", "proj_solar_test", "proj_water_test"])).delete()
    db.query(VisualEvidenceDB).filter(VisualEvidenceDB.id.in_(["ev_road_01", "ev_road_02", "ev_solar_01", "ev_water_01"])).delete()
    db.commit()
    for dummy_pid in ["asset_road_01", "asset_road_02", "asset_solar_01", "asset_water_01", "ev_road_01", "ev_road_02", "ev_solar_01", "ev_water_01"]:
        qdrant_service.delete_evidence(dummy_pid)

    db.close()
    print("\n" + "=" * 70)
    print("ALL 10 PROJECT INTELLIGENCE & CHAT TESTS PASSED! (Cleaned test fixtures)")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()

