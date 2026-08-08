"""
tools_geo.py
────────────
These tools don't touch Firestore — they emit a small "action" payload
that the frontend map (MapConnect.jsx) already knows how to consume
(the same 4 actions that lived in the original tools_registry.py /
router.py). The Geo Agent's job is to decide *which* action fits the
officer's question; the actual map rendering stays entirely on the
frontend, same as before.
"""

from langchain_core.tools import tool
from services import firebase_service as fb


@tool
def show_hotspots(district: str, crime_type: str = "all") -> dict:
    """Return a map action that highlights crime hotspots for a
    district, optionally filtered to one crime type."""
    return {"action": "showHotspots", "district": district, "crime": crime_type}


@tool
def show_crime_trend(district: str, crime_type: str = "all") -> dict:
    """Return a map action that plots the crime trend over time for a
    district."""
    return {"action": "showCrimeTrend", "district": district, "crime": crime_type}


@tool
def compare_districts(district_a: str, district_b: str, crime_type: str = "all") -> dict:
    """Return a map action that compares crime statistics between two
    districts."""
    return {"action": "compareDistricts", "districtA": district_a, "districtB": district_b, "crime": crime_type}


@tool
def zoom_district(district: str) -> dict:
    """Return a map action that zooms the Karnataka map to one
    district."""
    return {"action": "zoomDistrict", "district": district}


@tool
def open_map(district: str = "") -> dict:
    """Open the crime map page. Use this for a plain 'open the map' /
    'show me the map' request with no specific district or hotspot in
    mind. If the officer did name a district, pass it so the map opens
    already focused there instead of the default state-wide view."""
    return {"action": "openMap", "district": district or None}


@tool
def geo_cluster_summary(crime_type: str) -> dict:
    """Summarise which districts currently have the most reported cases
    of a given crime type, based on live Firestore data — useful before
    calling show_hotspots so the Geo Agent picks the right district."""
    records = fb.query_by_crime_type(crime_type)
    counts: dict[str, int] = {}
    for r in records:
        d = r.get("district", "Unknown")
        counts[d] = counts.get(d, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    return {"crime_type": crime_type, "district_counts": ranked}


GEO_TOOLS = [show_hotspots, show_crime_trend, compare_districts, zoom_district, open_map, geo_cluster_summary]