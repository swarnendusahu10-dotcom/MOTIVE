"""
llm.py
──────
One shared factory for the Gemini chat model so every agent (and LangSmith
trace) uses the same, consistently-configured LLM. `config.py` must be
imported before this module so LANGCHAIN_TRACING_V2 / GEMINI_API_KEY are
already set in the environment.
"""

import config  # noqa: F401  (ensures env vars / LangSmith are set first)
from langchain_google_genai import ChatGoogleGenerativeAI


def _require_api_key() -> str:
    """
    Fail loudly and immediately if GEMINI_API_KEY is missing, instead of
    passing an empty string into ChatGoogleGenerativeAI. An empty/None
    key can cause the underlying Google client to silently fall back to
    whatever it finds elsewhere (a stray GOOGLE_API_KEY in the system's
    environment, Application Default Credentials, etc.) — which is
    exactly how a backend can end up quietly using a different, stale
    API key than the one in Backend/.env. Better to error out clearly
    here than debug that mismatch again.
    """
    if not config.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Check Backend/.env — see .env.example."
        )
    return config.GEMINI_API_KEY


def get_llm(temperature: float = 0.05) -> ChatGoogleGenerativeAI:
    """Text + tool-calling LLM used by every ReAct agent node."""
    return ChatGoogleGenerativeAI(
        model=config.GEMINI_CHAT_MODEL,
        google_api_key=_require_api_key(),
        temperature=temperature,
        convert_system_message_to_human=False,
    )


def get_vision_llm(temperature: float = 0.1) -> ChatGoogleGenerativeAI:
    """Multimodal LLM used by the Evidence Agent to read crime-scene
    photos, scanned FIRs, or CCTV stills. Gemini flash accepts image
    content blocks natively, so this is the same model family with a
    lower temperature for more literal extraction."""
    return ChatGoogleGenerativeAI(
        model=config.GEMINI_VISION_MODEL,
        google_api_key=_require_api_key(),
        temperature=temperature,
    )