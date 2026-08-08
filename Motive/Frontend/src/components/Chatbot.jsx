import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInput from './ChatInput.jsx';
import ParticleCanvas from './Animations/ParticleCanvas.jsx';
import { useLocation } from 'react-router-dom';
import GridOverlay from './Animations/GridOverlay.jsx';
import CornerBrackets from './Animations/CornerBrackets.jsx';
import { api, fileToBase64 } from '../lib/api.js';
// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const BOT_NAME    = 'MOTIVE';
const CHAR_LIMIT  = 320; // chars before Show more kicks in

const HISTORY_STUBS = [
  { id: 1, title: 'Bengaluru Crime Analysis',   time: '2h ago'  },
  { id: 2, title: 'Raichur District Report',    time: 'Yesterday' },
  { id: 3, title: 'Cyber Crime Trends 2024',    time: '3d ago'  },
  { id: 4, title: 'Narcotics Network Query',    time: '5d ago'  },
];

// Coerce any message content (string, array of content blocks, or a
// stray object) into a plain string so it can always be safely
// rendered. The backend now normalises this too, but this guards the
// UI against ever crashing again if a shape like
// {type, text, extras} slips through.
function toDisplayText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(toDisplayText).join('');
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

// ── MESSAGE BUBBLE ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const [expanded, setExpanded] = useState(false);

  const text      = toDisplayText(msg.text);
  const isLong    = text.length > CHAR_LIMIT;
  const displayed = isLong && !expanded ? text.slice(0, CHAR_LIMIT) + '…' : text;

  return (
    <div
      className={`flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ animation: 'fadeIn 0.25s ease-out' }}
    >
      {/* Bot avatar */}
      {!isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
          style={{
            background: 'rgba(0,212,255,0.1)',
            border:     '1px solid rgba(0,212,255,0.25)',
            boxShadow:  '0 0 8px rgba(0,212,255,0.15)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#00d4ff" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
      )}

      {/* Bubble */}
      <div
        className="flex flex-col gap-1"
        style={{ maxWidth: '72%', minWidth: 60 }}
      >
        {/* Role label */}
        <div
          className={`text-[9px] font-mono tracking-[0.18em] ${isUser ? 'text-right' : 'text-left'}`}
          style={{ color: isUser ? 'rgba(0,212,255,0.35)' : 'rgba(0,212,255,0.45)' }}
        >
          {isUser ? 'YOU' : BOT_NAME}
        </div>

        {/* Text box */}
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={isUser ? {
            background:  'rgba(0,212,255,0.12)',
            border:      '1px solid rgba(0,212,255,0.28)',
            color:       'rgba(210,245,255,0.92)',
            borderBottomRightRadius: 4,
            fontFamily:  "'Rajdhani', sans-serif",
            fontWeight:  500,
            wordBreak:   'break-word',
          } : {
            background:  'rgba(5,15,28,0.85)',
            border:      '1px solid rgba(0,212,255,0.12)',
            color:       'rgba(185,235,255,0.85)',
            borderBottomLeftRadius: 4,
            fontFamily:  "'Rajdhani', sans-serif",
            fontWeight:  500,
            wordBreak:   'break-word',
          }}
        >
          {/* File attachments */}
          {msg.files && msg.files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {msg.files.map((f, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.18)', color: 'rgba(0,212,255,0.6)' }}>
                  📎 {f.name}
                </div>
              ))}
            </div>
          )}

          {/* Message text — pre-wrap preserves line breaks */}
          <span style={{ whiteSpace: 'pre-wrap' }}>{displayed}</span>

          {/* Show more / less */}
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="block mt-2 text-[10px] font-mono tracking-wider transition-opacity hover:opacity-80"
              style={{ color: '#00d4ff' }}
            >
              {expanded ? '▲ Show less' : '▼ Show more'}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[9px] font-mono ${isUser ? 'text-right' : 'text-left'}`}
          style={{ color: 'rgba(0,212,255,0.2)' }}
        >
          {msg.time}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
          style={{
            background: 'rgba(0,212,255,0.08)',
            border:     '1px solid rgba(0,212,255,0.2)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="rgba(0,212,255,0.6)" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ── TYPING INDICATOR ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 justify-start" style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)' }}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#00d4ff" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: 'rgba(5,15,28,0.85)', border: '1px solid rgba(0,212,255,0.12)' }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#00d4ff', opacity: 0.7, animation: `typingDot 1.2s ${i * 0.2}s infinite ease-in-out` }} />
        ))}
      </div>
    </div>
  );
}

// ── MAIN CHATBOT COMPONENT ────────────────────────────────────────────────────
export default function Chatbot() {
  const navigate  = useNavigate();
  const bottomRef = useRef(null);
  const location=useLocation();
  const [messages,  setMessages]  = useState([
    {
      id:   0,
      role: 'bot',
      text: 'Welcome to KSP Crime Intelligence AI.\n\nI can help you analyse crime patterns, query district statistics, identify hotspots, and generate insights from the Karnataka State Crime Records Bureau database.\n\nHow can I assist you today, Officer?',
      time: now(),
    }
  ]);
  const [typing,       setTyping]       = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [activeHistory, setActiveHistory] = useState(null);
  const sessionIdRef = useRef(
    (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now())
  );

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function now() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  const handleSend = useCallback(async (text, files) => {
    if (!text && files.length === 0) return;

    // Push user message
    const userMsg = {
      id:    Date.now(),
      role:  'user',
      text:  text || '',
      files: files,
      time:  now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    try {
      // Multimodal: if an image was attached, send it alongside the text
      // so the agent can read it (Gemini vision) in the same turn.
      let imageBase64 = null, mimeType = 'image/jpeg';
      const imageFile = files.find(f => f.type?.startsWith('image/'));
      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
        mimeType = imageFile.type;
      }

      const res = await api.chat(text || '', sessionIdRef.current, imageBase64, mimeType);
      setTyping(false);
      setMessages(prev => [...prev, {
        id:   Date.now() + 1,
        role: 'bot',
        text: toDisplayText(res.response),
        time: now(),
      }]);
    } catch (err) {
      setTyping(false);
      setMessages(prev => [...prev, {
        id:   Date.now() + 1,
        role: 'bot',
        text: `⚠ Could not reach the intelligence backend.\n\n${err.message || 'Unknown error.'}`,
        time: now(),
      }]);
    }
  }, []);

  // ── Panel style shared
  const panelStyle = {
    background:    'rgba(4,10,20,0.92)',
    border:        '1px solid rgba(0,212,255,0.12)',
    backdropFilter:'blur(20px)',
  };

  return (
    <div
      className="w-screen h-screen overflow-hidden flex flex-col bg-black"
      style={{ fontFamily: "'Rajdhani', sans-serif" }}
    >
      {/* ── KEYFRAMES injected once ── */}
      <style>{`
        @keyframes typingDot {
          0%,80%,100% { transform:scale(0.6); opacity:0.4; }
          40%          { transform:scale(1);   opacity:1;   }
        }
        @keyframes fadeIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        @keyframes scanLine {
          0%   { top:0%;   }
          100% { top:100%; }
        }
      `}</style>

      {/* ── BACKGROUND EFFECTS ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <ParticleCanvas/>
        {/* Grid */}
        <GridOverlay color="0,212,255" opacity={0.018}/>
        {/* Radial glow */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 50% at 60% 40%, rgba(0,30,55,0.55) 0%, rgba(0,0,0,0) 70%)' }} />
        {/* Scan line */}
        <div style={{ position:'absolute', left:0, right:0, height:1, background:'linear-gradient(to right,transparent,rgba(0,212,255,0.25) 30%,rgba(0,212,255,0.25) 70%,transparent)', opacity:0.04, animation:'scanLine 8s linear infinite' }} />
        {/* Vignette */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,0.65) 100%)' }} />
      </div>

      {/* ── TOP BAR ── */}
      <div
        className="relative z-30 flex items-center justify-between px-5 py-2.5 shrink-0"
        style={{ background:'rgba(3,8,18,0.97)', borderBottom:'1px solid rgba(0,212,255,0.1)', backdropFilter:'blur(12px)' }}
      >
        {/* Left: logo */}
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(s => !s)}
            className="flex items-center justify-center w-7 h-7 rounded transition-all hover:bg-cyan-400/10"
            style={{ color:'rgba(0,212,255,0.5)', border:'1px solid rgba(0,212,255,0.15)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <div className="w-px h-5" style={{ background:'rgba(0,212,255,0.15)' }} />

          {/* Icon + title */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-cyan-400/25 animate-ping" style={{ animationDuration:'3s' }} />
              <svg viewBox="0 0 28 28" className="w-6 h-6">
                <polygon points="14,1 17,11 27,11 19,17 22,27 14,21 6,27 9,17 1,11 11,11"
                  fill="none" stroke="#00d4ff" strokeWidth="1.2" opacity="0.9"/>
                <circle cx="14" cy="14" r="3" fill="#00d4ff" opacity="0.8"/>
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold tracking-[0.12em]" style={{ color:'#00d4ff', textShadow:'0 0 10px rgba(0,212,255,0.6)' }}>
                KSP INTEL AI
              </div>
              <div className="text-[8px] font-mono tracking-[0.2em]" style={{ color:'rgba(0,212,255,0.4)' }}>
                CRIME INTELLIGENCE ASSISTANT
              </div>
            </div>
          </div>
        </div>

        {/* Center: status */}
        <div className="hidden md:flex justify-center items-center gap-5">
         <h1 className="text-3xl font-bold tracking-[0.12em]" style={{ color:'#00d4ff', textShadow:'0 0 10px rgba(0,212,255,0.6)' }}>Welcome,{location.state?.officerName || 'Officer'}</h1>
        </div>

        {/* Right: MAP button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/agents')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest uppercase transition-all duration-200 hover:scale-105"
            style={{
              background:  'rgba(0,212,255,0.1)',
              border:      '1px solid rgba(0,212,255,0.35)',
              color:       '#00d4ff',
              textShadow:  '0 0 8px rgba(0,212,255,0.5)',
              boxShadow:   '0 0 14px rgba(0,212,255,0.12)',
            }}
          >
            {/* Network icon */}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/>
              <path strokeLinecap="round" d="M12 7.2V13m0 0L6.4 17.4M12 13l5.6 4.4"/>
            </svg>
            CASE ROOM
          </button>
          <button
            onClick={() => navigate('/submit-crime')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest uppercase transition-all duration-200 hover:scale-105"
            style={{
              background:  'rgba(0,212,255,0.1)',
              border:      '1px solid rgba(0,212,255,0.35)',
              color:       '#00d4ff',
              textShadow:  '0 0 8px rgba(0,212,255,0.5)',
              boxShadow:   '0 0 14px rgba(0,212,255,0.12)',
            }}
          >
            {/* Plus icon */}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            NEW RECORD
          </button>
          <button
            onClick={() => navigate('/map')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest uppercase transition-all duration-200 hover:scale-105"
            style={{
              background:  'rgba(0,212,255,0.1)',
              border:      '1px solid rgba(0,212,255,0.35)',
              color:       '#00d4ff',
              textShadow:  '0 0 8px rgba(0,212,255,0.5)',
              boxShadow:   '0 0 14px rgba(0,212,255,0.12)',
            }}
          >
            {/* Map icon */}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            OPEN MAP
          </button>
        </div>
      </div>

      {/* ── BODY: sidebar + chat ── */}
      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <div
          className="shrink-0 flex flex-col overflow-hidden transition-all duration-300"
          style={{
            width:        sidebarOpen ? 220 : 0,
            opacity:      sidebarOpen ? 1 : 0,
            borderRight:  '1px solid rgba(0,212,255,0.1)',
            background:   'rgba(3,8,18,0.85)',
            backdropFilter:'blur(16px)',
          }}
        >
          {sidebarOpen && (
            <>
              {/* New chat button */}
              <div className="p-3 shrink-0">
                <button
                  onClick={() => {
                    setMessages([{
                      id:   Date.now(),
                      role: 'bot',
                      text: 'New session started. How can I assist you, Officer?',
                      time: now(),
                    }]);
                    setActiveHistory(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono tracking-wider transition-all hover:opacity-80"
                  style={{ background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.2)', color:'rgba(0,212,255,0.7)' }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  NEW SESSION
                </button>
              </div>

              <div className="px-3 pb-1 text-[8px] font-mono tracking-[0.25em] shrink-0" style={{ color:'rgba(0,212,255,0.25)' }}>
                RECENT SESSIONS
              </div>

              {/* History list */}
              <div className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-1">
                {HISTORY_STUBS.map(h => (
                  <button
                    key={h.id}
                    onClick={() => setActiveHistory(h.id)}
                    className="w-full text-left flex flex-col gap-0.5 px-3 py-2 rounded-lg transition-all duration-150"
                    style={{
                      background:  activeHistory === h.id ? 'rgba(0,212,255,0.1)' : 'transparent',
                      border:      activeHistory === h.id ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
                      color:       activeHistory === h.id ? 'rgba(0,212,255,0.9)' : 'rgba(160,220,255,0.5)',
                    }}
                  >
                    <span className="text-xs font-medium truncate">{h.title}</span>
                    <span className="text-[9px] font-mono" style={{ color:'rgba(0,212,255,0.25)' }}>{h.time}</span>
                  </button>
                ))}
              </div>

              {/* Sidebar footer */}
              <div className="px-3 py-2 shrink-0 border-t text-[9px] font-mono" style={{ borderTopColor:'rgba(0,212,255,0.08)', color:'rgba(0,212,255,0.2)' }}>
                KSP INTEL · SESSION LOG
              </div>
            </>
          )}
        </div>

        {/* ── MAIN CHAT AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 flex flex-col gap-4 min-h-0">

            

            {/* Message list */}
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {/* Typing indicator */}
            {typing && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>

          {/* ── CHAT INPUT (imported component) ── */}
          <ChatInput onSend={handleSend} disabled={typing} />
        </div>
      </div>

      {/* ── CORNER DECORATIONS ── */}
      <CornerBrackets
  zIndex={20}
  opacity={0.2}
  positions={{
    topLeft: 'top-14 left-0',
    topRight: 'top-14 right-0',
    bottomLeft: 'bottom-0 left-0',
    bottomRight: 'bottom-0 right-0',
  }}
/>
    </div>
  );
}