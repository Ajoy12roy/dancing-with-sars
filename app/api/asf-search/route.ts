import { NextResponse } from 'next/server';
import {
  BoundingBox,
  validateBbox,
  validateDateWindows,
  groupAsfResults,
  AsfGranule,
} from '@/lib/aoi';

export const runtime = 'nodejs';
export const maxDuration = 15;

const ASF_BASE_URL = 'https://api.daac.asf.alaska.edu/services/search/param';

/**
 * Builds WKT POLYGON string from bounding box in counter-clockwise order:
 * POLYGON((west south, east south, east north, west north, west south))
 */
function bboxToWktPolygon(bbox: BoundingBox): string {
  const { west, south, east, north } = bbox;
  return `POLYGON((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
}

interface AsfFeature {
  properties?: {
    sceneName?: string;
    startTime?: string;
    stopTime?: string;
    flightDirection?: string;
    pathNumber?: number | string;
    frameNumber?: number | string;
    url?: string;
    platform?: string;
    beamModeType?: string;
    polarization?: string;
    [key: string]: unknown;
  };
}

async function queryAsfWindow(
  polygonWkt: string,
  startIso: string,
  endIso: string,
  platform: string,
  extraParams: Record<string, string> = {}
): Promise<AsfGranule[]> {
  const url = new URL(ASF_BASE_URL);
  url.searchParams.set('output', 'geojson');
  url.searchParams.set('platform', platform);
  url.searchParams.set('intersectsWith', polygonWkt);
  url.searchParams.set('start', `${startIso}T00:00:00UTC`);
  url.searchParams.set('end', `${endIso}T23:59:59UTC`);
  url.searchParams.set('maxResults', '150');

  for (const [k, v] of Object.entries(extraParams)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/geo+json, application/json',
        'User-Agent': 'TerraPulse/1.0 (https://github.com/Ajoy12roy/dancing-with-sars)',
      },
    });

    if (!res.ok) {
      throw new Error(`ASF Search returned status ${res.status}`);
    }

    const data = await res.json();
    const features: AsfFeature[] = Array.isArray(data?.features) ? data.features : [];

    return features.map((f) => ({
      platform: f.properties?.platform,
      startTime: f.properties?.startTime,
      flightDirection: f.properties?.flightDirection,
      pathNumber: f.properties?.pathNumber,
      frameNumber: f.properties?.frameNumber,
      sceneName: f.properties?.sceneName,
      url: f.properties?.url,
      polarization: f.properties?.polarization,
      beamModeType: f.properties?.beamModeType,
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const west = parseFloat(searchParams.get('west') || '');
  const south = parseFloat(searchParams.get('south') || '');
  const east = parseFloat(searchParams.get('east') || '');
  const north = parseFloat(searchParams.get('north') || '');

  if (Number.isNaN(west) || Number.isNaN(south) || Number.isNaN(east) || Number.isNaN(north)) {
    return NextResponse.json(
      { error: 'Invalid coordinates: west, south, east, and north must be valid numbers.' },
      { status: 400 }
    );
  }

  const bbox: BoundingBox = { west, south, east, north };
  const bboxValidation = validateBbox(bbox);
  if (!bboxValidation.valid) {
    return NextResponse.json({ error: bboxValidation.reason }, { status: 400 });
  }

  const beforeStart = searchParams.get('beforeStart') || '';
  const beforeEnd = searchParams.get('beforeEnd') || '';
  const afterStart = searchParams.get('afterStart') || '';
  const afterEnd = searchParams.get('afterEnd') || '';

  const dateValidation = validateDateWindows(
    { start: beforeStart, end: beforeEnd },
    { start: afterStart, end: afterEnd }
  );
  if (!dateValidation.valid) {
    return NextResponse.json({ error: dateValidation.reason }, { status: 400 });
  }

  const kind = (searchParams.get('kind') || 's1').toLowerCase();
  const polygonWkt = bboxToWktPolygon(bbox);

  try {
    if (kind === 'nisar') {
      // Query NISAR for both windows
      const [beforeGranules, afterGranules] = await Promise.all([
        queryAsfWindow(polygonWkt, beforeStart, beforeEnd, 'NISAR'),
        queryAsfWindow(polygonWkt, afterStart, afterEnd, 'NISAR'),
      ]);

      const seen = new Set<string>();
      const combined: AsfGranule[] = [];
      for (const g of [...beforeGranules, ...afterGranules]) {
        const id = g.sceneName || g.url || JSON.stringify(g);
        if (!seen.has(id)) {
          seen.add(id);
          combined.push(g);
        }
      }

      return NextResponse.json({
        success: true,
        kind: 'nisar',
        count: combined.length,
        granules: combined,
      });
    }

    // Default: Sentinel-1 query
    const [beforeGranules, afterGranules] = await Promise.all([
      queryAsfWindow(polygonWkt, beforeStart, beforeEnd, 'SENTINEL-1'),
      queryAsfWindow(polygonWkt, afterStart, afterEnd, 'SENTINEL-1'),
    ]);

    const seen = new Set<string>();
    const combined: AsfGranule[] = [];
    for (const g of [...beforeGranules, ...afterGranules]) {
      const id = g.sceneName || g.url || JSON.stringify(g);
      if (!seen.has(id)) {
        seen.add(id);
        combined.push(g);
      }
    }

    const groups = groupAsfResults(
      combined,
      { start: beforeStart, end: beforeEnd },
      { start: afterStart, end: afterEnd }
    );

    return NextResponse.json({
      success: true,
      kind: 's1',
      count: combined.length,
      groups,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Graceful fallback for offline mode or network timeouts: never return 500
    return NextResponse.json({
      offline: true,
      reason: `ASF Search API unavailable (${errorMsg}). You can still generate and execute the export script directly in Google Earth Engine.`,
      count: 0,
      groups: [],
      granules: [],
    });
  }
}

