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

export interface PresetAoi {
  id: string;
  name: string;
  description: string;
  bbox: BoundingBox;
  dateA: { start: string; end: string };
  dateB: { start: string; end: string };
  recommendedPass?: 'ASCENDING' | 'DESCENDING';
  recommendedOrbit?: number;
  provenanceNote: string;
  mode?: 'flood' | 'river-erosion' | 'deforestation' | 'surface-water';
}

export const SYLHET_GOLDEN_PRESET = {
  id: 'sylhet',
  name: 'Sylhet Division, Bangladesh (Flood Inundation)',
  description: 'Surma River Basin, 2022 catastrophic monsoon flood (Benchmark case)',
  bbox: { west: 91.8, south: 24.85, east: 91.95, north: 24.98 },
  startDateA: '2022-05-01',
  endDateA: '2022-05-10',
  startDateB: '2022-06-18',
  endDateB: '2022-06-22',
  pass: 'DESCENDING' as const,
  relativeOrbit: 77,
  scale: 20,
  prefix: 'terrapulse_aoi',
  bands: ['VV'],
  provenanceNote:
    'The preset comparison window (2022-06-18 to 2022-06-22) and single orbit geometry (DESCENDING track 77) capture the flood peak pass on 2022-06-18, whereas the reference script had window 2022-06-20 to 2022-06-21 and did not restrict the orbit; results are therefore comparable but not identical.',
};

export const PRESET_AOIS: PresetAoi[] = [
  {
    id: SYLHET_GOLDEN_PRESET.id,
    name: SYLHET_GOLDEN_PRESET.name,
    description: SYLHET_GOLDEN_PRESET.description,
    bbox: SYLHET_GOLDEN_PRESET.bbox,
    dateA: { start: SYLHET_GOLDEN_PRESET.startDateA, end: SYLHET_GOLDEN_PRESET.endDateA },
    dateB: { start: SYLHET_GOLDEN_PRESET.startDateB, end: SYLHET_GOLDEN_PRESET.endDateB },
    recommendedPass: SYLHET_GOLDEN_PRESET.pass,
    recommendedOrbit: SYLHET_GOLDEN_PRESET.relativeOrbit,
    provenanceNote: SYLHET_GOLDEN_PRESET.provenanceNote,
    mode: 'flood',
  },
  {
    id: 'tanguar',
    name: 'Tanguar Haor, Bangladesh (Wetland Dynamics)',
    description: 'Sunamganj freshwater wetland seasonal hydrological fluctuations',
    bbox: { west: 90.97976, south: 25.04979, east: 91.2002, north: 25.22011 },
    dateA: { start: '2023-02-01', end: '2023-02-25' },
    dateB: { start: '2023-08-07', end: '2023-08-31' },
    recommendedPass: 'DESCENDING',
    provenanceNote:
      'The preset enforces a single orbit geometry (DESCENDING) for both windows, whereas the reference script does not restrict the orbit; results are therefore comparable but not identical.',
    mode: 'surface-water',
  },
  {
    id: 'jamuna',
    name: 'Jamuna River, Bangladesh (Braided Sandbars)',
    description: 'Sirajganj multi-thread braided channel and char morphology shifts',
    bbox: { west: 89.6498, south: 24.29979, east: 89.95002, north: 24.55015 },
    dateA: { start: '2019-02-01', end: '2019-02-25' },
    dateB: { start: '2024-02-04', end: '2024-02-28' },
    recommendedPass: 'ASCENDING',
    provenanceNote:
      'The preset enforces a single orbit geometry (ASCENDING) for both windows, whereas the reference script does not restrict the orbit; results are therefore comparable but not identical.',
    mode: 'river-erosion',
  },
  {
    id: 'amazon',
    name: 'Amazon Rainforest, Rondônia, Brazil (Canopy Loss)',
    description: 'Deforestation monitoring in the southwestern Amazon basin',
    bbox: { west: -62.20007, south: -10.35003, east: -61.99992, north: -10.14988 },
    dateA: { start: '2022-08-20', end: '2022-09-13' },
    dateB: { start: '2023-01-01', end: '2023-01-25' },
    recommendedPass: 'DESCENDING',
    provenanceNote:
      'The preset enforces a single orbit geometry (DESCENDING) for both windows, whereas the reference script does not restrict the orbit; results are therefore comparable but not identical.',
    mode: 'deforestation',
  },
  {
    id: 'padma-naria',
    name: 'Padma River / Naria, Bangladesh (Bank Erosion)',
    description: 'Shariatpur riverbank recession and severe land loss monitoring',
    bbox: { west: 90.23272, south: 23.31002, east: 90.42765, north: 23.49005 },
    dateA: { start: '2017-01-15', end: '2017-02-08' },
    dateB: { start: '2024-01-15', end: '2024-02-08' },
    recommendedPass: 'DESCENDING',
    provenanceNote:
      'The preset enforces a single orbit geometry (DESCENDING) for both windows, whereas the precomputed case does not restrict the orbit; results are therefore comparable but not identical.',
    mode: 'river-erosion',
  },
];

/**
 * Returns the matching PresetAoi for a given case study ID, or undefined if no preset exists.
 */
export function presetForCase(caseId: string): PresetAoi | undefined {
  if (!caseId) return undefined;
  return PRESET_AOIS.find((p) => p.id === caseId);
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
  title?: string;
  aoiName?: string;
  baselineLabel?: string;
  comparisonLabel?: string;
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

export type HandleType = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'move';

export interface ResizeBoundsResult {
  bbox: BoundingBox;
  clamped: boolean;
  clampReason?: string;
}

/**
 * Pure resize and move logic for AOI bounding boxes.
 * Clamps dimensions to [MIN_SIDE_KM..MAX_SIDE_KM] (2 to 30 km) and area to MAX_AREA_KM2 (900 km2).
 * When squareMode is active on corner drags, preserves 1:1 aspect ratio.
 */
export function resizeBounds(
  currentBbox: BoundingBox,
  handleType: HandleType,
  deltaLat: number,
  deltaLon: number,
  squareMode: boolean = false
): ResizeBoundsResult {
  const norm = normalizeBbox(currentBbox);

  if (handleType === 'move') {
    const initialDims = computeBboxDimensions(norm);
    const newMidLat = (norm.south + norm.north) / 2 + deltaLat;
    const newMidLon = (norm.west + norm.east) / 2 + deltaLon;
    const rad = Math.PI / 180;
    const kmPerDegLat = WGS84_AUTHALIC_RADIUS_KM * rad;
    const kmPerDegLon = WGS84_AUTHALIC_RADIUS_KM * rad * (Math.cos(newMidLat * rad) || 1);

    const halfHeightDeg = (initialDims.heightKm / kmPerDegLat) / 2;
    const halfWidthDeg = (initialDims.widthKm / kmPerDegLon) / 2;

    const moved = normalizeBbox({
      west: Number((newMidLon - halfWidthDeg).toFixed(5)),
      east: Number((newMidLon + halfWidthDeg).toFixed(5)),
      south: Number((newMidLat - halfHeightDeg).toFixed(5)),
      north: Number((newMidLat + halfHeightDeg).toFixed(5)),
    });
    return { bbox: moved, clamped: false };
  }

  const midLat = (norm.south + norm.north) / 2;
  const rad = Math.PI / 180;
  const kmPerDegLat = WGS84_AUTHALIC_RADIUS_KM * rad;
  const kmPerDegLon = WGS84_AUTHALIC_RADIUS_KM * rad * (Math.cos(midLat * rad) || 1);

  const initialWidthKm = (norm.east - norm.west) * kmPerDegLon;
  const initialHeightKm = (norm.north - norm.south) * kmPerDegLat;

  let rawWidthKm = initialWidthKm;
  let rawHeightKm = initialHeightKm;

  if (handleType === 'e' || handleType === 'ne' || handleType === 'se') {
    rawWidthKm = initialWidthKm + deltaLon * kmPerDegLon;
  } else if (handleType === 'w' || handleType === 'nw' || handleType === 'sw') {
    rawWidthKm = initialWidthKm - deltaLon * kmPerDegLon;
  }

  if (handleType === 'n' || handleType === 'nw' || handleType === 'ne') {
    rawHeightKm = initialHeightKm + deltaLat * kmPerDegLat;
  } else if (handleType === 's' || handleType === 'sw' || handleType === 'se') {
    rawHeightKm = initialHeightKm - deltaLat * kmPerDegLat;
  }

  const isCorner = handleType === 'nw' || handleType === 'ne' || handleType === 'sw' || handleType === 'se';
  if (squareMode && isCorner) {
    const squareSide = Math.max(rawWidthKm, rawHeightKm);
    rawWidthKm = squareSide;
    rawHeightKm = squareSide;
  }

  let clamped = false;
  let clampReason: string | undefined;

  let targetWidthKm = rawWidthKm;
  let targetHeightKm = rawHeightKm;

  if (targetWidthKm < MIN_SIDE_KM) {
    targetWidthKm = MIN_SIDE_KM;
    clamped = true;
    clampReason = `Area side length clamped to minimum ${MIN_SIDE_KM} km.`;
  } else if (targetWidthKm > MAX_SIDE_KM) {
    targetWidthKm = MAX_SIDE_KM;
    clamped = true;
    clampReason = `Area side length clamped to maximum ${MAX_SIDE_KM} km.`;
  }

  if (targetHeightKm < MIN_SIDE_KM) {
    targetHeightKm = MIN_SIDE_KM;
    clamped = true;
    clampReason = `Area side length clamped to minimum ${MIN_SIDE_KM} km.`;
  } else if (targetHeightKm > MAX_SIDE_KM) {
    targetHeightKm = MAX_SIDE_KM;
    clamped = true;
    clampReason = `Area side length clamped to maximum ${MAX_SIDE_KM} km.`;
  }

  if (targetWidthKm * targetHeightKm > MAX_AREA_KM2) {
    const scaleFactor = Math.sqrt(MAX_AREA_KM2 / (targetWidthKm * targetHeightKm));
    targetWidthKm = Number((targetWidthKm * scaleFactor).toFixed(4));
    targetHeightKm = Number((targetHeightKm * scaleFactor).toFixed(4));
    clamped = true;
    clampReason = `Total area clamped to maximum ${MAX_AREA_KM2} km².`;
  }

  if (squareMode && isCorner) {
    const minSide = Math.min(targetWidthKm, targetHeightKm);
    targetWidthKm = minSide;
    targetHeightKm = minSide;
  }

  const dLatDeg = targetHeightKm / kmPerDegLat;
  const dLonDeg = targetWidthKm / kmPerDegLon;

  let west = norm.west;
  let east = norm.east;
  let south = norm.south;
  let north = norm.north;

  switch (handleType) {
    case 'n':
      north = south + dLatDeg;
      break;
    case 's':
      south = north - dLatDeg;
      break;
    case 'e':
      east = west + dLonDeg;
      break;
    case 'w':
      west = east - dLonDeg;
      break;
    case 'ne':
      east = west + dLonDeg;
      north = south + dLatDeg;
      break;
    case 'nw':
      west = east - dLonDeg;
      north = south + dLatDeg;
      break;
    case 'se':
      east = west + dLonDeg;
      south = north - dLatDeg;
      break;
    case 'sw':
      west = east - dLonDeg;
      south = north - dLatDeg;
      break;
  }

  return {
    bbox: normalizeBbox({
      west: Number(west.toFixed(5)),
      south: Number(south.toFixed(5)),
      east: Number(east.toFixed(5)),
      north: Number(north.toFixed(5)),
    }),
    clamped,
    clampReason,
  };
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
 * Adds (or subtracts) a given number of days to an ISO date string (YYYY-MM-DD)
 * using UTC date arithmetic.
 */
export function addDaysISO(isoDate: string, days: number): string {
  if (!isoDate || typeof isoDate !== 'string') return isoDate;
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Computes the midpoint date (ISO string YYYY-MM-DD) between two ISO date strings.
 */
export function getMidpointDateISO(startISO: string, endISO: string): string {
  if (!startISO || !endISO) return startISO || endISO || '';
  const p1 = startISO.split('-');
  const p2 = endISO.split('-');
  if (p1.length !== 3 || p2.length !== 3) return startISO;
  const y1 = Number(p1[0]);
  const m1 = Number(p1[1]);
  const d1 = Number(p1[2]);
  const y2 = Number(p2[0]);
  const m2 = Number(p2[1]);
  const d2 = Number(p2[2]);
  if (isNaN(y1) || isNaN(m1) || isNaN(d1) || isNaN(y2) || isNaN(m2) || isNaN(d2)) return startISO;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  const midTime = Math.round((t1 + t2) / 2);
  return new Date(midTime).toISOString().slice(0, 10);
}

/**
 * Expands a single target date to a search window with ±halfWindowDays (default 12 days, 24 days total).
 * Guarantees at least 2 Sentinel-1 orbital passes per window, preventing "0 scene(s)" catalogue search misses.
 */
export function expandSingleDateToWindow(
  targetISO: string,
  halfWindowDays: number = 12
): { start: string; end: string } {
  return {
    start: addDaysISO(targetISO, -halfWindowDays),
    end: addDaysISO(targetISO, halfWindowDays),
  };
}

/**
 * Returns default Before and After target dates separated by an optimal ~4.5 months (137 days).
 * Provides a meaningful temporal baseline separation for SAR change detection workflows.
 */
export function getDefaultBeforeAfterTargets(): { beforeTarget: string; afterTarget: string } {
  const afterTarget = '2024-09-15';
  const beforeTarget = addDaysISO(afterTarget, -137); // '2024-05-01'
  return { beforeTarget, afterTarget };
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
    prefix = '',
    bands = ['VV'],
    title,
    aoiName,
    baselineLabel,
    comparisonLabel,
  } = options;

  const norm = normalizeBbox(bbox);
  const bandsArrayStr = JSON.stringify(bands);

  const passLiteral = pass ? `'${pass}'` : 'null';
  const orbitLiteral = relativeOrbit !== null && relativeOrbit !== undefined ? String(relativeOrbit) : 'null';

  // Match preset or custom box
  const matchingPreset = PRESET_AOIS.find((p) => {
    return (
      Math.abs(p.bbox.west - norm.west) < 0.001 &&
      Math.abs(p.bbox.east - norm.east) < 0.001 &&
      Math.abs(p.bbox.south - norm.south) < 0.001 &&
      Math.abs(p.bbox.north - norm.north) < 0.001
    );
  }) || (prefix && prefix !== 'sylhet' && prefix !== 'terrapulse_aoi' ? PRESET_AOIS.find((p) => p.id === prefix) : undefined);

  const cleanPrefix = (prefix || (matchingPreset?.id === 'sylhet' ? 'terrapulse_aoi' : matchingPreset?.id) || 'terrapulse_aoi')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();

  let scriptTitle = title;
  let scriptAoi = aoiName;
  let baselineNote = baselineLabel;
  let comparisonNote = comparisonLabel;

  if (!scriptTitle || !scriptAoi || !baselineNote || !comparisonNote) {
    if (matchingPreset?.id === 'sylhet' || (!matchingPreset && norm.west === 91.8 && norm.south === 24.85 && norm.east === 91.95 && norm.north === 24.98) || prefix === 'sylhet') {
      scriptTitle = scriptTitle || 'Sylhet Flood Inundation';
      scriptAoi = scriptAoi || 'Sylhet Division, Bangladesh (Surma River Basin)';
      baselineNote = baselineNote || 'Pre-monsoon / dry baseline';
      comparisonNote = comparisonNote || 'Peak monsoon flood';
    } else if (matchingPreset?.id === 'tanguar') {
      scriptTitle = scriptTitle || 'Tanguar Haor Wetland Dynamics';
      scriptAoi = scriptAoi || 'Tanguar Haor, Sunamganj, Bangladesh (Freshwater Wetland)';
      baselineNote = baselineNote || 'Dry season / winter baseline';
      comparisonNote = comparisonNote || 'Monsoon high water comparison';
    } else if (matchingPreset?.id === 'jamuna') {
      scriptTitle = scriptTitle || 'Jamuna River Braided Channel Morphology';
      scriptAoi = scriptAoi || 'Jamuna River, Sirajganj, Bangladesh (Braided Sandbars)';
      baselineNote = baselineNote || 'Baseline channel morphology';
      comparisonNote = comparisonNote || 'Comparison channel morphology';
    } else if (matchingPreset?.id === 'amazon') {
      scriptTitle = scriptTitle || 'Amazon Rainforest Canopy Loss';
      scriptAoi = scriptAoi || 'Amazon Rainforest, Rond\u00f4nia, Brazil';
      baselineNote = baselineNote || 'Baseline canopy cover';
      comparisonNote = comparisonNote || 'Comparison canopy cover';
    } else if (matchingPreset?.id === 'padma-naria') {
      scriptTitle = scriptTitle || 'Padma River / Naria Bank Erosion';
      scriptAoi = scriptAoi || 'Padma River / Naria, Shariatpur, Bangladesh';
      baselineNote = baselineNote || 'Baseline pre-erosion bank line';
      comparisonNote = comparisonNote || 'Comparison post-erosion bank line';
    } else {
      scriptTitle = scriptTitle || 'Custom Area SAR Analysis';
      scriptAoi = scriptAoi || `Custom Area (${norm.west}, ${norm.south}, ${norm.east}, ${norm.north})`;
      baselineNote = baselineNote || 'Baseline observation';
      comparisonNote = comparisonNote || 'Comparison observation';
    }
  }

  return `/**
 * Google Earth Engine Export Script: ${scriptTitle}
 * Project: Dancing with the SARs (NASA Space Apps Challenge 2026)
 *
 * Dataset: COPERNICUS/S1_GRD (Sentinel-1 Ground Range Detected)
 * Swath Mode: IW (Interferometric Wide)
 * AOI: ${scriptAoi}
 */

// 1. Define Area of Interest (AOI) Bounding Box [west, south, east, north]
var aoi = ee.Geometry.Rectangle([
  ${norm.west}, // west
  ${norm.south}, // south
  ${norm.east}, // east
  ${norm.north} // north
]);

// 2. Acquisition Date Ranges
// Baseline (Image A - ${baselineNote})
var startDateA = '${startDateA}';
var endDateA = '${endDateA}';

// Comparison (Image B - ${comparisonNote})
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
