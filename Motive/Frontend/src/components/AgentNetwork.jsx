import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleCanvas from './Animations/ParticleCanvas.jsx';
import GridOverlay from './Animations/GridOverlay.jsx';
import CornerBrackets from './Animations/CornerBrackets.jsx';
import { api } from '../lib/api.js';
import useAgentSocket from '../hooks/useAgentSocket.js';

// ── AGENT NODE LAYOUT (viewBox 700 x 470) — theme-const colours pulled
// straight from index.css's @theme block, one accent per agent. `tools`
// is a short caption naming what each agent is actually wired to on the
// backend (agents/tools_*.py) — makes the interconnectivity legible at a
// glance instead of just "boxes with arrows". ─────────────────────────────
const AGENTS = {
  supervisor:     { label: 'SUPERVISOR',      x: 350, y: 55,  color: '#00d4ff', tools: 'ROUTES EVERY TURN' },
  records_agent:  { label: 'RECORDS',         x: 110, y: 205, color: '#00d4ff', tools: 'FIRESTORE QUERY TOOLS' },
  pattern_agent:  { label: 'PATTERN',         x: 350, y: 205, color: '#ffd60a', tools: 'TEMPORAL · GEO · MO' },
  geo_agent:      { label: 'GEO / HOTSPOT',   x: 590, y: 205, color: '#ff9f0a', tools: 'MAP ACTION TOOLS' },
  report_agent:   { label: 'REPORT',          x: 350, y: 335, color: '#30d158', tools: 'SYNTHESIS · NO TOOLS' },
  human_review:   { label: 'OFFICER REVIEW',  x: 350, y: 440, color: '#ff2d55', tools: 'APPROVE · REJECT · REWORK' },
  officer:        { label: 'OFFICER REVIEW',  x: 350, y: 440, color: '#ff2d55', tools: 'APPROVE · REJECT · REWORK' },
};

// Primary synchronous edges — mirrors Backend/agents/graph.py add_edge / add_conditional_edges.
const EDGES = [
  ['supervisor', 'records_agent'],
  ['supervisor', 'pattern_agent'],
  ['supervisor', 'geo_agent'],
  ['supervisor', 'report_agent'],
  ['records_agent', 'pattern_agent'],
  ['pattern_agent', 'report_agent'],
  ['geo_agent', 'report_agent'],
  ['report_agent', 'human_review'],
];

// The one conditional feedback loop in the graph: human_review routes back
// to pattern_agent when the officer sends the report back for more work
// (see route_after_human in Backend/agents/nodes.py). Rendered as a curved,
// dashed, amber path so it visually reads as "loop back", not a straight
// synchronous hop.
const REWORK_EDGE = ['human_review', 'pattern_agent'];

// `officer` and `human_review` are the same graph node wearing two names
// (the interrupt node emits transcript lines addressed to/from "officer").
// Normalising here is what makes the officer's "send back" reply correctly
// light up the report_agent <-> human_review edge instead of silently
// matching nothing.
function normalizeKey(key) {
  return key === 'officer' ? 'human_review' : key;
}
function edgeKey(a, b) { return [normalizeKey(a), normalizeKey(b)].sort().join('::'); }
const EDGE_KEYS = new Set(EDGES.map(([a, b]) => edgeKey(a, b)));
const REWORK_KEY = edgeKey(...REWORK_EDGE);

function resolveAgent(key) {
  return AGENTS[key] || { label: key?.toUpperCase() || 'UNKNOWN', x: 350, y: 250, color: 'rgba(0,212,255,0.5)', tools: '' };
}

// Sample points along a quadratic bezier so a pulse dot can travel the
// curved rework edge with framer-motion's plain cx/cy keyframe arrays
// (no SMIL / motion-path plugin required).
function bezierSamples(p0, p1, p2, steps = 24) {
  const xs = [], ys = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    xs.push(mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x);
    ys.push(mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y);
  }
  return { xs, ys };
}

function AgentNode({ agentKey, active, visited }) {
  const a = resolveAgent(agentKey);
  const dim = !active && !visited;
  return (
    <g transform={`translate(${a.x},${a.y})`}>
      {/* Momentary flash ring — this agent just sent/received a message */}
      {active && (
        <motion.circle
          r={26} fill="none" stroke={a.color} strokeWidth={1.5}
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 2.1, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      )}
      {/* Persistent "path taken" ring — this agent has spoken at least
          once this run, kept dim so the officer can see the whole route
          the investigation travelled, not just the current hop. */}
      {visited && !active && (
        <circle r={32} fill="none" stroke={a.color} strokeWidth={1} strokeDasharray="2 4" opacity={0.35} />
      )}
      <circle r={26} fill="rgba(4,10,20,0.9)" stroke={a.color} strokeWidth={active ? 2 : 1}
        style={{
          filter: active ? `drop-shadow(0 0 10px ${a.color})` : visited ? `drop-shadow(0 0 4px ${a.color}80)` : `drop-shadow(0 0 2px ${a.color}40)`,
          opacity: dim ? 0.55 : 1,
          transition: 'opacity 0.4s ease',
        }} />
      <circle r={4} fill={a.color} opacity={active ? 1 : visited ? 0.75 : 0.35} />
      <text y={44} textAnchor="middle" fontSize={9} fontFamily="'JetBrains Mono', monospace"
        letterSpacing={1} fill={a.color} opacity={dim ? 0.45 : 0.85}>
        {a.label}
      </text>
      <text y={55} textAnchor="middle" fontSize={6.5} fontFamily="'JetBrains Mono', monospace"
        letterSpacing={0.5} fill={a.color} opacity={dim ? 0.22 : 0.45}>
        {a.tools}
      </text>
    </g>
  );
}

function AgentEdge({ from, to, activeColor, idleIndex }) {
  const a = resolveAgent(from), b = resolveAgent(to);
  return (
    <g>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke={activeColor || 'rgba(0,212,255,0.15)'} strokeWidth={activeColor ? 2 : 1}
        style={{ transition: 'stroke 0.3s ease' }} />
      {/* Ambient idle flow — a faint dot always drifting along every live
          channel, so the network reads as "alive" even between messages. */}
      {!activeColor && (
        <motion.circle r={2.5} fill="rgba(0,212,255,0.55)"
          animate={{ cx: [a.x, b.x], cy: [a.y, b.y], opacity: [0, 0.4, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'linear', delay: idleIndex * 0.5 }} />
      )}
    </g>
  );
}

// One in-flight pulse travelling a straight edge — supports many at once
// (queued, not overwritten) so bursts of fast agent replies all animate.
function EdgePulse({ pulse, onDone }) {
  const a = resolveAgent(pulse.from), b = resolveAgent(pulse.to);
  return (
    <motion.circle r={4.5} fill={pulse.color}
      style={{ filter: `drop-shadow(0 0 6px ${pulse.color})` }}
      initial={{ cx: a.x, cy: a.y, opacity: 1 }}
      animate={{ cx: b.x, cy: b.y, opacity: 0.15 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
      onAnimationComplete={onDone} />
  );
}

// The curved rework-loop pulse (human_review -> pattern_agent), sampled
// along a quadratic bezier so it visibly arcs instead of cutting straight
// through the report_agent node that sits between them on the same axis.
function ReworkPulse({ pulse, onDone, curve }) {
  return (
    <motion.circle r={4.5} fill={pulse.color}
      style={{ filter: `drop-shadow(0 0 6px ${pulse.color})` }}
      initial={{ opacity: 1 }}
      animate={{ cx: curve.xs, cy: curve.ys, opacity: [1, 1, 0.1] }}
      transition={{ duration: 1.2, ease: 'linear' }}
      onAnimationComplete={onDone} />
  );
}

function ChatBubble({ msg }) {
  const a = resolveAgent(msg.from);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-[0.15em]" style={{ color: a.color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} />
        {a.label} <span style={{ color: 'rgba(0,212,255,0.3)' }}>→ {resolveAgent(msg.to).label}</span>
      </div>
      <div className="rounded-xl px-3 py-2 text-[13px] leading-snug"
        style={{
          background: 'rgba(5,15,28,0.85)', border: `1px solid ${a.color}33`,
          color: 'rgba(200,240,255,0.88)', fontFamily: "'Rajdhani', sans-serif", fontWeight: 500,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
        {msg.text}
      </div>
    </motion.div>
  );
}

export default function AgentNetwork() {
  const navigate = useNavigate();
  const { status, messages, visited, reviewRequest, error, turn, maxTurns, start, sendDecision } = useAgentSocket();

  const [cases, setCases]         = useState([]);
  const [caseId, setCaseId]       = useState('');
  const [query, setQuery]         = useState('Find any patterns or linked cases for this investigation.');
  const [feedback, setFeedback]   = useState('');
  const [pulses, setPulses]       = useState([]);   // in-flight straight-edge pulses
  const [reworkPulses, setReworkPulses] = useState([]); // in-flight curved-edge pulses
  const [activeNodes, setActiveNodes] = useState(new Set());
  const bottomRef = useRef(null);
  const lastCountRef = useRef(0);
  const activeCountsRef = useRef({});
  const pulseIdRef = useRef(0);

  useEffect(() => {
    api.listCases(30).then((d) => setCases(d.cases || [])).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, reviewRequest]);

  // Reset local animation queues whenever a fresh run starts.
  useEffect(() => {
    if (status === 'connecting') {
      lastCountRef.current = 0;
      activeCountsRef.current = {};
      setPulses([]);
      setReworkPulses([]);
      setActiveNodes(new Set());
    }
  }, [status]);

  function flashNode(rawKey) {
    const key = normalizeKey(rawKey);
    activeCountsRef.current[key] = (activeCountsRef.current[key] || 0) + 1;
    setActiveNodes(new Set(Object.keys(activeCountsRef.current).filter((k) => activeCountsRef.current[k] > 0)));
    setTimeout(() => {
      activeCountsRef.current[key] = Math.max(0, (activeCountsRef.current[key] || 0) - 1);
      setActiveNodes(new Set(Object.keys(activeCountsRef.current).filter((k) => activeCountsRef.current[k] > 0)));
    }, 1100);
  }

  // Turn every newly-arrived transcript line into a queued animation —
  // multiple messages arriving in a burst each get their own pulse instead
  // of the newest one clobbering the last (the original single-activeEdge
  // approach could drop visible animation under fast bursts).
  useEffect(() => {
    if (messages.length <= lastCountRef.current) { lastCountRef.current = messages.length; return; }
    const fresh = messages.slice(lastCountRef.current);
    lastCountRef.current = messages.length;

    fresh.forEach((m) => {
      const key = edgeKey(m.from, m.to);
      const color = resolveAgent(m.from).color;
      flashNode(m.from);
      flashNode(m.to);

      if (key === REWORK_KEY) {
        const id = ++pulseIdRef.current;
        setReworkPulses((p) => [...p, { id, from: m.from, to: m.to, color }]);
        setTimeout(() => setReworkPulses((p) => p.filter((x) => x.id !== id)), 1300);
      } else if (EDGE_KEYS.has(key)) {
        const id = ++pulseIdRef.current;
        setPulses((p) => [...p, { id, from: m.from, to: m.to, color }]);
        setTimeout(() => setPulses((p) => p.filter((x) => x.id !== id)), 1000);
      }
    });
  }, [messages]);

  // The backend never emits a literal "human_review -> pattern_agent"
  // transcript line for the rework loop (route_after_human in nodes.py
  // resumes pattern_agent directly; only the officer's own feedback line,
  // addressed to report_agent, is transcribed). So the one moment we can
  // *know* that edge is being taken is the instant the officer clicks
  // "Send back" — fire the curved pulse right here, client-side.
  function handleSendBack() {
    const id = ++pulseIdRef.current;
    setReworkPulses((p) => [...p, { id, from: 'human_review', to: 'pattern_agent', color: '#ff9f0a' }]);
    setTimeout(() => setReworkPulses((p) => p.filter((x) => x.id !== id)), 1300);
    flashNode('human_review');
    flashNode('pattern_agent');
    sendDecision('reject', feedback);
  }

  const canStart = caseId && query.trim() && (status === 'idle' || status === 'done' || status === 'error' || status === 'disconnected');
  const isRunning = status === 'running' || status === 'connecting' || status === 'awaiting_human';

  const reworkCurve = useMemo(() => {
    const a = resolveAgent('human_review'), b = resolveAgent('pattern_agent');
    const ctrl = { x: (a.x + b.x) / 2 - 100, y: (a.y + b.y) / 2 };
    return bezierSamples(a, ctrl, b);
  }, []);
  const reworkPathD = useMemo(() => {
    const a = resolveAgent('human_review'), b = resolveAgent('pattern_agent');
    const ctrl = { x: (a.x + b.x) / 2 - 100, y: (a.y + b.y) / 2 };
    return `M${a.x},${a.y} Q${ctrl.x},${ctrl.y} ${b.x},${b.y}`;
  }, []);

  const totalEdges = EDGES.length + 1; // +1 rework loop
  const traversedEdges = useMemo(() => {
    const seen = new Set();
    messages.forEach((m) => {
      const key = edgeKey(m.from, m.to);
      if (EDGE_KEYS.has(key) || key === REWORK_KEY) seen.add(key);
    });
    return seen.size;
  }, [messages]);

  const panelStyle = {
    background: 'rgba(4,10,20,0.92)', border: '1px solid rgba(0,212,255,0.12)', backdropFilter: 'blur(20px)',
  };

  const statusColor = {
    idle: 'rgba(0,212,255,0.4)', connecting: '#ffd60a', running: '#00d4ff',
    awaiting_human: '#ff2d55', done: '#30d158', error: '#ff2d55', disconnected: 'rgba(0,212,255,0.3)',
  }[status] || 'rgba(0,212,255,0.4)';

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-black" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <ParticleCanvas />
        <GridOverlay color="0,212,255" opacity={0.018} />
        <div className="fixed inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.7) 100%)' }} />
      </div>

      {/* TOP BAR */}
      <div className="relative z-30 flex items-center justify-between px-5 py-2.5 shrink-0"
        style={{ background: 'rgba(3,8,18,0.97)', borderBottom: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('/chat')} className="text-[11px] font-mono tracking-widest uppercase"
          style={{ color: 'rgba(0,212,255,0.55)' }}>← Assistant</button>
        <div className="text-xs font-bold tracking-[0.2em]" style={{ color: '#00d4ff', textShadow: '0 0 10px rgba(0,212,255,0.6)' }}>
          KSP INTEL · CASE ROOM — MULTI-AGENT INVESTIGATION
        </div>
        <button onClick={() => navigate('/submit-crime')} className="text-[11px] font-mono tracking-widest uppercase"
          style={{ color: 'rgba(0,212,255,0.55)' }}>+ New Record</button>
      </div>

      {/* CONTROL STRIP */}
      <div className="relative z-20 flex items-center gap-3 px-5 py-2.5 shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)', background: 'rgba(3,8,18,0.8)' }}>
        <select value={caseId} onChange={(e) => setCaseId(e.target.value)}
          className="text-xs font-mono px-2 py-1.5 rounded"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,212,255,0.2)', color: 'rgba(200,240,255,0.9)' }}>
          <option value="">Select case…</option>
          {cases.map((c) => (
            <option key={c.id} value={c.case_id || c.id}>
              {(c.case_id || c.id)} · {c.district} · {c.crime_type}
            </option>
          ))}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Investigation goal…" className="flex-1 min-w-[220px] text-xs font-mono px-3 py-1.5 rounded"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,212,255,0.2)', color: 'rgba(200,240,255,0.9)' }} />
        <button onClick={() => start(caseId, query)} disabled={!canStart}
          className="text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-lg"
          style={{
            background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.4)',
            color: '#00d4ff', opacity: canStart ? 1 : 0.4,
          }}>
          {status === 'running' ? 'RUNNING…' : 'RUN INVESTIGATION'}
        </button>

        {/* Live network stats — turn progress + edges traversed, both driven
            straight off the same message stream that animates the graph. */}
        <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest uppercase"
          style={{ color: 'rgba(0,212,255,0.4)' }}>
          {isRunning && <span>TURN {Math.min(turn, maxTurns)}/{maxTurns}</span>}
          {messages.length > 0 && <span>{messages.length} MSG</span>}
          {messages.length > 0 && <span>{traversedEdges}/{totalEdges} LINKS</span>}
          <span className="flex items-center gap-1.5" style={{ color: statusColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* BODY: graph + chat — stacks vertically on narrow / mobile screens */}
      <div className="relative z-10 flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">

        {/* GRAPH */}
        <div className="relative flex-1 flex items-center justify-center min-w-0 min-h-0 p-4">
          <svg viewBox="0 0 700 480" className="w-full h-full max-w-3xl">
            {EDGES.map(([a, b], i) => {
              const key = edgeKey(a, b);
              const hasActivePulse = pulses.some((p) => edgeKey(p.from, p.to) === key);
              const activeColor = hasActivePulse ? resolveAgent(a).color : null;
              return <AgentEdge key={key} from={a} to={b} activeColor={activeColor} idleIndex={i} />;
            })}

            {/* Rework loop — always drawn faint + dashed so the officer can
                see the "send back for more work" path exists before it's
                ever used, then lights up amber when actually traversed. */}
            <path d={reworkPathD} fill="none"
              stroke={reworkPulses.length ? '#ff9f0a' : 'rgba(255,159,10,0.18)'}
              strokeWidth={reworkPulses.length ? 2 : 1}
              strokeDasharray="5 5"
              style={{ transition: 'stroke 0.3s ease' }} />

            <AnimatePresence>
              {pulses.map((p) => <EdgePulse key={p.id} pulse={p} onDone={() => setPulses((prev) => prev.filter((x) => x.id !== p.id))} />)}
              {reworkPulses.map((p) => <ReworkPulse key={p.id} pulse={p} curve={reworkCurve} onDone={() => setReworkPulses((prev) => prev.filter((x) => x.id !== p.id))} />)}
            </AnimatePresence>

            {Object.keys(AGENTS).filter((k) => k !== 'officer').map((k) => (
              <AgentNode key={k} agentKey={k} active={activeNodes.has(k)} visited={visited.has(k)} />
            ))}
          </svg>

          {/* LEGEND */}
          <div className="hidden md:flex absolute bottom-3 left-3 flex-col gap-1 px-3 py-2 rounded-lg text-[9px] font-mono tracking-wider"
            style={{ background: 'rgba(3,8,18,0.75)', border: '1px solid rgba(0,212,255,0.12)', color: 'rgba(0,212,255,0.55)' }}>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} /> ACTIVE NOW</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border" style={{ borderColor: '#00d4ff', borderStyle: 'dashed' }} /> VISITED THIS RUN</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5" style={{ background: 'rgba(255,159,10,0.6)' }} /> REWORK LOOP</div>
          </div>
        </div>

        {/* LIVE CHAT / REVIEW PANEL */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col min-h-0 max-h-[42vh] lg:max-h-none"
          style={{ ...panelStyle, borderLeft: '1px solid rgba(0,212,255,0.12)', borderTop: '1px solid rgba(0,212,255,0.12)' }}>
          <div className="px-4 py-2.5 text-[10px] font-mono tracking-[0.2em] shrink-0" style={{ color: 'rgba(0,212,255,0.4)', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
            AGENT-TO-AGENT TRANSCRIPT
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
            {messages.length === 0 && status !== 'running' && status !== 'connecting' && (
              <div className="text-[11px] font-mono" style={{ color: 'rgba(0,212,255,0.3)' }}>
                Pick a case, set an investigation goal, and run it — the agents will negotiate the case live here.
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m) => <ChatBubble key={m.id} msg={m} />)}
            </AnimatePresence>

            {reviewRequest && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-3 flex flex-col gap-2"
                style={{ background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.35)' }}>
                <div className="text-[10px] font-mono tracking-[0.15em]" style={{ color: '#ff2d55' }}>
                  ⚠ OFFICER SIGN-OFF REQUIRED
                </div>
                <div className="text-[12px] leading-snug whitespace-pre-wrap" style={{ color: 'rgba(220,230,240,0.9)' }}>
                  {reviewRequest.reportDraft}
                </div>
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional: question the agents back, or say what to re-check…"
                  rows={2}
                  className="text-[12px] rounded px-2 py-1.5"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,45,85,0.25)', color: 'rgba(220,230,240,0.9)', fontFamily: "'Rajdhani', sans-serif" }} />
                <div className="flex gap-2">
                  <button onClick={() => sendDecision('approve', feedback)}
                    className="flex-1 text-[11px] font-bold tracking-widest uppercase py-1.5 rounded"
                    style={{ background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.5)', color: '#30d158' }}>
                    Approve & Save
                  </button>
                  <button onClick={handleSendBack}
                    className="flex-1 text-[11px] font-bold tracking-widest uppercase py-1.5 rounded"
                    style={{ background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.5)', color: '#ff2d55' }}
                    title="Sends the report back to the Pattern Agent for another pass (the amber loop on the graph).">
                    Send back
                  </button>
                </div>
              </motion.div>
            )}

            {status === 'disconnected' && !error && (
              <div className="text-[11px] font-mono" style={{ color: 'rgba(0,212,255,0.4)' }}>
                ⚠ Connection to the case graph closed. Pick a case and run again to reconnect.
              </div>
            )}
            {error && <div className="text-[11px] font-mono" style={{ color: '#ff2d55' }}>⚠ {error}</div>}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      <CornerBrackets zIndex={20} opacity={0.2} positions={{
        topLeft: 'top-20 left-0', topRight: 'top-20 right-0', bottomLeft: 'bottom-0 left-0', bottomRight: 'bottom-0 right-0',
      }} />
    </div>
  );
}
