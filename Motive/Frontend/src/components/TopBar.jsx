import { useState, useEffect } from 'react';

export default function TopBar() {
  const [time, setTime] = useState(new Date());
  const [tick, setTick] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date());
      setTick(t => !t);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (n) => String(n).padStart(2, '0');
  const timeStr = `${fmt(time.getHours())}:${fmt(time.getMinutes())}:${fmt(time.getSeconds())}`;
  const dateStr = time.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();

  return (
    <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-2.5"
      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0) 100%)' }}>

      {/* Left — KSP Branding */}
      <div className="flex items-center gap-3">
        {/* Star of Life / badge icon */}
        <div className="relative w-9 h-9 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" style={{ animationDuration: '3s' }} />
          <svg viewBox="0 0 36 36" className="w-8 h-8">
            <polygon points="18,2 22,14 34,14 24,22 28,34 18,26 8,34 12,22 2,14 14,14"
              fill="none" stroke="#00d4ff" strokeWidth="1.2" strokeLinejoin="round" opacity="0.9"/> {/* this part is the star logo on the top left corner */}
            <circle cx="18" cy="19" r="4" fill="#00d4ff" opacity="0.8"/>
          </svg>
        </div>
        <div>
          <div className="text-xs tracking-[0.25em] text-cyan-400/60 font-mono leading-none">KARNATAKA STATE POLICE</div>
          <div className="text-base font-bold tracking-[0.1em] leading-tight"
            style={{ color: '#00d4ff', textShadow: '0 0 12px rgba(0,212,255,0.7)' }}>
            CRIME INTELLIGENCE MAP
          </div>
        </div>
      </div>

      {/* Center — Status indicators */}
      <div className="hidden md:flex items-center gap-6">
        {[
          { label: 'SYSTEM', status: 'ONLINE', color: '#30d158' },
          { label: 'DATA FEED', status: 'LIVE', color: '#30d158' },
          { label: 'COVERAGE', status: '31 DISTRICTS', color: '#00d4ff' },
        ].map(({ label, status, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <div className="text-[9px] tracking-[0.2em] text-white/30 font-mono">{label}</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <span className="text-[11px] font-mono font-semibold" style={{ color }}>{status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Right — Clock */}
      <div className="flex flex-col items-end">
        <div className="font-mono text-xl font-bold tracking-widest"
          style={{ color: '#00d4ff', textShadow: '0 0 15px rgba(0,212,255,0.6)' }}>
          {timeStr}
        </div>
        <div className="font-mono text-[10px] tracking-[0.15em] text-white/40">{dateStr}</div>
      </div>
    </div>
  );
}
//copied