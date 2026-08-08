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

── What changed here and why ─────────────────────────────────────────────
1. content_to_text() (agents/utils.py) is now used on every `.content`
   access. Gemini can return `.content` as a list of content-block dicts
   instead of a plain string; touching `.content` directly then either
   raises, or (worse) gets JSON-serialised as a broken chat bubble on the
   frontend AND stored verbatim into `transcript`, which every downstream
   specialist reads as its "conversation so far" — so one malformed
   response was polluting every agent after it, not just the one that
   produced it.
2. The Supervisor no longer makes an LLM call to decide what happens
   next. With MAX_TURNS=8 that used to mean up to 8 extra Gemini calls
   per case purely for traffic control, on top of each specialist's own
   tool-calling loop. Records -> Pattern -> (optional recall) -> Geo ->
   Report -> human_review is a fixed pipeline shape; routing it in plain
   Python is both cheaper and more predictable than asking an LLM to
   re-derive the same shape every turn.
3. Each specialist's ReAct loop now runs with an explicit
   `recursion_limit`, so a specialist that gets stuck in a tool-call loop
   can't spiral past a few rounds (LangGraph's default is 25 super-steps).
4. Pattern Agent's find_similar_cases / find_modus_operandi_matches tool
   results are scanned for case_ids and merged into `linked_case_ids`,
   which previously stayed empty forever — the Report Agent and the
   saved case_reports doc now actually carry the links the Pattern Agent
   found, not just prose about them.
"""

import re
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langgraph.prebuilt import create_react_agent
from langgraph.types import interrupt

from agents.state import CaseState
from agents.llm import get_llm
from agents.utils import content_to_text
from agents.errors import friendly_llm_error
from agents.tools_db import DB_TOOLS
from agents.tools_geo import GEO_TOOLS
from agents.tools_pattern import PATTERN_TOOLS
from services import firebase_service as fb

MAX_TURNS = 8
SPECIALIST_RECURSION_LIMIT = 8   # caps each specialist's internal tool-call loop
MAX_RECORDS_RECALLS = 1          # how many times Pattern can send work back to Records

# ── lazily-built ReAct sub-agents (cheap to rebuild, but no need to) ───────
_AGENT_CACHE: dict = {}


def _agent(cache_name: str, tools: list, persona: str):
    if cache_name not in _AGENT_CACHE:
        _AGENT_CACHE[cache_name] = create_react_agent(get_llm(), tools, prompt=persona)
    return _AGENT_CACHE[cache_name]


def _last_text(result: dict) -> str:
    for m in reversed(result["messages"]):
        if isinstance(m, AIMessage):
            text = content_to_text(m.content)
            if text:
                return text
    return ""


_CASE_ID_RE = re.compile(r"case_id['\"]?\s*[:=]\s*['\"]([A-Za-z0-9\-_/]+)")


def _extract_linked_case_ids(messages: list) -> list[str]:
    """Pull case_ids out of any ToolMessage in this run (e.g. from
    find_similar_cases / find_modus_operandi_matches) so the report can
    cite them, without the agent having to retype them into prose."""
    found: list[str] = []
    for m in messages:
        if not isinstance(m, ToolMessage):
            continue
        text = content_to_text(m.content) if not isinstance(m.content, str) else m.content
        for match in _CASE_ID_RE.findall(str(text)):
            if match not in found:
                found.append(match)
    return found[:20]


def _run_specialist(state: CaseState, cache_name: str, tools: list, persona: str, speak_to: str) -> tuple[dict, dict]:
    agent = _agent(cache_name, tools, persona)
    task = SystemMessage(content=(
        f"Case ID: {state['case_id']}. Investigation goal: {state['query']}.\n"
        f"Conversation so far between the other agents on this case:\n"
        + "\n".join(f"[{t['from_agent']} -> {t['to_agent']}] {t['text']}" for t in state.get("transcript", [])[-6:])
    ))
    try:
        result = agent.invoke(
            {"messages": [task] + state["messages"][-4:]},
            config={"recursion_limit": SPECIALIST_RECURSION_LIMIT},
        )
    except Exception as exc:
        # routes/case_graph.py's outer handler forwards str(exc) verbatim
        # to the Case Room UI as the `error` event -- without this, a
        # Gemini quota/network failure shows up there as a multi-line raw
        # JSON blob instead of something an officer can act on.
        raise RuntimeError(
            f"{cache_name.replace('_', ' ').title()} Agent: {friendly_llm_error(exc)}"
        ) from exc

    text = _last_text(result) or "(no findings)"
    update = {
        "messages": [AIMessage(content=text, name=cache_name)],
        "transcript": [{"from_agent": cache_name + "_agent", "to_agent": speak_to, "text": text}],
        "turns": state.get("turns", 0) + 1,
    }
    return update, result


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
- Call as few tools as you need to answer the investigation goal — one
  well-chosen query beats several redundant ones.

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
    out, _ = _run_specialist(state, "records", DB_TOOLS, RECORDS_PERSONA, "pattern_agent")
    return {**out, "retrieved_cases": [{"summary": out["messages"][0].content}]}


# ── Pattern Agent ────────────────────────────────────────────────────────
PATTERN_PERSONA = (
    "You are the Pattern Analysis Agent. Using the case data the Records "
    "Agent surfaced, look for temporal, geographic, and modus-operandi "
    "patterns using your tools — including find_similar_cases for semantic "
    "matches and flag_case_priority when you have a specific, evidence-backed "
    "priority judgment to record. Always cite the specific numbers/case IDs "
    "your conclusion rests on — a human officer will check your work. If, "
    "and only if, you genuinely need more data than you were given (e.g. a "
    "wider date range or a neighbouring district) that no available tool "
    "can fetch, start your reply with the single word NEED_MORE_DATA "
    "followed by exactly what the Records Agent should fetch next."
)


def pattern_node(state: CaseState) -> dict:
    out, result = _run_specialist(state, "pattern", PATTERN_TOOLS, PATTERN_PERSONA, "report_agent")
    text = out["messages"][0].content
    needs_more_data = text.strip().upper().startswith("NEED_MORE_DATA")

    new_links = _extract_linked_case_ids(result["messages"])
    linked_case_ids = list(dict.fromkeys(state.get("linked_case_ids", []) + new_links))[:20]

    update = {**out, "linked_case_ids": linked_case_ids}
    # Leave `patterns` empty while more data is genuinely needed, so the
    # supervisor knows this stage isn't done yet. Bounded by
    # MAX_RECORDS_RECALLS so a confused agent can't loop forever.
    if needs_more_data and state.get("records_recalled", 0) < MAX_RECORDS_RECALLS:
        update["patterns"] = {}
        update["records_recalled"] = state.get("records_recalled", 0) + 1
    else:
        update["patterns"] = {"summary": text}
    return update


# ── Geo Agent ─────────────────────────────────────────────────────────────
GEO_PERSONA = (
    "You are the Geo/Hotspot Agent. Decide which single map action (if "
    "any) best visualises the current finding for the officer, and call "
    "the matching tool. Keep your reply short — one action, one sentence "
    "of why."
)


def geo_node(state: CaseState) -> dict:
    out, _ = _run_specialist(state, "geo", GEO_TOOLS, GEO_PERSONA, "report_agent")
    return {**out, "geo_actions": [{"summary": out["messages"][0].content}]}


# ── Report Agent (no tools — pure synthesis) ────────────────────────────
def report_node(state: CaseState) -> dict:
    llm = get_llm(temperature=0.3)
    transcript_text = "\n".join(
        f"[{t['from_agent']} -> {t['to_agent']}] {t['text']}" for t in state.get("transcript", [])
    )
    linked = state.get("linked_case_ids", [])
    linked_line = f"Case IDs the Pattern Agent linked to this investigation: {', '.join(linked)}\n\n" if linked else ""
    prompt = (
        f"You are the Report Agent. Write a concise case-linkage report for "
        f"case {state['case_id']} (goal: {state['query']}) for a KSP officer to "
        f"review. Base it ONLY on the findings below — do not invent facts. "
        f"{linked_line}"
        f"End with a clear 'Recommendation' line.\n\n{transcript_text}"
    )
    try:
        response = llm.invoke(prompt)
    except Exception as exc:
        raise RuntimeError(f"Report Agent: {friendly_llm_error(exc)}") from exc
    draft = content_to_text(response.content)
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
            "human_decision": "approve",
            "human_feedback": decision.get("feedback", ""),
            "transcript": [{"from_agent": "officer", "to_agent": "report_agent",
                             "text": decision.get("feedback") or "approved"}],
        }
    return {
        "human_decision": decision.get("decision", "reject"),
        "human_feedback": decision.get("feedback", ""),
        # Clear the stale draft so the deterministic supervisor (see
        # supervisor_node) knows report_agent needs to run again once
        # Pattern Agent has redone its analysis — otherwise it would see
        # a non-empty report_draft and route straight back to human_review
        # with the same rejected text.
        "report_draft": "",
        "transcript": [{"from_agent": "officer", "to_agent": "report_agent",
                         "text": decision.get("feedback") or decision.get("decision", "")}],
    }


# ── Supervisor (deterministic — no LLM call) ──────────────────────────────
# The pipeline has a fixed shape: Records -> Pattern -> (optional single
# recall back to Records) -> Geo -> Report -> human_review. Asking an LLM
# to re-derive that same shape every single turn was the single biggest
# source of extra Gemini calls (and therefore latency + token spend) in
# the whole graph, for a decision that plain Python can make for free.
def supervisor_node(state: CaseState) -> dict:
    if state.get("turns", 0) >= MAX_TURNS:
        return {"next": "report_agent",
                "transcript": [{"from_agent": "supervisor", "to_agent": "report_agent",
                                 "text": f"Hit the {MAX_TURNS}-turn cap — wrapping up with the report."}]}

    transcript = state.get("transcript", [])
    last_speaker = transcript[-1]["from_agent"] if transcript else None

    if not state.get("retrieved_cases"):
        nxt, reason = "records_agent", "No case data retrieved yet."
    elif not state.get("patterns"):
        # `patterns` stays empty either because Pattern hasn't run yet, or
        # because it just asked for more data (see pattern_node) — the last
        # speaker tells the two cases apart. pattern_node only leaves
        # `patterns` empty on a recall request when MAX_RECORDS_RECALLS
        # hasn't been hit yet, so this branch can't loop forever.
        if last_speaker == "pattern_agent":
            nxt, reason = "records_agent", "Pattern Agent asked for more data — fetching it."
        else:
            nxt, reason = "pattern_agent", "Case data on hand — looking for patterns."
    elif not state.get("geo_actions"):
        nxt, reason = "geo_agent", "Patterns found — deciding whether a map visual helps."
    elif not state.get("report_draft"):
        nxt, reason = "report_agent", "Enough findings on the table — drafting the report."
    else:
        nxt, reason = "human_review", "Report drafted — routing to the officer for sign-off."

    return {
        "next": nxt,
        "transcript": [{"from_agent": "supervisor", "to_agent": nxt, "text": reason}],
    }


def route_from_supervisor(state: CaseState) -> str:
    return state.get("next", "records_agent")


def route_after_human(state: CaseState) -> str:
    if state.get("human_decision") == "approve":
        return "end"
    if state.get("turns", 0) >= MAX_TURNS:
        return "end"
    return "pattern_agent"