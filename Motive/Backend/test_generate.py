"""
test_generate.py
─────────────────
Standalone diagnostic — run this directly, it's not imported by the app.

`ListModels` (what test_models.py uses) lists every model Google has
published, regardless of whether YOUR key/project actually has
generation access to it. That's why test_models.py can show
"models/gemini-2.5-flash" while a real chat request 404s on it.

This script instead makes a real, tiny generateContent call against
each candidate model and reports which ones actually work for this
API key — so you can pick a working model in one run instead of
guessing one model name per chat message (each guess burns a quota
unit either way).

Run from the Backend folder:
    python test_generate.py
"""

import os
from pathlib import Path

from dotenv import load_dotenv
import google.generativeai as genai

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

API_KEY = os.getenv("GEMINI_API_KEY", "")
if not API_KEY:
    raise SystemExit(f"GEMINI_API_KEY not set — checked {_ENV_PATH}")

print(f"Using key ending in ...{API_KEY[-4:]} (from {_ENV_PATH})\n")
genai.configure(api_key=API_KEY)

# Every candidate here actually appeared in your own ListModels output.
# Ordered roughly cheapest/most-likely-to-work first.
CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash-lite",
    "gemini-pro-latest",
    "gemini-2.5-pro",
]

print(f"Testing real generateContent calls against {len(CANDIDATES)} candidate models...\n")

working = []
for name in CANDIDATES:
    try:
        model = genai.GenerativeModel(name)
        resp = model.generate_content("Reply with just the word OK.")
        text = (getattr(resp, "text", "") or "").strip()[:40]
        print(f"[WORKS]   {name:30s} -> {text!r}")
        working.append(name)
    except Exception as exc:
        reason = str(exc).splitlines()[0][:100]
        print(f"[FAILED]  {name:30s} -> {reason}")

print("\n" + "=" * 60)
if working:
    print(f"Models that work for this key: {', '.join(working)}")
    print(f"\nSet this in Backend/.env, then restart the backend:")
    print(f"  GEMINI_CHAT_MODEL={working[0]}")
    print(f"  GEMINI_VISION_MODEL={working[0]}")
else:
    print(
        "None of the candidates worked. That points to the API key itself "
        "(not a model-name problem) — regenerate a key at "
        "https://aistudio.google.com/app/apikey and confirm billing/quota "
        "status on the project it belongs to."
    )