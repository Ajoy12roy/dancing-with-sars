// scripts/qa/audit-custom-areas.mjs
// Live ASF Search API check for three custom areas.

const ASF_BASE_URL = 'https://api.daac.asf.alaska.edu/services/search/param';

const CUSTOM_AREAS = [
  {
    name: 'Bandarban',
    bbox: { west: 92.15, south: 21.95, east: 92.25, north: 22.05 },
  },
  {
    name: "Cox's Bazar",
    bbox: { west: 91.95, south: 21.40, east: 92.05, north: 21.50 },
  },
  {
    name: 'Sundarbans',
    bbox: { west: 89.00, south: 21.85, east: 89.10, north: 21.95 },
  },
];

const BEFORE_WINDOW = { start: '2023-01-20', end: '2023-02-13' };
const AFTER_WINDOW = { start: '2024-01-20', end: '2024-02-13' };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryAsfWindow(bbox, window) {
  const wkt = `POLYGON((${bbox.west} ${bbox.south},${bbox.east} ${bbox.south},${bbox.east} ${bbox.north},${bbox.west} ${bbox.north},${bbox.west} ${bbox.south}))`;
  const url = new URL(ASF_BASE_URL);
  url.searchParams.set('dataset', 'SENTINEL-1');
  url.searchParams.set('intersectsWith', wkt);
  url.searchParams.set('start', `${window.start}T00:00:00Z`);
  url.searchParams.set('end', `${window.end}T23:59:59Z`);
  url.searchParams.set('processingLevel', 'SLC,GRD_HD,GRD_MD,GRD_MS,GRD_HS');
  url.searchParams.set('output', 'json');

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'TerraPulse-QA/1.0' },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      return Array.isArray(json) && Array.isArray(json[0]) ? json[0] : (Array.isArray(json) ? json : []);
    } catch (err) {
      lastError = err;
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

function summarizeGroups(granules) {
  const groups = new Map();
  for (const g of granules) {
    const props = g.properties || g || {};
    let dir = 'UNKNOWN';
    const rawDir = String(props.flightDirection || '').toUpperCase();
    if (rawDir.startsWith('ASC')) dir = 'ASCENDING';
    else if (rawDir.startsWith('DESC')) dir = 'DESCENDING';
    const orbit = Number(props.pathNumber || props.relativeOrbit || 0);
    const key = `${dir} track ${orbit}`;
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  return groups;
}

async function runAudit() {
  console.log('=== Real ASF Query Audit for Three Custom Areas ===');
  console.log(`Before Window: ${BEFORE_WINDOW.start} to ${BEFORE_WINDOW.end}`);
  console.log(`After Window:  ${AFTER_WINDOW.start} to ${AFTER_WINDOW.end}\n`);

  for (const area of CUSTOM_AREAS) {
    console.log(`--- Checking: ${area.name} [${area.bbox.west}, ${area.bbox.south}, ${area.bbox.east}, ${area.bbox.north}] ---`);
    await sleep(1000); // 1.0s pacing
    const beforeGranules = await queryAsfWindow(area.bbox, BEFORE_WINDOW);
    console.log(`  Before window granules returned: ${beforeGranules.length}`);
    const beforeGroups = summarizeGroups(beforeGranules);
    for (const [key, count] of beforeGroups.entries()) {
      console.log(`    Before orbit group: ${key} (${count} scenes)`);
    }

    await sleep(1000); // 1.0s pacing
    const afterGranules = await queryAsfWindow(area.bbox, AFTER_WINDOW);
    console.log(`  After window granules returned: ${afterGranules.length}`);
    const afterGroups = summarizeGroups(afterGranules);
    for (const [key, count] of afterGroups.entries()) {
      console.log(`    After orbit group: ${key} (${count} scenes)`);
    }

    // Check intersection
    const common = [];
    for (const [key, bCount] of beforeGroups.entries()) {
      if (afterGroups.has(key)) {
        common.push({ key, before: bCount, after: afterGroups.get(key) });
      }
    }

    if (common.length > 0) {
      console.log(`  ✓ Usable single-geometry orbit group(s) found:`);
      for (const c of common) {
        console.log(`    -> ${c.key} (${c.before} before, ${c.after} after)`);
      }
    } else {
      console.log(`  ✗ No common orbit geometry found between windows.`);
    }
    console.log('');
  }
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err.message);
  process.exit(1);
});
