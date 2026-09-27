import os
import sys
import io
import json
from PIL import Image
import piexif

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.location_service import LocationService
from app.services.project_router import ProjectRouter
from app.schemas.routing import RoutingStatus


class MockProject:
    def __init__(self, id, name, description, tags, latitude=None, longitude=None, location_name=None):
        self.id = id
        self.name = name
        self.description = description
        self.tags = tags
        self.latitude = latitude
        self.longitude = longitude
        self.location_name = location_name


def create_image_with_gps(lat: float, lon: float) -> bytes:
    """Create a simple in-memory JPEG with EXIF GPS tags."""
    img = Image.new("RGB", (100, 100), color=(73, 109, 137))
    
    def decdeg2dms(dd):
        is_positive = dd >= 0
        dd = abs(dd)
        minutes, seconds = divmod(dd * 3600, 60)
        degrees, minutes = divmod(minutes, 60)
        degrees = degrees if is_positive else -degrees
        return (int(degrees), 1), (int(minutes), 1), (int(seconds * 100), 100)

    lat_dms = decdeg2dms(lat)
    lon_dms = decdeg2dms(lon)
    lat_ref = "N" if lat >= 0 else "S"
    lon_ref = "E" if lon >= 0 else "W"

    gps_ifd = {
        piexif.GPSIFD.GPSLatitudeRef: lat_ref,
        piexif.GPSIFD.GPSLatitude: lat_dms,
        piexif.GPSIFD.GPSLongitudeRef: lon_ref,
        piexif.GPSIFD.GPSLongitude: lon_dms,
    }
    exif_dict = {"GPS": gps_ifd}
    exif_bytes = piexif.dump(exif_dict)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif_bytes)
    return buf.getvalue()


def run_tests():
    print("=" * 60)
    print("MIRA GEO-TAGGED PROJECT ROUTING TEST SUITE")
    print("=" * 60)

    # 1. Test Distance Calculation
    # Mayur Vihar: 28.601, 77.299
    # Janakpuri: 28.621, 77.087
    dist = LocationService.calculate_distance(28.601, 77.299, 28.621, 77.087)
    print(f"\n[TEST 1] Haversine Distance (Mayur Vihar <-> Janakpuri): {dist:.2f} km")
    assert 20.0 < dist < 22.0, f"Expected distance ~20.7km, got {dist}"
    print("  -> PASSED (Distance is ~20.7 km, which exceeds default 15 km radius)")

    # 2. Test EXIF GPS Extraction
    print("\n[TEST 2] EXIF GPS Injection & Extraction")
    img_bytes = create_image_with_gps(28.6010, 77.2990)
    ext_lat, ext_lon, source = LocationService.extract_exif_gps(img_bytes)
    print(f"  Extracted GPS: lat={ext_lat}, lon={ext_lon}, source={source}")
    assert ext_lat is not None and abs(ext_lat - 28.6010) < 0.001
    assert ext_lon is not None and abs(ext_lon - 77.2990) < 0.001
    assert source == "EXIF"
    print("  -> PASSED (EXIF GPS correctly parsed into decimal coordinates)")

    # Define Candidate Projects
    proj_mayur_vihar = MockProject(
        id="proj_mv_001",
        name="Mayur Vihar Road Development",
        description="Road widening, asphalt laying, and pothole repair across Mayur Vihar Phase 1 and 2.",
        tags=["road", "asphalt", "paving", "mayur vihar"],
        latitude=28.6010,
        longitude=77.2990,
        location_name="Mayur Vihar, Delhi"
    )

    proj_janakpuri = MockProject(
        id="proj_jp_002",
        name="Janakpuri Road Development",
        description="Pothole fixing, resurfacing, and asphalt work on Janakpuri main district avenues.",
        tags=["road", "asphalt", "paving", "janakpuri"],
        latitude=28.6210,
        longitude=77.0870,
        location_name="Janakpuri, Delhi"
    )

    proj_general_bridge = MockProject(
        id="proj_br_003",
        name="Metro Bridge Construction",
        description="Elevated metro bridge pillar installation and structural reinforcement.",
        tags=["bridge", "metro", "concrete", "pillars"],
        latitude=None,
        longitude=None,
        location_name=None
    )

    candidate_projects = [proj_mayur_vihar, proj_janakpuri, proj_general_bridge]

    # Visual Evidence: Moondream output of road construction
    road_evidence = {
        "description": "Road construction scene with workers laying hot mix asphalt and heavy steam roller paving the street.",
        "activity": "asphalt road laying and paving",
        "scene": "outdoor urban road construction",
        "objects": ["road roller", "asphalt", "paving equipment", "construction workers"],
        "project_signals": ["road paving", "asphalt layer"]
    }

    # 3. Test Routing with Mayur Vihar GPS (28.601, 77.299)
    print("\n[TEST 3] Routing with Mayur Vihar GPS (lat=28.601, lon=77.299)")
    res_mv = ProjectRouter.route_evidence(
        asset_id="asset_mv_test",
        evidence_data=road_evidence,
        candidate_projects=candidate_projects,
        image_lat=28.6010,
        image_lon=77.2990,
        location_source="EXIF"
    )
    print(f"  Result: status={res_mv.status}, selected={res_mv.selected_project_id}, conf={res_mv.confidence:.3f}")
    print(f"  Reason: {res_mv.reason}")
    print(f"  Distance: {res_mv.distance_km} km, Location Used: {res_mv.location_used}")
    assert res_mv.selected_project_id == "proj_mv_001", f"Expected Mayur Vihar project, got {res_mv.selected_project_id}"
    assert res_mv.location_used is True
    print("  -> PASSED: Successfully routed to Mayur Vihar Road Development (Janakpuri excluded by >15km geo-filter)")

    # 4. Test Routing with Janakpuri GPS (28.621, 77.087)
    print("\n[TEST 4] Routing with Janakpuri GPS (lat=28.621, lon=77.087)")
    res_jp = ProjectRouter.route_evidence(
        asset_id="asset_jp_test",
        evidence_data=road_evidence,
        candidate_projects=candidate_projects,
        image_lat=28.6210,
        image_lon=77.0870,
        location_source="EXIF"
    )
    print(f"  Result: status={res_jp.status}, selected={res_jp.selected_project_id}, conf={res_jp.confidence:.3f}")
    print(f"  Reason: {res_jp.reason}")
    print(f"  Distance: {res_jp.distance_km} km, Location Used: {res_jp.location_used}")
    assert res_jp.selected_project_id == "proj_jp_002", f"Expected Janakpuri project, got {res_jp.selected_project_id}"
    assert res_jp.location_used is True
    print("  -> PASSED: Successfully routed to Janakpuri Road Development (Mayur Vihar excluded by >15km geo-filter)")

    # 5. Test Routing with Out-of-Range GPS (Mumbai lat=19.076, lon=72.877)
    print("\n[TEST 5] Routing with Mumbai GPS (lat=19.076, lon=72.877) - only Delhi geo-projects exist")
    # Only test with geo-pinned projects
    res_mumbai = ProjectRouter.route_evidence(
        asset_id="asset_mumbai_test",
        evidence_data=road_evidence,
        candidate_projects=[proj_mayur_vihar, proj_janakpuri],
        image_lat=19.0760,
        image_lon=72.8777,
        location_source="EXIF"
    )
    print(f"  Result: status={res_mumbai.status}, selected={res_mumbai.selected_project_id}")
    print(f"  Reason: {res_mumbai.reason}")
    assert res_mumbai.status == RoutingStatus.UNASSIGNED
    assert res_mumbai.selected_project_id is None
    print("  -> PASSED: Successfully marked UNASSIGNED when no projects exist within 15km")

    # 6. Test Routing without GPS (Fallback to Semantic Matching)
    print("\n[TEST 6] Routing without GPS (None, None)")
    res_nogps = ProjectRouter.route_evidence(
        asset_id="asset_nogps_test",
        evidence_data=road_evidence,
        candidate_projects=candidate_projects,
        image_lat=None,
        image_lon=None,
        location_source="NONE"
    )
    print(f"  Result: status={res_nogps.status}, selected={res_nogps.selected_project_id}, conf={res_nogps.confidence:.3f}")
    print(f"  Reason: {res_nogps.reason}")
    print(f"  Location Used: {res_nogps.location_used}")
    assert res_nogps.status in (RoutingStatus.ASSIGNED, RoutingStatus.NEEDS_REVIEW)
    assert res_nogps.location_used is False
    print("  -> PASSED: Seamless fallback to semantic routing across all candidate projects")

    # 7. Test Scalability: 200 Total Projects with 3 Co-located Projects in Mayur Vihar
    print("\n[TEST 7] Scalability Test: 200 Total Projects, 3 Co-located in Mayur Vihar")
    
    # 3 Projects in Mayur Vihar
    mv_road = MockProject("p_mv_road", "Mayur Vihar Road Development", "Road paving and asphalt repair", ["road"], 28.6010, 77.2990, "Mayur Vihar")
    mv_solar = MockProject("p_mv_solar", "Mayur Vihar Solar Rooftop", "Solar PV panel installation on roofs", ["solar"], 28.6015, 77.2995, "Mayur Vihar")
    mv_water = MockProject("p_mv_water", "Mayur Vihar Water Pipeline", "Clean water pipe laying and drain maintenance", ["water"], 28.6020, 77.2980, "Mayur Vihar")
    
    # 197 Projects in other distant cities (Mumbai, Bangalore, etc.)
    distant_projects = []
    for i in range(197):
        distant_projects.append(
            MockProject(
                id=f"p_dist_{i}",
                name=f"Distant Project {i}",
                description=f"Infrastructure project in distant region {i}",
                tags=["infrastructure"],
                latitude=19.0760 + (i * 0.01),  # Mumbai region
                longitude=72.8777 + (i * 0.01),
                location_name=f"Region {i}"
            )
        )
    
    all_200_projects = [mv_road, mv_solar, mv_water] + distant_projects
    assert len(all_200_projects) == 200

    # Test image 1: Road photo at Mayur Vihar GPS -> Must choose Mayur Vihar Road (NOT distant projects, NOT solar/water)
    res_scale_road = ProjectRouter.route_evidence(
        asset_id="asset_scale_road",
        evidence_data=road_evidence,
        candidate_projects=all_200_projects,
        image_lat=28.6010,
        image_lon=77.2990,
        location_source="EXIF"
    )
    print(f"  Road Photo Result: status={res_scale_road.status}, selected={res_scale_road.selected_project_id}, conf={res_scale_road.confidence:.3f}")
    assert res_scale_road.selected_project_id == "p_mv_road", f"Expected Mayur Vihar Road, got {res_scale_road.selected_project_id}"
    print("  -> PASSED: Out of 200 projects, Laya was given only the 3 Mayur Vihar candidates and picked Mayur Vihar Road!")

    # Test image 2: Solar photo at Mayur Vihar GPS -> Must choose Mayur Vihar Solar
    solar_evidence = {
        "description": "Installation of photovoltaic solar panels on residential rooftops with wiring and inverters.",
        "activity": "solar panel installation",
        "scene": "rooftop renewable energy setup",
        "objects": ["solar panels", "inverter", "mounting brackets"],
        "project_signals": ["photovoltaic", "solar power"]
    }
    res_scale_solar = ProjectRouter.route_evidence(
        asset_id="asset_scale_solar",
        evidence_data=solar_evidence,
        candidate_projects=all_200_projects,
        image_lat=28.6010,
        image_lon=77.2990,
        location_source="EXIF"
    )
    print(f"  Solar Photo Result: status={res_scale_solar.status}, selected={res_scale_solar.selected_project_id}, conf={res_scale_solar.confidence:.3f}")
    assert res_scale_solar.selected_project_id == "p_mv_solar", f"Expected Mayur Vihar Solar, got {res_scale_solar.selected_project_id}"
    print("  -> PASSED: Out of 200 projects, Laya accurately picked Mayur Vihar Solar for solar evidence at that location!")

    print("\n" + "=" * 60)
    print("ALL GEO-TAGGED PROJECT ROUTING TESTS PASSED!")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()

