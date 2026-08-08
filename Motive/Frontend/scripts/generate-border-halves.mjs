/**
 * Precomputes "meeting halves" line geometry for the animated border draw-in
 * effect used on the Karnataka map (state / district / taluk boundaries).
 *
 * For every closed ring in the source polygons we cut the ring at its start
 * point (P0) and at the point exactly halfway around by arc-length (Pm).
 * That produces two arcs that both begin at P0 and end at Pm (one of them is
 * reversed so it "travels" the opposite way around the ring). When both arcs
 * are revealed simultaneously (0 -> 1 progress) via a MapLibre line-gradient,
 * they visually grow outward from the same point in opposite directions and
 * meet at Pm - the "living lines" effect.
 *
 * This is done ahead of time (not in the browser) because the source
 * geometries are very large (hundreds of thousands of vertices) and
 * polygonToLine/lineSliceAlong over that much data would jank the UI thread.
 *
 * Run with:  node scripts/generate-border-halves.mjs
 */
import * as turf from '@turf/turf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

function toFeatureArray(input) {
  if (!input) return [];
  if (input.type === 'FeatureCollection') return input.features;
  if (input.type === 'Feature') return [input];
  if (input.type === 'GeometryCollection') {
    return input.geometries.map((g) => ({ type: 'Feature', properties: {}, geometry: g }));
  }
  if (input.type && input.coordinates) {
    return [{ type: 'Feature', properties: {}, geometry: input }];
  }
  return [];
}

/**
 * Builds a FeatureCollection of LineStrings, two per ring ("half a" / "half
 * b"), both starting at the ring's start point and meeting at its arc-length
 * midpoint.
 */
function buildHalves(inputGeoJSON, { nameProp } = {}) {
  const feats = toFeatureArray(inputGeoJSON);
  const halves = [];
  let ringId = 0;

  feats.forEach((feature, featIdx) => {
    const parentName = nameProp ? feature.properties?.[nameProp] ?? null : null;

    let lineFC;
    try {
      lineFC = turf.polygonToLine(feature);
    } catch (err) {
      console.warn(`  skip feature ${featIdx}: ${err.message}`);
      return;
    }
    const lineFeats = lineFC.type === 'FeatureCollection' ? lineFC.features : [lineFC];

    lineFeats.forEach((lf) => {
      const rings =
        lf.geometry.type === 'MultiLineString'
          ? lf.geometry.coordinates.map((c) => turf.lineString(c))
          : [lf];

      rings.forEach((ring) => {
        const L = turf.length(ring, { units: 'kilometers' });
        if (!L) return;

        const half = L / 2;
        const a = turf.lineSliceAlong(ring, 0, half, { units: 'kilometers' });
        const b = turf.lineSliceAlong(ring, half, L, { units: 'kilometers' });

        // b currently runs Pm -> P0. Reverse it so both halves start at P0
        // and end at Pm - they'll grow toward each other and meet at Pm.
        const bReversed = {
          ...b,
          geometry: { ...b.geometry, coordinates: [...b.geometry.coordinates].reverse() },
        };

        const id = ringId++;
        halves.push({
          type: 'Feature',
          properties: { half: 'a', ringId: id, featIdx, parentName },
          geometry: a.geometry,
        });
        halves.push({
          type: 'Feature',
          properties: { half: 'b', ringId: id, featIdx, parentName },
          geometry: bReversed.geometry,
        });
      });
    });
  });

  return { type: 'FeatureCollection', features: halves };
}

function run(label, srcFile, outFile, nameProp) {
  const t0 = Date.now();
  const src = JSON.parse(fs.readFileSync(path.join(DATA_DIR, srcFile), 'utf8'));
  const out = buildHalves(src, { nameProp });
  fs.writeFileSync(path.join(DATA_DIR, outFile), JSON.stringify(out));
  const kb = (fs.statSync(path.join(DATA_DIR, outFile)).size / 1024).toFixed(0);
  console.log(
    `${label}: ${out.features.length} half-lines (${out.features.length / 2} rings), ` +
      `${kb} KB, ${Date.now() - t0}ms -> ${outFile}`
  );
}

run('State', 'Stateboarder.json', 'StateBorderHalves.json', null);
run('District', 'District1.json', 'DistrictBorderHalves.json', 'KGISDist_1');
run('Taluk', 'Taluk1.json', 'TalukBorderHalves.json', 'KGISTalukN');
