import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSend, disabled = false }) {
  const [text,      setText]      = useState('');
  const [files,     setFiles]     = useState([]);
  const [expanded,  setExpanded]  = useState(true);
  const [listening, setListening] = useState(false);
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    if (disabled) return;
    onSend(trimmed, files);
    setText('');
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...picked].slice(0, 5));
    e.target.value = '';
  };

  const removeFile = (i) => setFiles(f => f.filter((_, idx) => idx !== i));

  const toggleVoice = () => setListening(l => !l);

  // ── styles
  const borderCol  = 'rgba(0,212,255,0.18)';
  const panelBg    = 'rgba(4,10,20,0.96)';

  return (
    <div
      className="relative flex-shrink-0 transition-all duration-300"
      style={{
        background:    panelBg,
        borderTop:     `1px solid ${borderCol}`,
        backdropFilter:'blur(20px)',
      }}
    >
      {/* ── COLLAPSE / EXPAND TOGGLE ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        title={expanded ? 'Collapse input' : 'Expand input'}
        className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-8 h-4 rounded-t-md transition-all duration-200 hover:opacity-80"
        style={{
          background:  panelBg,
          border:      `1px solid ${borderCol}`,
          borderBottom:'none',
          color:       'rgba(0,212,255,0.5)',
          fontSize:    10,
        }}
      >
        {expanded ? '▼' : '▲'}
      </button>

      {/* ── COLLAPSED STATE — one-liner strip ── */}
      {!expanded && (
        <div
          className="flex items-center gap-2 px-4 py-2 cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
          <span className="text-xs font-mono tracking-widest" style={{ color: 'rgba(0,212,255,0.35)' }}>
            CLICK TO OPEN INPUT
          </span>
        </div>
      )}

      {/* ── EXPANDED STATE ── */}
      {expanded && (
        <div className="flex flex-col gap-2 px-4 py-3">

          {/* File previews */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono"
                  style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)', color: 'rgba(0,212,255,0.7)' }}
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="ml-1 hover:text-red-400 transition-colors"
                    style={{ color: 'rgba(0,212,255,0.4)' }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Main input row */}
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{
              background: 'rgba(0,0,0,0.45)',
              border:     `1px solid ${disabled ? 'rgba(0,212,255,0.08)' : 'rgba(0,212,255,0.22)'}`,
              boxShadow:  disabled ? 'none' : '0 0 12px rgba(0,212,255,0.06)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          >
            {/* Attach */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
              title="Attach file"
              className="shrink-0 mb-1 transition-all duration-150 hover:scale-110 disabled:opacity-30"
              style={{ color: 'rgba(0,212,255,0.45)' }}
            >
              <svg className="w-4.5 h-4.5" width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              disabled={disabled}
              placeholder={disabled ? 'Awaiting response…' : 'Enter your query… (Shift+Enter for new line)'}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed focus:outline-none placeholder-white/20 disabled:opacity-40"
              style={{
                color:      'rgba(200,240,255,0.88)',
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 500,
                fontSize:   14,
                caretColor: '#00d4ff',
                minHeight:  24,
                maxHeight:  160,
              }}
            />

            {/* Voice */}
            <button
              onClick={toggleVoice}
              disabled={disabled}
              title={listening ? 'Stop listening' : 'Voice input'}
              className="shrink-0 mb-1 transition-all duration-150 hover:scale-110 disabled:opacity-30"
              style={{ color: listening ? '#ff2d55' : 'rgba(0,212,255,0.45)' }}
            >
              {listening ? (
                // animated mic
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"/>
                  <line x1="9"  y1="23" x2="15" y2="23" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth={1} opacity="0.3" style={{ animation: 'pulse 1s infinite' }}/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z"/>
                </svg>
              )}
            </button>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={disabled || (!text.trim() && files.length === 0)}
              title="Send (Enter)"
              className="shrink-0 mb-0.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 disabled:opacity-25 disabled:cursor-not-allowed"
              style={{
                background: (disabled || (!text.trim() && files.length === 0))
                  ? 'rgba(0,212,255,0.06)'
                  : 'rgba(0,212,255,0.18)',
                border:     '1px solid rgba(0,212,255,0.35)',
                color:      '#00d4ff',
                boxShadow:  (disabled || (!text.trim() && files.length === 0))
                  ? 'none'
                  : '0 0 10px rgba(0,212,255,0.2)',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-mono tracking-widest" style={{ color: 'rgba(0,212,255,0.2)' }}>
              ENTER TO SEND · SHIFT+ENTER FOR NEW LINE
            </span>
            <span className="text-[9px] font-mono" style={{ color: 'rgba(0,212,255,0.15)' }}>
              {text.length > 0 ? `${text.length} chars` : 'KSP INTEL AI'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
