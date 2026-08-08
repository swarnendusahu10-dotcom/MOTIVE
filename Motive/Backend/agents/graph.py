"""
graph.py
────────
Wires the Supervisor + 4 specialist agents + human-review node into one
LangGraph StateGraph. This is the "agents as nodes" graph the /ws/case/{id}
route (routes/case_graph.py) streams to the frontend Case Room page.

    START -> supervisor --(records_agent)--> supervisor
                        --(pattern_agent)--> supervisor
                        --(geo_agent)------> supervisor
                        --(report_agent)---> human_review --(approved)--> END
                                                           --(more work)--> pattern_agent
                        --(human_review)-----------------> ...

A MemorySaver checkpointer gives every case its own persistent thread
(keyed by case_id) — reopen the same case later and the graph resumes
with full memory of what every agent already found and said.
"""

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from agents.state import CaseState
from agents.nodes import (
    supervisor_node,
    records_node,
    pattern_node,
    geo_node,
    report_node,
    human_review_node,
    route_from_supervisor,
    route_after_human,
)

_checkpointer = MemorySaver()
_compiled = None


def build_case_graph():
    graph = StateGraph(CaseState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("records_agent", records_node)
    graph.add_node("pattern_agent", pattern_node)
    graph.add_node("geo_agent", geo_node)
    graph.add_node("report_agent", report_node)
    graph.add_node("human_review", human_review_node)

    graph.add_edge(START, "supervisor")
    graph.add_conditional_edges("supervisor", route_from_supervisor, {
        "records_agent": "records_agent",
        "pattern_agent": "pattern_agent",
        "geo_agent": "geo_agent",
        "report_agent": "report_agent",
        "human_review": "human_review",
    })
    graph.add_edge("records_agent", "supervisor")
    graph.add_edge("pattern_agent", "supervisor")
    graph.add_edge("geo_agent", "supervisor")
    graph.add_edge("report_agent", "human_review")
    graph.add_conditional_edges("human_review", route_after_human, {
        "end": END,
        "pattern_agent": "pattern_agent",
    })

    return graph.compile(checkpointer=_checkpointer)


def get_case_graph():
    global _compiled
    if _compiled is None:
        _compiled = build_case_graph()
    return _compiled


def initial_state(case_id: str, query: str) -> CaseState:
    return {
        "messages": [],
        "case_id": case_id,
        "query": query,
        "retrieved_cases": [],
        "patterns": {},
        "geo_actions": [],
        "evidence_notes": {},
        "report_draft": "",
        "linked_case_ids": [],
        "next": "records_agent",
        "turns": 0,
        "awaiting_human": False,
        "human_decision": "",
        "human_feedback": "",
        "transcript": [],
    }
