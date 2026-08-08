"""
⚠️ NOT USED BY THE LIVE APP — see database/firestore_db.py's module
docstring. The live chatbot uses agents/tools_db.py + services/firebase_service.py
(collection "crimes"), not this module.

Records Agent / Map Agent tools.

Each function here is a plain Python function with type hints + a docstring —
that's deliberate: this same function list gets passed straight to Gemini as
`tools=[...]`, and the SDK builds the function-calling schema from the
signature and docstring automatically. Keep argument types simple
(str/int/float, no Optional) since that's what the schema generator handles
most reliably, and use "" / 0 as the "not filtered" default instead of None.
"""

from database.firestore_db import get_db, CASES_COLLECTION, doc_to_dict


def get_cases(crime_type: str = "", district: str = "", date_from: str = "", date_to: str = "", limit: int = 20) -> dict:
    """Retrieve FIR case records, optionally filtered by crime type, district, and date range.

    Args:
        crime_type: Crime category e.g. Murder, Robbery, Theft, Cyber Crime, Narcotics,
            Assault, Kidnapping, Burglary, Fraud. Leave empty ("") for all types.
        district: Karnataka district the incident occurred in, e.g. "Mysuru". Leave empty for all districts.
        date_from: Earliest incident date to include, format YYYY-MM-DD. Leave empty for no lower bound.
        date_to: Latest incident date to include, format YYYY-MM-DD. Leave empty for no upper bound.
        limit: Maximum number of records to return. Default 20.
    """
    db = get_db()
    query = db.collection(CASES_COLLECTION)

    if crime_type:
        query = query.where("crime.category", "==", crime_type)
    if district:
        query = query.where("incident.location.district", "==", district)
    if date_from:
        query = query.where("incident.date", ">=", date_from)
    if date_to:
        query = query.where("incident.date", "<=", date_to)

    query = query.limit(limit)

    try:
        docs = list(query.stream())
    except Exception as e:
        # Most likely cause: Firestore needs a composite index for this
        # combination of filters. The exception message includes a direct
        # console link to create it — surface that to the caller.
        return {"error": str(e), "results": [], "count": 0}

    results = [doc_to_dict(d) for d in docs]
    return {"results": results, "count": len(results)}


def get_case_by_id(fir_id: str) -> dict:
    """Retrieve a single case by its FIR ID (e.g. "FIR-2026-AB12CD").

    Args:
        fir_id: The FIR document ID to fetch.
    """
    db = get_db()
    doc = db.collection(CASES_COLLECTION).document(fir_id).get()
    if not doc.exists:
        return {"error": f"No case found with id {fir_id}"}
    return doc_to_dict(doc)


def get_case_locations(crime_type: str = "", district: str = "", date_from: str = "", date_to: str = "", limit: int = 100) -> dict:
    """Retrieve just the map-plottable location for cases matching filters — used to pin markers on the map.

    Args:
        crime_type: Crime category to filter by. Leave empty for all types.
        district: District to filter by. Leave empty for all districts.
        date_from: Earliest incident date, YYYY-MM-DD. Leave empty for no lower bound.
        date_to: Latest incident date, YYYY-MM-DD. Leave empty for no upper bound.
        limit: Maximum number of points to return. Default 100.
    """
    base = get_cases(crime_type, district, date_from, date_to, limit)
    if "error" in base:
        return base

    points = []
    for c in base["results"]:
        loc = (c.get("incident") or {}).get("location") or {}
        lat, lng = loc.get("latitude"), loc.get("longitude")
        if lat and lng:
            points.append({
                "fir_id": c.get("firId"),
                "title": (c.get("crime") or {}).get("category", ""),
                "lat": lat,
                "lng": lng,
            })
    return {"results": points, "count": len(points)}