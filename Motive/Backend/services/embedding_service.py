"""
embedding_service.py
─────────────────────
Generates a text embedding for a FIR/case narrative using Gemini's
embedding model, so the Similarity Agent can compare cases later.

THIS FILE WAS PREVIOUSLY EMPTY. Because routes/cases.py does
`from services.embedding_service import generate_embedding` at import
time, an empty file raised an ImportError the moment app.py imported
routes.cases -> the entire FastAPI app failed to boot -> the frontend
could not reach the backend at all (every request, not just embedding
requests, was failing). That was the root cause of the "backend/frontend
not connected" symptom.

Uses the same GEMINI_API_KEY already configured in config.py. Never
raises: if the API key is missing or the call fails, it returns None
and the caller (routes/cases.py) treats that as "embedding skipped"
without breaking the FIR save itself, since Firestore remains the
single source of truth.
"""

from __future__ import annotations

import google.generativeai as genai
import config

EMBEDDING_MODEL = "models/text-embedding-004"


def generate_embedding(text: str) -> list[float] | None:
    """Return a float vector embedding for `text`, or None if it can't
    be generated (missing API key, empty text, or an API error)."""

    if not text or not text.strip():
        return None

    if not config.GEMINI_API_KEY:
        print("[embedding_service] WARNING: GEMINI_API_KEY not set — skipping embedding.")
        return None

    try:
        genai.configure(api_key=config.GEMINI_API_KEY)
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="SEMANTIC_SIMILARITY",
        )
        return result.get("embedding") if isinstance(result, dict) else result.embedding
    except Exception as exc:  # noqa: BLE001 -- best-effort, must never crash the save
        print(f"[embedding_service] Embedding generation failed: {exc}")
        return None