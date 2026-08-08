"""
tools_evidence.py
──────────────────
Multimodal evidence intake. `analyze_image_evidence` is what makes the
whole backend "multimodal": it hands a base64 image (a crime-scene
photo, a scanned FIR, a CCTV still) straight to Gemini alongside a
structured extraction prompt, then files the result under the case's
evidence sub-collection so every other agent (and the officer) can see
it later.
"""

import json
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage
from agents.llm import get_vision_llm
from agents.utils import content_to_text
from agents.errors import friendly_llm_error
from services import firebase_service as fb

EXTRACTION_PROMPT = """You are the Evidence Analyst for the Karnataka State \
Police Crime Intelligence Platform. Look at the attached image and return \
ONLY valid JSON with this schema, no markdown fences, no commentary:

{
  "summary": "one or two sentence plain-language description of the image",
  "entities": {
    "people_described": [],
    "vehicles": [],
    "weapons": [],
    "license_plates_visible": [],
    "location_clues": [],
    "notable_text_visible": []
  },
  "confidence": "low" | "medium" | "high"
}

Leave arrays empty if nothing relevant is visible. Never invent details \
that are not actually visible in the image.
"""


@tool
def analyze_image_evidence(case_id: str, image_base64: str, mime_type: str = "image/jpeg") -> dict:
    """Analyse a crime-scene photo, scanned FIR page, or CCTV still for a
    case using Gemini's multimodal vision. Extracts a plain-language
    summary plus structured entities (people, vehicles, weapons, plate
    numbers, visible text) and saves the result to that case's evidence
    log in Firestore. `image_base64` must be the raw base64 payload
    (no data: URL prefix)."""
    llm = get_vision_llm()
    message = HumanMessage(content=[
        {"type": "text", "text": EXTRACTION_PROMPT},
        {"type": "image_url", "image_url": f"data:{mime_type};base64,{image_base64}"},
    ])
    try:
        response = llm.invoke([message])
    except Exception as exc:
        # Returning a normal dict (instead of raising) lets the ReAct loop
        # keep going and report this in its own answer -- e.g. "I
        # couldn't analyse that photo, Gemini's quota is exhausted" --
        # rather than a vision-model hiccup killing the entire chat turn.
        return {
            "summary": friendly_llm_error(exc),
            "entities": {},
            "confidence": "low",
            "evidence_id": None,
            "error": True,
        }
    text = content_to_text(response.content).removeprefix("```json").removesuffix("```").strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {"summary": text, "entities": {}, "confidence": "low"}

    saved = fb.add_evidence(
        case_id=case_id,
        kind="image",
        summary=parsed.get("summary", ""),
        entities=parsed.get("entities", {}),
    )
    return {**parsed, "evidence_id": saved["id"]}


EVIDENCE_TOOLS = [analyze_image_evidence]