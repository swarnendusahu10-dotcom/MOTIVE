import { useCallback, useRef, useState } from 'react';
import { WS_BASE } from '../lib/api.js';

// Mirrors Backend/agents/nodes.py MAX_TURNS — used only to render a
// "turn x / 8" progress readout, never to gate behaviour client-side.
const MAX_TURNS = 8;

/**
 * Drives the /ws/case/{caseId} protocol described in Backend/routes/case_graph.py.
 *
 * Returns:
 *   status         'idle' | 'connecting' | 'running' | 'awaiting_human' | 'done' | 'error' | 'disconnected'
 *   messages       [{ id, from, to, text, ts }]   -- every agent_message event, in order
 *   visited        Set<string> of every agent key that has spoken this run
 *                  (lets the graph keep a persistent "path taken" glow, not
 *                  just a single momentary flash)
 *   turn           current turn count (best-effort, derived from messages)
 *   maxTurns       MAX_TURNS constant, for a "turn x/8" readout
 *   reviewRequest  the last human_review_required payload, or null
 *   start(caseId, query)
 *   sendDecision(decision, feedback)
 */
export default function useAgentSocket() {
  const [status, setStatus]     = useState('idle');
  const [messages, setMessages] = useState([]);
  const [visited, setVisited]   = useState(() => new Set());
  const [reviewRequest, setReviewRequest] = useState(null);
  const [error, setError]       = useState(null);
  const wsRef = useRef(null);
  const idRef = useRef(0);

  const start = useCallback((caseId, query) => {
    setMessages([]);
    setVisited(new Set());
    setReviewRequest(null);
    setError(null);
    setStatus('connecting');
    idRef.current = 0;

    // Close any previous socket cleanly before opening a new one.
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_BASE}/ws/case/${encodeURIComponent(caseId)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('running');
      ws.send(JSON.stringify({ type: 'start', query }));
    };

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type === 'agent_message') {
        idRef.current += 1;
        const msg = { id: idRef.current, from: data.from, to: data.to, text: data.text, ts: Date.now() };
        setMessages((prev) => [...prev, msg]);
        setVisited((prev) => {
          const next = new Set(prev);
          next.add(data.from);
          next.add(data.to);
          return next;
        });
      } else if (data.type === 'human_review_required') {
        setReviewRequest({ reportDraft: data.report_draft, message: data.message });
        setStatus('awaiting_human');
      } else if (data.type === 'done') {
        setStatus('done');
      } else if (data.type === 'error') {
        setError(data.message);
        setStatus('error');
      }
    };

    ws.onerror = () => setStatus('error');
    ws.onclose = () => {
      setStatus((s) => (s === 'done' || s === 'error' ? s : 'disconnected'));
    };
  }, []);

  const sendDecision = useCallback((decision, feedback = '', reviewer = 'Officer') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'human_decision', decision, feedback, reviewer }));
    setReviewRequest(null);
    setStatus('running');
  }, []);

  // Best-effort turn counter: every distinct "from" that isn't the
  // supervisor/officer represents one specialist turn completing.
  const turn = messages.filter((m) => m.from !== 'supervisor' && m.from !== 'officer').length;

  return {
    status, messages, visited, reviewRequest, error,
    turn, maxTurns: MAX_TURNS,
    start, sendDecision,
  };
}
