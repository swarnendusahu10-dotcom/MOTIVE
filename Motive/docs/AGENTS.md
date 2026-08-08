# AGENTS.md — Agent rules for MOTIVE

This file is the rulebook every agent in this codebase is built to
follow. It describes *what each agent is allowed to do*, not how the
code works internally (see `ARCHITECTURE.md` for that).

## Cross-cutting rules (apply to every agent)

1. **Firestore is the single source of truth.** Every agent tool reads
   and writes through `services/firebase_service.py`. No agent, tool, or
   route may create a second data store or bypass that module.
2. **No agent guesses at data it can look up.** If a tool exists to
   answer a question, call it — don't infer facts about a case from
   memory or plausibility.
3. **Officer-owned fields are never overwritten by an agent.** A case's
   `status` and any officer-set priority are set only by an officer
   action (via the REST routes). Agents may only write *advisory*
   fields (currently: `ai_priority_suggestion`) that a human reviews.
4. **A formal case-linkage report is never saved without a human
   approving it.** The Case Room graph always pauses at
   `human_review_node` before `case_reports` is written.
5. **Internal fields never reach an LLM as text.** The `embedding`
   vector on a case doc is for similarity math only — no tool may
   return it verbatim in a response an agent's LLM will read.

## Records Intelligence Agent

- **Scope:** read-only retrieval from Firestore — cases, evidence,
  historical matches, district statistics.
- **Tools:** `agents/tools_db.py` (`DB_TOOLS`) only.
- **Hard rules:** never speculate, never analyse, never infer. Every
  relevant record it returns must include Case ID, District, Crime
  Type, Date, and Status. Call as few tools as the question needs.

## Pattern Analysis Agent

- **Scope:** find temporal, geographic, modus-operandi, and semantic
  patterns across the cases Records surfaced; record its own priority
  judgment when warranted.
- **Tools:** `agents/tools_pattern.py` (`PATTERN_TOOLS`) — three
  read-only frequency tools (`find_temporal_patterns`,
  `find_geo_clusters`, `find_modus_operandi_matches`) plus two judgment
  tools (`find_similar_cases`, `flag_case_priority`). See
  `AGENTS_AND_SKILLS.md` for what makes the judgment tools different
  from a plain lookup.
- **Hard rules:** every conclusion must cite the specific case IDs or
  numbers it rests on — a human reviewer checks this before approving
  anything downstream. `flag_case_priority` requires a concrete,
  evidence-backed `reason`; it is refused without one. If (and only if)
  it genuinely needs data no available tool can fetch, it says so
  explicitly (`NEED_MORE_DATA: ...`) rather than guessing — bounded to
  one recall back to Records per investigation so it can't loop forever.

## Geo/Hotspot Agent

- **Scope:** decide which single map action (if any) best visualises
  the current finding.
- **Tools:** `agents/tools_geo.py` (`GEO_TOOLS`).
- **Hard rules:** no Firestore writes, ever — this agent's tools only
  return an action payload the frontend map component renders. One
  action, one sentence of justification.

## Report Agent

- **Scope:** synthesise everything the other agents found into one
  case-linkage report for an officer to review.
- **Tools:** none — pure LLM synthesis over the agent transcript.
- **Hard rules:** base the report only on findings already in the
  transcript; never invent facts. Must end with a clear
  `Recommendation` line. Cites the case IDs the Pattern Agent linked.

## Supervisor

- **Scope:** decide which agent acts next.
- **Implementation:** a deterministic Python function
  (`supervisor_node` in `agents/nodes.py`), not an LLM call — the
  pipeline has one fixed shape (Records → Pattern → optional single
  recall → Geo → Report → human review), so routing it is a plain
  state check, not a judgment call.
- **Hard rule:** always yields to `report_agent` once `MAX_TURNS` is
  hit, so a stuck investigation still produces something for an officer
  to see rather than hanging.

## Human review (the officer)

- **Scope:** the only party who can approve a report as an official
  lead, reject it, or send feedback back for another pass.
- **Hard rule:** nothing is written to `case_reports` except on explicit
  approval. Rejecting sends the case back through Pattern Agent for
  revision with the officer's feedback in the transcript.

## Chatbot (front desk, `agents/chat_agent.py`)

- **Scope:** single-turn officer questions — statistics, case lookups,
  map navigation, quick evidence-photo reads. Not a substitute for the
  Case Room's multi-case pattern analysis; it tells the officer to open
  Case Room for that.
- **Tools:** `DB_TOOLS` + `GEO_TOOLS` + `EVIDENCE_TOOLS`.
- **Hard rules:** cite district/case names when it has them, never
  invent statistics it didn't retrieve, say plainly when it doesn't
  have data.
