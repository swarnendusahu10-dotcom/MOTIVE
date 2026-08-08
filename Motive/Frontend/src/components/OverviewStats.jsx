import { useState, useEffect } from 'react';
import { crimeData, getSeverity } from '../data/karnataka-districts.js';
import { useNavigate } from 'react-router-dom';


export default function OverviewStats() {
   const navigate  = useNavigate();
  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 flex items-right justify-right gap-0 py-2.5"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0) 100%)' }}>

      <div className="flex items-right divide-x divide-white/10">
         <div className="flex items-right gap-2">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2 mx-4 px-4 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest uppercase transition-all duration-200 hover:scale-105"
            style={{
              background:  'rgba(0,212,255,0.1)',
              border:      '1px solid rgba(0,212,255,0.35)',
              color:       '#00d4ff',
              textShadow:  '0 0 8px rgba(0,212,255,0.5)',
              boxShadow:   '0 0 14px rgba(0,212,255,0.12)',
            }}
          >
            
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            OPEN CHAT
          </button>
        </div>
      </div>
    </div>
  );
}
//copied