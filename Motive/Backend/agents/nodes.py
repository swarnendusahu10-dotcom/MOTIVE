"""
nodes.py
────────
Every node in the case-analysis graph (agents/graph.py). Each specialist
is a small LangGraph-prebuilt ReAct agent scoped to its own toolset —
that keeps each one honest (Records can't invent map actions, Geo can't
touch Firestore writes) and keeps the whole system easy to reason about.

Every specialist also appends a line to `transcript`, written as if it
were speaking to the Supervisor / the next agent in line — that is what
the frontend "Case Room" page renders as the live agent-to-agent chat.
"""

from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, AIMessage
from langgraph.prebuilt import create_react_agent
from langgraph.types import interrupt

from agents.state import CaseState
from agents.llm import get_llm
from agents.tools_db import DB_TOOLS
from agents.tools_geo import GEO_TOOLS
from agents.tools_pattern import PATTERN_TOOLS
from services import firebase_service as fb

MAX_TURNS = 8

# ── lazily-built ReAct sub-agents (cheap to rebuild, but no need to) ───────
_AGENT_CACHE: dict = {}


def _agent(cache_name: str, tools: list, persona: str):
    if cache_name not in _AGENT_CACHE:
        _AGENT_CACHE[cache_name] = create_react_agent(get_llm(), tools, prompt=persona)
    return _AGENT_CACHE[cache_name]


def _last_text(result: dict) -> str:
    for m in reversed(result["messages"]):
        if isinstance(m, AIMessage) and m.content:
            return m.content
    return ""


def _run_specialist(state: CaseState, cache_name: str, tools: list, persona: str, speak_to: str) -> dict:
    agent = _agent(cache_name, tools, persona)
    task = SystemMessage(content=(
        f"Case ID: {state['case_id']}. Investigation goal: {state['query']}.\n"
        f"Conversation so far between the other agents on this case:\n"
        + "\n".join(f"[{t['from_agent']} -> {t['to_agent']}] {t['text']}" for t in state.get("transcript", [])[-6:])
    ))
    result = agent.invoke({"messages": [task] + state["messages"][-4:]})
    text = _last_text(result) or "(no findings)"
    return {
        "messages": [AIMessage(content=text, name=cache_name)],
        "transcript": [{"from_agent": cache_name + "_agent", "to_agent": speak_to, "text": text}],
        "turns": state.get("turns", 0) + 1,
    }


# ── Records Agent ───────────────────────────────────────────────────────
RECORDS_PERSONA = """
You are the KSP Records Intelligence Agent.

Responsibilities:

1. Retrieve all relevant cases.
2. Retrieve evidence.
3. Retrieve historical matches.
4. Retrieve district statistics.

Rules:

- Never speculate.
- Never analyze.
- Never infer.

Return only facts found in Firestore.

Always include:

- Case ID
- District
- Crime Type
- Date
- Status

for every relevant record.
"""


def records_node(state: CaseState) -> dict:
    out = _run_specialist(state, "records", DB_TOOLS, RECORDS_PERSONA, "pattern_agent")
    return {**out, "retrieved_cases": [{"summary": out["messages"][0].content}]}


# ── Pattern Agent ────────────────────────────────────────────────────────
PATTERN_PERSONA = (
    "You are the Pattern Analysis Agent. Using the case data the Records "
    "Agent surfaced, look for temporal, geographic, and modus-operandi "
    "patterns using your tools. Always cite the specific numbers/case IDs "
    "your conclusion rests on — a human officer will check your work. If "
    "you need more data than you were given (e.g. a wider date range or a "
    "neighbouring district), say so directly, addressed to the Records "
    "Agent, so it can be fetched next turn."
)


def pattern_node(state: CaseState) -> dict:
    out = _run_specialist(state, "pattern", PATTERN_TOOLS, PATTERN_PERSONA, "report_agent")
    return {**out, "patterns": {"summary": out["messages"][0].content}}


# ── Geo Agent ─────────────────────────────────────────────────────────────
GEO_PERSONA = (
    "You are the Geo/Hotspot Agent. Decide which single map action (if "
    "any) best visualises the current finding for the officer, and call "
    "the matching tool. Keep your reply short — one action, one sentence "
    "of why."
)


def geo_node(state: CaseState) -> dict:
    out = _run_specialist(state, "geo", GEO_TOOLS, GEO_PERSONA, "report_agent")
    return {**out, "geo_actions": [{"summary": out["messages"][0].content}]}


# ── Report Agent (no tools — pure synthesis) ────────────────────────────
def report_node(state: CaseState) -> dict:
    llm = get_llm(temperature=0.3)
    transcript_text = "\n".join(
        f"[{t['from_agent']} -> {t['to_agent']}] {t['text']}" for t in state.get("transcript", [])
    )
    prompt = (
        f"You are the Report Agent. Write a concise case-linkage report for "
        f"case {state['case_id']} (goal: {state['query']}) for a KSP officer to "
        f"review. Base it ONLY on the findings below — do not invent facts. "
        f"End with a clear 'Recommendation' line.\n\n{transcript_text}"
    )
    response = llm.invoke(prompt)
    draft = response.content
    return {
        "messages": [AIMessage(content=draft, name="report_agent")],
        "report_draft": draft,
        "transcript": [{"from_agent": "report_agent", "to_agent": "human_review", "text": draft}],
        "turns": state.get("turns", 0) + 1,
    }


# ── Human-in-the-loop review ─────────────────────────────────────────────
def human_review_node(state: CaseState) -> dict:
    """Pauses the graph and waits for an officer to approve, reject, or
    send back feedback via the /ws/case/{case_id} socket. Resumed with
    Command(resume={"decision": ..., "feedback": ...})."""
    decision = interrupt({
        "type": "human_review_required",
        "case_id": state["case_id"],
        "report_draft": state["report_draft"],
        "message": "Officer review required before this link is saved as an official lead.",
    })
    if decision.get("decision") == "approve":
        fb.save_draft_report(
            case_id=state["case_id"],
            report_text=state["report_draft"],
            patterns=state.get("patterns", {}),
            linked_case_ids=state.get("linked_case_ids", []),
        )
        fb.review_report(state["case_id"], approved=True, reviewer=decision.get("reviewer", "officer"))
    return {
        "human_decision": decision.get("decision", "reject"),
        "human_feedback": decision.get("feedback", ""),
        "transcript": [{"from_agent": "officer", "to_agent": "report_agent",
                         "text": decision.get("feedback") or decision.get("decision", "")}],
    }


# ── Supervisor ────────────────────────────────────────────────────────────
class RouteDecision(BaseModel):
    next: Literal["records_agent", "pattern_agent", "geo_agent", "report_agent", "human_review"] = Field(
        description="Which agent should act next."
    )
    reason: str = Field(description="One short sentence explaining the routing choice.")


def supervisor_node(state: CaseState) -> dict:
    if state.get("turns", 0) >= MAX_TURNS:
        return {"next": "report_agent"}

    llm = get_llm(temperature=0)
    router = llm.with_structured_output(RouteDecision)
    transcript_text = "\n".join(
        f"[{t['from_agent']} -> {t['to_agent']}] {t['text'][:300]}" for t in state.get("transcript", [])
    ) or "(nothing yet)"
    decision: RouteDecision = router.invoke(
        "You are the Supervisor coordinating a police case-analysis team.\n"
        f"Investigation goal: {state['query']}\n"
        f"Agents that have already spoken:\n{transcript_text}\n\n"
        "Route to records_agent first if no case data has been retrieved yet. "
        "Route to pattern_agent once case data exists. Route to geo_agent only "
        "if a map visual would help. Route to report_agent once patterns have "
        "been found. Route to human_review only after report_agent has produced "
        "a draft."
    )
    return {
        "next": decision.next,
        "transcript": [{"from_agent": "supervisor", "to_agent": decision.next, "text": decision.reason}],
    }


def route_from_supervisor(state: CaseState) -> str:
    return state.get("next", "records_agent")


def route_after_human(state: CaseState) -> str:
    if state.get("human_decision") == "approve":
        return "end"
    if state.get("turns", 0) >= MAX_TURNS:
        return "end"
    return "pattern_agent"
