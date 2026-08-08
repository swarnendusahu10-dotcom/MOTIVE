import { useState, useEffect } from 'react';
import { crimeData, getSeverity, severityColor } from '../data/karnataka-districts.js';

const CRIME_TYPES = ['Theft', 'Assault', 'Cyber Fraud', 'Narcotics', 'Chain Snatching', 'Burglary', 'Vehicle Theft', 'Domestic Violence'];
const LOCATIONS = ['Market Rd', 'Old Town', 'NH-48', 'Station Rd', 'Bus Stand', 'Lake View', 'Industrial Area', 'Civil Lines'];

function generateAlert() {
  const districts = Object.keys(crimeData);
  const district = districts[Math.floor(Math.random() * districts.length)];
  const d = crimeData[district];
  const sev = getSeverity(d.incidents);
  const crimeType = CRIME_TYPES[Math.floor(Math.random() * CRIME_TYPES.length)];
  const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  return {
    id: Date.now() + Math.random(),
    district,
    crimeType,
    location: loc,
    severity: sev,
    color: severityColor[sev],
    time: timeStr,
  };
}

export default function AlertFeed() {
  const [alerts, setAlerts] = useState(() => Array.from({ length: 4 }, generateAlert));

  useEffect(() => {
    // Add a new alert every 3-6 seconds
    const schedule = () => {
      const delay = 3000 + Math.random() * 3000;
      return setTimeout(() => {
        setAlerts(prev => [generateAlert(), ...prev].slice(0, 8));
        schedule();
      }, delay);
    };
    const timer = schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col gap-0">
      {alerts.map((a, idx) => (
        <div
          key={a.id}
          className="flex items-start gap-2 px-3 py-1.5 border-b transition-all duration-300"
          style={{
            borderBottomColor: 'rgba(0,212,255,0.06)',
            opacity: idx === 0 ? 1 : Math.max(0.25, 1 - idx * 0.1),
            animation: idx === 0 ? 'alertSlide 0.3s ease-out' : 'none',
          }}
        >
          {/* Color dot */}
          <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
            style={{ background: a.color, boxShadow: `0 0 5px ${a.color}` }} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold truncate" style={{ color: a.color }}>{a.crimeType}</span>
              <span className="text-[9px] font-mono text-white/25 shrink-0">{a.time}</span>
            </div>
            <div className="text-[10px] text-white/40 truncate">{a.district} · {a.location}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
//copied