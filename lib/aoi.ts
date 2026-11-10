/**
 * lib/aoi.ts
 *
 * Pure algorithmic library for Area of Interest (AOI) bounding box math,
 * geographic limits, scale calculation, date window validation, ASF pass grouping,
 * and parameterized Google Earth Engine export script generation.
 *
 * Zero external dependencies. No React, no window / DOM access.
 */

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface BboxDimensions {
  widthKm: number;
  heightKm: number;
  areaKm2: number;
}

export interface ScaleRecommendation {
  scale: number;
  pixelsX: number;
  pixelsY: number;
  uncompressedBytes: number;
  uncompressedMb: number;
  note: string;
}

export interface DateWindow {
  start: string; // ISO 'YYYY-MM-DD'
  end: string;   // ISO 'YYYY-MM-DD'
}

export interface DateValidationResult {
  valid: boolean;
  reason?: string;
}

export interface AsfGranule {
  platform?: string;
  startTime?: string;
  flightDirection?: string;
  pathNumber?: number | string;
  frameNumber?: number | string;
  sceneName?: string;
  url?: string;
  [key: string]: unknown;
}

export interface AsfPassGroup {
  id: string;
  platform: string;
  flightDirection: 'ASCENDING' | 'DESCENDING' | 'UNKNOWN';
  relativeOrbit: number;
  beforeDates: string[];
  afterDates: string[];
  beforeCount: number;
  afterCount: number;
  usable: boolean;
  sampleGranule?: AsfGranule;
}

export interface GeeScriptOptions {
  bbox: BoundingBox;
  startDateA: string;
  endDateA: string;
  startDateB: string;
  endDateB: string;
  pass?: 'ASCENDING' | 'DESCENDING' | null;
  relativeOrbit?: number | null;
  scale?: number;
  prefix?: string;
  bands?: string[];
}

// ── Physical & System Constants ──
export const WGS84_AUTHALIC_RADIUS_KM = 6371.0088;
export const MIN_SIDE_KM = 2.0;
export const MAX_SIDE_KM = 30.0;
export const MAX_AREA_KM2 = 900.0;
export const MAX_WINDOW_DAYS = 60;
export const MAX_PIXELS_PER_SIDE = 1500;

export const SEASONAL_WARNING_TEXT =
  'Choose windows in the same season when possible: crop growth, soil moisture and water level can look like change.';

/**
 * Normalizes a bounding box: ensures west < east, south < north,
 * and clamps coordinates to valid global lat/lon ranges [-180..180, -85..85].
 */
export function normalizeBbox(bbox: BoundingBox): BoundingBox {
  let west = Math.min(bbox.west, bbox.east);
  let east = Math.max(bbox.west, bbox.east);
  let south = Math.min(bbox.south, bbox.north);
  let north = Math.max(bbox.south, bbox.north);

  west = Math.max(-180, Math.min(180, west));
  east = Math.max(-180, Math.min(180, east));
  south = Math.max(-85, Math.min(85, south));
  north = Math.max(-85, Math.min(85, north));

  return { west, south, east, north };
}

/**
 * Creates a normalized bounding box from two arbitrary [lon, lat] corners.
 */
export function bboxFromCorners(c1: [number, number], c2: [number, number]): BoundingBox {
  return normalizeBbox({
    west: c1[0],
    south: c1[1],
    east: c2[0],
    north: c2[1],
  });
}

/**
 * Computes geodesic dimensions (width, height, area) in km / km2
 * using haversine geodesic calculation at the box's mid latitude.
 */
export function computeBboxDimensions(bbox: BoundingBox): BboxDimensions {
  const norm = normalizeBbox(bbox);
  const midLat = (norm.south + norm.north) / 2;
  const rad = Math.PI / 180;

  // Height along meridian (1 deg lat approx 111.195 km)
  const heightKm = (norm.north - norm.south) * rad * WGS84_AUTHALIC_RADIUS_KM;

  // Width along parallel at mid-latitude
  const widthKm = (norm.east - norm.west) * rad * WGS84_AUTHALIC_RADIUS_KM * Math.cos(midLat * rad);

  const areaKm2 = widthKm * heightKm;

  return {
    widthKm: Number(widthKm.toFixed(3)),
    heightKm: Number(heightKm.toFixed(3)),
    areaKm2: Number(areaKm2.toFixed(3)),
  };
}

/**
 * Checks bounding box against size and area constraints.
 * Returns valid status, dimensions, and plain-language reason if invalid.
 */
export function validateBbox(bbox: BoundingBox): {
  valid: boolean;
  reason?: string;
  dimensions: BboxDimensions;
} {
  const dims = computeBboxDimensions(bbox);

  if (dims.widthKm < MIN_SIDE_KM || dims.heightKm < MIN_SIDE_KM) {
    return {
      valid: false,
      reason: `Area side length must be at least ${MIN_SIDE_KM} km (current: width ${dims.widthKm} km, height ${dims.heightKm} km).`,
      dimensions: dims,
    };
  }

  if (dims.widthKm > MAX_SIDE_KM || dims.heightKm > MAX_SIDE_KM) {
    return {
      valid: false,
      reason: `Area side length must be at most ${MAX_SIDE_KM} km (current: width ${dims.widthKm} km, height ${dims.heightKm} km).`,
      dimensions: dims,
    };
  }

  if (dims.areaKm2 > MAX_AREA_KM2) {
    return {
      valid: false,
      reason: `Total area must not exceed ${MAX_AREA_KM2} km² (current: ${dims.areaKm2} km²).`,
      dimensions: dims,
    };
  }

  return { valid: true, dimensions: dims };
}

/**
 * Clamps bounding box so that sides do not exceed MAX_SIDE_KM and stay above MIN_SIDE_KM,
 * preserving the center point.
 */
export function clampBboxToLimits(bbox: BoundingBox): BoundingBox {
  const norm = normalizeBbox(bbox);
  const dims = computeBboxDimensions(norm);
  const midLat = (norm.south + norm.north) / 2;
  const midLon = (norm.west + norm.east) / 2;
  const rad = Math.PI / 180;

  let targetWidthKm = Math.min(MAX_SIDE_KM, Math.max(MIN_SIDE_KM, dims.widthKm));
  let targetHeightKm = Math.min(MAX_SIDE_KM, Math.max(MIN_SIDE_KM, dims.heightKm));

  if (targetWidthKm * targetHeightKm > MAX_AREA_KM2) {
    const scaleFactor = Math.sqrt(MAX_AREA_KM2 / (targetWidthKm * targetHeightKm));
    targetWidthKm *= scaleFactor;
    targetHeightKm *= scaleFactor;
  }

  const halfHeightDeg = (targetHeightKm / (WGS84_AUTHALIC_RADIUS_KM * rad)) / 2;
  const cosLat = Math.cos(midLat * rad);
  const halfWidthDeg = (targetWidthKm / (WGS84_AUTHALIC_RADIUS_KM * rad * (cosLat || 1))) / 2;

  return normalizeBbox({
    west: midLon - halfWidthDeg,
    south: midLat - halfHeightDeg,
    east: midLon + halfWidthDeg,
    north: midLat + halfHeightDeg,
  });
}

/**
 * Export scale rule:
 * scale = the smallest multiple of 10 metres such that max(width, height) / scale <= 1500 pixels.
 *
 * State the rule in a code comment:
 * This rule keeps an exported SAR raster near the 10-20 MB size threshold the existing uploader
 * was designed for, preventing memory exhaustion and protecting the companion Python service.
 */
export function computeExportScale(dims: BboxDimensions, bandCount: number = 1): ScaleRecommendation {
  const maxDimMeters = Math.max(dims.widthKm, dims.heightKm) * 1000;
  const minRequiredScale = maxDimMeters / MAX_PIXELS_PER_SIDE;

  // Smallest multiple of 10 metres >= minRequiredScale, at least 10m
  const scale = Math.max(10, Math.ceil(minRequiredScale / 10) * 10);

  const pixelsX = Math.max(1, Math.round((dims.widthKm * 1000) / scale));
  const pixelsY = Math.max(1, Math.round((dims.heightKm * 1000) / scale));

  // Float32 = 4 bytes per pixel per band
  const uncompressedBytes = pixelsX * pixelsY * bandCount * 4;
  const uncompressedMb = Number((uncompressedBytes / (1024 * 1024)).toFixed(2));

  return {
    scale,
    pixelsX,
    pixelsY,
    uncompressedBytes,
    uncompressedMb,
    note: 'Compressed GeoTIFF files (.tif) in Deflate or LZW format are typically 2x to 5x smaller than uncompressed estimates.',
  };
}

/**
 * Validates temporal windows: start <= end, no overlap, before ends before after starts,
 * and maximum window duration <= 60 days.
 */
export function validateDateWindows(
  before: DateWindow,
  after: DateWindow
): DateValidationResult {
  const bStart = new Date(before.start);
  const bEnd = new Date(before.end);
  const aStart = new Date(after.start);
  const aEnd = new Date(after.end);

  if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) {
    return { valid: false, reason: 'Before window dates must be valid ISO date strings (YYYY-MM-DD).' };
  }
  if (isNaN(aStart.getTime()) || isNaN(aEnd.getTime())) {
    return { valid: false, reason: 'After window dates must be valid ISO date strings (YYYY-MM-DD).' };
  }

  if (bStart > bEnd) {
    return { valid: false, reason: 'Before window start date must be before or equal to end date.' };
  }
  if (aStart > aEnd) {
    return { valid: false, reason: 'After window start date must be before or equal to end date.' };
  }

  const bDays = Math.round((bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const aDays = Math.round((aEnd.getTime() - aStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (bDays > MAX_WINDOW_DAYS) {
    return { valid: false, reason: `Before window duration (${bDays} days) exceeds maximum of ${MAX_WINDOW_DAYS} days.` };
  }
  if (aDays > MAX_WINDOW_DAYS) {
    return { valid: false, reason: `After window duration (${aDays} days) exceeds maximum of ${MAX_WINDOW_DAYS} days.` };
  }

  if (bEnd >= aStart) {
    return { valid: false, reason: 'Before window must end strictly before After window begins (windows cannot overlap).' };
  }

  return { valid: true };
}

/**
 * Suggests standard date windows for a given disaster or reference event date:
 * - Before window: 36 days ending 12 days before the event
 * - After window: 12 days starting on the event date
 * Labelled as a suggestion, editable.
 */
export function suggestWindowsForEvent(eventDateInput: string | Date): {
  before: DateWindow;
  after: DateWindow;
  label: string;
} {
  const d = typeof eventDateInput === 'string' ? new Date(eventDateInput) : new Date(eventDateInput.getTime());
  if (isNaN(d.getTime())) {
    throw new Error('Invalid event date input.');
  }

  const toIso = (date: Date) => date.toISOString().slice(0, 10);

  // After window: [eventDate, eventDate + 11 days] (12 days total)
  const afterStart = new Date(d);
  const afterEnd = new Date(d);
  afterEnd.setDate(afterEnd.getDate() + 11);

  // Before window: ending 12 days before event, 36 days duration -> [event - 47 days, event - 12 days]
  const beforeEnd = new Date(d);
  beforeEnd.setDate(beforeEnd.getDate() - 12);
  const beforeStart = new Date(beforeEnd);
  beforeStart.setDate(beforeStart.getDate() - 35);

  return {
    before: { start: toIso(beforeStart), end: toIso(beforeEnd) },
    after: { start: toIso(afterStart), end: toIso(afterEnd) },
    label: 'Standard suggested windows (Before: 36-day baseline ending 12 days prior; After: 12-day event impact). Fully editable.',
  };
}

/**
 * Groups raw ASF search results by (platform, flightDirection, relativeOrbit / pathNumber).
 * Marks a group as "usable" only if it contains >= 1 acquisition in the before window
 * AND >= 1 acquisition in the after window.
 */
export function groupAsfResults(
  granules: AsfGranule[],
  beforeWindow: DateWindow,
  afterWindow: DateWindow
): AsfPassGroup[] {
  const bStart = new Date(beforeWindow.start).getTime();
  const bEnd = new Date(beforeWindow.end).getTime() + (24 * 60 * 60 * 1000 - 1);
  const aStart = new Date(afterWindow.start).getTime();
  const aEnd = new Date(afterWindow.end).getTime() + (24 * 60 * 60 * 1000 - 1);

  const groups = new Map<string, AsfPassGroup>();

  for (const g of granules) {
    const platform = (g.platform || 'SENTINEL-1').trim();
    let dir: 'ASCENDING' | 'DESCENDING' | 'UNKNOWN' = 'UNKNOWN';
    const rawDir = String(g.flightDirection || '').toUpperCase();
    if (rawDir.startsWith('ASC')) dir = 'ASCENDING';
    else if (rawDir.startsWith('DESC')) dir = 'DESCENDING';

    const orbit = Number(g.pathNumber || g.relativeOrbit || 0);
    const key = `${platform}_${dir}_${orbit}`;

    let grp = groups.get(key);
    if (!grp) {
      grp = {
        id: key,
        platform,
        flightDirection: dir,
        relativeOrbit: orbit,
        beforeDates: [],
        afterDates: [],
        beforeCount: 0,
        afterCount: 0,
        usable: false,
        sampleGranule: g,
      };
      groups.set(key, grp);
    }

    const tStr = g.startTime ? String(g.startTime) : '';
    const t = new Date(tStr).getTime();
    const dateStr = tStr.slice(0, 10);

    if (!isNaN(t)) {
      if (t >= bStart && t <= bEnd) {
        grp.beforeDates.push(dateStr);
        grp.beforeCount++;
      } else if (t >= aStart && t <= aEnd) {
        grp.afterDates.push(dateStr);
        grp.afterCount++;
      }
    }
  }

  for (const grp of groups.values()) {
    grp.usable = grp.beforeCount >= 1 && grp.afterCount >= 1;
    grp.beforeDates.sort();
    grp.afterDates.sort();
  }

  return Array.from(groups.values()).sort((a, b) => {
    // Usable groups first, then descending total counts
    if (a.usable && !b.usable) return -1;
    if (!a.usable && b.usable) return 1;
    return (b.beforeCount + b.afterCount) - (a.beforeCount + a.afterCount);
  });
}

/**
 * Generates complete Google Earth Engine JavaScript code derived from scripts/gee/export_sylhet.js.
 * Parameterized with bbox, date windows, PASS, ORBIT, scale, and prefix.
 *
 * If PASS and ORBIT are null, generates script with null assignments and stop-with-error logic
 * that prints distinct passes and tracks to console before aborting.
 */
export function generateGeeScript(options: GeeScriptOptions): string {
  const {
    bbox,
    startDateA,
    endDateA,
    startDateB,
    endDateB,
    pass = null,
    relativeOrbit = null,
    scale = 20,
    prefix = 'sylhet',
    bands = ['VV'],
  } = options;

  const norm = normalizeBbox(bbox);
  const bandsArrayStr = JSON.stringify(bands);
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

  const passLiteral = pass ? `'${pass}'` : 'null';
  const orbitLiteral = relativeOrbit !== null && relativeOrbit !== undefined ? String(relativeOrbit) : 'null';

  return `/**
 * Google Earth Engine Export Script: Sylhet Flood Inundation
 * Project: Dancing with the SARs (NASA Space Apps Challenge 2026)
 *
 * Dataset: COPERNICUS/S1_GRD (Sentinel-1 Ground Range Detected)
 * Swath Mode: IW (Interferometric Wide)
 * AOI: Sylhet Division, Bangladesh (Surma River Basin)
 */

// 1. Define Area of Interest (AOI) Bounding Box [west, south, east, north]
var aoi = ee.Geometry.Rectangle([
  ${norm.west}, // west
  ${norm.south}, // south
  ${norm.east}, // east
  ${norm.north} // north
]);

// 2. Acquisition Date Ranges
// Baseline (Image A - Pre-monsoon / dry baseline)
var startDateA = '${startDateA}';
var endDateA = '${endDateA}';

// Comparison (Image B - Peak monsoon flood)
var startDateB = '${startDateB}';
var endDateB = '${endDateB}';

// 3. Bands & Resolution
var bands = ${bandsArrayStr}; // Sample data contains 1 band: VV
var scale = ${scale};     // Spatial resolution: ~20m (0.000179663° in EPSG:4326)
var crs = 'EPSG:4326';

// 4. Filter Sentinel-1 GRD Collection
var s1Collection = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', ${bands[0] ? `'${bands[0]}'` : "'VV'"}));

// Single-geometry orbital pass and relative orbit selection
var PASS = ${passLiteral};
var ORBIT = ${orbitLiteral};

var endAExclusive = ee.Date(endDateA).advance(1, 'day');
var endBExclusive = ee.Date(endDateB).advance(1, 'day');

if (PASS !== null && ORBIT !== null) {
  var countA = s1Collection
    .filterDate(startDateA, endAExclusive)
    .filter(ee.Filter.eq('orbitProperties_pass', PASS))
    .filter(ee.Filter.eq('relativeOrbitNumber_start', ORBIT))
    .size()
    .getInfo();
  var countB = s1Collection
    .filterDate(startDateB, endBExclusive)
    .filter(ee.Filter.eq('orbitProperties_pass', PASS))
    .filter(ee.Filter.eq('relativeOrbitNumber_start', ORBIT))
    .size()
    .getInfo();

  if (countA === 0 || countB === 0) {
    print('Requested orbit group ' + PASS + ' track ' + ORBIT + ' has ' + countA + ' baseline and ' + countB + ' comparison images. Falling back to automatic single-geometry selection.');
    PASS = null;
    ORBIT = null;
  } else {
    print('Selected single-geometry orbit group: ' + PASS + ' track ' + ORBIT + ' (Baseline: ' + countA + ', Comparison: ' + countB + ').');
  }
}

if (PASS === null || ORBIT === null) {
  var beforePasses = s1Collection.filterDate(startDateA, endAExclusive).aggregate_array('orbitProperties_pass').getInfo();
  var beforeOrbits = s1Collection.filterDate(startDateA, endAExclusive).aggregate_array('relativeOrbitNumber_start').getInfo();
  var afterPasses = s1Collection.filterDate(startDateB, endBExclusive).aggregate_array('orbitProperties_pass').getInfo();
  var afterOrbits = s1Collection.filterDate(startDateB, endBExclusive).aggregate_array('relativeOrbitNumber_start').getInfo();

  var countMapA = {};
  for (var i = 0; i < beforePasses.length; i++) {
    var keyA = beforePasses[i] + '_' + beforeOrbits[i];
    countMapA[keyA] = (countMapA[keyA] || 0) + 1;
  }

  var countMapB = {};
  for (var j = 0; j < afterPasses.length; j++) {
    var keyB = afterPasses[j] + '_' + afterOrbits[j];
    countMapB[keyB] = (countMapB[keyB] || 0) + 1;
  }

  var allKeys = {};
  for (var kA in countMapA) { allKeys[kA] = true; }
  for (var kB in countMapB) { allKeys[kB] = true; }

  var candidates = [];
  print('Available single-geometry orbit groups:');
  for (var k in allKeys) {
    var parts = k.split('_');
    var p = parts[0];
    var orb = parseInt(parts[1], 10);
    var cA = countMapA[k] || 0;
    var cB = countMapB[k] || 0;
    print('  - Direction: ' + p + ', Track: ' + orb + ', Baseline images: ' + cA + ', Comparison images: ' + cB);
    if (cA > 0 && cB > 0) {
      candidates.push({ pass: p, orbit: orb, beforeCount: cA, afterCount: cB, minCount: Math.min(cA, cB) });
    }
  }

  if (candidates.length === 0) {
    print('No single orbit geometry has images in both windows. Widen a window or move the area.');
    throw new Error('No single orbit geometry has images in both windows. Widen a window or move the area.');
  }

  candidates.sort(function(a, b) {
    if (b.minCount !== a.minCount) {
      return b.minCount - a.minCount;
    }
    if (a.pass !== b.pass) {
      return a.pass === 'DESCENDING' ? -1 : 1;
    }
    return a.orbit - b.orbit;
  });

  PASS = candidates[0].pass;
  ORBIT = candidates[0].orbit;
  print('Selected single-geometry orbit group: ' + PASS + ' track ' + ORBIT + ' (used for both baseline and comparison windows).');
}

s1Collection = s1Collection
  .filter(ee.Filter.eq('orbitProperties_pass', PASS))
  .filter(ee.Filter.eq('relativeOrbitNumber_start', ORBIT));

// 5. Select Images
var imageA = s1Collection
  .filterDate(startDateA, endAExclusive)
  .select(bands)
  .mosaic()
  .clip(aoi);

var imageB = s1Collection
  .filterDate(startDateB, endBExclusive)
  .select(bands)
  .mosaic()
  .clip(aoi);

// 6. Export Tasks to Google Drive
Export.image.toDrive({
  image: imageA,
  description: '${cleanPrefix}_image_a',
  folder: 'dancing-with-sars-${cleanPrefix}',
  fileNamePrefix: 'image_a',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: imageB,
  description: '${cleanPrefix}_image_b',
  folder: 'dancing-with-sars-${cleanPrefix}',
  fileNamePrefix: 'image_b',
  region: aoi,
  scale: scale,
  crs: crs,
  maxPixels: 1e9
});
`;
}
