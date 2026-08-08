"""
tools_db.py
───────────
Firestore tools for the MOTIVE KSP platform.

These are the ONLY tools that agents should use when accessing
crime records, evidence, reports, and statistics.

All tools return structured data.
The LLM is responsible for reasoning.
The tool is responsible for retrieval.

── Why list tools return summaries, not full records ────────────────────
Every case document also carries the full nested FIR (fir_information,
crime_classification, incident_details, victims, suspects, evidence,
witnesses, narrative — see routes/crime_data.py's _flatten_for_agents).
That's the right shape for a single-case lookup, but a *list* tool like
investigate_case can return up to 50 of these at once — handing all of
that to the LLM burns tens of thousands of tokens on fields the agent
never asked about and pushes the sub-agent toward the context limit,
which is what actually made the Case Room graph stall/garble output.
List tools below return SUMMARY_FIELDS only; get_case_by_id and
list_case_evidence still return the full record/evidence, since those
are explicit single-item lookups where the extra detail is the point.
"""

from langchain_core.tools import tool
from services import firebase_service as fb

# Fields worth an agent's attention when scanning many cases at once.
# Deliberately excludes nested victims/suspects/witnesses/full narrative —
# an agent that needs that detail calls get_case_by_id on the specific
# case_id instead.
SUMMARY_FIELDS = [
    "case_id", "id", "district", "taluk", "crime_type", "crime_subcategory",
    "severity", "status", "date", "reported_by",
]
_DESCRIPTION_PREVIEW_CHARS = 220


def _summarize(record: dict) -> dict:
    out = {k: record.get(k) for k in SUMMARY_FIELDS if record.get(k) not in (None, "")}
    desc = record.get("description") or ""
    if desc:
        out["description"] = (
            desc if len(desc) <= _DESCRIPTION_PREVIEW_CHARS
            else desc[:_DESCRIPTION_PREVIEW_CHARS].rsplit(" ", 1)[0] + "…"
        )
    return out


# ─────────────────────────────────────────────────────────────
# DISTRICT SEARCH
# ─────────────────────────────────────────────────────────────

@tool
def query_crimes_by_district(district: str) -> list[dict]:
    """
    Fetch recent crime record summaries for a Karnataka district.
    Matching is case/whitespace-insensitive. Returns summary fields only
    (case_id, district, taluk, crime_type, severity, status, date,
    a short description preview) — call get_case_by_id for full detail
    on a specific case.

    Example:
    Bengaluru Urban
    Mysuru
    Raichur
    """
    return [_summarize(r) for r in fb.query_by_district(district)]


# ─────────────────────────────────────────────────────────────
# CRIME TYPE SEARCH
# ─────────────────────────────────────────────────────────────

@tool
def query_crimes_by_type(crime_type: str) -> list[dict]:
    """
    Fetch recent crime record summaries by crime type. Matching is
    case/whitespace-insensitive. Returns summary fields only — call
    get_case_by_id for full detail on a specific case.

    Example:
    robbery
    murder
    cyber fraud
    narcotics
    chain snatching
    """
    return [_summarize(r) for r in fb.query_by_crime_type(crime_type)]


# ─────────────────────────────────────────────────────────────
# CASE LOOKUP
# ─────────────────────────────────────────────────────────────

@tool
def get_case_by_id(case_id: str) -> dict:
    """
    Fetch the full record for a single case by case ID — use this once
    you've narrowed down to a specific case and need full detail
    (victims, suspects, full narrative, etc.), not for scanning many
    cases at once.
    """
    record = fb.get_crime_record(case_id)

    if not record:
        return {
            "error": f"No case found with id {case_id}"
        }

    return record


# ─────────────────────────────────────────────────────────────
# KEYWORD SEARCH
# ─────────────────────────────────────────────────────────────

@tool
def search_cases_by_keyword(keyword: str) -> list[dict]:
    """
    Search recent case summaries by a keyword. Returns summary fields
    only — call get_case_by_id for full detail on a specific case.

    Example:
    weapon
    motorcycle
    gold chain
    knife
    """
    return [_summarize(r) for r in fb.search_by_keyword(keyword)]


# ─────────────────────────────────────────────────────────────
# EVIDENCE LOOKUP
# ─────────────────────────────────────────────────────────────

@tool
def list_case_evidence(case_id: str) -> list[dict]:
    """
    List evidence attached to a case.
    """

    return fb.list_evidence(case_id)


# ─────────────────────────────────────────────────────────────
# INTELLIGENT INVESTIGATION SEARCH
# ─────────────────────────────────────────────────────────────

# Bounded scan window and result cap — investigate_case used to scan
# 1000 records and return up to 50 full nested FIRs (potentially tens of
# thousands of tokens in one tool result). A natural-language question
# rarely needs more than a double-digit number of matches to reason
# about, and summaries carry enough signal for the agent to decide
# whether to drill into a specific case_id next.
_INVESTIGATE_SCAN_WINDOW = 300
_INVESTIGATE_RESULT_CAP = 15


@tool
def investigate_case(query: str) -> dict:
    """
    Broad natural-language investigation search across case_id, district,
    taluk, crime_type, description, and status. Returns up to 15 ranked
    summary matches (not full records) — call get_case_by_id for full
    detail on any specific case_id it surfaces.
    """
    records = fb.list_recent_crimes(_INVESTIGATE_SCAN_WINDOW)

    query_words = {
        word.strip().lower()
        for word in query.split()
        if len(word.strip()) > 2
    }

    matches = []
    for record in records:
        searchable_text = " ".join(str(value).lower() for value in record.values())
        score = sum(1 for word in query_words if word in searchable_text)
        if score > 0:
            matches.append({"score": score, "record": record})

    matches.sort(key=lambda x: x["score"], reverse=True)

    return {
        "query": query,
        "match_count": len(matches),
        "matches": [_summarize(item["record"]) for item in matches[:_INVESTIGATE_RESULT_CAP]],
    }


# ─────────────────────────────────────────────────────────────
# OVERALL STATISTICS
# ─────────────────────────────────────────────────────────────

@tool
def get_case_statistics() -> dict:
    """
    Get overall crime statistics (counts by district/crime type/status)
    from Firestore. Returns aggregate numbers only, not individual cases.
    """

    records = fb.list_recent_crimes(2000)

    district_counts = {}
    crime_counts = {}
    status_counts = {}

    for record in records:
        district = record.get("district", "Unknown")
        crime_type = record.get("crime_type", "Unknown")
        status = record.get("status", "Unknown")

        district_counts[district] = district_counts.get(district, 0) + 1
        crime_counts[crime_type] = crime_counts.get(crime_type, 0) + 1
        status_counts[status] = status_counts.get(status, 0) + 1

    top_districts = sorted(district_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    top_crimes = sorted(crime_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "total_cases": len(records),
        "top_districts": top_districts,
        "top_crime_types": top_crimes,
        "status_breakdown": status_counts,
    }


# ─────────────────────────────────────────────────────────────
# CASE REPORT LOOKUP
# ─────────────────────────────────────────────────────────────

@tool
def get_case_report(case_id: str) -> dict:
    """
    Retrieve an AI-generated case report.
    """

    report = fb.get_report(case_id)

    if not report:
        return {
            "error": f"No report found for case {case_id}"
        }

    return report


# ─────────────────────────────────────────────────────────────
# RECENT CASES
# ─────────────────────────────────────────────────────────────

@tool
def get_recent_cases(limit: int = 25) -> list[dict]:
    """
    Retrieve summaries of the most recently added cases. Call
    get_case_by_id for full detail on a specific case.
    """

    return [_summarize(r) for r in fb.list_recent_crimes(limit)]


# ─────────────────────────────────────────────────────────────
# TOOL REGISTRY
# ─────────────────────────────────────────────────────────────

DB_TOOLS = [
    query_crimes_by_district,
    query_crimes_by_type,
    get_case_by_id,
    search_cases_by_keyword,
    list_case_evidence,
    investigate_case,
    get_case_statistics,
    get_case_report,
    get_recent_cases,
]