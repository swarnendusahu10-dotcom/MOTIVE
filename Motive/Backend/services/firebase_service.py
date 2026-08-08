"""
firebase_service.py
────────────────────
This is the ONE place case data lives and the ONLY module the chatbot reads
from. All Firestore reads/writes go through this module — REST routes call
it directly, and the LangChain tools in agents/tools_db.py / tools_geo.py /
tools_pattern.py wrap these same functions so the agents and the
human-facing API never drift out of sync.

Every producer of case data must land in CRIMES ("crimes") in this exact
flat+nested shape:
  - routes/crime_data.py (`POST /crime-data`, used by the frontend's
    CrimeDataEntry wizard via lib/api.js) flattens new FIRs through
    `_flatten_for_agents()` before calling add_crime_record() below.
  - uploadToFirestore.js (bulk/synthetic dataset loads) mirrors that same
    flattening in JS and writes into this same collection with the FIR
    number as the doc ID.
If a new data source is ever added, it must funnel through this same
collection/shape — a second collection is invisible to every agent tool
and to the chatbot.

Firestore layout
-----------------
crimes/{crimeId}
    case_id, district, taluk, crime_type, description, status,
    date (ISO string), location {lat, lng}, reported_by, created_at,
    embedding (768-float vector, optional — written by POST /cases/embed)

crimes/{crimeId}/evidence/{evidenceId}
    kind ("image" | "document" | "note"), summary, extracted_entities,
    created_at

case_reports/{case_id}
    report_text, patterns, linked_case_ids, status
    ("draft" | "approved" | "rejected"), created_at, reviewed_by, reviewed_at

── Why records are sanitised before they reach an agent ────────────────
Once POST /cases/embed runs on a case, that document carries a 768-float
`embedding` field. Every read below funnels through `_sanitize()`, which
strips that field (and any other `_INTERNAL_FIELDS`) before the record
leaves this module. Without this, every agent tool call — and every
Gemini call that follows — pays for a multi-KB vector it never asked for
and can't use as text; `investigate_case` alone can return 50 of these at
once. The one place that still needs the raw vector (case-similarity
search) reads it through `get_embedding()` / `list_case_embeddings()`
below, which never return the vector to an LLM — only tools_pattern.py's
`find_similar_cases` consumes them, and it returns similarity scores, not
the vectors themselves.
"""

from datetime import datetime, timezone
from google.cloud.firestore_v1 import FieldFilter
from config import get_db

CRIMES = "crimes"
REPORTS = "case_reports"

# Fields that exist in Firestore for internal/system use only and must
# never be handed to an LLM as part of a "read this case" tool result.
_INTERNAL_FIELDS = {"embedding"}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _sanitize(d: dict) -> dict:
    """Strip internal-only fields (currently just `embedding`) before a
    record leaves this module. Always call this on every read path."""
    if not d:
        return d
    return {k: v for k, v in d.items() if k not in _INTERNAL_FIELDS}


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
    return _sanitize({"id": ref.id, **record})


def get_crime_record(case_id: str) -> dict | None:
    db = get_db()
    doc = db.collection(CRIMES).document(case_id).get()
    if not doc.exists:
        return None
    return _sanitize({"id": doc.id, **doc.to_dict()})


def list_recent_crimes(limit: int = 50) -> list[dict]:
    db = get_db()
    docs = (
        db.collection(CRIMES)
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    return [_sanitize({"id": d.id, **d.to_dict()}) for d in docs]


def _case_insensitive_scan(field: str, value: str, limit: int, scan_window: int = 500) -> list[dict]:
    """Fallback for when an exact Firestore `==` match returns nothing.
    Firestore has no native case-insensitive query, and free-text entry
    (wizard dropdowns vs. an LLM typing "Bengaluru Urban" vs. a dataset
    row storing "bengaluru urban") means an exact match silently returns
    zero rows instead of erroring — the agent then reports "no cases
    found" even though the data exists. This scans a bounded recent
    window and compares normalised (stripped + lowercased) values
    client-side. Bounded by `scan_window` so it stays cheap at hackathon
    data volumes; if the dataset grows past a few thousand docs, add a
    normalised `{field}_lower` field at write time and query that
    directly instead."""
    needle = value.strip().lower()
    docs = list_recent_crimes(limit=scan_window)
    matches = [d for d in docs if str(d.get(field, "")).strip().lower() == needle]
    return matches[:limit]


def query_by_district(district: str, limit: int = 25) -> list[dict]:
    db = get_db()
    docs = (
        db.collection(CRIMES)
        .where(filter=FieldFilter("district", "==", district))
        .limit(limit)
        .stream()
    )
    results = [_sanitize({"id": d.id, **d.to_dict()}) for d in docs]
    if results:
        return results
    return _case_insensitive_scan("district", district, limit)


def query_by_crime_type(crime_type: str, limit: int = 25) -> list[dict]:
    db = get_db()
    docs = (
        db.collection(CRIMES)
        .where(filter=FieldFilter("crime_type", "==", crime_type))
        .limit(limit)
        .stream()
    )
    results = [_sanitize({"id": d.id, **d.to_dict()}) for d in docs]
    if results:
        return results
    return _case_insensitive_scan("crime_type", crime_type, limit)


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


# ── Embeddings (internal-only — never returned to an LLM as-is) ─────────
def get_embedding(case_id: str) -> list[float] | None:
    """Raw embedding vector for one case, or None if it doesn't have one
    yet. Only for internal similarity math (see tools_pattern.py) — never
    hand this straight back to an agent."""
    db = get_db()
    doc = db.collection(CRIMES).document(case_id).get()
    if not doc.exists:
        return None
    return doc.to_dict().get("embedding")


def list_case_embeddings(limit: int = 500) -> list[dict]:
    """Bounded list of {case_id, embedding} pairs for every case that has
    one, newest first. Internal-only, same rule as get_embedding()."""
    db = get_db()
    docs = (
        db.collection(CRIMES)
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    out = []
    for d in docs:
        data = d.to_dict()
        emb = data.get("embedding")
        if emb:
            out.append({"case_id": data.get("case_id", d.id), "embedding": emb})
    return out


# ── AI suggestions (agent judgment, never overwrites officer-owned fields) ─
def set_ai_priority_suggestion(case_id: str, priority: str, reason: str, agent: str) -> dict:
    """Writes an `ai_priority_suggestion` sub-object onto the case doc.
    Deliberately never touches `status` or a top-level `priority` field —
    those stay officer-owned. This is advisory only; an officer reviewing
    the case sees the suggestion and decides whether to act on it."""
    db = get_db()
    suggestion = {
        "priority": priority,
        "reason": reason,
        "suggested_by": agent,
        "suggested_at": _now(),
    }
    db.collection(CRIMES).document(case_id).set({"ai_priority_suggestion": suggestion}, merge=True)
    return {"case_id": case_id, "ai_priority_suggestion": suggestion}


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