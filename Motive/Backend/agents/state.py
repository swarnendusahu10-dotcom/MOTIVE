"""
state.py
────────
Shared state object that flows through every node of the multi-agent
case-analysis graph (agents/graph.py). Every agent reads what it needs
from this dict and writes its findings back into it — LangGraph merges
the returned partial dict into the running state after each node.
"""

from typing import Annotated, TypedDict
from langgraph.graph.message import add_messages


class Speak(TypedDict):
    """One line of the agent-to-agent conversation, shaped for the
    frontend 'Case Room' graph page to render as a chat bubble between
    two nodes."""
    from_agent: str
    to_agent: str
    text: str


class CaseState(TypedDict):
    # LangChain message history for the underlying LLM calls (memory)
    messages: Annotated[list, add_messages]

    case_id: str
    query: str                     # the officer's question / investigation goal

    retrieved_cases: list[dict]    # from Records Agent
    patterns: dict                 # from Pattern Agent
    geo_actions: list[dict]        # from Geo Agent (map commands for the frontend)
    evidence_notes: dict           # from Evidence Agent (multimodal extraction)

    report_draft: str              # from Report Agent
    linked_case_ids: list[str]

    next: str                      # supervisor's routing decision
    turns: int                     # loop guard

    # human-in-the-loop
    awaiting_human: bool
    human_decision: str            # "approve" | "reject" | ""
    human_feedback: str

    transcript: Annotated[list[Speak], lambda a, b: a + b]  # agent<->agent chat log
