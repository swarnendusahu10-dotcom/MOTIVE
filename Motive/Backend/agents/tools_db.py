"""
tools_db.py
───────────
Firestore tools for the MOTIVE KSP platform.

These are the ONLY tools that agents should use when accessing
crime records, evidence, reports, and statistics.

All tools return structured data.
The LLM is responsible for reasoning.
The tool is responsible for retrieval.
"""

from langchain_core.tools import tool
from services import firebase_service as fb


# ─────────────────────────────────────────────────────────────
# DISTRICT SEARCH
# ─────────────────────────────────────────────────────────────

@tool
def query_crimes_by_district(district: str) -> list[dict]:
    """
    Fetch recent crime records for a Karnataka district.

    Example:
    Bengaluru Urban
    Mysuru
    Raichur
    """

    return fb.query_by_district(district)


# ─────────────────────────────────────────────────────────────
# CRIME TYPE SEARCH
# ─────────────────────────────────────────────────────────────

@tool
def query_crimes_by_type(crime_type: str) -> list[dict]:
    """
    Fetch crime records by crime type.

    Example:
    robbery
    murder
    cyber fraud
    narcotics
    chain snatching
    """

    return fb.query_by_crime_type(crime_type)


# ─────────────────────────────────────────────────────────────
# CASE LOOKUP
# ─────────────────────────────────────────────────────────────

@tool
def get_case_by_id(case_id: str) -> dict:
    """
    Fetch a single case by case ID.
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
    Search cases by a keyword.

    Example:
    weapon
    motorcycle
    gold chain
    knife
    """
    return fb.search_by_keyword(keyword)


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

@tool
def investigate_case(query: str) -> dict:
    """
    Broad investigation search.

    Searches across:

    - case_id
    - district
    - taluk
    - crime_type
    - description
    - status
    - evidence summaries

    Useful when the officer asks a natural language question.
    """

    records = fb.list_recent_crimes(1000)

    query_words = {
        word.strip().lower()
        for word in query.split()
        if len(word.strip()) > 2
    }

    matches = []

    for record in records:

        searchable_text = " ".join(
            str(value).lower()
            for value in record.values()
        )

        score = 0

        for word in query_words:
            if word in searchable_text:
                score += 1

        if score > 0:
            matches.append({
                "score": score,
                "record": record
            })

    matches.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return {
        "query": query,
        "match_count": len(matches),
        "matches": [
            item["record"]
            for item in matches[:50]
        ]
    }


# ─────────────────────────────────────────────────────────────
# OVERALL STATISTICS
# ─────────────────────────────────────────────────────────────

@tool
def get_case_statistics() -> dict:
    """
    Get overall crime statistics from Firestore.
    """

    records = fb.list_recent_crimes(2000)

    district_counts = {}
    crime_counts = {}
    status_counts = {}

    for record in records:

        district = record.get("district", "Unknown")
        crime_type = record.get("crime_type", "Unknown")
        status = record.get("status", "Unknown")

        district_counts[district] = (
            district_counts.get(district, 0) + 1
        )

        crime_counts[crime_type] = (
            crime_counts.get(crime_type, 0) + 1
        )

        status_counts[status] = (
            status_counts.get(status, 0) + 1
        )

    top_districts = sorted(
        district_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]

    top_crimes = sorted(
        crime_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]

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
    Retrieve the most recently added cases.
    """

    return fb.list_recent_crimes(limit)


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