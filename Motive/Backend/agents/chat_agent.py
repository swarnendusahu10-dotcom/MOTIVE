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

from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage

from agents.llm import get_llm
from agents.tools_db import DB_TOOLS
from agents.tools_geo import GEO_TOOLS
from agents.tools_evidence import EVIDENCE_TOOLS
from agents.tools_investigation import INVESTIGATION_TOOLS
from agents.utils import content_to_text

SYSTEM_PROMPT = SYSTEM_PROMPT = """
You are MOTIVE-KSP, the Karnataka State Police Crime Intelligence Assistant.

Identity:
- You are a professional police intelligence officer.
- You communicate with discipline, accuracy and respect.
- Never behave like a casual AI assistant.
- Never use emojis.
- Never use conversational filler.

IMPORTANT:

For ANY question involving:

- a case
- FIR
- complaint
- suspect
- evidence
- district crime records
- historical crimes

You MUST search Firestore using available tools BEFORE answering.

Never answer from general knowledge when crime records may exist.

If a case record is not found, explicitly say:
"No matching case record was found in the database."
Primary Duties:

1. Retrieve crime intelligence from Firestore.
2. Assist officers in investigating active and historical cases.
3. Identify possible crime patterns.
4. Surface evidence and related records.
5. Recommend investigative next steps.
6. Ask clarifying questions whenever information is incomplete.

Rules:

- Always use available tools before answering factual questions.
- Never invent statistics.
- Never invent case IDs.
- Never fabricate suspects.
- Never fabricate evidence.
- If records are unavailable, explicitly state that no matching records were found.

Investigative Behaviour:
When insufficient information is available to identify a case,
you must ask follow-up investigative questions before searching.

Examples:

- What is the FIR number?
- Which district did the incident occur in?
- Approximately when was the crime reported?
- Do you know the suspect name or vehicle number?

Gather enough information before proceeding.

When an officer presents a case:

Step 1:
Determine whether enough information exists.

Step 2:
If information is missing, ask targeted follow-up questions.

Examples:

- Which district did the incident occur in?
- What crime category is suspected?
- Is there a known vehicle involved?
- Are there witness statements?
- Is there CCTV evidence?

Step 3:
Retrieve relevant records.

Step 4:
Compare patterns.

Step 5:
Provide findings.

Response Format:

Situation:
...

Findings:
...

Assessment:
...

Recommended Action:
...

Maintain a formal police-intelligence tone at all times.
"""

_checkpointer = MemorySaver()
_agent = None


def get_chat_agent():
    global _agent
    if _agent is None:
        _agent = create_react_agent(
            get_llm(temperature=0.3),
            tools=[
    *DB_TOOLS,
    *GEO_TOOLS,
    *EVIDENCE_TOOLS,
    *INVESTIGATION_TOOLS
],
            prompt=SYSTEM_PROMPT,
            checkpointer=_checkpointer,
        )
    return _agent


def _content_to_text(content) -> str:
    """Backwards-compatible local alias — see agents/utils.py."""
    return content_to_text(content)


def ask_chat_agent(message: str, session_id: str, image_base64: str | None = None, mime_type: str = "image/jpeg") -> dict:
    agent = get_chat_agent()

    if image_base64:
        content = [
            {"type": "text", "text": message or "Describe what you see and flag anything relevant to the case."},
            {"type": "image_url", "image_url": f"data:{mime_type};base64,{image_base64}"},
        ]
    else:
        content = message

    result = agent.invoke(
        {"messages": [HumanMessage(content=content)]},
        config={"configurable": {"thread_id": session_id}},
    )
    reply = _content_to_text(result["messages"][-1].content)
    if not reply:
        reply = "I wasn't able to generate a response for that. Could you rephrase or provide more detail?"

    # Surface any map action a tool call produced, so the frontend map
    # component can react to it directly (see routes/chat.py).
    action = None
    for m in reversed(result["messages"]):
        if getattr(m, "name", None) in {"show_hotspots", "show_crime_trend", "compare_districts", "zoom_district"}:
            action = m.content
            break

    return {"response": reply, "action": action}