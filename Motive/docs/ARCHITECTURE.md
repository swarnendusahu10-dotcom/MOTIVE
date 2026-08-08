# MOTIVE — Architecture

MOTIVE is a Karnataka State Police (KSP) crime-intelligence platform: a
FastAPI backend + React frontend, backed by Firestore, with two AI
surfaces built on Gemini via LangChain/LangGraph — a single front-desk
chatbot and a multi-agent case-investigation graph.

## Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python), uvicorn |
| Frontend | React (Vite), custom hooks for chat + the agent websocket |
| Database | Google Firestore (single source of truth) |
| LLM | Gemini (`gemini-2.5-flash`), via `langchain-google-genai` |
| Agent orchestration | LangGraph (`create_react_agent` for single agents, a `StateGraph` for the multi-agent Case Room) |
| Embeddings | Gemini `text-embedding-004`, for case-similarity search |
| Observability | LangSmith (optional, enabled when `LANGCHAIN_API_KEY` is set) |

## Data model

Everything lives in one Firestore collection, `crimes`, so every
producer (the FIR-entry wizard, bulk dataset loads, agent writes) and
every consumer (REST routes, chatbot tools, Case Room tools) reads and
writes the exact same shape — there is no second collection an agent
tool can silently miss.

```
crimes/{crimeId}
    case_id, district, taluk, crime_type, crime_subcategory, severity,
    description, status, date (ISO string), location {lat, lng},
    reported_by, created_at
    + the full nested FIR (fir_information, crime_classification,
      incident_details, victims, suspects, evidence, witnesses,
      narrative) from the 8-step entry wizard
    + embedding (768-float vector, optional — written by POST /cases/embed,
      stripped from every agent-facing read; see "Internal-only fields" below)
    + ai_priority_suggestion {priority, reason, suggested_by, suggested_at}
      (optional — written by the Pattern Agent's flag_case_priority tool,
      advisory only, never overwrites status)

crimes/{crimeId}/evidence/{evidenceId}
    kind ("image" | "document" | "note"), summary, extracted_entities,
    created_at

case_reports/{case_id}
    report_text, patterns, linked_case_ids, status ("draft" | "approved" | "rejected"),
    created_at, reviewed_by, reviewed_at
```

`services/firebase_service.py` is the only module that touches
Firestore directly. REST routes and every LangChain tool wrap its
functions, so the human-facing API and the agents never drift out of
sync.

### Internal-only fields

`embedding` exists for semantic-similarity search, not for an LLM to
read as text. `firebase_service._sanitize()` strips it from every
generic read (`get_crime_record`, `list_recent_crimes`,
`query_by_district`, `query_by_crime_type`, …) before the record leaves
the module. The one tool that needs the actual vector — Pattern Agent's
`find_similar_cases` — reads it through `get_embedding()` /
`list_case_embeddings()`, which are called only from that tool and
never hand the raw vector back to an LLM; the tool returns similarity
scores, not vectors.

## Two AI surfaces

### 1. Chatbot (`POST /chat`, `agents/chat_agent.py`)

A single `create_react_agent` (Gemini + DB tools + Geo tools + the
multimodal Evidence tool), checkpointed per browser session. This is
the "general front desk" — one officer question, one focused tool call
or two, one answer. Its narrow, direct tool use is why it stayed
responsive even while the multi-agent graph was breaking.

### 2. Case Room (`/ws/case/{case_id}`, `agents/graph.py`)

A `StateGraph` of five nodes for a full multi-case investigation:

```
START -> supervisor -> records_agent   -> supervisor
                     -> pattern_agent   -> supervisor
                     -> geo_agent       -> supervisor
                     -> report_agent    -> human_review -> END (approved)
                                                         -> pattern_agent (revise)
```

- **Supervisor** — deterministic Python router (see "What changed"
  below), not an LLM call. The pipeline has a fixed shape: fetch data,
  find patterns (with at most one bounded recall back to Records if
  Pattern genuinely needs more), visualise, draft, review.
- **Records Agent** — read-only Firestore retrieval (`agents/tools_db.py`).
  Never speculates or analyses.
- **Pattern Agent** — frequency-based pattern tools (temporal, geo
  clusters, keyword-overlap MO matching) plus two judgment tools:
  `find_similar_cases` (embedding similarity) and `flag_case_priority`
  (writes an advisory suggestion, never touches officer-owned fields).
  See `AGENTS_AND_SKILLS.md`.
- **Geo Agent** — picks one map action for the frontend (`MapConnect.jsx`
  already knows how to render the four action types); no Firestore
  writes.
- **Report Agent** — pure synthesis, no tools; writes a report grounded
  only in the transcript, citing the case IDs the Pattern Agent linked.
- **Human review** — a LangGraph `interrupt()` that pauses the graph
  until an officer approves/rejects over the same websocket. Only an
  approval persists the report to `case_reports`.

A `MemorySaver` checkpointer gives each `case_id` its own persistent
thread, so reopening a case resumes with full memory of what every
agent already found.

## What changed (agent-reliability fixes)

The Case Room graph was breaking (stalling, garbled output, silent
"no cases found" results) while the chatbot kept working, for four
concrete reasons — all fixed in this pass:

1. **Embedding leak** — `POST /cases/embed` stores a 768-float vector
   on the case doc; every read tool was returning it raw. Fixed by
   `firebase_service._sanitize()`.
2. **List-content bug not applied to the graph** — `agents/utils.py`'s
   `content_to_text()` existed for exactly this (Gemini sometimes
   returns `.content` as a list of blocks, not a string) but
   `agents/nodes.py` and `agents/chat_agent.py` were still touching
   `.content` raw. Now routed through `content_to_text()` everywhere.
3. **Brittle exact-match Firestore queries** — `district`/`crime_type`
   lookups used `==`, so any casing/whitespace mismatch silently
   returned zero rows. Fixed with a bounded case-insensitive fallback
   scan in `firebase_service.py`.
4. **Supervisor burning an LLM call every turn just to route** —
   replaced with a deterministic Python router (`supervisor_node` in
   `agents/nodes.py`), since the pipeline shape is fixed. Each
   specialist's own ReAct tool-call loop is also now capped
   (`recursion_limit`) so a stuck specialist can't spiral.

List-returning tools (`investigate_case`, `query_crimes_by_district`,
etc.) were also trimmed to return summary fields instead of full
nested FIRs (which include victim/suspect PII), cutting the dominant
remaining source of token spend per tool call.

## Known limitation (not fixed in this pass)

`routes/case_graph.py`'s websocket handler calls `graph.stream()`
synchronously inside an `async def` route, which blocks the event loop
for the duration of a case run — every other request (chat, other
Case Room sessions) stalls until it returns. `routes/crime_data.py`
already avoids this by using plain `def` routes so FastAPI offloads
them to a thread pool; the websocket handler would need the same
treatment (e.g. `anyio.to_thread.run_sync`) to be safe under concurrent
officers. Left out of this pass to avoid touching the live-streaming
behaviour without dedicated testing — worth doing before a real
multi-user deployment.
