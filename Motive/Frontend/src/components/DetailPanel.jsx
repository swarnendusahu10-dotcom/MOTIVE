import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { getSeverity, severityColor, severityLabel } from '../data/karnataka-districts.js';

function StatCard({ label, value, color }) {
  return (
    <div className="rounded p-2.5 border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="text-[10px] tracking-widest text-white/35 font-mono mb-0.5">{label}</div>
      <div className="text-xl font-bold font-mono" style={{ color, textShadow: `0 0 10px ${color}55` }}>
        {value}
      </div>
    </div>
  );
}

export default function DetailPanel({ district, data }) {
  const trendRef = useRef(null);
  const donutRef = useRef(null);
  const trendChart = useRef(null);
  const donutChart = useRef(null);

  const sev = data ? getSeverity(data.incidents) : 'low';
  const col = severityColor[sev];

  useEffect(() => {
    if (!data || !trendRef.current || !donutRef.current) return;

    // Destroy old
    if (trendChart.current) { trendChart.current.destroy(); trendChart.current = null; }
    if (donutChart.current) { donutChart.current.destroy(); donutChart.current = null; }

    const gridColor = 'rgba(0,212,255,0.06)';
    const labelColor = 'rgba(160,220,255,0.4)';

    // ── Trend Line Chart
    trendChart.current = new Chart(trendRef.current, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          data: data.trend,
          borderColor: col,
          backgroundColor: col.replace(')', ', 0.12)').replace('rgb', 'rgba').replace('#ff2d55', 'rgba(255,45,85,0.12)').replace('#ff9f0a', 'rgba(255,159,10,0.12)').replace('#ffd60a', 'rgba(255,214,10,0.12)').replace('#30d158', 'rgba(48,209,88,0.12)'),
          borderWidth: 2,
          pointBackgroundColor: col,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: 'rgba(5,10,20,0.95)',
          borderColor: col,
          borderWidth: 1,
          titleColor: col,
          bodyColor: 'rgba(160,220,255,0.8)',
          titleFont: { family: 'JetBrains Mono', size: 11 },
          bodyFont: { family: 'Rajdhani', size: 12 },
          callbacks: { title: (i) => i[0].label, label: (i) => `  Incidents: ${i.raw}` }
        }},
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: labelColor, font: { family: 'JetBrains Mono', size: 9 } } },
          y: { grid: { color: gridColor }, ticks: { color: labelColor, font: { family: 'JetBrains Mono', size: 9 } }, beginAtZero: false }
        }
      }
    });

    // ── Donut Chart
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Theft', 'Assault', 'Cyber', 'Narcotics'],
        datasets: [{
          data: [data.theft, data.assault, data.cyber, data.narcotics],
          backgroundColor: ['rgba(255,159,10,0.8)', 'rgba(255,45,85,0.8)', 'rgba(0,212,255,0.8)', 'rgba(48,209,88,0.8)'],
          borderColor: ['#ff9f0a', '#ff2d55', '#00d4ff', '#30d158'],
          borderWidth: 1,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'rgba(160,220,255,0.6)',
              font: { family: 'Rajdhani', size: 11 },
              boxWidth: 10,
              padding: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(5,10,20,0.95)',
            borderColor: 'rgba(0,212,255,0.3)',
            borderWidth: 1,
            titleColor: '#00d4ff',
            bodyColor: 'rgba(160,220,255,0.8)',
          }
        }
      }
    });

    return () => {
      if (trendChart.current) trendChart.current.destroy();
      if (donutChart.current) donutChart.current.destroy();
    };
  }, [data, col]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-40">
        <svg className="w-10 h-10 mb-3 text-cyan-400/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-xs font-mono text-white/30 tracking-wider">SELECT A DISTRICT</p>
        <p className="text-xs text-white/20 mt-1">Click map or list to view analytics</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 animate-[fadeIn_0.3s_ease-out]">
      {/* District header */}
      <div className="border-b pb-3" style={{ borderColor: `${col}30` }}>
        <div className="text-base font-bold tracking-wide" style={{ color: col, textShadow: `0 0 12px ${col}55` }}>
          {district}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: col, boxShadow: `0 0 6px ${col}` }} />
          <span className="text-[10px] font-mono tracking-[0.18em] text-white/40">{severityLabel[sev]} RISK</span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="INCIDENTS/MO" value={data.incidents} color={col} />
        <StatCard label="THEFT" value={data.theft} color="#ff9f0a" />
        <StatCard label="ASSAULT" value={data.assault} color="#ff2d55" />
        <StatCard label="CYBER" value={data.cyber} color="#00d4ff" />
        <StatCard label="NARCOTICS" value={data.narcotics} color="#30d158" />
        <StatCard label="DIVISION" value={
          Object.entries({ "Bengaluru Urban": "BLR", "Mysuru": "MYS", "Dharwad": "DHR", "Belagavi": "BLG" })[0]
            ? "—" : "—"
        } color="rgba(160,220,255,0.5)" />
      </div>

      {/* Trend chart */}
      <div>
        <div className="text-[9px] font-mono tracking-[0.2em] text-white/25 mb-1.5">6-MONTH TREND</div>
        <div className="rounded border border-white/5 p-2" style={{ background: 'rgba(0,0,0,0.3)', height: 90 }}>
          <canvas ref={trendRef} />
        </div>
      </div>

      {/* Donut chart */}
      <div>
        <div className="text-[9px] font-mono tracking-[0.2em] text-white/25 mb-1.5">CRIME BREAKDOWN</div>
        <div className="rounded border border-white/5 p-2" style={{ background: 'rgba(0,0,0,0.3)', height: 100 }}>
          <canvas ref={donutRef} />
        </div>
      </div>
    </div>
  );
}
//copied