from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import firebase_service as fb
from config import get_db
from services.embedding_service import generate_embedding

router = APIRouter()


# =====================================================
# Models
# =====================================================

class EmbedRequest(BaseModel):
    fir_id: str
    text: str


# =====================================================
# Case Retrieval APIs
# =====================================================

@router.get("/cases")
def list_cases(limit: int = 30):
    return {
        "cases": fb.list_recent_crimes(limit=limit)
    }


@router.get("/cases/{case_id}/report")
def get_case_report(case_id: str):
    report = fb.get_report(case_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="No report yet for this case"
        )

    return report


@router.get("/cases/{case_id}/evidence")
def get_case_evidence(case_id: str):
    return {
        "evidence": fb.list_evidence(case_id)
    }


# =====================================================
# Embedding APIs
# =====================================================

@router.post("/cases/embed")
def embed_case(req: EmbedRequest):
    """
    Generates an embedding from the FIR narrative and stores it
    directly in the same Firestore case document (crimes/{fir_id}).

    Firestore remains the single source of truth — there is exactly
    one collection ("crimes", via services/firebase_service.py) that
    both the REST API and every agent tool read from and write to.
    """

    embedding = generate_embedding(req.text)

    if embedding is None:
        return {
            "status": "skipped",
            "reason": "embedding generation failed",
            "fir_id": req.fir_id
        }

    db = get_db()

    db.collection(fb.CRIMES).document(req.fir_id).set(
        {
            "embedding": embedding
        },
        merge=True
    )

    return {
        "status": "ok",
        "fir_id": req.fir_id,
        "embedded": True
    }