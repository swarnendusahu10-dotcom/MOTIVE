import { useState } from 'react';
import { crimeData } from '../data/karnataka-districts.js';
import DistrictList from './DistrictList.jsx';
import DetailPanel from './DetailPanel.jsx';
import AlertFeed from './AlertFeed.jsx';

export default function LeftPanel({
  visible,
  toggleVisible,
  selectedDistrict,
  selectedData,
  onSelect,
}) {
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const searchResults =
    searchQuery.length > 0
      ? Object.keys(crimeData)
          .filter((n) =>
            n.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 6)
      : [];

  const tabs = [
    { id: 'list', label: 'DISTRICTS', icon: '◈' },
    { id: 'detail', label: 'DETAIL', icon: '◉' },
    { id: 'alerts', label: 'ALERTS', icon: '◎' },
  ];

  const handleSelect = (name, data) => {
    onSelect(name, data);
    setActiveTab('detail');
    setSearchQuery('');
    setShowSearch(false);
  };

  return (
    <>
      {/* FLOATING TOGGLE ARROW */}
      <div
        className="absolute z-40 transition-all duration-300"
        style={{
          left: visible ? 296 : 8,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        <button
          onClick={toggleVisible}
          className="w-7 h-14 rounded-r-md flex items-center justify-center"
          style={{
            background: 'rgba(5,10,20,0.95)',
            border: '1px solid rgba(0,212,255,0.18)',
            borderLeft: 'none',
            color: '#00d4ff',
            boxShadow: '0 0 20px rgba(0,212,255,0.15)',
          }}
        >
          {visible ? '◀' : '▶'}
        </button>
      </div>

      {/* MAIN PANEL */}
      <div
        className="absolute top-14 bottom-14 z-30 flex flex-col rounded-lg overflow-hidden transition-all duration-300"
        style={{
          width: 280,

          left: visible ? 16 : -300,

          opacity: visible ? 1 : 0,

          pointerEvents: visible
            ? 'auto'
            : 'none',

          background: 'rgba(5, 10, 20, 0.92)',

          border:
            '1px solid rgba(0, 212, 255, 0.12)',

          backdropFilter: 'blur(16px)',

          boxShadow:
            '0 0 40px rgba(0,0,0,0.7), 0 0 80px rgba(0,212,255,0.04), inset 0 1px 0 rgba(0,212,255,0.08)',
        }}
      >
        {/* HEADER */}
        <div
          className="px-3 py-2 border-b flex items-center justify-between shrink-0"
          style={{
            borderBottomColor:
              'rgba(0,212,255,0.1)',
          }}
        >
          <div className="text-[9px] font-mono tracking-[0.25em] text-cyan-400/50">
            INTELLIGENCE PANEL
          </div>

          <button
            onClick={() => {
              setShowSearch((s) => !s);
              setSearchQuery('');
            }}
            className="text-cyan-400/40 hover:text-cyan-400/80 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>

        {/* SEARCH */}
        {showSearch && (
          <div
            className="px-3 py-2 border-b relative shrink-0"
            style={{
              borderBottomColor:
                'rgba(0,212,255,0.08)',
            }}
          >
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              placeholder="Search district..."
              className="w-full bg-black/40 border rounded px-2.5 py-1.5 text-sm font-mono text-cyan-100/80 placeholder-white/15 focus:outline-none"
              style={{
                borderColor:
                  'rgba(0,212,255,0.2)',
                caretColor: '#00d4ff',
              }}
            />

            {searchResults.length > 0 && (
              <div
                className="absolute left-3 right-3 top-full mt-1 z-50 rounded border overflow-hidden"
                style={{
                  background:
                    'rgba(5,10,20,0.98)',
                  borderColor:
                    'rgba(0,212,255,0.2)',
                }}
              >
                {searchResults.map((name) => (
                  <div
                    key={name}
                    onClick={() =>
                      handleSelect(
                        name,
                        crimeData[name]
                      )
                    }
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-cyan-400/10 text-cyan-200/70 hover:text-cyan-300 transition-colors font-medium"
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TABS */}
        <div
          className="flex border-b shrink-0"
          style={{
            borderBottomColor:
              'rgba(0,212,255,0.08)',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id)
              }
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono tracking-wider transition-all duration-150"
              style={{
                color:
                  activeTab === tab.id
                    ? '#00d4ff'
                    : 'rgba(160,180,200,0.35)',

                background:
                  activeTab === tab.id
                    ? 'rgba(0,212,255,0.06)'
                    : 'transparent',

                borderBottom:
                  activeTab === tab.id
                    ? '1px solid #00d4ff'
                    : '1px solid transparent',

                marginBottom: -1,
              }}
            >
              <span style={{ fontSize: 8 }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'list' && (
            <DistrictList
              selectedDistrict={selectedDistrict}
              onSelect={handleSelect}
            />
          )}

          {activeTab === 'detail' && (
            <DetailPanel
              district={selectedDistrict}
              data={selectedData}
            />
          )}

          {activeTab === 'alerts' && (
            <div>
              <div
                className="px-3 py-2 text-[9px] font-mono tracking-[0.2em] text-white/25 border-b"
                style={{
                  borderBottomColor:
                    'rgba(0,212,255,0.06)',
                }}
              >
                ● LIVE INCIDENT FEED
              </div>

              <AlertFeed />
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className="px-3 py-1.5 border-t shrink-0 flex items-center justify-between"
          style={{
            borderTopColor:
              'rgba(0,212,255,0.08)',
          }}
        >
          <div className="text-[9px] font-mono text-white/15">
            KSP · INTEL v2.0
          </div>

          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] font-mono text-green-400/60">
              LIVE
            </span>
          </div>
        </div>
      </div>
    </>
  );
}