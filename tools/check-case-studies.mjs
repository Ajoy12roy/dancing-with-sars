// ========================================================================
// Case Study Verification Tool — Dancing with the SARs
// Validates registry entries, disk file availability, image sizes, and links.
// ========================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// 4 Existing core demo entries
const EXISTING_DEMOS = [
  {
    id: 'sylhet',
    module: 'flood',
    title: 'Sylhet Flood 2022',
    country: 'Bangladesh',
    precomputedId: 'sylhet',
    suggestedDates: {
      before: '2022-05-10',
      after: '2022-06-20',
      a: '2022-05-01',
      b: '2022-06-21',
    },
    sourceLinks: [
      {
        name: 'Copernicus Data Space Ecosystem',
        url: 'https://dataspace.copernicus.eu/',
      },
    ],
  },
  {
    id: 'jamuna',
    module: 'river-erosion',
    title: 'Jamuna River Erosion 2019 to 2024',
    country: 'Bangladesh',
    precomputedId: 'jamuna',
    suggestedDates: {
      before: '2019-02-15',
      after: '2024-02-15',
      a: '2019-02-15',
      b: '2024-02-15',
    },
    sourceLinks: [
      {
        name: 'Copernicus Data Space Ecosystem',
        url: 'https://dataspace.copernicus.eu/',
      },
    ],
  },
  {
    id: 'amazon',
    module: 'deforestation',
    title: 'Amazon Deforestation',
    country: 'Brazil',
    precomputedId: 'amazon',
    suggestedDates: {
      before: '2021-01-01',
      after: '2023-01-01',
      a: '2021-01-01',
      b: '2023-01-01',
    },
    sourceLinks: [
      {
        name: 'Copernicus Data Space Ecosystem',
        url: 'https://dataspace.copernicus.eu/',
      },
    ],
  },
  {
    id: 'tanguar',
    module: 'surface-water',
    title: 'Tanguar Haor Seasonal Water',
    country: 'Bangladesh',
    precomputedId: 'tanguar',
    suggestedDates: {
      before: '2023-02-15',
      after: '2023-08-15',
      a: '2023-02-15',
      b: '2023-08-15',
    },
    sourceLinks: [
      {
        name: 'Copernicus Data Space Ecosystem',
        url: 'https://dataspace.copernicus.eu/',
      },
    ],
  },
];

// Load seed entries
const seedPath = path.join(ROOT_DIR, 'data', 'case-studies', 'seed.json');
let seedEntries = [];
if (fs.existsSync(seedPath)) {
  try {
    const rawSeed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    seedEntries = Array.isArray(rawSeed) ? rawSeed : (rawSeed?.caseStudies || []);
  } catch (err) {
    console.error(`[ERROR] Failed to parse seed.json: ${err.message}`);
  }
} else {
  console.warn(`[WARN] seed.json not found at ${seedPath}`);
}

const allCaseStudies = [...EXISTING_DEMOS, ...seedEntries];

function findPrecomputedFile(dir, candidates) {
  for (const file of candidates) {
    const fullPath = path.join(dir, file);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

async function testUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CaseStudyChecker/1.0)' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (res.status >= 200 && res.status < 400) {
      return { ok: true, status: res.status };
    }
    // If HEAD fails with 403 or 405, fallback to a lightweight GET
    if (res.status === 403 || res.status === 405) {
      const getCtrl = new AbortController();
      const getTimeout = setTimeout(() => getCtrl.abort(), 6000);
      const getRes = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CaseStudyChecker/1.0)' },
        signal: getCtrl.signal,
        redirect: 'follow',
      });
      clearTimeout(getTimeout);
      return { ok: getRes.status >= 200 && getRes.status < 400, status: getRes.status };
    }
    return { ok: false, status: res.status };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Timeout (6s)' : err.message };
  }
}

async function checkAll() {
  console.log('='.repeat(80));
  console.log(' TerraPulse Case Study Registry Verification');
  console.log('='.repeat(80));
  console.log(`Checking ${allCaseStudies.length} case studies across 4 modules...\n`);

  let readyCount = 0;
  let pendingCount = 0;

  for (let i = 0; i < allCaseStudies.length; i++) {
    const cs = allCaseStudies[i];
    const preId = cs.precomputedId || cs.id;
    const preDir = path.join(ROOT_DIR, 'data', 'precomputed', preId);
    const legacyDir = path.join(ROOT_DIR, 'data', preId);

    const resultPath = findPrecomputedFile(preDir, ['result.json']) || findPrecomputedFile(legacyDir, ['result.json']);
    const isReady = Boolean(resultPath);

    if (isReady) readyCount++;
    else pendingCount++;

    const statusBadge = isReady ? '[\x1b[32mREADY\x1b[0m]' : '[\x1b[33mPENDING-DATA\x1b[0m]';
    console.log(`${String(i + 1).padStart(2, ' ')}. ${statusBadge} ${cs.title} (id: ${cs.id})`);
    console.log(`    Module: ${cs.module} | Country: ${cs.country}`);

    // Missing files check
    const missingFiles = [];
    if (!resultPath) missingFiles.push('result.json');

    const beforeImg =
      findPrecomputedFile(preDir, ['before.png', `${preId}_before.png`]) ||
      findPrecomputedFile(legacyDir, ['before.png', `${preId}_before.png`]);
    if (!beforeImg) missingFiles.push('before.png');

    const afterImg =
      findPrecomputedFile(preDir, ['after.png', `${preId}_after.png`]) ||
      findPrecomputedFile(legacyDir, ['after.png', `${preId}_after.png`]);
    if (!afterImg) missingFiles.push('after.png');

    const changeMapImg =
      findPrecomputedFile(preDir, ['change-map.png', 'change_map.png', `${preId}_change_map.png`]) ||
      findPrecomputedFile(legacyDir, ['change-map.png', 'change_map.png', `${preId}_change_map.png`]);
    if (!changeMapImg) missingFiles.push('change-map.png');

    if (missingFiles.length > 0) {
      console.log(`    Missing files: ${missingFiles.join(', ')}`);
    } else {
      console.log(`    Files: All 4 core precomputed assets present`);
    }

    // Image sizes check
    const existingImages = [
      { name: 'before.png', file: beforeImg },
      { name: 'after.png', file: afterImg },
      { name: 'change-map.png', file: changeMapImg },
    ].filter((img) => Boolean(img.file));

    for (const img of existingImages) {
      try {
        const stats = fs.statSync(img.file);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        if (stats.size > MAX_IMAGE_SIZE_BYTES) {
          console.log(`    \x1b[33m[WARN]\x1b[0m Image ${img.name} size is ${sizeMb} MB (exceeds 2 MB limit)`);
        }
      } catch {
        // stat error ignored
      }
    }

    // Missing dates check
    const dates = cs.suggestedDates;
    const hasBeforeDate = dates && (dates.before || dates.a);
    const hasAfterDate = dates && (dates.after || dates.b);
    if (!hasBeforeDate || !hasAfterDate) {
      console.log(`    \x1b[33m[WARN]\x1b[0m Missing observation dates: ${!hasBeforeDate ? 'before ' : ''}${!hasAfterDate ? 'after' : ''}`);
    } else {
      const bStr = Array.isArray(dates?.before) ? dates.before.join(' to ') : (dates?.before || dates?.a);
      const aStr = Array.isArray(dates?.after) ? dates.after.join(' to ') : (dates?.after || dates?.b);
      console.log(`    Dates: ${bStr} → ${aStr}`);
    }

    // Source links check (report only)
    if (Array.isArray(cs.sourceLinks) && cs.sourceLinks.length > 0) {
      for (const link of cs.sourceLinks) {
        if (!link.url) continue;
        const res = await testUrl(link.url);
        if (!res.ok) {
          console.log(`    \x1b[33m[WARN URL]\x1b[0m ${link.name}: ${link.url} (status: ${res.status || res.error})`);
        }
      }
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`Summary: ${allCaseStudies.length} total case studies | \x1b[32m${readyCount} ready\x1b[0m | \x1b[33m${pendingCount} pending-data\x1b[0m`);
  console.log('='.repeat(80));
}

checkAll().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(0); // Report only, do not fail
});
