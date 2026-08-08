# AGENTS_AND_SKILLS.md

This documents the custom agent and custom skills built for MOTIVE, as
required by the hackathon checkpoints. "Skill" here means a tool that
does more than a Firestore CRUD call — it applies real judgment or
computation over the data, not just fetches it.

## Custom agent: Pattern Analysis Agent

**File:** `agents/nodes.py` (`pattern_node`, `PATTERN_PERSONA`),
tools in `agents/tools_pattern.py`.

The Pattern Agent is the one node in the Case Room graph with real
analytical and write authority, as opposed to pure retrieval (Records)
or pure formatting (Geo, Report). It:

- reasons over the case pool the Records Agent retrieved to find
  temporal, geographic, semantic, and MO patterns,
- decides, using its own judgment, when a case pool warrants an
  elevated priority flag — and writes that judgment back to Firestore,
  advisory-only, for an officer to review,
- can ask the Supervisor to send the investigation back to Records for
  more data (`NEED_MORE_DATA:` convention), bounded to one recall so it
  can't loop forever — the only agent in the graph with that authority.

Its findings (via `linked_case_ids`) flow directly into the Report
Agent's final draft, so a pattern it surfaces is traceable all the way
into the report an officer signs off on.

## Custom skill #1: `find_similar_cases`

**File:** `agents/tools_pattern.py`

**What it does:** semantic similarity search between cases, using the
768-float embedding Gemini's `text-embedding-004` model produces for a
case's narrative (via `POST /cases/embed`, `services/embedding_service.py`).
Cosine similarity is computed in plain Python (`_cosine()`) — no extra
vector-DB dependency needed at this data scale.

**Why it's a skill and not a lookup:** it catches cases that describe
the same kind of incident in *different words* — two robberies
described as "snatched a gold chain from a pedestrian" and "grabbed
jewellery off a woman walking home" share almost no keywords but are
semantically close. `find_modus_operandi_matches` (keyword overlap)
misses this class of match entirely; `find_similar_cases` is what
closes that gap.

**Inputs:** `case_id`, `top_k` (default 5).
**Outputs:** `{base_case_id, similar_cases: [{case_id, similarity}, ...]}`
— case IDs and scores only. The raw embedding vectors never leave
`services/firebase_service.py`; the agent's LLM never sees a vector.

**Data dependency:** only works for cases that already have an
embedding on file (i.e. `POST /cases/embed` has run for them). If not,
the tool says so explicitly and points the agent at
`find_modus_operandi_matches` instead of failing silently.

## Custom skill #2: `flag_case_priority`

**File:** `agents/tools_pattern.py`

**What it does:** lets the Pattern Agent record its own priority
judgment (`low` / `medium` / `high` / `urgent`) on a case, with a
required, evidence-citing reason.

**Why it's a skill and not a lookup:** it's the one point where an
agent's *judgment* — not just retrieved facts — is written back into
the system. To keep that safe:

- it writes an `ai_priority_suggestion` sub-object
  (`priority`, `reason`, `suggested_by`, `suggested_at`) via
  `services/firebase_service.set_ai_priority_suggestion()`,
- it never touches the case's actual `status` or an officer-set
  priority field — those stay human-owned,
- it's refused outright (returns an error, no write) if `priority` isn't
  one of the four allowed values or `reason` is empty — an
  unjustified priority flag is worse than none.

**Inputs:** `case_id`, `priority`, `reason`.
**Outputs:** `{case_id, ai_priority_suggestion: {...}}` on success, or
`{error: "..."}` if the input didn't meet the bar above.
