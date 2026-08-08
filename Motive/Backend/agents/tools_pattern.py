"""
tools_pattern.py
─────────────────
Lightweight, explainable pattern-finding over the case pool the Records
Agent retrieved. Deliberately simple (pandas groupby / frequency counts,
not a black-box model) so the Pattern Agent can cite exactly *why* it
flagged a link — that citation is what the human reviewer checks before
approving a report.
"""

from collections import Counter
from datetime import datetime
import pandas as pd
from langchain_core.tools import tool
from services import firebase_service as fb


def _to_df(records: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(records)
    if "date" in df.columns:
        df["date_parsed"] = pd.to_datetime(df["date"], errors="coerce")
    return df


@tool
def find_temporal_patterns(district: str, crime_type: str) -> dict:
    """Look for a time-of-day / day-of-week pattern across cases of one
    crime type in one district — e.g. repeated night-time chain
    snatchings on weekends. Returns counts, not conclusions."""
    records = [
        r for r in fb.query_by_district(district)
        if r.get("crime_type", "").lower() == crime_type.lower()
    ]
    if not records:
        return {"district": district, "crime_type": crime_type, "note": "No matching cases on file."}
    df = _to_df(records)
    if "date_parsed" not in df or df["date_parsed"].isna().all():
        return {"district": district, "crime_type": crime_type, "note": "No usable dates on file."}
    df = df.dropna(subset=["date_parsed"])
    by_weekday = df["date_parsed"].dt.day_name().value_counts().to_dict()
    by_hour = df["date_parsed"].dt.hour.value_counts().sort_index().to_dict()
    return {
        "district": district,
        "crime_type": crime_type,
        "sample_size": len(df),
        "by_weekday": by_weekday,
        "by_hour": by_hour,
    }


@tool
def find_geo_clusters(crime_type: str) -> dict:
    """Find which districts/taluks show a cluster of the same crime type
    — a rising count in a small area is a common early signal of an
    organised or repeat-offender pattern."""
    records = fb.query_by_crime_type(crime_type)
    if not records:
        return {"crime_type": crime_type, "note": "No matching cases on file."}
    taluk_counts = Counter(r.get("taluk", "Unknown") for r in records)
    return {
        "crime_type": crime_type,
        "sample_size": len(records),
        "top_clusters": taluk_counts.most_common(5),
    }


@tool
def find_modus_operandi_matches(case_id: str) -> dict:
    """Compare one case's description against other open cases of the
    same crime_type and surface the ones that share notable keywords
    (weapon, vehicle type, suspect description) — candidate linked
    cases for the officer to review, not a confirmed match."""
    case = fb.get_crime_record(case_id)
    if not case:
        return {"error": f"No case found with id {case_id}"}

    candidates = fb.query_by_crime_type(case.get("crime_type", ""))
    base_words = set(str(case.get("description", "")).lower().split())
    matches = []
    for c in candidates:
        if c.get("id") == case_id or c.get("case_id") == case_id:
            continue
        words = set(str(c.get("description", "")).lower().split())
        overlap = base_words & words
        # ignore very common short words so the overlap is meaningful
        overlap = {w for w in overlap if len(w) > 3}
        if len(overlap) >= 2:
            matches.append({
                "case_id": c.get("case_id") or c.get("id"),
                "shared_keywords": sorted(overlap),
                "district": c.get("district"),
                "date": c.get("date"),
            })
    matches.sort(key=lambda m: len(m["shared_keywords"]), reverse=True)
    return {"base_case_id": case_id, "candidate_links": matches[:10]}


PATTERN_TOOLS = [find_temporal_patterns, find_geo_clusters, find_modus_operandi_matches]
