import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import {
   crimeData,
  getSeverity, severityColor,
} from '../data/karnataka-districts.js';
import districtsGeoJSON from '../data/District1.json';
import talukGeoJSON from '../data/Taluk1.json';
import stateBorderHalves from '../data/StateBorderHalves.json';
import districtBorderHalves from '../data/DistrictBorderHalves.json';
import talukBorderHalves from '../data/TalukBorderHalves.json';
import pointOnFeature from '@turf/point-on-feature';

// ─── BOUNDARY LEVEL COLORS ─────────────────────────────────────────────────
const BOUNDARY_COLORS = {
  state:    { line: 'rgb(28,158,175)', glow: 'rgba(28,158,175,0.35)' },
  district: { line: '#1F51FF',         glow: 'rgba(31,81,255,0.35)'  }, // neon blue
  taluk:    { line: '#39FF14',         glow: 'rgba(57,255,20,0.30)'  }, // neon green
};

const talukLabelPoints = {
  type: 'FeatureCollection',
  features: talukGeoJSON.features.map(feature => {
   const center = pointOnFeature(feature);

    return {
      type: 'Feature',
      geometry: center.geometry,
      properties: {
        name: feature.properties.KGISTalukN
      }
    };
  })
};
const districtLabelPoints = {
  type: 'FeatureCollection',
  features: districtsGeoJSON.features.map(feature => {
    const center = pointOnFeature(feature);

    return {
      type: 'Feature',
      geometry: center.geometry,
      properties: {
        name: feature.properties.KGISDist_1
      }
    };
  })
};

// ─── ANIMATED "LIVING LINE" BOUNDARY HELPERS ───────────────────────────────
// Each boundary's halves-geojson holds two LineStrings per ring that both
// start at the same point and run in opposite directions around the ring,
// meeting at the far side. Revealing them together (via line-gradient driven
// off ['line-progress']) makes them visually grow toward each other and
// meet — the animation stops the instant they do.

function gradientExpr(t, color) {
  if (t <= 0) {
    return ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0)'];
  }
  if (t >= 1) {
    return ['interpolate', ['linear'], ['line-progress'], 0, color, 1, color];
  }
  const eps = 0.0008;
  const s1 = Math.max(t - eps, 0.0001);
  const s2 = Math.min(t + eps, 0.9999);
  return [
    'interpolate', ['linear'], ['line-progress'],
    0,  color,
    s1, color,
    s2, 'rgba(0,0,0,0)',
    1,  'rgba(0,0,0,0)',
  ];
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function addAnimatedBoundary(map, { id, data, color, glow, width, glowWidth, beforeId, minzoom }) {
  const srcId  = `${id}-src`;
  const glowId = `${id}-glow`;
  const lineId = `${id}-line`;

  if (!map.getSource(srcId)) {
    map.addSource(srcId, { type: 'geojson', data, lineMetrics: true });
  }
  if (!map.getLayer(glowId)) {
    map.addLayer({
      id: glowId,
      type: 'line',
      source: srcId,
      minzoom: minzoom || 0,
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-gradient': gradientExpr(0, color),
        'line-width': glowWidth,
        'line-blur': 6,
        'line-opacity': 0.7,
      },
    }, beforeId);
  }
  if (!map.getLayer(lineId)) {
    map.addLayer({
      id: lineId,
      type: 'line',
      source: srcId,
      minzoom: minzoom || 0,
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-gradient': gradientExpr(0, color),
        'line-width': width,
        'line-opacity': 1,
      },
    }, beforeId);
  }

  // `progress` tracks the boundary's actual current reveal (0..1) at all
  // times, including mid-animation, so a toggle can always reverse from
  // wherever it truly is instead of assuming it was fully shown/hidden.
  return { srcId, glowId, lineId, color, glowColor: glow, progress: 0, shown: false };
}

// tokens let us cancel a stale rAF loop if a boundary is re-toggled mid-animation
const animTokens = {};

// Animates a boundary's reveal progress from `from` -> `to` (both 0..1).
// Used both to draw a boundary in (0 -> 1) and to retract it back out
// (1 -> 0) in the exact same "living line" style, just running in reverse —
// always starting from the boundary's real current progress, never an
// assumed value, so rapid toggling never "flashes" a boundary that wasn't
// actually showing.
function animateBoundaryTo(map, boundary, { from, to, durationMs = 1800, onDone, hideAtEnd = false } = {}) {
  const { glowId, lineId, color } = boundary;
  if (!map.getLayer(lineId)) return;

  const start0 = from !== undefined ? from : boundary.progress;

  const token = Symbol('anim');
  animTokens[lineId] = token;

  map.setLayoutProperty(glowId, 'visibility', 'visible');
  map.setLayoutProperty(lineId, 'visibility', 'visible');
  map.setPaintProperty(glowId, 'line-gradient', gradientExpr(start0, color));
  map.setPaintProperty(lineId, 'line-gradient', gradientExpr(start0, color));

  const startTime = performance.now();
  function frame(now) {
    if (animTokens[lineId] !== token) return; // superseded by a newer toggle
    if (!map.getLayer(lineId)) return;

    const t = Math.min((now - startTime) / durationMs, 1);
    const eased = easeInOutQuad(t);
    const value = start0 + (to - start0) * eased;
    boundary.progress = value;
    const expr = gradientExpr(value, color);
    map.setPaintProperty(lineId, 'line-gradient', expr);
    map.setPaintProperty(glowId, 'line-gradient', expr);

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      boundary.progress = to;
      if (hideAtEnd) {
        map.setLayoutProperty(glowId, 'visibility', 'none');
        map.setLayoutProperty(lineId, 'visibility', 'none');
      }
      onDone && onDone();
    }
  }
  requestAnimationFrame(frame);
}

// Draw the boundary in: both halves grow from their shared start point and
// meet on the far side, from wherever they currently are, up to fully shown.
function playBoundary(map, boundary, opts = {}) {
  animTokens[boundary.lineId] = Symbol('cancelled-previous');
  boundary.shown = true;
  animateBoundaryTo(map, boundary, { to: 1, ...opts });
}

// Retract the boundary: the exact same halves shrink back apart from
// wherever they currently are toward their shared start point, then hide.
// No-ops instantly if the boundary was never actually shown, so it can
// never "flash" into view before disappearing.
function retractBoundary(map, boundary, opts = {}) {
  boundary.shown = false;
  if (!boundary.progress || boundary.progress <= 0) {
    animTokens[boundary.lineId] = Symbol('cancelled-noop');
    if (map.getLayer(boundary.glowId)) map.setLayoutProperty(boundary.glowId, 'visibility', 'none');
    if (map.getLayer(boundary.lineId)) map.setLayoutProperty(boundary.lineId, 'visibility', 'none');
    opts.onDone && opts.onDone();
    return;
  }
  animateBoundaryTo(map, boundary, { to: 0, hideAtEnd: true, ...opts });
}

export function useMap({ onDistrictSelect }) {
  const mapContainerRef  = useRef(null);
  const mapInstanceRef   = useRef(null);
  const markersRef       = useRef([]);
  const markersAddedRef  = useRef(false);
  const boundariesRef    = useRef({}); // level -> {srcId, glowId, lineId, color}
  const onSelectRef      = useRef(onDistrictSelect);
  onSelectRef.current    = onDistrictSelect;

  const [districtsOn, setDistrictsOn] = useState(false);
  const [taluksOn,    setTaluksOn]    = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© CARTO © OpenStreetMap contributors',
          },
        },
        layers: [{
          id: 'background',
          type: 'raster',
          source: 'carto-dark',
          paint: { 'raster-opacity': 1 },
        }],
      },
      center:    [76.5, 15.0],
      zoom:      6.2,
      minZoom:   5,
      maxZoom:   14,
      maxBounds: [[71.5, 10.5], [81.5, 19.5]],
    });

    // map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');// need to fix the issue with button or i think over lapying

    map.on('load', () => {

      // ── CRIME DASHBOARD LAYERS (hidden until "Districts" is revealed) ──────
      addDistrictLayers(map);

      map.addSource('district-labels-source', { type: 'geojson', data: districtLabelPoints });
      map.addLayer({
        id: 'district-labels',
        type: 'symbol',
        source: 'district-labels-source',
        layout: {
          visibility: 'none',
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 12, 16],
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.5,
        },
        paint: {
          'text-color': 'rgba(160,230,255,0.8)',
          'text-halo-color': 'rgba(0,0,0,0.9)',
          'text-halo-width': 1.5,
        },
      });

      addHeatmapLayer(map);
      setupDistrictInteraction(map);

      // ── TALUK LABELS (hidden until "Taluks" is revealed) ───────────────────
      map.addSource('taluk-labels-source', { type: 'geojson', data: talukLabelPoints });
      map.addLayer({
        id: 'taluk-names',
        type: 'symbol',
        source: 'taluk-labels-source',
        minzoom: 8,
        layout: {
          visibility: 'none',
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 8, 12, 12],
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.5,
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': '#000',
          'text-halo-width': 1.5,
        },
      });

      // ── ANIMATED "LIVING LINE" BOUNDARIES ───────────────────────────────────
      // Stacking order (bottom -> top): taluk, district, state — state stays
      // the top-most frame at all times.
      boundariesRef.current.taluk = addAnimatedBoundary(map, {
        id: 'taluk-boundary',
        data: talukBorderHalves,
        color: BOUNDARY_COLORS.taluk.line,
        glow:  BOUNDARY_COLORS.taluk.glow,
        width: 1,
        glowWidth: 4,
        minzoom: 7,
      });

      boundariesRef.current.district = addAnimatedBoundary(map, {
        id: 'district-boundary',
        data: districtBorderHalves,
        color: BOUNDARY_COLORS.district.line,
        glow:  BOUNDARY_COLORS.district.glow,
        width: 1.6,
        glowWidth: 6,
      });

      boundariesRef.current.state = addAnimatedBoundary(map, {
        id: 'state-boundary',
        data: stateBorderHalves,
        color: BOUNDARY_COLORS.state.line,
        glow:  BOUNDARY_COLORS.state.glow,
        width: 2.2,
        glowWidth: 8,
      });

      // Only the state border is shown initially — it draws itself in.
      playBoundary(map, boundariesRef.current.state, { durationMs: 2200 });
    });

    mapInstanceRef.current = map;

    const ro = new ResizeObserver(() => {
      if (!mapInstanceRef.current) return;
      requestAnimationFrame(() => {
        mapInstanceRef.current.resize();
      });
    });
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ─── DISTRICT POLYGON LAYERS (crime fill — hidden until revealed) ─────────
  function addDistrictLayers(map) {
    const enriched = {
      ...districtsGeoJSON,
      features: districtsGeoJSON.features.map((f, idx) => {
       const districtName = f.properties.KGISDist_1;

const d = crimeData[districtName] || {};
        const sev = getSeverity(d.incidents || 0);
        return {
          ...f,
          id: idx,
          properties: {
            ...f.properties,
            incidents: d.incidents || 0,
            theft:     d.theft     || 0,
            assault:   d.assault   || 0,
            cyber:     d.cyber     || 0,
            narcotics: d.narcotics || 0,
            severity:  sev,
          },
        };
      }),
    };

    map.addSource('karnataka', { type: 'geojson', data: enriched, generateId: true });

    map.addLayer({
      id: 'districts-fill',
      type: 'fill',
      source: 'karnataka',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': [
          'match', ['get', 'severity'],
          'critical', 'rgba(255,45,85,0.18)',
          'high',     'rgba(255,159,10,0.14)',
          'medium',   'rgba(255,214,10,0.10)',
          'low',      'rgba(48,209,88,0.08)',
          'rgba(0,180,220,0.06)',
        ],
        'fill-opacity': 1,
      },
    });

    map.addLayer({
      id: 'districts-fill-hover',
      type: 'fill',
      source: 'karnataka',
      layout: { visibility: 'none' },
      paint: {
        'fill-color':   'rgba(0,212,255,0.20)',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0],
      },
    });
  }

  // ─── HEATMAP ───────────────────────────────────────────────────────────────
  function addHeatmapLayer(map) {
    const points = {
      type: 'FeatureCollection',
      features: Object.values(crimeData).map(d => ({
        type: 'Feature',
        properties: { incidents: d.incidents },
        geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
      })),
    };

    map.addSource('heatmap-src', { type: 'geojson', data: points });
    map.addLayer({
      id:      'heatmap-layer',
      type:    'heatmap',
      source:  'heatmap-src',
      maxzoom: 9,
      layout:  { visibility: 'none' },
      paint: {
        'heatmap-weight':    ['interpolate', ['linear'], ['get', 'incidents'], 0, 0, 350, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 9, 1.2],
        'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 5, 30, 9, 60],
        'heatmap-opacity':   0.50,
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0,    'rgba(0,0,0,0)',
          0.15, 'rgba(0,180,220,0.4)',
          0.40, 'rgba(255,214,10,0.6)',
          0.70, 'rgba(255,159,10,0.8)',
          1.00, 'rgba(255,45,85,1)',
        ],
      },
    }, 'districts-fill');
  }

  // ─── HOTSPOT MARKERS ──────────────────────────────────────────────────────
  // FIX: use maplibregl.Marker with anchor:'center' so MapLibre handles
  // all coordinate→pixel projection. The marker element must NOT use
  // CSS transform/translate for positioning — the Marker API owns that.
  function addHotspotMarkers(map) {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    Object.entries(crimeData).forEach(([name, d]) => {
      const sev = getSeverity(d.incidents);
      const col = severityColor[sev];

      const size =
        sev === 'critical' ? 16 :
        sev === 'high'     ? 13 :
        sev === 'medium'   ? 10 : 8;

      const speed =
        sev === 'critical' ? '1.2s' :
        sev === 'high'     ? '1.8s' : '2.5s';

      // ── WRAPPER — sized just large enough for rings, no extra transforms
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: relative;
        width:  ${size + 28}px;
        height: ${size + 28}px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      `;

      // ── CENTER DOT
      const dot = document.createElement('div');
      dot.style.cssText = `
        width:  ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${col};
        box-shadow: 0 0 ${size}px ${col}, 0 0 ${size * 2}px ${col}55;
        position: relative;
        z-index: 2;
        flex-shrink: 0;
      `;

      // ── PULSE RINGS — absolutely positioned relative to wrapper, centered
      [0, 1].forEach((i) => {
        const ring = document.createElement('div');
        const ringSize = size + 8 + i * 10;
        ring.style.cssText = `
          position: absolute;
          width:  ${ringSize}px;
          height: ${ringSize}px;
          top:  50%;
          left: 50%;
          margin-top:  -${ringSize / 2}px;
          margin-left: -${ringSize / 2}px;
          border-radius: 50%;
          border: ${i === 0 ? 1.5 : 1}px solid ${col};
          opacity: 0;
          animation: markerPulse ${speed} ${i * 0.45}s ease-out infinite;
          pointer-events: none;
          z-index: 1;
        `;
        wrapper.appendChild(ring);
      });

      wrapper.appendChild(dot);

      // ── HOVER
      wrapper.addEventListener('mouseenter', () => {
        dot.style.boxShadow = `0 0 ${size * 2}px ${col}, 0 0 ${size * 4}px ${col}88`;
      });
      wrapper.addEventListener('mouseleave', () => {
        dot.style.boxShadow = `0 0 ${size}px ${col}, 0 0 ${size * 2}px ${col}55`;
      });
      wrapper.addEventListener('click', () => {
        onSelectRef.current(name, d);
      });

      // ── MARKER — anchor:'center' is critical: aligns wrapper center to lngLat
      const marker = new maplibregl.Marker({ element: wrapper, anchor: 'center' })
        .setLngLat([d.lng, d.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }

  // ─── HOVER + CLICK ────────────────────────────────────────────────────────
  function setupDistrictInteraction(map) {
     let selectedDistrict = null;;

    const popup = new maplibregl.Popup({
      closeButton:  false,
      closeOnClick: false,
      className:    'crime-popup',
      maxWidth:     '230px',
    });

   map.on('click', 'districts-fill', e => {
  const feature = e.features[0];
  const districtName = feature.properties.KGISDist_1;

  // Clicking same district again closes popup
  if (selectedDistrict === districtName) {
    popup.remove();
    selectedDistrict = null;
    return;
  }

  selectedDistrict = districtName;

 const p = feature.properties;
const d = crimeData[districtName] || {};

const col =
  severityColor[p.severity] ||
  severityColor[getSeverity(d.incidents || 0)] ||
  '#00d4ff';

  popup
    .setLngLat(e.lngLat)
    .setHTML(`
      <div style="padding:12px 14px;font-family:'Rajdhani',sans-serif;">
        <div style="font-size:15px;font-weight:700;color:${col};">
          ${p.KGISDist_1}
        </div>

        <div style="font-size:10px;color:${col}88;margin-bottom:8px;">
         ${(p.severity || getSeverity(d.incidents || 0)).toUpperCase()} RISK ZONE
        </div>

      <div style="margin-top:10px;">

  <div style="
    display:grid;
    grid-template-columns:1fr auto;
    row-gap:8px;
    font-size:12px;
    color:rgba(180,220,255,.85);
  ">
    <span>Incidents</span>
    <span style="color:${col};font-weight:700;">${d.incidents}</span>

    <span>Theft</span>
    <span>${d.theft}</span>

    <span>Assault</span>
    <span>${d.assault}</span>

    <span>Cyber</span>
    <span>${d.cyber}</span>

    <span>Narcotics</span>
    <span>${d.narcotics}</span>
  </div>

</div>
      </div>
    `)
    .addTo(map);

if (d) {
  onSelectRef.current(districtName, d);
}

});
map.on('click', e => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['districts-fill']
  });

  if (features.length === 0) {
    popup.remove();
    selectedDistrict = null;
  }
});

 
  }

  // ─── PUBLIC CONTROLS ──────────────────────────────────────────────────────
  const flyToDistrict = useCallback((name) => {
    const d = crimeData[name];
    if (!mapInstanceRef.current || !d) return;
    mapInstanceRef.current.flyTo({ center: [d.lng, d.lat], zoom: 8.5, duration: 1200, essential: true });
  }, []);

  const resetView = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({ center: [76.5, 15.0], zoom: 6.2, duration: 1000 });
  }, []);

  const toggleHeatmap = useCallback((show) => {
    const map = mapInstanceRef.current;
    if (!map || !map.getLayer('heatmap-layer')) return;
    map.setLayoutProperty('heatmap-layer', 'visibility', show ? 'visible' : 'none');
  }, []);

  const toggleLabels = useCallback((show) => {
    const map = mapInstanceRef.current;
    if (!map || !map.getLayer('district-labels')) return;
    map.setLayoutProperty('district-labels', 'visibility', show ? 'visible' : 'none');
  }, []);

  // Reveal district boundaries (animated) + the crime dashboard layers that
  // ride along with them (fill, heatmap, labels, hotspot markers).
  const showDistricts = useCallback((opts = {}) => {
    const map = mapInstanceRef.current;
    if (!map || !boundariesRef.current.district) return;

    setDistrictsOn(true);

    ['districts-fill', 'districts-fill-hover', 'district-labels', 'heatmap-layer'].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
    });
    if (!markersAddedRef.current) {
      addHotspotMarkers(map);
      markersAddedRef.current = true;
    } else {
      markersRef.current.forEach(m => m.getElement().style.display = '');
    }

    playBoundary(map, boundariesRef.current.district, {
      durationMs: 1800,
      onDone: opts.onDone,
    });
  }, []);

  const hideDistricts = useCallback((opts = {}) => {
    const map = mapInstanceRef.current;
    if (!map || !boundariesRef.current.district) return;

    setDistrictsOn(false);
    setTaluksOn(false); // taluks live inside districts — retract them too

    ['districts-fill', 'districts-fill-hover', 'district-labels', 'heatmap-layer'].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
    });
    markersRef.current.forEach(m => m.getElement().style.display = 'none');

    if (boundariesRef.current.taluk) {
      retractBoundary(map, boundariesRef.current.taluk, { durationMs: 1400 });
    }
    if (map.getLayer('taluk-names')) map.setLayoutProperty('taluk-names', 'visibility', 'none');

    retractBoundary(map, boundariesRef.current.district, {
      durationMs: 1800,
      onDone: opts.onDone,
    });
  }, []);

  const showTaluks = useCallback((opts = {}) => {
    const map = mapInstanceRef.current;
    if (!map || !boundariesRef.current.taluk) return;

    if (!districtsOn) showDistricts();

    setTaluksOn(true);
    if (map.getLayer('taluk-names')) map.setLayoutProperty('taluk-names', 'visibility', 'visible');

    playBoundary(map, boundariesRef.current.taluk, {
      durationMs: 1800,
      onDone: opts.onDone,
    });
  }, [districtsOn, showDistricts]);

  const hideTaluks = useCallback((opts = {}) => {
    const map = mapInstanceRef.current;
    if (!map || !boundariesRef.current.taluk) return;

    setTaluksOn(false);
    if (map.getLayer('taluk-names')) map.setLayoutProperty('taluk-names', 'visibility', 'none');
    retractBoundary(map, boundariesRef.current.taluk, {
      durationMs: 1400,
      onDone: opts.onDone,
    });
  }, []);

  return {
    mapRef: mapContainerRef,
    flyToDistrict,
    resetView,
    toggleHeatmap,
    toggleLabels,
    showDistricts,
    hideDistricts,
    showTaluks,
    hideTaluks,
    districtsOn,
    taluksOn,
  };
}