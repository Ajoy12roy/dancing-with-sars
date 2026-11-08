import { NextResponse } from 'next/server';
import { BoundingBox, normalizeBbox } from '@/lib/aoi';

export const runtime = 'nodejs';
export const maxDuration = 15;

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const OSM_ATTRIBUTION = '© OpenStreetMap contributors (ODbL 1.0)';

// In-memory timestamp to enforce max 1 request/second Nominatim usage policy
let lastRequestTimestamp = 0;

export interface GeocodeItem {
  name: string;
  lat: number;
  lon: number;
  bbox: BoundingBox;
}

interface NominatimRawResult {
  place_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
  boundingbox?: [string, string, string, string]; // [south, north, west, east]
  type?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({
      results: [],
      attribution: OSM_ATTRIBUTION,
      message: 'Query must be at least 2 characters long.',
    });
  }

  // Enforce Nominatim policy: at most 1 request per second
  const now = Date.now();
  const timeSinceLast = now - lastRequestTimestamp;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastRequestTimestamp = Date.now();

  const url = new URL(NOMINATIM_BASE_URL);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TerraPulse/1.0 (https://github.com/Ajoy12roy/dancing-with-sars)',
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim responded with status ${res.status}`);
    }

    const data: NominatimRawResult[] = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({
        results: [],
        attribution: OSM_ATTRIBUTION,
      });
    }

    const results: GeocodeItem[] = [];

    for (const item of data) {
      if (!item.boundingbox || item.boundingbox.length < 4) continue;
      const south = parseFloat(item.boundingbox[0]);
      const north = parseFloat(item.boundingbox[1]);
      const west = parseFloat(item.boundingbox[2]);
      const east = parseFloat(item.boundingbox[3]);
      const lat = parseFloat(item.lat || '0');
      const lon = parseFloat(item.lon || '0');

      if (Number.isNaN(south) || Number.isNaN(north) || Number.isNaN(west) || Number.isNaN(east)) {
        continue;
      }

      const bbox = normalizeBbox({ west, south, east, north });
      results.push({
        name: item.display_name || q,
        lat,
        lon,
        bbox,
      });
    }

    return NextResponse.json({
      results,
      attribution: OSM_ATTRIBUTION,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Graceful offline fallback
    return NextResponse.json({
      offline: true,
      reason: `Geocoding unavailable (${msg}). You can still enter coordinates directly or select a preset.`,
      results: [],
      attribution: OSM_ATTRIBUTION,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

