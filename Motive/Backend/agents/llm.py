"""
llm.py
──────
One shared factory for the Gemini chat model so every agent (and LangSmith
trace) uses the same, consistently-configured LLM. `config.py` must be
imported before this module so LANGCHAIN_TRACING_V2 / GEMINI_API_KEY are
already set in the environment.

`timeout` / `max_retries` are set explicitly (rather than left on the
library defaults) so a slow or flaky connection to Gemini fails fast and
retries with backoff instead of hanging the request indefinitely -- see
agents/chat_agent.py for the outer retry wrapper that catches it if every
attempt still fails.
"""

import config  # noqa: F401  (ensures env vars / LangSmith are set first)
from langchain_google_genai import ChatGoogleGenerativeAI

LLM_TIMEOUT_SECONDS = 45
LLM_MAX_RETRIES = 3


def get_llm(temperature: float = 0.2) -> ChatGoogleGenerativeAI:
    """Text + tool-calling LLM used by every ReAct agent node."""
    return ChatGoogleGenerativeAI(
        model=config.GEMINI_CHAT_MODEL,
        google_api_key=config.GEMINI_API_KEY,
        temperature=temperature,
        convert_system_message_to_human=False,
        timeout=LLM_TIMEOUT_SECONDS,
        max_retries=LLM_MAX_RETRIES,
    )


def get_vision_llm(temperature: float = 0.1) -> ChatGoogleGenerativeAI:
    """Multimodal LLM used by the Evidence Agent to read crime-scene
    photos, scanned FIRs, or CCTV stills. Gemini flash accepts image
    content blocks natively, so this is the same model family with a
    lower temperature for more literal extraction."""
    return ChatGoogleGenerativeAI(
        model=config.GEMINI_VISION_MODEL,
        google_api_key=config.GEMINI_API_KEY,
        temperature=temperature,
        timeout=LLM_TIMEOUT_SECONDS,
        max_retries=LLM_MAX_RETRIES,
    )