import { crimeData, getSeverity, severityColor } from '../data/karnataka-districts.js';

const sorted = Object.entries(crimeData).sort((a, b) => b[1].incidents - a[1].incidents);

export default function DistrictList({ selectedDistrict, onSelect }) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {sorted.map(([name, d], idx) => {
        const sev = getSeverity(d.incidents);
        const col = severityColor[sev];
        const isActive = selectedDistrict === name;

        return (
          <div
            key={name}
            onClick={() => onSelect(name, d)}
            className="flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-150 border-l-2 hover:bg-white/5"
            style={{
              borderLeftColor: isActive ? col : 'transparent',
              background: isActive ? `${col}10` : 'transparent',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Rank */}
              <span className="text-[10px] font-mono text-white/20 w-4 shrink-0">{idx + 1}</span>
              {/* Dot */}
              <div className="w-2 h-2 rounded-full shrink-0" style={{
                background: col,
                boxShadow: `0 0 6px ${col}`
              }} />
              {/* Name */}
              <span className="text-sm font-medium truncate" style={{ color: isActive ? col : 'rgba(200,230,255,0.8)' }}>
                {name}
              </span>
            </div>
            {/* Count */}
            <span className="text-xs font-mono font-semibold ml-2 shrink-0" style={{ color: col }}>
              {d.incidents}
            </span>
          </div>
        );
      })}
    </div>
  );
}
//copied