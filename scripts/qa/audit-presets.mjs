// scripts/qa/audit-presets.mjs
// Audit every preset in lib/aoi.ts against the real ASF Search API.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const ASF_BASE_URL = 'https://api.daac.asf.alaska.edu/services/search/param';

// Presets defined in lib/aoi.ts
const PRESETS = [
  {
    id: 'sylhet',
    name: 'Sylhet Division, Bangladesh (Flood Inundation)',
    isGolden: true,
    bbox: { west: 91.8, south: 24.85, east: 91.95, north: 24.98 },
    dateA: { start: '2022-05-01', end: '2022-05-10' },
    dateB: { start: '2022-06-18', end: '2022-06-22' },
    recommendedPass: 'DESCENDING',
    recommendedOrbit: 77,
  },
  {
    id: 'tanguar',
    name: 'Tanguar Haor, Bangladesh (Wetland Dynamics)',
    bbox: { west: 90.97976, south: 25.04979, east: 91.2002, north: 25.22011 },
    dateA: { start: '2023-02-01', end: '2023-02-25' },
    dateB: { start: '2023-08-07', end: '2023-08-31' },
    recommendedPass: 'DESCENDING',
    recommendedOrbit: 121,
  },
  {
    id: 'jamuna',
    name: 'Jamuna River, Bangladesh (Braided Sandbars)',
    bbox: { west: 89.6498, south: 24.29979, east: 89.95002, north: 24.55015 },
    dateA: { start: '2019-02-01', end: '2019-02-25' },
    dateB: { start: '2024-02-04', end: '2024-02-28' },
    recommendedPass: 'ASCENDING',
    recommendedOrbit: 165,
  },
  {
    id: 'amazon',
    name: 'Amazon Rainforest, Rondônia, Brazil (Canopy Loss)',
    bbox: { west: -62.20007, south: -10.35003, east: -61.99992, north: -10.14988 },
    dateA: { start: '2022-08-20', end: '2022-09-13' },
    dateB: { start: '2023-01-01', end: '2023-01-25' },
    recommendedPass: 'DESCENDING',
    recommendedOrbit: 154,
  },
  {
    id: 'padma-naria',
    name: 'Padma River / Naria, Bangladesh (Bank Erosion)',
    bbox: { west: 90.23272, south: 23.31002, east: 90.42765, north: 23.49005 },
    dateA: { start: '2017-01-15', end: '2017-02-08' },
    dateB: { start: '2024-01-15', end: '2024-02-08' },
    recommendedPass: 'DESCENDING',
    recommendedOrbit: 121,
  },
];

function bboxToWktPolygon(bbox) {
  const { west, south, east, north } = bbox;
  return `POLYGON((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
}

function addDaysISO(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function getMidpointDateISO(startISO, endISO) {
  const [y1, m1, d1] = startISO.split('-').map(Number);
  const [y2, m2, d2] = endISO.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return new Date(Math.round((t1 + t2) / 2)).toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryAsfWithRetry(polygonWkt, startIso, endIso, maxRetries = 3) {
  const url = new URL(ASF_BASE_URL);
  url.searchParams.set('output', 'geojson');
  url.searchParams.set('platform', 'SENTINEL-1');
  url.searchParams.set('intersectsWith', polygonWkt);
  url.searchParams.set('start', `${startIso}T00:00:00UTC`);
  url.searchParams.set('end', `${endIso}T23:59:59UTC`);
  url.searchParams.set('maxResults', '150');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/geo+json, application/json',
          'User-Agent': 'TerraPulse/1.0 (https://github.com/Ajoy12roy/dancing-with-sars)',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      return Array.isArray(json?.features) ? json.features : [];
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await sleep(1000 * attempt);
    }
  }
}

function groupFeatures(features) {
  const counts = new Map();
  for (const f of features) {
    const props = f.properties || {};
    const dir = props.flightDirection || 'UNKNOWN';
    const orbit = Number(props.pathNumber);
    if (!orbit || isNaN(orbit)) continue;
    const key = `${dir}_${orbit}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export async function runAudit() {
  console.log('Starting Preset Audit against ASF Search API...');
  const auditResults = [];

  for (const preset of PRESETS) {
    console.log(`\nAuditing preset: ${preset.id} (${preset.name})`);
    const polygonWkt = bboxToWktPolygon(preset.bbox);

    let currentWindowA = { ...preset.dateA };
    let currentWindowB = { ...preset.dateB };
    let selectedGroup = null;
    let chosenWindows = { windowA: currentWindowA, windowB: currentWindowB };
    let actionTaken = 'Stored usable group';

    // Query default windows
    let featuresA, featuresB;
    try {
      await sleep(1000);
      featuresA = await queryAsfWithRetry(polygonWkt, currentWindowA.start, currentWindowA.end);
      await sleep(1000);
      featuresB = await queryAsfWithRetry(polygonWkt, currentWindowB.start, currentWindowB.end);
    } catch (err) {
      console.error(`NOT RUN: Failed to reach ASF after retries for preset ${preset.id}:`, err.message);
      return { success: false, notRun: true, error: err.message };
    }

    let groupsA = groupFeatures(featuresA);
    let groupsB = groupFeatures(featuresB);

    console.log(`  Window A [${currentWindowA.start} to ${currentWindowA.end}]: ${featuresA.length} acquisitions across ${groupsA.size} groups`);
    for (const [k, count] of groupsA.entries()) {
      console.log(`    - Group ${k}: ${count} before image(s)`);
    }
    console.log(`  Window B [${currentWindowB.start} to ${currentWindowB.end}]: ${featuresB.length} acquisitions across ${groupsB.size} groups`);
    for (const [k, count] of groupsB.entries()) {
      console.log(`    - Group ${k}: ${count} after image(s)`);
    }

    // Find common groups
    function findCommonCandidates(gA, gB) {
      const candidates = [];
      for (const [k, countA] of gA.entries()) {
        const countB = gB.get(k) || 0;
        if (countA > 0 && countB > 0) {
          const [dir, orbitStr] = k.split('_');
          candidates.push({
            key: k,
            pass: dir,
            orbit: Number(orbitStr),
            beforeCount: countA,
            afterCount: countB,
            minCount: Math.min(countA, countB),
          });
        }
      }
      candidates.sort((a, b) => {
        if (b.minCount !== a.minCount) return b.minCount - a.minCount;
        if (a.pass !== b.pass) return a.pass === 'DESCENDING' ? -1 : 1;
        return a.orbit - b.orbit;
      });
      return candidates;
    }

    let candidates = findCommonCandidates(groupsA, groupsB);
    console.log(`  Groups present in BOTH windows: ${candidates.map((c) => `${c.key} (min: ${c.minCount})`).join(', ') || 'None'}`);

    if (preset.isGolden) {
      // Golden preset is never modified
      selectedGroup = { pass: preset.recommendedPass, orbit: preset.recommendedOrbit };
      actionTaken = 'Golden benchmark retained unchanged';
    } else if (candidates.length > 0) {
      selectedGroup = { pass: candidates[0].pass, orbit: candidates[0].orbit, minCount: candidates[0].minCount };
      actionTaken = `Stored usable group ${selectedGroup.pass} track ${selectedGroup.orbit}`;
    } else {
      // Widen windows in steps of 12 days up to 36 days total window length
      console.log('  No common group found in default windows. Attempting window widening...');
      const midA = getMidpointDateISO(preset.dateA.start, preset.dateA.end);
      const midB = getMidpointDateISO(preset.dateB.start, preset.dateB.end);

      let found = false;
      for (const spanDays of [24, 36]) {
        const half = Math.round(spanDays / 2);
        const wA = { start: addDaysISO(midA, -half), end: addDaysISO(midA, half) };
        const wB = { start: addDaysISO(midB, -half), end: addDaysISO(midB, half) };
        console.log(`    Trying widened span ${spanDays} days: Window A [${wA.start}..${wA.end}], Window B [${wB.start}..${wB.end}]`);

        await sleep(1000);
        const fA = await queryAsfWithRetry(polygonWkt, wA.start, wA.end);
        await sleep(1000);
        const fB = await queryAsfWithRetry(polygonWkt, wB.start, wB.end);
        const gA = groupFeatures(fA);
        const gB = groupFeatures(fB);
        const cands = findCommonCandidates(gA, gB);
        if (cands.length > 0) {
          selectedGroup = { pass: cands[0].pass, orbit: cands[0].orbit, minCount: cands[0].minCount };
          chosenWindows = { windowA: wA, windowB: wB };
          actionTaken = `Widened to ${spanDays}d; stored ${selectedGroup.pass} track ${selectedGroup.orbit}`;
          groupsA = gA;
          groupsB = gB;
          candidates = cands;
          found = true;
          break;
        }
      }

      if (!found) {
        selectedGroup = null;
        actionTaken = 'no single orbit geometry in the default windows';
      }
    }

    auditResults.push({
      preset: preset.id,
      name: preset.name,
      bbox: preset.bbox,
      windows: chosenWindows,
      countsA: Object.fromEntries(groupsA),
      countsB: Object.fromEntries(groupsB),
      candidates,
      selectedGroup,
      actionTaken,
    });
  }

  return { success: true, results: auditResults };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAudit().then((res) => {
    if (res.notRun) {
      console.log('NOT RUN');
      process.exit(1);
    }
    console.log('\nAudit complete.');
    console.log(JSON.stringify(res.results, null, 2));
  }).catch((err) => {
    console.error('Fatal audit error:', err);
    process.exit(1);
  });
}

