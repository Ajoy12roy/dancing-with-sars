/**
 * lib/live-validate.ts
 *
 * Pure TypeScript validation functions for Live Area Analysis requests.
 * Validates bounding box, geographic dimensions, dates, and modes against
 * physical and algorithmic limits. Parity with python-service/live_gee.py and lib/aoi.ts.
 */

import {
  BoundingBox,
  DateWindow,
  normalizeBbox,
  computeBboxDimensions,
  computeExportScale,
  MIN_SIDE_KM,
  MAX_SIDE_KM,
  MAX_AREA_KM2,
  MAX_WINDOW_DAYS,
} from './aoi';

export const ALLOWED_LIVE_MODES = [
  'flood',
  'river-erosion',
  'deforestation',
  'surface-water',
] as const;

export type LiveAnalysisMode = (typeof ALLOWED_LIVE_MODES)[number];

export interface LiveValidationSuccess {
  valid: true;
  data: {
    box: BoundingBox;
    beforeWindow: DateWindow;
    afterWindow: DateWindow;
    mode: LiveAnalysisMode;
    scale: number;
  };
}

export interface LiveValidationFailure {
  valid: false;
  error: string;
  window?: 'before' | 'after';
}

export type LiveValidationResult = LiveValidationSuccess | LiveValidationFailure;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(val: unknown): { date: Date; str: string } | null {
  if (typeof val !== 'string' || !ISO_DATE_REGEX.test(val)) return null;
  const d = new Date(val + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  return { date: d, str: val };
}

export function validateLiveRequest(payload: unknown): LiveValidationResult {
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      error: 'Invalid request body. Expected a JSON object.',
    };
  }

  const p = payload as Record<string, unknown>;

  // 1. Mode Validation
  const rawMode = typeof p.mode === 'string' ? p.mode.trim().toLowerCase() : 'flood';
  if (!ALLOWED_LIVE_MODES.includes(rawMode as LiveAnalysisMode)) {
    return {
      valid: false,
      error: `Invalid mode '${rawMode}'. Allowed modes: ${ALLOWED_LIVE_MODES.join(', ')}.`,
    };
  }
  const mode = rawMode as LiveAnalysisMode;

  // 2. Bounding Box Validation
  const rawBox = p.box;
  if (!rawBox) {
    return {
      valid: false,
      error: "Missing required parameter 'box'.",
    };
  }

  let bbox: BoundingBox;
  if (Array.isArray(rawBox) && rawBox.length === 4) {
    const west = Number(rawBox[0]);
    const south = Number(rawBox[1]);
    const east = Number(rawBox[2]);
    const north = Number(rawBox[3]);
    if ([west, south, east, north].some((n) => isNaN(n))) {
      return {
        valid: false,
        error: 'Bounding box coordinates must be numeric values [west, south, east, north].',
      };
    }
    bbox = { west, south, east, north };
  } else if (
    typeof rawBox === 'object' &&
    'west' in rawBox &&
    'south' in rawBox &&
    'east' in rawBox &&
    'north' in rawBox
  ) {
    const b = rawBox as Record<string, unknown>;
    const west = Number(b.west);
    const south = Number(b.south);
    const east = Number(b.east);
    const north = Number(b.north);
    if ([west, south, east, north].some((n) => isNaN(n))) {
      return {
        valid: false,
        error: 'Bounding box coordinates must be numeric values {west, south, east, north}.',
      };
    }
    bbox = { west, south, east, north };
  } else {
    return {
      valid: false,
      error: "Invalid bounding box format. Expected [west, south, east, north] or {west, south, east, north}.",
    };
  }

  const normBox = normalizeBbox(bbox);
  const dims = computeBboxDimensions(normBox);

  if (dims.widthKm < MIN_SIDE_KM || dims.heightKm < MIN_SIDE_KM) {
    return {
      valid: false,
      error: `Area side length must be at least 2.0 km (current: width ${dims.widthKm} km, height ${dims.heightKm} km).`,
    };
  }

  if (dims.widthKm > MAX_SIDE_KM || dims.heightKm > MAX_SIDE_KM) {
    return {
      valid: false,
      error: `Area side length must be at most 30.0 km (current: width ${dims.widthKm} km, height ${dims.heightKm} km).`,
    };
  }

  if (dims.areaKm2 > MAX_AREA_KM2) {
    return {
      valid: false,
      error: `Total area must not exceed ${MAX_AREA_KM2} km² (current: ${dims.areaKm2} km²).`,
    };
  }

  // 3. Date Window Validation
  const beforeWin = p.beforeWindow as Record<string, unknown> | undefined;
  const afterWin = p.afterWindow as Record<string, unknown> | undefined;

  if (!beforeWin || typeof beforeWin !== 'object') {
    return {
      valid: false,
      error: "Missing or invalid 'beforeWindow' object.",
      window: 'before',
    };
  }

  if (!afterWin || typeof afterWin !== 'object') {
    return {
      valid: false,
      error: "Missing or invalid 'afterWindow' object.",
      window: 'after',
    };
  }

  const parsedStartA = parseIsoDate(beforeWin.start);
  const parsedEndA = parseIsoDate(beforeWin.end);
  if (!parsedStartA || !parsedEndA) {
    return {
      valid: false,
      error: 'Invalid date format for before window. Expected YYYY-MM-DD.',
      window: 'before',
    };
  }

  const parsedStartB = parseIsoDate(afterWin.start);
  const parsedEndB = parseIsoDate(afterWin.end);
  if (!parsedStartB || !parsedEndB) {
    return {
      valid: false,
      error: 'Invalid date format for after window. Expected YYYY-MM-DD.',
      window: 'after',
    };
  }

  if (parsedStartA.date > parsedEndA.date) {
    return {
      valid: false,
      error: `Before window start date (${parsedStartA.str}) must be earlier than or equal to end date (${parsedEndA.str}).`,
      window: 'before',
    };
  }

  if (parsedStartB.date > parsedEndB.date) {
    return {
      valid: false,
      error: `After window start date (${parsedStartB.str}) must be earlier than or equal to end date (${parsedEndB.str}).`,
      window: 'after',
    };
  }

  if (parsedEndA.date >= parsedStartB.date) {
    return {
      valid: false,
      error: 'Before window must be strictly earlier than after window, and windows cannot overlap.',
    };
  }

  const dayMs = 1000 * 60 * 60 * 24;
  const spanA = Math.round((parsedEndA.date.getTime() - parsedStartA.date.getTime()) / dayMs) + 1;
  const spanB = Math.round((parsedEndB.date.getTime() - parsedStartB.date.getTime()) / dayMs) + 1;

  if (spanA > MAX_WINDOW_DAYS) {
    return {
      valid: false,
      error: `Before window duration (${spanA} days) exceeds maximum allowed ${MAX_WINDOW_DAYS} days.`,
      window: 'before',
    };
  }

  if (spanB > MAX_WINDOW_DAYS) {
    return {
      valid: false,
      error: `After window duration (${spanB} days) exceeds maximum allowed ${MAX_WINDOW_DAYS} days.`,
      window: 'after',
    };
  }

  const scaleRec = computeExportScale(dims);

  return {
    valid: true,
    data: {
      box: normBox,
      beforeWindow: { start: parsedStartA.str, end: parsedEndA.str },
      afterWindow: { start: parsedStartB.str, end: parsedEndB.str },
      mode,
      scale: scaleRec.scale,
    },
  };
}
