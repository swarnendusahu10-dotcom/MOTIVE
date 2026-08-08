"""
errors.py
─────────
Turns raw Gemini / LangChain exceptions into short, accurate,
officer-facing messages -- instead of a multi-line JSON error blob (or a
raw Python traceback) leaking into the chat UI or the Case Room
transcript. Every place that calls the LLM (chat_agent.py, nodes.py,
tools_evidence.py) should route its exception through
friendly_llm_error() before it ever reaches a frontend response.

Detection is string-based (grepping str(exc)) rather than isinstance
checks against langchain_google_genai / google.genai exception classes.
That is deliberate: those exception classes live at internal import
paths that have moved before between library versions, while the
underlying Google API error text (RESOURCE_EXHAUSTED, quotaId, ...) is
stable across SDKs -- this keeps the check working even if a dependency
bump changes exactly how the error gets wrapped.
"""

import re

_RETRY_DELAY_RE = re.compile(r"retryDelay['\"]?\s*:\s*['\"]?(\d+(?:\.\d+)?)s")
_QUOTA_ID_RE    = re.compile(r"quotaId['\"]?\s*:\s*['\"]([^'\"]+)")
_QUOTA_VALUE_RE = re.compile(r"quotaValue['\"]?\s*:\s*['\"]?(\d+)")
_MODEL_RE       = re.compile(r"model['\"]?\s*:\s*['\"]([^'\"]+)")


def is_quota_error(exc: Exception) -> bool:
    """True for a Gemini 429 RESOURCE_EXHAUSTED (rate limit or quota cap)."""
    text = str(exc)
    return "RESOURCE_EXHAUSTED" in text or "429" in text


def is_daily_quota(exc: Exception) -> bool:
    """True specifically for the free-tier *daily* request cap -- as
    opposed to a short per-minute rate limit. Worth knowing separately
    because a daily cap will not clear within this request's lifetime,
    so retrying is pointless; a per-minute limit sometimes will."""
    m = _QUOTA_ID_RE.search(str(exc))
    return bool(m) and "PerDay" in m.group(1)


def retry_delay_seconds(exc: Exception, default: float = 30.0) -> float:
    """Google suggests a retryDelay in the error payload -- use it when
    present instead of guessing."""
    m = _RETRY_DELAY_RE.search(str(exc))
    return float(m.group(1)) if m else default


def friendly_llm_error(exc: Exception) -> str:
    """One or two clean sentences, safe to show directly in the UI."""
    text = str(exc)

    if is_quota_error(exc):
        quota_val = _QUOTA_VALUE_RE.search(text)
        model     = _MODEL_RE.search(text)
        limit_str = f" ({quota_val.group(1)} requests/day)" if quota_val else ""
        model_str = f" for {model.group(1)}" if model else ""

        if is_daily_quota(exc):
            return (
                f"The Gemini free-tier daily request limit{limit_str}{model_str} has been "
                "reached. It resets on Google's usual daily cycle, so it should clear up "
                "later today -- or raise the limit by enabling billing on this API key "
                "(see https://ai.google.dev/gemini-api/docs/rate-limits)."
            )
        delay = retry_delay_seconds(exc)
        return (
            f"Gemini is rate-limiting requests right now{model_str}. "
            f"Please wait about {int(delay)}s and try again."
        )

    if "PERMISSION_DENIED" in text or "API_KEY_INVALID" in text or "api key" in text.lower():
        return (
            "Gemini rejected the request -- the API key looks invalid, expired, or lacking "
            "permission for this model. Check GEMINI_API_KEY in Backend/.env."
        )

    if "DEADLINE_EXCEEDED" in text or "timeout" in text.lower():
        return "The request to Gemini timed out. Try again in a moment."

    # Generic fallback -- never leak the raw exception/stack into the UI.
    return (
        "Something went wrong talking to the AI service on my end. "
        "I've logged the full error server-side -- check the backend terminal, "
        "or try again."
    )