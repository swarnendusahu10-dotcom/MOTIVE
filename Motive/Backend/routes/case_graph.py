"""
case_graph.py
──────────────
WebSocket endpoint: /ws/case/{case_id}

Protocol (all messages are JSON):

  client -> server   {"type": "start", "query": "Why do these three cases look linked?"}
  server -> client    {"type": "agent_message", "from": "supervisor", "to": "records_agent", "text": "..."}
                       (repeated, one per agent turn, as the graph runs)
  server -> client    {"type": "human_review_required", "report_draft": "...", "message": "..."}
  client -> server    {"type": "human_decision", "decision": "approve"|"reject", "feedback": "..."}
                       (graph resumes and keeps streaming agent_message events)
  server -> client    {"type": "done", "status": "approved"|"rejected"|"max_turns"}

The frontend AgentNetwork page uses `from`/`to` to animate a pulse along
the matching edge of the node graph and drops each message into the live
chat feed as a bubble from that agent.
"""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langgraph.types import Command

from agents.graph import get_case_graph, initial_state

router = APIRouter()
logger = logging.getLogger("motive.case_graph")


async def _drain_updates(ws: WebSocket, stream):
    """Push every transcript line produced by a graph.stream() run to the
    socket as it's generated."""
    for chunk in stream:
        for node_name, partial in chunk.items():
            if not isinstance(partial, dict):
                continue
            for line in partial.get("transcript", []):
                await ws.send_text(json.dumps({
                    "type": "agent_message",
                    "from": line["from_agent"],
                    "to": line["to_agent"],
                    "text": line["text"],
                }))


@router.websocket("/ws/case/{case_id}")
async def case_socket(ws: WebSocket, case_id: str):
    await ws.accept()
    graph = get_case_graph()
    config = {"configurable": {"thread_id": case_id}}

    try:
        raw = await ws.receive_text()
        start_msg = json.loads(raw)
        query = start_msg.get("query", "Analyse this case for patterns and possible links.")

        await _drain_updates(ws, graph.stream(initial_state(case_id, query), config, stream_mode="updates"))

        # ── did the graph pause for human review? ──
        snapshot = graph.get_state(config)
        while snapshot.next:
            interrupts = snapshot.tasks[0].interrupts if snapshot.tasks else ()
            payload = interrupts[0].value if interrupts else {"report_draft": "", "message": "Review required."}
            await ws.send_text(json.dumps({
                "type": "human_review_required",
                "report_draft": payload.get("report_draft", ""),
                "message": payload.get("message", ""),
            }))

            raw = await ws.receive_text()
            decision_msg = json.loads(raw)
            decision = {
                "decision": decision_msg.get("decision", "reject"),
                "feedback": decision_msg.get("feedback", ""),
                "reviewer": decision_msg.get("reviewer", "officer"),
            }

            await _drain_updates(ws, graph.stream(Command(resume=decision), config, stream_mode="updates"))
            snapshot = graph.get_state(config)

        final_state = snapshot.values
        await ws.send_text(json.dumps({
            "type": "done",
            "status": "approved" if final_state.get("human_decision") == "approve" else "ended",
        }))

    except WebSocketDisconnect:
        return
    except Exception as exc:  # surface backend errors to the frontend instead of a silent drop
        # Belt-and-suspenders: agents/nodes.py already logs+cleans up LLM
        # failures before they get here, but this catches anything else
        # (a bad Firestore write, a bug in graph.py, etc.) that would
        # otherwise vanish the moment it's swallowed into the websocket
        # error event below.
        logger.exception("Case Room graph run failed for case %s", case_id)
        try:
            await ws.send_text(json.dumps({"type": "error", "message": str(exc)}))
        except Exception:
            pass