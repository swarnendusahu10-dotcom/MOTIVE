"""
chat_agent.py
─────────────
The single agent behind the Chatbot.jsx page (`POST /chat`). It's a
LangGraph-prebuilt ReAct agent: Gemini + the DB tools + the Geo tools,
wrapped with a MemorySaver checkpointer so it remembers the running
conversation per browser session (thread_id = session_id sent by the
frontend). It also accepts an optional image (multimodal) for on-the-fly
evidence questions without leaving the chat.

This is intentionally the *general front desk* — for a full multi-agent
case investigation (patterns across many cases + human sign-off), the
frontend instead opens the Case Room page, which drives agents/graph.py.
"""

import logging
import time
from httpx import RemoteProtocolError, ConnectError, ReadTimeout, ConnectTimeout

from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage

from agents.llm import get_llm
from agents.utils import content_to_text
from agents.errors import is_quota_error, is_daily_quota, retry_delay_seconds, friendly_llm_error
from agents.tools_db import DB_TOOLS
from agents.tools_geo import GEO_TOOLS
from agents.tools_evidence import EVIDENCE_TOOLS

logger = logging.getLogger("motive.chat_agent")

# Transport-level failures worth one extra app-level retry on top of the
# SDK's own internal retry/backoff (see agents/llm.py's max_retries) --
# these mean the request never got a response at all, as opposed to a
# real error from the model.
NETWORK_ERRORS = (RemoteProtocolError, ConnectError, ReadTimeout, ConnectTimeout)

SYSTEM_PROMPT = """You are MOTIVE, the AI assistant embedded in the \
Karnataka State Police (KSP) State Crime Records Bureau Crime \
Intelligence Platform.

Your role:
- You help vetted police officers query crime statistics, retrieve case \
records, spot leads, and navigate the district crime map — nothing else.
- You have tools to read structured crime data from Firestore and to \
trigger map actions (hotspots, trend charts, district comparison, zoom). \
Use them whenever a question needs real data instead of guessing.
- You can also read an attached crime-scene photo or document if the \
officer sends one, and fold what you see into your answer.
- For a deep multi-case pattern investigation with a formal report and \
sign-off, tell the officer to open the "Case Room" page — that's handled \
by a dedicated multi-agent team, not you.
- Be precise, cite district/case names when you have them, and never \
invent statistics you didn't retrieve. If you don't have data, say so \
plainly.
- Keep responses focused and professional — you are a tool for working \
police officers, not a general-purpose chatbot.
"""

_checkpointer = MemorySaver()
_agent = None


def get_chat_agent():
    global _agent
    if _agent is None:
        _agent = create_react_agent(
            get_llm(temperature=0.3),
            tools=[*DB_TOOLS, *GEO_TOOLS, *EVIDENCE_TOOLS],
            prompt=SYSTEM_PROMPT,
            checkpointer=_checkpointer,
        )
    return _agent


def ask_chat_agent(message: str, session_id: str, image_base64: str | None = None, mime_type: str = "image/jpeg") -> dict:
    agent = get_chat_agent()

    if image_base64:
        content = [
            {"type": "text", "text": message or "Describe what you see and flag anything relevant to the case."},
            {"type": "image_url", "image_url": f"data:{mime_type};base64,{image_base64}"},
        ]
    else:
        content = message

    invoke_kwargs = dict(
        input={"messages": [HumanMessage(content=content)]},
        config={"configurable": {"thread_id": session_id}},
    )

    # This is the outer safety net: /chat must always return a normal 200
    # response the frontend can render as a chat bubble, never an
    # unhandled exception -- a Gemini network hiccup should read as "the
    # assistant is having connection trouble", not as a broken page.
    last_exc = None
    for attempt in range(2):  # one retry beyond the SDK's own internal retries
        try:
            result = agent.invoke(**invoke_kwargs)
            # Gemini can return `.content` as a list of content blocks instead
            # of a plain string — route through content_to_text so that never
            # reaches the frontend as a broken bubble (same fix applied to
            # the Case Room graph in agents/nodes.py).
            reply = content_to_text(result["messages"][-1].content)

            # Surface any map action a tool call produced, so the frontend
            # map component can react to it directly (see routes/chat.py).
            action = None
            for m in reversed(result["messages"]):
                if getattr(m, "name", None) in {"show_hotspots", "show_crime_trend", "compare_districts", "zoom_district", "open_map"}:
                    action = content_to_text(m.content) if not isinstance(m.content, str) else m.content
                    break

            return {"response": reply, "action": action}

        except NETWORK_ERRORS as exc:
            last_exc = exc
            logger.warning("Gemini network error on attempt %s/2: %s", attempt + 1, exc)
            time.sleep(1.5)

        except Exception as exc:
            if is_quota_error(exc):
                # This is an expected, known condition (not a bug) -- log
                # it as a warning, not a full traceback dump. A daily
                # free-tier cap can't clear within this request's
                # lifetime, so retrying is pointless; a short per-minute
                # limit sometimes will, so give it exactly one wait-and-
                # retry (bounded to 60s) before giving up.
                logger.warning("Gemini quota exceeded on attempt %s/2: %s", attempt + 1, exc)
                if is_daily_quota(exc) or attempt == 1:
                    return {"response": friendly_llm_error(exc), "action": None}
                last_exc = exc
                time.sleep(min(retry_delay_seconds(exc), 60))
                continue

            logger.exception("Chat agent failed")
            return {"response": friendly_llm_error(exc), "action": None}

    if last_exc is not None and is_quota_error(last_exc):
        return {"response": friendly_llm_error(last_exc), "action": None}

    logger.error("Gemini unreachable after retries: %s", last_exc)
    return {
        "response": (
            "I can't reach the Gemini service right now -- this is a network "
            "issue talking to generativelanguage.googleapis.com, not a "
            "database problem. The most common causes are a campus/office "
            "firewall, an active VPN, or antivirus HTTPS scanning "
            "interfering with the connection. Try again in a moment, or "
            "switch networks (e.g. a phone hotspot) to confirm before "
            "digging further."
        ),
        "action": None,
    }