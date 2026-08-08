"""
firebase_service.py
────────────────────
All Firestore reads/writes go through this module — REST routes call it
directly, and the LangChain tools in agents/tools_db.py wrap these same
functions so the agents and the human-facing API never drift out of sync.

Firestore layout
-----------------
crimes/{crimeId}
    case_id, district, taluk, crime_type, description, status,
    date (ISO string), location {lat, lng}, reported_by, created_at

crimes/{crimeId}/evidence/{evidenceId}
    kind ("image" | "document" | "note"), summary, extracted_entities,
    created_at

case_reports/{case_id}
    report_text, patterns, linked_case_ids, status
    ("draft" | "approved" | "rejected"), created_at, reviewed_by, reviewed_at
"""

from datetime import datetime, timezone
from google.cloud.firestore_v1 import FieldFilter
from config import get_db

CRIMES = "crimes"
REPORTS = "case_reports"


def _now():
    return datetime.now(timezone.utc).isoformat()


# ── Crime records ────────────────────────────────────────────────────────
def add_crime_record(record: dict) -> dict:
    db = get_db()
    record = dict(record)
    record.setdefault("status", "open")
    record["created_at"] = _now()
    case_id = record.get("case_id")

    if case_id:
     ref = db.collection(CRIMES).document(case_id)
    else:
     ref = db.collection(CRIMES).document()
    ref.set(record)
    return {"id": ref.id, **record}


def get_crime_record(case_id: str) -> dict | None:
    db = get_db()
    doc = db.collection(CRIMES).document(case_id).get()
    return doc.to_dict() | {"id": doc.id} if doc.exists else None


def list_recent_crimes(limit: int = 50) -> list[dict]:
    db = get_db()
    docs = (
        db.collection(CRIMES)
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]


def query_by_district(district: str, limit: int = 25) -> list[dict]:
    db = get_db()
    docs = (
        db.collection(CRIMES)
        .where(filter=FieldFilter("district", "==", district))
        .limit(limit)
        .stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]


def query_by_crime_type(crime_type: str, limit: int = 25) -> list[dict]:
    db = get_db()
    docs = (
        db.collection(CRIMES)
        .where(filter=FieldFilter("crime_type", "==", crime_type))
        .limit(limit)
        .stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]


def search_by_keyword(keyword: str, limit: int = 100) -> list[dict]:
    """Firestore has no full-text search, so pull a bounded window of recent
    records and filter client-side. Fine at hackathon/demo data volumes;
    swap for Algolia/typesense-backed search if the dataset grows."""
    keyword = keyword.lower().strip()
    docs = list_recent_crimes(limit=limit)
    return [
        d for d in docs
        if keyword in json_blob(d)
    ]


def json_blob(d: dict) -> str:
    return " ".join(str(v).lower() for v in d.values())


# ── Evidence sub-collection ─────────────────────────────────────────────
def add_evidence(case_id: str, kind: str, summary: str, entities: dict) -> dict:
    db = get_db()
    ref = db.collection(CRIMES).document(case_id).collection("evidence").document()
    payload = {
        "kind": kind,
        "summary": summary,
        "extracted_entities": entities,
        "created_at": _now(),
    }
    ref.set(payload)
    return {"id": ref.id, **payload}


def list_evidence(case_id: str) -> list[dict]:
    db = get_db()
    docs = db.collection(CRIMES).document(case_id).collection("evidence").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


# ── Case reports (agent output + human sign-off) ────────────────────────
def save_draft_report(case_id: str, report_text: str, patterns: dict, linked_case_ids: list[str]) -> dict:
    db = get_db()
    payload = {
        "case_id": case_id,
        "report_text": report_text,
        "patterns": patterns,
        "linked_case_ids": linked_case_ids,
        "status": "draft",
        "created_at": _now(),
    }
    db.collection(REPORTS).document(case_id).set(payload)
    return payload


def review_report(case_id: str, approved: bool, reviewer: str, notes: str = "") -> dict:
    db = get_db()
    ref = db.collection(REPORTS).document(case_id)
    update = {
        "status": "approved" if approved else "rejected",
        "reviewed_by": reviewer,
        "reviewed_at": _now(),
        "review_notes": notes,
    }
    ref.update(update)
    return {**ref.get().to_dict()}


def get_report(case_id: str) -> dict | None:
    db = get_db()
    doc = db.collection(REPORTS).document(case_id).get()
    return doc.to_dict() if doc.exists else None
