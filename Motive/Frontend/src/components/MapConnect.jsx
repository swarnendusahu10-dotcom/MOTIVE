import { useState, useCallback } from 'react';
import { useMap } from '../hooks/useMap.js';
import { crimeData } from '../data/karnataka-districts.js';
import TopBar        from './TopBar.jsx';
import LeftPanel     from './LeftPanel.jsx';
import MapControls   from './MapControls.jsx';
import OverviewStats from './OverviewStats.jsx';
import ScanlineOverlay from './ScanlineOverlay.jsx';

export default function MapConnect() {
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedData,     setSelectedData]     = useState(null);

  const {
    mapRef, flyToDistrict, resetView, toggleHeatmap, toggleLabels,
    showDistricts, hideDistricts, showTaluks, hideTaluks,
    districtsOn, taluksOn,
  } = useMap({
    onDistrictSelect: (name, data) => {
      setSelectedDistrict(name);
      setSelectedData(data);
    },
  });

  const handleSelect = useCallback((name, data) => {
    setSelectedDistrict(name);
    setSelectedData(data);
    flyToDistrict(name);
  }, [flyToDistrict]);

  // Once the district boundaries have finished drawing in, settle the view
  // on Bengaluru Urban and surface its crime data — same intro beat the map
  // used to open with, just gated behind the reveal instead of a fixed timer.
  const handleToggleDistricts = useCallback((next) => {
    if (next) {
      showDistricts({
        onDone: () => {
          setTimeout(() => {
            const district = 'Bengaluru Urban';
            setSelectedDistrict(district);
            setSelectedData(crimeData[district]);
            flyToDistrict(district);
          }, 400);
        },
      });
    } else {
      hideDistricts();
    }
  }, [showDistricts, hideDistricts, flyToDistrict]);

  const handleToggleTaluks = useCallback((next) => {
    if (next) showTaluks();
    else hideTaluks();
  }, [showTaluks, hideTaluks]);

  return (
    <div className="relative bg-black overflow-hidden font-sans" style={{ width:'100vw', height:'100vh' }}>
      <div ref={mapRef} className="absolute inset-0 z-0" />
      <ScanlineOverlay />
      <TopBar />
      <LeftPanel
        visible={leftPanelVisible}
        toggleVisible={() => setLeftPanelVisible(v => !v)}
        selectedDistrict={selectedDistrict}
        selectedData={selectedData}
        onSelect={handleSelect}
      />
      <MapControls
        onToggleHeatmap={toggleHeatmap}
        onToggleLabels={toggleLabels}
        onReset={resetView}
        districtsOn={districtsOn}
        taluksOn={taluksOn}
        onToggleDistricts={handleToggleDistricts}
        onToggleTaluks={handleToggleTaluks}
      />
      <OverviewStats />
     
    </div>
  );
}
