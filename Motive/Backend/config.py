"""
config.py
─────────
Single place where every external service (Firebase, Gemini, LangSmith)
gets initialised from environment variables. Import `db` from here anywhere
you need Firestore, and just `import config` early (e.g. in app.py) so the
LangSmith tracing env vars are set before any LangChain/LangGraph code runs.
"""

import os
import json
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Load .env from THIS file's own folder (Backend/.env), not from wherever
# the process happens to be launched from — `load_dotenv()` with no path
# searches from the current working directory, which silently breaks if
# uvicorn is ever started from a different folder.
#
# override=True is equally important: by default python-dotenv refuses to
# overwrite a variable that's already set in the process/shell environment.
# If an old GEMINI_API_KEY was ever exported in this terminal session (or
# left over from an earlier run), updating Backend/.env alone would NOT
# actually change what the backend uses — the stale value would silently
# win. override=True guarantees Backend/.env is always the source of truth.
_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

# ── Gemini ────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")
# Multimodal (vision) reasoning uses the same flash model — it natively
# accepts image input, no separate vision model needed.
GEMINI_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-2.5-flash")

if GEMINI_API_KEY:
    # Never print the full key. This is just so a `.env` change is
    # instantly verifiable in the server logs on every boot — no more
    # guessing whether the backend actually picked up a new key.
    print(f"[config] GEMINI_API_KEY loaded from {_ENV_PATH} (ends in ...{GEMINI_API_KEY[-4:]})")
else:
    print(f"[config] WARNING: GEMINI_API_KEY not set — checked {_ENV_PATH}")

print(f"[config] GEMINI_CHAT_MODEL={GEMINI_CHAT_MODEL}  GEMINI_VISION_MODEL={GEMINI_VISION_MODEL}")

# ── LangSmith (observability for every agent + tool call) ──────────────────
if os.getenv("LANGCHAIN_API_KEY"):
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGCHAIN_PROJECT", "Motive-KSP")
    os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY")

# ── Firebase Admin / Firestore ──────────────────────────────────────────────
# Two supported ways to provide credentials, in this order:
#   1. FIREBASE_CREDENTIALS_JSON  -> the full service-account JSON as a string
#      (handy for hosting platforms where you can't upload a file)
#   2. FIREBASE_CREDENTIALS_PATH  -> path to the service-account .json file
_firebase_app = None
db = None


def _init_firebase():
    global _firebase_app, db
    if firebase_admin._apps:
        _firebase_app = firebase_admin.get_app()
        db = firestore.client()
        return

    cred = None
    if os.getenv("FIREBASE_CREDENTIALS_JSON"):
        cred = credentials.Certificate(json.loads(os.getenv("FIREBASE_CREDENTIALS_JSON")))
    elif os.getenv("FIREBASE_CREDENTIALS_PATH"):
        cred = credentials.Certificate(os.getenv("FIREBASE_CREDENTIALS_PATH"))

    if cred is None:
        # Allow the app to boot without Firebase configured yet (e.g. first
        # local run before the service-account key has been dropped in) —
        # every firebase_service call will raise a clear error instead of
        # crashing the whole server on import.
        print("[config] WARNING: Firebase credentials not set — Firestore calls will fail "
              "until FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS_JSON is configured.")
        return

    _firebase_app = firebase_admin.initialize_app(cred)
    db = firestore.client()


_init_firebase()


def get_db():
    if db is None:
        raise RuntimeError(
            "Firestore is not initialised. Set FIREBASE_CREDENTIALS_PATH (or "
            "FIREBASE_CREDENTIALS_JSON) in Backend/.env — see .env.example."
        )
    return db