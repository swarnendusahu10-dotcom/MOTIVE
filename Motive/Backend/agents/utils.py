"""
utils.py
────────
Small shared helpers used across the agent stack.
"""


def content_to_text(content) -> str:
    """
    Normalise a LangChain message's `.content` into a plain string.

    With Gemini (langchain-google-genai), `.content` is not always a
    plain string — it can come back as a list of content-block dicts,
    e.g. [{"type": "text", "text": "...", "extras": {...}}], or a mix
    of strings and dicts. Anything that calls `.strip()` / string
    methods directly on `.content` will raise AttributeError the
    moment Gemini returns one of these list-shaped responses. Route
    every `.content` access through this helper instead.
    """
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                text = block.get("text")
                if text:
                    parts.append(text)
        return "".join(parts).strip()
    return str(content)