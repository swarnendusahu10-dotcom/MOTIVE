# DEmo link of frontend
motives-eight.vercel.app



# Motive-KSP — Crime Intelligence Platform

An AI-assisted crime intelligence platform built for the Karnataka State Police (KSP): officers file and browse FIRs (First Information Reports), ask a chatbot investigative questions, and run a multi-agent "Case Room" that retrieves records, finds patterns, suggests map visualisations, and drafts a linkage report for human sign-off before anything becomes an official lead.

```
Frontend (React + MapLibre)  <---->  Backend (FastAPI + LangGraph + Gemini)  <---->  Firestore
```

---

## Table of contents

- [Architecture overview](#architecture-overview)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [1. Firebase](#1-firebase)
  - [2. Backend](#2-backend)
  - [3. Frontend](#3-frontend)
- [Environment variables](#environment-variables)
- [Firestore data model](#firestore-data-model)
- [The two agent surfaces](#the-two-agent-surfaces)
  - [Chatbot (`/chat`)](#chatbot-chat)
  - [Case Room multi-agent graph (`/ws/case/{case_id}`)](#case-room-multi-agent-graph-wscasecase_id)
- [REST API reference](#rest-api-reference)
- [WebSocket protocol (`/ws/case/{case_id}`)](#websocket-protocol-wscasecase_id)
- [Running the app](#running-the-app)
- [Security status — read before deploying](#security-status--read-before-deploying)
- [Known issues / cleanup TODO](#known-issues--cleanup-todo)

---

## Architecture overview

There are two independent AI surfaces, both backed by the same Firestore data:

1. **Chatbot** — a single ReAct agent (Gemini 2.5 Flash + tools) for quick, one-off officer questions. Session-scoped memory, optional image upload for on-the-fly evidence questions.
2. **Case Room** — a four-specialist LangGraph pipeline (Records → Pattern → Geo → Report) coordinated by a deterministic supervisor, that pauses for a **human-in-the-loop review** before any finding is saved as an official case report.

Both read/write the same `crimes` collection in Firestore through one shared data-access module (`services/firebase_service.py`), so the chatbot, the REST API, and the agent graph can never see inconsistent data.

```
                         ┌─────────────────────────┐
  Officer (Chatbot) ───► │   /chat  (ReAct agent)   │──┐
                         └─────────────────────────┘  │
                                                        ▼
                         ┌─────────────────────────────────────┐
                         │            Firestore                │
                         │  crimes/{id}, crimes/{id}/evidence,  │
                         │  case_reports/{case_id}              │
                         └─────────────────────────────────────┘
                                                        ▲
                         ┌─────────────────────────┐   │
  Officer (Case Room) ─► │ /ws/case/{id} (LangGraph) │──┘
                         │ supervisor → records →    │
                         │ pattern → geo → report →   │
                         │ human_review (pause/resume)│
                         └─────────────────────────┘
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI (Python) |
| Agent orchestration | LangGraph + LangChain |
| LLM | Google Gemini 2.5 Flash (chat + vision), `text-embedding-004` (similarity) |
| Database | Firebase Firestore (via `firebase-admin`) |
| Observability | LangSmith tracing (optional) |
| Frontend framework | React 19 + React Router 7 |
| Map | MapLibre GL + Turf.js |
| Charts / animation | Chart.js, Framer Motion |
| Build tool | Vite |

---

## Project structure

```
Backend/
├── app.py                    # FastAPI app entrypoint, CORS, global error handler
├── config.py                 # Loads .env, initialises Firebase Admin + Gemini + LangSmith
├── agents/
│   ├── chat_agent.py          # Single ReAct agent behind /chat
│   ├── graph.py                # Builds the Case Room LangGraph (supervisor + 4 specialists)
│   ├── nodes.py                 # Every node's logic (supervisor, records, pattern, geo, report, human_review)
│   ├── state.py                  # CaseState — the shared dict that flows through the graph
│   ├── llm.py                     # Shared Gemini chat/vision model factory
│   ├── tools_db.py                 # Firestore read tools (Records Agent + Chatbot)
│   ├── tools_pattern.py             # Pattern-finding + similarity + priority-flagging tools (Pattern Agent)
│   ├── tools_geo.py                  # Map-action tools (Geo Agent + Chatbot)
│   ├── tools_evidence.py              # Multimodal image-evidence extraction tool
│   ├── tools_investigation.py          # "Ask for more info" tool (Chatbot)
│   └── utils.py                         # content_to_text() — normalises Gemini's message content
├── services/
│   ├── firebase_service.py    # ALL Firestore reads/writes go through this module
│   └── embedding_service.py   # Generates text embeddings for case-similarity search
├── routes/
│   ├── chat.py                # POST /chat
│   ├── crime_data.py          # FIR wizard submit/list/get endpoints
│   ├── cases.py                # Case listing, report/evidence lookup, embedding endpoint
│   └── case_graph.py            # WebSocket /ws/case/{case_id} — drives the Case Room
└── requirements.txt

Frontend/
├── src/
│   ├── App.jsx                     # Routes
│   ├── lib/api.js                   # REST client for the backend
│   ├── hooks/
│   │   ├── useMap.js                  # Karnataka district/taluk MapLibre map
│   │   └── useAgentSocket.js           # WebSocket client for the Case Room
│   └── components/
│       ├── Home.jsx, TopBar.jsx, DistrictList.jsx, OverviewStats.jsx, AlertFeed.jsx
│       ├── MapConnect.jsx, MapControls.jsx, DetailPanel.jsx
│       ├── Chatbot.jsx, ChatInput.jsx        # /chat UI
│       ├── AgentNetwork.jsx                    # Case Room — live graph visualisation
│       ├── CrimeDataEntry.jsx                    # FIR submission wizard
│       └── AccessRequest.jsx                      # Officer access-request form (UI only — not yet wired to a backend auth flow)
└── package.json
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A Firebase project with Firestore enabled
- A Google AI Studio (Gemini) API key
- (Optional) A LangSmith account, for tracing

---

## Setup

### 1. Firebase

1. Firebase Console → Project Settings → Service Accounts → **Generate new private key**. This downloads a JSON file.
2. Save it somewhere on disk (do **not** commit it to git).
3. Enable Firestore in the same project, in Native mode.

### 2. Backend

```bash
cd Backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `Backend/.env` (see [Environment variables](#environment-variables) below), then start the server:

```bash
uvicorn app:app --reload --port 8000
```

On boot, `config.py` prints whether it found `GEMINI_API_KEY` and which model names are configured — check this output first if anything looks broken.

### 3. Frontend

```bash
cd Frontend
npm install
npm run dev
```

By default the dev server proxies to `http://localhost:8000` — check `src/lib/api.js` if your backend runs on a different host/port.

---

## Environment variables

Create `Backend/.env`:

```bash
# Gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-2.5-flash

# Firebase — pick ONE of the two options below
FIREBASE_CREDENTIALS_PATH=/absolute/path/to/serviceAccountKey.json
# FIREBASE_CREDENTIALS_JSON={"type": "service_account", ...}   # full JSON as one line, e.g. for hosting platforms without file uploads

# LangSmith (optional — tracing)
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=Motive-KSP
```

If `GEMINI_API_KEY` or the Firebase credentials are missing, the backend still boots (so you can fix config without restarting blind), but every Firestore/Gemini call will fail with a clear error until they're set.

---

## Firestore data model

Everything lives in **one collection**, `crimes`, so the REST API, the chatbot, and every agent tool always see the same data — there is no separate/duplicate schema anywhere in the working system.

```
crimes/{case_id}
├── case_id, district, taluk, crime_type, crime_subcategory, severity
├── description, date (ISO string), status ("open" | ...), reported_by
├── location: { lat, lng }
├── created_at
├── embedding: float[]                     # optional — set by POST /cases/embed
├── ai_priority_suggestion, ai_priority_reason,
│   ai_priority_set_by, ai_priority_set_at  # optional — written by the Pattern Agent, never overrides officer-set fields
│
├── fir_information, crime_classification, incident_details,
│   victims[], suspects[], evidence[], witnesses[], narrative
│                                            # full nested FIR wizard payload, stored alongside the flat
│                                            # fields above so no detail is lost — agents drill into this
│                                            # via get_case_by_id when they need full detail
│
└── evidence/{evidenceId}                  # subcollection
    ├── kind ("image" | "document" | "note")
    ├── summary, extracted_entities
    └── created_at

case_reports/{case_id}
├── report_text, patterns, linked_case_ids
├── status ("draft" | "approved" | "rejected")
├── created_at, reviewed_by, reviewed_at, review_notes
```

**Why both a flat and a nested shape in the same document?** The frontend's 8-step FIR wizard produces a rich nested structure. `routes/crime_data.py` flattens the fields every agent tool actually queries (district, crime_type, date, etc.) to the top level on save, *and* keeps the full nested payload in the same document — so nothing is lost, and no agent code has to understand the wizard's shape unless it explicitly wants full detail.

---

## The two agent surfaces

### Chatbot (`/chat`)

A single LangGraph `create_react_agent` (Gemini 2.5 Flash), with:

- **Tools:** all of `DB_TOOLS` (query by district/type/keyword, get case by ID, list evidence, broad `investigate_case` search, stats, reports, recent cases), `GEO_TOOLS` (map actions), `EVIDENCE_TOOLS` (multimodal image analysis), `INVESTIGATION_TOOLS` (ask the officer a follow-up question when information is missing).
- **Memory:** per-browser-session, via `MemorySaver` keyed by `session_id`.
- **Multimodal:** accepts an optional base64 image alongside a text question.
- **Persona:** formal police-intelligence tone; must search Firestore before answering any case-related question; must say so explicitly if no record is found — never invents case IDs, suspects, or statistics.

### Case Room multi-agent graph (`/ws/case/{case_id}`)

```
START → supervisor ─┬─(records_agent)──► supervisor
                     ├─(pattern_agent)──► supervisor
                     ├─(geo_agent)──────► supervisor
                     └─(report_agent)───► human_review ─┬─(approved)──► END
                                                          └─(more work)─► pattern_agent
```

| Node | Tools | Job |
|---|---|---|
| **Supervisor** | none (deterministic — no LLM call) | Routes to the next node based on what's already in state: Records first if no data, Pattern once data exists, Geo only if the query implies a map is useful, Report once findings are ready. Can send the investigation back to Records once if Pattern Agent says it needs more data. |
| **Records Agent** | `DB_TOOLS` | Retrieves only the facts — never analyses or infers. |
| **Pattern Agent** | `PATTERN_TOOLS` | Finds temporal/geographic/MO patterns; can flag an AI-suggested case priority (`flag_case_priority`) and find semantically similar cases (`find_similar_cases`, embedding-based) or keyword-overlap matches (`find_modus_operandi_matches`). |
| **Geo Agent** | `GEO_TOOLS` | Picks one map action (hotspots / trend / district comparison / zoom) for the frontend map to render. |
| **Report Agent** | none — pure synthesis | Writes a report from the transcript only; never invents facts. |
| **Human Review** | — | Pauses the graph (`interrupt()`) until an officer approves or rejects via the socket. Only on **approve** does anything get saved as an official `case_reports` entry. |

Each specialist is a small ReAct sub-agent scoped to only its own tools (Records can't emit map actions, Geo can't touch Firestore writes), with a capped internal tool-call loop and a persona instructing it to call at most 1–2 tools before answering — this keeps a full case run to a small, predictable number of Gemini calls.

A `MemorySaver` checkpointer gives every `case_id` its own persistent thread, so reopening a case later resumes with full memory of what every agent already found.

---

## REST API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/chat` | Ask the chatbot. Body: `{ message, session_id, image_base64?, mime_type? }` |
| `POST` | `/crime-data` | Submit a FIR (full nested wizard payload) |
| `GET` | `/crime-data?limit=` | List recent FIRs |
| `GET` | `/crime-data/{case_id}` | Get one FIR by ID |
| `GET` | `/cases?limit=` | List recent cases (lighter-weight, for the Case Room case picker) |
| `GET` | `/cases/{case_id}/report` | Get the saved case report, if one exists |
| `GET` | `/cases/{case_id}/evidence` | List evidence for a case |
| `POST` | `/cases/embed` | Generate and store a similarity-search embedding for a case's narrative. Body: `{ fir_id, text }` |

### WebSocket protocol (`/ws/case/{case_id}`)

All messages are JSON.

| Direction | Message |
|---|---|
| client → server | `{"type": "start", "query": "Why do these three cases look linked?"}` |
| server → client | `{"type": "agent_message", "from": "supervisor", "to": "records_agent", "text": "..."}` — one per agent turn, streamed live |
| server → client | `{"type": "human_review_required", "report_draft": "...", "message": "..."}` |
| client → server | `{"type": "human_decision", "decision": "approve" \| "reject", "feedback": "..."}` |
| server → client | `{"type": "done", "status": "approved" \| "ended"}` |
| server → client | `{"type": "error", "message": "..."}` (on any unhandled backend exception) |

The frontend's `AgentNetwork.jsx` uses `from`/`to` to animate a pulse along the matching edge of the live node graph, and drops each message into the chat feed as a bubble from that agent.

---

## Running the app

```bash
# Terminal 1
cd Backend && source venv/bin/activate && uvicorn app:app --reload --port 8000

# Terminal 2
cd Frontend && npm run dev
```

Open the printed Vite dev URL (typically `http://localhost:5173`).

---

## Security status — read before deploying

This is currently a **prototype with no authentication**:

- Every REST route and the `/ws/case/{case_id}` socket are open — no login, no API key, no session check.
- CORS is set to `allow_origins=["*"]`.
- The frontend's `AccessRequest.jsx` officer-access form is UI only and isn't wired to any backend gate yet.

**Do not deploy this publicly as-is.** Before any real rollout, add an auth layer (e.g. Firebase Auth + a FastAPI dependency checking a verified ID token on every route and on socket connect) and restrict CORS to your actual frontend origin.

Also: never commit `Backend/.env` or your Firebase service-account JSON. If either has ever been shared or pushed to a public repo, rotate the Gemini/LangSmith key and regenerate the Firebase service-account key immediately.

---

## Known issues / cleanup TODO

- `Backend/tools/case_tools.py`, `Backend/tools/similarity_tools.py`, and `Backend/database/firestore_db.py` target a `firs` collection with a nested schema that nothing in the live pipeline writes to. They're dead code from an earlier design iteration — safe to delete.
- `Backend/db.py` (if present), `Backend/services/gemini_service.py`, `Backend/tools/router.py`, and `Backend/tools/tools_registry.py` are leftovers from a pre-LangGraph prototype, fully superseded by `agents/`. Safe to delete.
- `Backend/test.py`, `test_action.py`, `test_router.py` are standalone diagnostic scripts, not part of the app — `test_generate.py` (checks which Gemini model names actually work for your key) and `test_models.py` (lists all published Gemini models) are the current, useful ones to keep.
