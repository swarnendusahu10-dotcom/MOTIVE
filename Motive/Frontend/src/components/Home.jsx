import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCounter from './Animations/useCounter';
import ParticleCanvas from './Animations/ParticleCanvas';
import GridOverlay from './Animations/GridOverlay';
import ScanLine from './Animations/ScanLine';
import CornerBrackets from './Animations/CornerBrackets';


const STATS = [
  { label: 'Districts Covered',  value: 31,    suffix: '' },
  { label: 'Police Stations',    value: 1100,  suffix: '+' },
  { label: 'Monthly Incidents',  value: 2847,  suffix: '' },
  { label: 'Active Officers',    value: 85000, suffix: '+' },
];

export default function Home() {
  const navigate    = useNavigate();
  const [ready, setReady]  = useState(false);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  const c0 = useCounter(STATS[0].value, 1800, ready);
  const c1 = useCounter(STATS[1].value, 2000, ready);
  const c2 = useCounter(STATS[2].value, 2200, ready);
  const c3 = useCounter(STATS[3].value, 2400, ready);
  const counts = [c0, c1, c2, c3];

  return (
    <div
      className="relative w-screen min-h-screen bg-black flex flex-col"
      style={{ fontFamily: "'Rajdhani', sans-serif" }}
    >
      {/* ── PARTICLE BACKGROUND (fixed so it always fills viewport) ── */}
      <ParticleCanvas />

      {/* ── RADIAL GLOW ── */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(0,40,60,0.6) 0%, rgba(0,0,0,0) 70%)' }} />

      {/* ── GRID OVERLAY ── */}
      <GridOverlay color="0,212,255" />

      {/* ── SCAN LINE ── */}
    <ScanLine opacity={0.04} duration ={6}/>

      {/* ── CORNER BRACKETS ── */}
      <CornerBrackets/>

      {/* ── VIGNETTE ── */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />

      {/* ── MAIN CONTENT ── */}
      {/* py reduced from py-10 → py-5 to reclaim vertical space */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 flex-1 py-5"
        style={{ animation: 'fadeIn 0.8s ease-out' }}>

        <div className="flex flex-col items-center max-w-4xl w-full">
          {/* Badge — mb reduced from mb-6 → mb-4 */}
          <div className="flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border"
            style={{ borderColor: 'rgba(0,212,255,0.25)', background: 'rgba(0,212,255,0.06)', backdropFilter: 'blur(10px)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #30d158', animation: 'pulse 1.5s infinite' }} />
            <span className="text-[10px] font-mono tracking-[0.3em] text-cyan-400/70">KARNATAKA STATE POLICE · SCRB</span>
          </div>

          {/* Main heading — clamp reduced from clamp(42px,7vw,88px) → clamp(32px,5.5vw,68px) */}
          <div className="mb-2 relative">
            <h1 className="font-bold leading-none tracking-tight select-none"
              style={{ fontSize: 'clamp(32px, 5.5vw, 68px)', color: '#ffffff', letterSpacing: '-0.01em' }}>
              CRIME
            </h1>
            <h1 className="font-bold leading-none tracking-tight select-none"
              style={{ fontSize: 'clamp(32px, 5.5vw, 68px)', color: '#00d4ff', letterSpacing: '-0.01em', textShadow: '0 0 40px rgba(0,212,255,0.5), 0 0 80px rgba(0,212,255,0.2)' }}>
              INTELLIGENCE
            </h1>
            <h1 className="font-bold leading-none tracking-tight select-none"
              style={{ fontSize: 'clamp(32px, 5.5vw, 68px)', color: '#ffffff', letterSpacing: '-0.01em' }}>
              PLATFORM
            </h1>
          </div>

          {/* Subtitle — margins reduced from mt-5 mb-8 → mt-3 mb-5 */}
          <p className="mt-3 mb-5 max-w-lg font-mono text-sm leading-relaxed"
            style={{ color: 'rgba(160,220,255,0.5)', letterSpacing: '0.04em' }}>
            Tactical crime analytics, district-level intelligence, and real-time pattern detection across Karnataka's 31 districts.
          </p>

          {/* STATS ROW — mb reduced from mb-10 → mb-6; number size from text-2xl → text-xl */}
          <div className="grid grid-cols-4 gap-4 w-full max-w-2xl mb-6">
            {STATS.map((s, i) => (
              <div key={s.label} className="flex flex-col items-center p-3 rounded-lg border"
                style={{ borderColor: 'rgba(0,212,255,0.12)', background: 'rgba(0,212,255,0.04)', backdropFilter: 'blur(8px)' }}>
                <div className="text-xl font-bold font-mono" style={{ color: '#00d4ff', textShadow: '0 0 12px rgba(0,212,255,0.4)' }}>
                  {counts[i].toLocaleString()}{s.suffix}
                </div>
                <div className="text-[9px] font-mono tracking-widest mt-0.5" style={{ color: 'rgba(160,220,255,0.4)' }}>
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          {/* CTA BUTTON */}
          <button
            onClick={() => navigate('/access')}
            onMouseEnter={() => setHovered('cta')}
            onMouseLeave={() => setHovered(null)}
            className="relative group px-10 py-4 rounded-lg font-bold text-base tracking-[0.15em] uppercase transition-all duration-300"
            style={{
              background:   hovered === 'cta' ? 'rgba(0,212,255,0.18)' : 'rgba(0,212,255,0.1)',
              border:       '1px solid rgba(0,212,255,0.45)',
              color:        '#00d4ff',
              letterSpacing: '0.18em',
              textShadow:   '0 0 12px rgba(0,212,255,0.6)',
              boxShadow:    hovered === 'cta'
                ? '0 0 30px rgba(0,212,255,0.3), inset 0 0 20px rgba(0,212,255,0.05)'
                : '0 0 15px rgba(0,212,255,0.15)',
              transform:    hovered === 'cta' ? 'translateY(-2px)' : 'translateY(0)',
            }}>
            <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
              style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff', opacity: hovered === 'cta' ? 1 : 0.4, transition: 'opacity 0.3s' }} />
            <div className="absolute right-0 top-2 bottom-2 w-0.5 rounded-full"
              style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff', opacity: hovered === 'cta' ? 1 : 0.4, transition: 'opacity 0.3s' }} />
            ⬡ REQUEST ACCESS
          </button>

          {/* Sub note */}
          <p className="mt-4 text-[10px] font-mono tracking-widest" style={{ color: 'rgba(160,220,255,0.2)' }}>
            AUTHORIZED PERSONNEL ONLY · KSP INTERNAL SYSTEM
          </p>
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-2.5 border-t"
        style={{ borderTopColor: 'rgba(0,212,255,0.08)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-4">
          {['SECURE CONNECTION', 'ENCRYPTED CHANNEL', 'TLS 1.3'].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-green-400" style={{ boxShadow: '0 0 4px #30d158' }} />
              <span className="text-[9px] font-mono tracking-widest" style={{ color: 'rgba(48,209,88,0.5)' }}>{t}</span>
            </div>
          ))}
        </div>
        <div className="text-[9px] font-mono tracking-widest" style={{ color: 'rgba(160,220,255,0.2)' }}>
          MOTIVE-KSP · BUILD 2026.1
        </div>
      </div>
    </div>
  );
}