"""
⚠️ NOT USED BY THE LIVE APP — kept only for reference / possible future use.

Nothing in app.py imports this module or the tools built on it
(tools/case_tools.py, tools/similarity_tools.py). The chatbot and every
route actually wired up in app.py go through config.py -> get_db() and
services/firebase_service.py, which read/write the "crimes" collection —
see services/firebase_service.py's module docstring for the real, current
source of truth. This file's "firs" collection is NOT the same collection
the chatbot reads. Do not resurrect these tools without first pointing them
at services/firebase_service.py's schema, or you will recreate the exact
"data is in one collection, chatbot reads another" bug this codebase already
hit once (synthetic FIR data uploaded to a collection nothing read from).

Firestore connection for the backend, via the Firebase Admin SDK.

Setup:
1. Firebase Console -> Project Settings -> Service Accounts -> Generate new
   private key. This downloads a JSON file.
2. Save it as Backend/serviceAccountKey.json (do NOT commit this file — add
   it to .gitignore).
3. Alternatively set FIREBASE_SERVICE_ACCOUNT in .env to point at the file
   somewhere else on disk.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore

CASES_COLLECTION = "firs"

_db = None


def get_db():
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        cred_path = os.getenv(
            "FIREBASE_SERVICE_ACCOUNT",
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "serviceAccountKey.json"),
        )
        if not os.path.exists(cred_path):
            raise RuntimeError(
                f"Firebase service account key not found at {cred_path}. "
                "Download it from Firebase Console -> Project Settings -> Service Accounts, "
                "save it there, or point FIREBASE_SERVICE_ACCOUNT at its location."
            )
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    _db = firestore.client()
    return _db


def doc_to_dict(doc, include_embedding=False):
    """Convert a Firestore DocumentSnapshot into a plain JSON-safe dict."""
    data = doc.to_dict() or {}
    data["firId"] = doc.id
    if not include_embedding:
        data.pop("embedding", None)
    return data