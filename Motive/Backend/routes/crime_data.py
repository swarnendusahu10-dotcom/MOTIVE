import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import firebase_service as fb

router = APIRouter()

# NOTE: every handler below is a plain `def`, not `async def`. They call
# firebase_service functions, which do blocking (synchronous) network I/O
# to Firestore -- an `async def` route calling blocking code runs it
# directly on the event loop and stalls every other in-flight request
# (chat messages, the Case Room websocket, everything) until it returns.
# FastAPI runs plain `def` path functions in a worker thread pool
# automatically, so this keeps the server responsive under concurrent use.

# ─────────────────────────────────────────────────────────────────────────
# Nested FIR schema — mirrors the 8-step frontend wizard exactly:
#   1. FIR Information   4. Victim Details      7. FIR Narrative
#   2. Crime Classification 5. Suspect Details  8. Review & Submit
#   3. Incident Details   6. Evidence & Witnesses
#
# Every sub-model is intentionally permissive (most fields optional /
# default "") — the wizard saves a draft after every step, so a
# partially-filled FIR must still be a valid payload, not just the final
# submit. Required-ness is enforced by the frontend wizard's per-step
# validation, not here.
# ─────────────────────────────────────────────────────────────────────────


class Location(BaseModel):
    address: str = ""
    city: str = ""
    taluk: str = ""
    district: str = ""
    state: str = "Karnataka"
    lat: float | None = None
    lng: float | None = None


class FIRInformation(BaseModel):
    fir_number: str = ""
    police_station: str = ""
    district: str = ""
    state: str = "Karnataka"
    registration_date: str = ""


class CrimeClassification(BaseModel):
    category: str = ""
    subcategory: str = ""
    severity: str = ""  # Low | Medium | High | Critical


class IncidentDetails(BaseModel):
    date: str = ""
    time: str = ""
    location: Location = Location()
    description: str = ""


class VictimDetail(BaseModel):
    name: str = ""
    age: str = ""
    gender: str = ""
    occupation: str = ""
    phone: str = ""
    address: str = ""


class SuspectDetail(BaseModel):
    known: bool = True
    name: str = ""
    alias: str = ""
    age: str = ""
    gender: str = ""
    relationship_to_victim: str = ""
    description: str = ""
    vehicle_details: str = ""


class EvidenceItem(BaseModel):
    type: str = "CCTV"
    description: str = ""


class WitnessDetail(BaseModel):
    name: str = ""
    phone: str = ""
    statement: str = ""


class FIRRecordIn(BaseModel):
    case_id: str | None = None
    fir_information: FIRInformation = FIRInformation()
    crime_classification: CrimeClassification = CrimeClassification()
    incident_details: IncidentDetails = IncidentDetails()
    victims: list[VictimDetail] = Field(default_factory=list)
    suspects: list[SuspectDetail] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    witnesses: list[WitnessDetail] = Field(default_factory=list)
    narrative: str = ""
    status: str = "open"          # "draft" while the wizard is in progress, "open" once submitted
    reported_by: str = ""


def _flatten_for_agents(fir: FIRRecordIn) -> dict:
    """
    Build the Firestore document.

    Every field the existing agent tools (agents/tools_db.py,
    tools_geo.py, tools_pattern.py -> services/firebase_service.py)
    already query — district, taluk, crime_type, description, date,
    location, reported_by, status, case_id — is kept flat at the top
    level so none of that agent code has to change. The full nested
    FIR (fir_information, crime_classification, incident_details,
    victims, suspects, evidence, witnesses, narrative) is stored
    alongside it in the SAME document, so nothing is lost and the
    chatbot/agents can still drill into full detail when needed.
    """
    payload = fir.model_dump()

    district = (
        fir.incident_details.location.district
        or fir.fir_information.district
    )
    taluk = fir.incident_details.location.taluk

    payload.update({
        "district": district,
        "taluk": taluk,
        "crime_type": fir.crime_classification.category,
        "crime_subcategory": fir.crime_classification.subcategory,
        "severity": fir.crime_classification.severity,
        "description": fir.narrative or fir.incident_details.description,
        "date": fir.incident_details.date,
        "location": {
            "lat": fir.incident_details.location.lat,
            "lng": fir.incident_details.location.lng,
        },
        "reported_by": fir.reported_by or fir.fir_information.police_station,
    })
    return payload


@router.post("/crime-data")
def submit_crime_record(record: FIRRecordIn):
    payload = _flatten_for_agents(record)
    payload["case_id"] = (
        payload.get("case_id")
        or record.fir_information.fir_number
        or f"KSP-{uuid.uuid4().hex[:8].upper()}"
    )
    saved = fb.add_crime_record(payload)
    return {"status": "saved", "record": saved}


@router.get("/crime-data")
def list_crime_records(limit: int = 50):
    return {"records": fb.list_recent_crimes(limit=limit)}


@router.get("/crime-data/{case_id}")
def get_crime_record(case_id: str):
    record = fb.get_crime_record(case_id)
    if not record:
        raise HTTPException(status_code=404, detail="Case not found")
    return record