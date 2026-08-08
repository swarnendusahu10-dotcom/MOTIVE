import { useState } from 'react';

const LEGEND = [
  { label: 'Critical (200+)', color: '#ff2d55', fill: 'rgba(255,45,85,0.2)' },
  { label: 'High (120–199)', color: '#ff9f0a', fill: 'rgba(255,159,10,0.18)' },
  { label: 'Medium (70–119)', color: '#ffd60a', fill: 'rgba(255,214,10,0.15)' },
  { label: 'Low (<70)', color: '#30d158', fill: 'rgba(48,209,88,0.12)' },
];

export default function MapControls({
  onToggleHeatmap,
  onToggleLabels,
  onReset,
  districtsOn = false,
  taluksOn = false,
  onToggleDistricts,
  onToggleTaluks,
}) {
  const [heatmap, setHeatmap] = useState(true);
  const [labels, setLabels] = useState(true);

  const [showLayers, setShowLayers] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showHotspots, setShowHotspots] = useState(false);

  const Toggle = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-mono text-white/45">
        {label}
      </span>

      <button
        onClick={() => onChange(!checked)}
        className="relative w-8 h-4 rounded-full transition-all duration-200 shrink-0"
        style={{
          background: checked
            ? 'rgba(0,212,255,0.4)'
            : 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200"
          style={{
            background: checked
              ? '#00d4ff'
              : 'rgba(255,255,255,0.25)',
            left: checked ? '17px' : '2px',
            boxShadow: checked
              ? '0 0 6px #00d4ff'
              : 'none',
          }}
        />
      </button>
    </div>
  );

  const PanelStyle = {
    width: 190,
    background: 'rgba(5,10,20,0.88)',
    border: '1px solid rgba(0,212,255,0.12)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow:
      '0 0 30px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,212,255,0.03)',
  };

  return (
   <div
  className="
    absolute
    right-4
    bottom-30
    z-30
    flex
    flex-col
    gap-3
    items-end
    pointer-events-none
  "
  style={{
    maxHeight: 'calc(100vh - 140px)',
    overflowY: 'auto',
    paddingRight: '2px'
  }}
>
      {/* BOUNDARIES PANEL — reveals district / taluk borders with the "living line" draw-in animation */}
      <div
        className="pointer-events-auto rounded-lg p-3"
        style={PanelStyle}
      >
        <span className="text-[9px] font-mono tracking-[0.25em] text-cyan-400/40 block mb-3">
          BOUNDARIES
        </span>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onToggleDistricts && onToggleDistricts(!districtsOn)}
            className="w-full py-1.5 rounded text-[10px] font-mono tracking-wider transition-all duration-200"
            style={{
              border: `1px solid ${districtsOn ? 'rgba(31,81,255,0.6)' : 'rgba(31,81,255,0.2)'}`,
              color: districtsOn ? '#5b7fff' : 'rgba(91,127,255,0.55)',
              background: districtsOn ? 'rgba(31,81,255,0.12)' : 'transparent',
              boxShadow: districtsOn ? '0 0 10px rgba(31,81,255,0.25)' : 'none',
            }}
          >
            {districtsOn ? '● ' : '○ '}DISTRICT BORDERS
          </button>

          <button
            onClick={() => onToggleTaluks && onToggleTaluks(!taluksOn)}
            className="w-full py-1.5 rounded text-[10px] font-mono tracking-wider transition-all duration-200"
            style={{
              border: `1px solid ${taluksOn ? 'rgba(57,255,20,0.6)' : 'rgba(57,255,20,0.2)'}`,
              color: taluksOn ? '#39FF14' : 'rgba(57,255,20,0.55)',
              background: taluksOn ? 'rgba(57,255,20,0.10)' : 'transparent',
              boxShadow: taluksOn ? '0 0 10px rgba(57,255,20,0.25)' : 'none',
            }}
          >
            {taluksOn ? '● ' : '○ '}TALUK BORDERS
          </button>
        </div>
      </div>

      {/* MAP LAYERS PANEL */}
     <div
  className="pointer-events-auto rounded-lg p-3"
  style={PanelStyle}
>
  <button
    onClick={() => setShowLayers(s => !s)}
    className="w-full flex items-center justify-between"
  >
    <span className="text-[9px] font-mono tracking-[0.25em] text-cyan-400/40">
      MAP LAYERS
    </span>

    <span className="text-cyan-400/30 text-xs">
      {showLayers ? '▲' : '▼'}
    </span>
  </button>

  {showLayers && (
    <div className="flex flex-col gap-3 mt-3">

      <Toggle
        label="HEAT MAP"
        checked={heatmap}
        onChange={(v) => {
          setHeatmap(v);
          onToggleHeatmap(v);
        }}
      />

      <Toggle
        label="DISTRICT LABELS"
        checked={labels}
        onChange={(v) => {
          setLabels(v);
          onToggleLabels(v);
        }}
      />

      <button
        onClick={onReset}
        className="mt-1 w-full py-1.5 rounded text-[10px] font-mono tracking-wider hover:bg-cyan-400/10"
        style={{
          border: '1px solid rgba(0,212,255,0.2)',
          color: 'rgba(0,212,255,0.6)',
        }}
      >
        ⌂ RESET VIEW
      </button>

    </div>
  )}
</div>

      {/* LEGEND PANEL */}
     {/* <div
  className="pointer-events-auto rounded-lg p-3"
  style={PanelStyle}
>
  <button
    className="w-full flex items-center justify-between"
    onClick={() => setShowLegend(s => !s)}
  >
    <span className="text-[9px] font-mono tracking-[0.25em] text-cyan-400/40">
      RISK LEGEND
    </span>

    <span className="text-cyan-400/30 text-xs">
      {showLegend ? '▲' : '▼'}
    </span>
  </button>

  {showLegend && (
    <div className="flex flex-col gap-2 mt-3">
      {LEGEND.map(({ label, color, fill }) => (
        <div
          key={label}
          className="flex items-center gap-2"
        >
          <div
            className="w-4 h-3 rounded-sm border shrink-0"
            style={{
              background: fill,
              borderColor: `${color}60`,
            }}
          />

          <div
            className="text-[10px] font-mono"
            style={{
              color: 'rgba(160,200,220,0.55)',
            }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  )}
</div> */}

      {/* HOTSPOT PANEL */}
     {/* <div
  className="pointer-events-auto rounded-lg p-3"
  style={PanelStyle}
>
  <button
    onClick={() => setShowHotspots(s => !s)}
    className="w-full flex items-center justify-between"
  >
    <span className="text-[9px] font-mono tracking-[0.25em] text-cyan-400/40">
      HOTSPOT MARKERS
    </span>

    <span className="text-cyan-400/30 text-xs">
      {showHotspots ? '▲' : '▼'}
    </span>
  </button>

  {showHotspots && (
    <div className="mt-3">
      {[
        { color: '#ff2d55', label: 'Critical Zone' },
        { color: '#ff9f0a', label: 'High Activity' },
        { color: '#ffd60a', label: 'Medium Activity' },
        { color: '#30d158', label: 'Low Activity' },
      ].map(({ color, label }) => (
        <div
          key={label}
          className="flex items-center gap-2 mb-2"
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />

          <span
            className="text-[10px] font-mono"
            style={{
              color: 'rgba(160,200,220,0.5)',
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )}
</div> */}

    </div>
  );
}