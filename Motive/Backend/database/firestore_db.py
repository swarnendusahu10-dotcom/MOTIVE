"""
Firestore connection for the backend, via the Firebase Admin SDK.

This replaces database/db.py (SQLite) completely — there is now exactly one
place case data lives: the `firs` collection in Firestore, the same
collection the frontend's CrimeDataEntry wizard writes to. The backend
reads/writes that same collection so agents always see live data, not a copy.

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
