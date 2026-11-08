'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Rectangle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import {
  BoundingBox,
  normalizeBbox,
  computeBboxDimensions,
  validateBbox,
  clampBboxToLimits,
  computeExportScale,
  validateDateWindows,
  suggestWindowsForEvent,
  generateGeeScript,
  AsfPassGroup,
  AsfGranule,
  SEASONAL_WARNING_TEXT,
  MIN_SIDE_KM,
  MAX_SIDE_KM,
  MAX_AREA_KM2,
} from '@/lib/aoi';

// Guard Leaflet default marker icons for client environments
if (typeof window !== 'undefined' && L && L.Icon && L.Icon.Default) {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
    iconUrl: '/leaflet/images/marker-icon.png',
    shadowUrl: '/leaflet/images/marker-shadow.png',
  });
}

// Map Recentering & FitBounds Controller
function MapController({
  bbox,
  recenterTrigger,
}: {
  bbox: BoundingBox;
  recenterTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (recenterTrigger > 0) {
      const bounds = L.latLngBounds(
        [bbox.south, bbox.west],
        [bbox.north, bbox.east]
      );
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }, [map, bbox, recenterTrigger]);

  return null;
}

// Map Click Handler to reposition AOI center
function MapClickHandler({
  onCenterChange,
}: {
  onCenterChange: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onCenterChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface PresetAoi {
  id: string;
  name: string;
  description: string;
  bbox: BoundingBox;
  dateA: { start: string; end: string };
  dateB: { start: string; end: string };
  recommendedPass?: 'ASCENDING' | 'DESCENDING';
  recommendedOrbit?: number;
}

const PRESET_AOIS: PresetAoi[] = [
  {
    id: 'sylhet',
    name: 'Sylhet Division, Bangladesh (Flood Inundation)',
    description: 'Surma River Basin, 2022 catastrophic monsoon flood (Benchmark case)',
    bbox: { west: 91.8, south: 24.85, east: 91.95, north: 24.98 },
    dateA: { start: '2022-05-01', end: '2022-05-10' },
    dateB: { start: '2022-06-20', end: '2022-06-21' },
    recommendedPass: 'DESCENDING',
    recommendedOrbit: 77,
  },
  {
    id: 'tanguar',
    name: 'Tanguar Haor, Bangladesh (Wetland Dynamics)',
    description: 'Sunamganj freshwater wetland seasonal hydrological fluctuations',
    bbox: { west: 91.02, south: 25.1, east: 91.17, north: 25.21 },
    dateA: { start: '2023-01-10', end: '2023-01-20' },
    dateB: { start: '2023-07-05', end: '2023-07-15' },
    recommendedPass: 'DESCENDING',
  },
  {
    id: 'jamuna',
    name: 'Jamuna River, Bangladesh (Braided Sandbars)',
    description: 'Sirajganj multi-thread braided channel and char morphology shifts',
    bbox: { west: 89.65, south: 24.5, east: 89.85, north: 24.68 },
    dateA: { start: '2021-02-01', end: '2021-02-15' },
    dateB: { start: '2024-02-01', end: '2024-02-15' },
    recommendedPass: 'ASCENDING',
  },
  {
    id: 'padma-naria',
    name: 'Padma River / Naria, Bangladesh (Bank Erosion)',
    description: 'Shariatpur riverbank recession and severe land loss monitoring',
    bbox: { west: 90.35, south: 23.25, east: 90.52, north: 23.4 },
    dateA: { start: '2018-01-10', end: '2018-01-25' },
    dateB: { start: '2019-01-10', end: '2019-01-25' },
    recommendedPass: 'DESCENDING',
  },
  {
    id: 'siberia-wildfire',
    name: 'Western Siberia, Russia (Taiga Wildfire)',
    description: 'Khanty-Mansi Autonomous Okrug fire scar and burn perimeter',
    bbox: { west: 76.2, south: 61.1, east: 76.5, north: 61.3 },
    dateA: { start: '2026-07-15', end: '2026-07-25' },
    dateB: { start: '2026-08-10', end: '2026-08-20' },
    recommendedPass: 'DESCENDING',
  },
];

export default function AoiMapPicker() {
  // ── AOI Bounding Box State ──
  const [bbox, setBbox] = useState<BoundingBox>({
    west: 91.8,
    south: 24.85,
    east: 91.95,
    north: 24.98,
  });

  // Recenter counter to force MapController to re-fit bounds
  const [recenterCount, setRecenterCount] = useState<number>(1);

  // ── Date Window State ──
  const [dateWindowA, setDateWindowA] = useState<{ start: string; end: string }>({
    start: '2022-05-01',
    end: '2022-05-10',
  });
  const [dateWindowB, setDateWindowB] = useState<{ start: string; end: string }>({
    start: '2022-06-20',
    end: '2022-06-21',
  });

  // Event Date Helper
  const [eventDateInput, setEventDateInput] = useState<string>('2022-06-18');
  const [showEventHelper, setShowEventHelper] = useState<boolean>(false);

  // ── Geocode Search State ──
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ name: string; lat: number; lon: number; bbox: BoundingBox }>
  >([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ── ASF Search & Pass Finder State ──
  const [asfMode, setAsfMode] = useState<'s1' | 'nisar'>('s1');
  const [asfLoading, setAsfLoading] = useState<boolean>(false);
  const [asfGroups, setAsfGroups] = useState<AsfPassGroup[]>([]);
  const [asfNisarGranules, setAsfNisarGranules] = useState<AsfGranule[]>([]);
  const [asfError, setAsfError] = useState<string | null>(null);
  const [asfOfflineNotice, setAsfOfflineNotice] = useState<string | null>(null);
  const [asfTotalCount, setAsfTotalCount] = useState<number | null>(null);

  // Selected Track / Pass Filter
  const [selectedTrackPass, setSelectedTrackPass] = useState<{
    pass: 'ASCENDING' | 'DESCENDING';
    orbit: number;
  } | null>({
    pass: 'DESCENDING',
    orbit: 77,
  });

  // ── Export Script Preview State ──
  const [scriptCopied, setScriptCopied] = useState<boolean>(false);

  // ── Computed Bounding Box Metrics ──
  const dimensions = useMemo(() => computeBboxDimensions(bbox), [bbox]);
  const validation = useMemo(() => validateBbox(bbox), [bbox]);
  const scaleInfo = useMemo(() => computeExportScale(dimensions), [dimensions]);
  const dateValidation = useMemo(
    () => validateDateWindows(dateWindowA, dateWindowB),
    [dateWindowA, dateWindowB]
  );

  // ── Generated GEE Script ──
  const geeScript = useMemo(() => {
    return generateGeeScript({
      bbox,
      startDateA: dateWindowA.start,
      endDateA: dateWindowA.end,
      startDateB: dateWindowB.start,
      endDateB: dateWindowB.end,
      pass: selectedTrackPass?.pass || null,
      relativeOrbit: selectedTrackPass?.orbit ?? null,
      scale: scaleInfo.scale,
      prefix: 'terrapulse_aoi',
    });
  }, [bbox, dateWindowA, dateWindowB, selectedTrackPass, scaleInfo.scale]);

  // ── Map Center Reposition Handler ──
  const handleMapCenterClick = useCallback(
    (lat: number, lon: number) => {
      const halfHeight = (bbox.north - bbox.south) / 2;
      const halfWidth = (bbox.east - bbox.west) / 2;
      const updated = normalizeBbox({
        west: Number((lon - halfWidth).toFixed(5)),
        east: Number((lon + halfWidth).toFixed(5)),
        south: Number((lat - halfHeight).toFixed(5)),
        north: Number((lat + halfHeight).toFixed(5)),
      });
      setBbox(updated);
    },
    [bbox]
  );

  // ── Nudge Handlers ──
  const handleNudgeCoordinate = (
    coord: 'west' | 'south' | 'east' | 'north',
    delta: number
  ) => {
    setBbox((prev) => {
      const next = { ...prev, [coord]: Number((prev[coord] + delta).toFixed(5)) };
      return normalizeBbox(next);
    });
  };

  const handleShiftBox = (direction: 'N' | 'S' | 'E' | 'W') => {
    const latSpan = bbox.north - bbox.south;
    const lonSpan = bbox.east - bbox.west;
    const stepLat = latSpan * 0.1;
    const stepLon = lonSpan * 0.1;

    setBbox((prev) => {
      let dLat = 0;
      let dLon = 0;
      if (direction === 'N') dLat = stepLat;
      if (direction === 'S') dLat = -stepLat;
      if (direction === 'E') dLon = stepLon;
      if (direction === 'W') dLon = -stepLon;

      return normalizeBbox({
        west: Number((prev.west + dLon).toFixed(5)),
        east: Number((prev.east + dLon).toFixed(5)),
        south: Number((prev.south + dLat).toFixed(5)),
        north: Number((prev.north + dLat).toFixed(5)),
      });
    });
  };

  const handleResizeBox = (factor: number) => {
    const midLat = (bbox.south + bbox.north) / 2;
    const midLon = (bbox.west + bbox.east) / 2;
    const halfLat = ((bbox.north - bbox.south) / 2) * factor;
    const halfLon = ((bbox.east - bbox.west) / 2) * factor;

    const unconstrained = normalizeBbox({
      west: midLon - halfLon,
      east: midLon + halfLon,
      south: midLat - halfLat,
      north: midLat + halfLat,
    });
    setBbox(clampBboxToLimits(unconstrained));
  };

  // ── Preset Selection ──
  const handleSelectPreset = (preset: PresetAoi) => {
    setBbox(preset.bbox);
    setDateWindowA(preset.dateA);
    setDateWindowB(preset.dateB);
    if (preset.recommendedPass && preset.recommendedOrbit) {
      setSelectedTrackPass({
        pass: preset.recommendedPass,
        orbit: preset.recommendedOrbit,
      });
    } else {
      setSelectedTrackPass(null);
    }
    setAsfGroups([]);
    setAsfNisarGranules([]);
    setAsfError(null);
    setAsfOfflineNotice(null);
    setAsfTotalCount(null);
    setRecenterCount((c) => c + 1);
  };

  // ── Geocode Search Submit (Submit-Only, No Autocomplete) ──
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || query.length < 2) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.offline) {
        setSearchError(data.reason || 'Geocoding unavailable in offline mode.');
      } else if (Array.isArray(data.results) && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchError(`No locations found for "${query}".`);
      }
    } catch {
      setSearchError('Failed to query geocoding service.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = (result: {
    name: string;
    lat: number;
    lon: number;
    bbox: BoundingBox;
  }) => {
    // If the returned bbox is valid and within limits, use it; otherwise clamp around lat/lon
    const dims = computeBboxDimensions(result.bbox);
    let targetBbox: BoundingBox;
    if (dims.widthKm >= MIN_SIDE_KM && dims.heightKm >= MIN_SIDE_KM && dims.areaKm2 <= MAX_AREA_KM2) {
      targetBbox = clampBboxToLimits(result.bbox);
    } else {
      // Default ~10 km box centered at lat/lon
      const rad = Math.PI / 180;
      const dLat = 5 / 111.195;
      const dLon = 5 / (111.195 * Math.cos(result.lat * rad) || 1);
      targetBbox = clampBboxToLimits({
        west: result.lon - dLon,
        east: result.lon + dLon,
        south: result.lat - dLat,
        north: result.lat + dLat,
      });
    }

    setBbox(targetBbox);
    setSearchResults([]);
    setSearchQuery('');
    setRecenterCount((c) => c + 1);
  };

  // ── Apply Event Date Suggestion ──
  const handleApplyEventSuggestion = () => {
    if (!eventDateInput) return;
    const suggested = suggestWindowsForEvent(eventDateInput);
    setDateWindowA(suggested.before);
    setDateWindowB(suggested.after);
    setShowEventHelper(false);
  };

  // ── Find Acquisitions via ASF Search ──
  const handleFindAcquisitions = async () => {
    if (!validation.valid || !dateValidation.valid) return;

    setAsfLoading(true);
    setAsfError(null);
    setAsfOfflineNotice(null);
    setAsfGroups([]);
    setAsfNisarGranules([]);

    const params = new URLSearchParams({
      west: String(bbox.west),
      south: String(bbox.south),
      east: String(bbox.east),
      north: String(bbox.north),
      beforeStart: dateWindowA.start,
      beforeEnd: dateWindowA.end,
      afterStart: dateWindowB.start,
      afterEnd: dateWindowB.end,
      kind: asfMode,
    });

    try {
      const res = await fetch(`/api/asf-search?${params.toString()}`);
      const data = await res.json();

      if (data.offline) {
        setAsfOfflineNotice(data.reason);
      } else if (data.error) {
        setAsfError(data.error);
      } else {
        setAsfTotalCount(data.count ?? 0);
        if (asfMode === 's1' && Array.isArray(data.groups)) {
          setAsfGroups(data.groups);
          // Auto-select first usable group if none selected or current is invalid
          const firstUsable = data.groups.find(
            (g: AsfPassGroup) => g.usable && g.flightDirection !== 'UNKNOWN'
          );
          if (firstUsable) {
            setSelectedTrackPass({
              pass: firstUsable.flightDirection as 'ASCENDING' | 'DESCENDING',
              orbit: firstUsable.relativeOrbit,
            });
          }
        } else if (asfMode === 'nisar' && Array.isArray(data.granules)) {
          setAsfNisarGranules(data.granules);
        }
      }
    } catch {
      setAsfError('Network error while querying satellite acquisitions.');
    } finally {
      setAsfLoading(false);
    }
  };

  // ── Copy Script to Clipboard ──
  const handleCopyScript = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(geeScript).then(() => {
        setScriptCopied(true);
        setTimeout(() => setScriptCopied(false), 2500);
      });
    }
  };

  const midLat = (bbox.south + bbox.north) / 2;
  const midLon = (bbox.west + bbox.east) / 2;

  return (
    <div className="space-y-6 text-ink">
      {/* ── Subheading & Pipeline Explanation ── */}
      <div>
        <h3 className="text-base font-bold font-headline text-ink flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
          Area Picker & Earth Engine Script Generator
        </h3>
        <p className="text-xs text-text-secondary mt-1 font-sans">
          Interactively select an Area of Interest ({MIN_SIDE_KM}–{MAX_SIDE_KM} km side length, max {MAX_AREA_KM2} km²),
          query matching Sentinel-1 or NISAR orbital passes via the Alaska Satellite Facility (ASF),
          and export co-registered radar GeoTIFF pairs using Google Earth Engine.
        </p>
      </div>

      {/* ── Preset Case Studies (100% Offline Capable) ── */}
      <div className="border border-hairline rounded-[2px] bg-surface p-4 space-y-2">
        <label htmlFor="preset-aoi-select" className="text-xs font-semibold text-text-secondary font-sans uppercase tracking-wider block">
          Preset Benchmark Case Studies (Instant Offline Fill)
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_AOIS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="px-3 py-1.5 text-xs font-medium border border-hairline bg-surface-2 hover:border-accent hover:text-accent rounded-[2px] transition-colors cursor-pointer text-left"
              title={preset.description}
            >
              {preset.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search Bar (Nominatim Submit-Only) ── */}
      <div className="border border-hairline rounded-[2px] bg-surface p-4 space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="geocode-input" className="text-xs font-semibold text-text-secondary font-sans uppercase tracking-wider">
            Search Location (Submit on Enter or Search)
          </label>
          <span className="text-[10px] text-text-secondary">
            Data © OpenStreetMap contributors
          </span>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="geocode-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Sylhet, Sunamganj, Sirajganj, Naria, Khanty-Mansiysk..."
              className="w-full bg-surface-2 border border-hairline rounded-[2px] py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-text-secondary focus:outline-none focus:border-accent"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-secondary pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={searchLoading || searchQuery.trim().length < 2}
            className="px-4 py-1.5 text-xs font-semibold bg-accent text-text-on-accent rounded-[2px] hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchError && (
          <p className="text-xs text-rust mt-1 font-sans">{searchError}</p>
        )}

        {searchResults.length > 0 && (
          <div className="border border-hairline rounded-[2px] bg-surface-2 mt-2 divide-y divide-hairline">
            {searchResults.map((res, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(res)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-surface text-ink transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="truncate">{res.name}</span>
                <span className="text-[10px] text-text-secondary shrink-0 font-data">
                  {res.lat.toFixed(2)}°, {res.lon.toFixed(2)}°
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Interactive Map & Bounding Box Controls ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map View */}
        <div className="lg:col-span-7 border border-hairline rounded-[2px] overflow-hidden bg-surface-2 relative flex flex-col min-h-[360px] h-[400px]">
          <div className="absolute top-2 left-2 z-[400] bg-surface/90 backdrop-blur-sm border border-hairline rounded-[2px] px-2 py-1 text-[11px] text-text-secondary font-sans pointer-events-none shadow-sm">
            💡 Click anywhere on map to reposition AOI center
          </div>

          <MapContainer
            center={[midLat, midLon]}
            zoom={10}
            scrollWheelZoom={false}
            style={{ width: '100%', height: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Rectangle
              bounds={[
                [bbox.south, bbox.west],
                [bbox.north, bbox.east],
              ]}
              pathOptions={{
                color: validation.valid ? '#0f766e' : '#b45309',
                weight: 2,
                fillColor: validation.valid ? '#0f766e' : '#b45309',
                fillOpacity: 0.18,
              }}
            />
            <MapController bbox={bbox} recenterTrigger={recenterCount} />
            <MapClickHandler onCenterChange={handleMapCenterClick} />
          </MapContainer>

          <div className="p-2 border-t border-hairline bg-surface flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-text-secondary">
              Center: <span className="font-data font-medium text-ink">{midLat.toFixed(4)}°N, {midLon.toFixed(4)}°E</span>
            </span>
            <button
              type="button"
              onClick={() => setRecenterCount((c) => c + 1)}
              className="text-accent hover:underline text-xs cursor-pointer"
            >
              Fit map to selection
            </button>
          </div>
        </div>

        {/* Numeric & Nudge Controls */}
        <div className="lg:col-span-5 border border-hairline rounded-[2px] bg-surface p-4 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 font-sans">
              Geographic Coordinates & Nudge Controls
            </h4>

            {/* 4 Coordinate Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="coord-north" className="text-text-secondary font-medium block mb-1">
                  North (°N)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="coord-north"
                    type="number"
                    step="0.005"
                    value={bbox.north}
                    onChange={(e) =>
                      setBbox((b) =>
                        normalizeBbox({ ...b, north: parseFloat(e.target.value) || b.north })
                      )
                    }
                    className="w-full bg-surface-2 border border-hairline rounded-[2px] px-2 py-1 font-data text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => handleNudgeCoordinate('north', 0.01)}
                    className="px-1.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-[11px]"
                    title="Nudge North +0.01°"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgeCoordinate('north', -0.01)}
                    className="px-1.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-[11px]"
                    title="Nudge North -0.01°"
                  >
                    -
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="coord-south" className="text-text-secondary font-medium block mb-1">
                  South (°N)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="coord-south"
                    type="number"
                    step="0.005"
                    value={bbox.south}
                    onChange={(e) =>
                      setBbox((b) =>
                        normalizeBbox({ ...b, south: parseFloat(e.target.value) || b.south })
                      )
                    }
                    className="w-full bg-surface-2 border border-hairline rounded-[2px] px-2 py-1 font-data text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => handleNudgeCoordinate('south', 0.01)}
                    className="px-1.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-[11px]"
                    title="Nudge South +0.01°"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgeCoordinate('south', -0.01)}
                    className="px-1.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-[11px]"
                    title="Nudge South -0.01°"
                  >
                    -
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="coord-west" className="text-text-secondary font-medium block mb-1">
                  West (°E)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="coord-west"
                    type="number"
                    step="0.005"
                    value={bbox.west}
                    onChange={(e) =>
                      setBbox((b) =>
                        normalizeBbox({ ...b, west: parseFloat(e.target.value) || b.west })
                      )
                    }
                    className="w-full bg-surface-2 border border-hairline rounded-[2px] px-2 py-1 font-data text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => handleNudgeCoordinate('west', 0.01)}
                    className="px-1.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-[11px]"
                    title="Nudge West +0.01°"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgeCoordinate('west', -0.01)}
                    className="px-1.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-[11px]"
                    title="Nudge West -0.01°"
                  >
                    -
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="coord-east" className="text-text-secondary font-medium block mb-1">
                  East (°E)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="coord-east"
                    type="number"
                    step="0.005"
                    value={bbox.east}
                    onChange={(e) =>
                      setBbox((b) =>
                        normalizeBbox({ ...b, east: parseFloat(e.target.value) || b.east })
                      )
                    }
                    className="w-full bg-surface-2 border border-hairline rounded-[2px] px-2 py-1 font-data text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => handleNudgeCoordinate('east', 0.01)}
                    className="px-1.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-[11px]"
                    title="Nudge East +0.01°"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgeCoordinate('east', -0.01)}
                    className="px-1.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-[11px]"
                    title="Nudge East -0.01°"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Shift / Resize Buttons */}
            <div className="pt-3 border-t border-hairline mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-text-secondary text-[11px]">Shift 10%:</span>
                <button
                  type="button"
                  onClick={() => handleShiftBox('N')}
                  className="px-2 py-0.5 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface"
                >
                  ↑ N
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftBox('S')}
                  className="px-2 py-0.5 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface"
                >
                  ↓ S
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftBox('W')}
                  className="px-2 py-0.5 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface"
                >
                  ← W
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftBox('E')}
                  className="px-2 py-0.5 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface"
                >
                  → E
                </button>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-text-secondary text-[11px]">Scale:</span>
                <button
                  type="button"
                  onClick={() => handleResizeBox(1.1)}
                  className="px-2 py-0.5 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface"
                  title="Expand box by 10%"
                >
                  +10%
                </button>
                <button
                  type="button"
                  onClick={() => handleResizeBox(0.9)}
                  className="px-2 py-0.5 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface"
                  title="Shrink box by 10%"
                >
                  -10%
                </button>
              </div>
            </div>
          </div>

          {/* Area Dimensions & Export Scale Card */}
          <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-2 text-xs font-data">
            <div className="flex items-center justify-between border-b border-hairline pb-1.5">
              <span className="text-text-secondary font-sans">Geodesic Dimensions:</span>
              <span className="font-medium text-ink">
                {dimensions.widthKm} km × {dimensions.heightKm} km ({dimensions.areaKm2} km²)
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-hairline pb-1.5">
              <span className="text-text-secondary font-sans">Optimal GEE Scale:</span>
              <span className="font-medium text-teal">
                {scaleInfo.scale}m resolution ({scaleInfo.pixelsX} × {scaleInfo.pixelsY} px)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary font-sans">Estimated Raw GeoTIFF:</span>
              <span className="text-text-secondary">
                ~{scaleInfo.uncompressedMb} MB uncompressed (well under 60 MB limit)
              </span>
            </div>

            {/* Validation Banner */}
            {!validation.valid ? (
              <div className="pt-2 flex items-start gap-1.5 text-rust font-sans text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validation.reason}</span>
              </div>
            ) : (
              <div className="pt-1 flex items-center gap-1.5 text-teal font-sans text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Area meets all 2–30 km side and 900 km² boundary rules</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Date Windows & Acquisition Finder ── */}
      <div className="border border-hairline rounded-[2px] bg-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-sans flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            Acquisition Date Windows
          </h4>

          <button
            type="button"
            onClick={() => setShowEventHelper((v) => !v)}
            className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            {showEventHelper ? (
              <>
                Hide event helper <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Suggest windows around event date <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>

        {/* Collapsible Event Date Suggestion Helper */}
        {showEventHelper && (
          <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-2 text-xs">
            <p className="text-text-secondary font-sans">
              Enter an event date (e.g. peak flood or storm landfall) to automatically configure 12-day pre-event baseline and 12-day post-event comparison windows:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={eventDateInput}
                onChange={(e) => setEventDateInput(e.target.value)}
                className="bg-surface border border-hairline rounded-[2px] px-2 py-1 text-xs text-ink font-data"
              />
              <button
                type="button"
                onClick={handleApplyEventSuggestion}
                className="px-3 py-1 bg-accent text-text-on-accent font-semibold rounded-[2px] hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Apply Suggestion
              </button>
            </div>
          </div>
        )}

        {/* Date Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Baseline Window (A) */}
          <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-2">
            <span className="font-semibold text-ink font-sans block">
              Baseline Window (Image A — Pre-Event)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="date-window-a-start" className="text-text-secondary block mb-1">
                  Start Date
                </label>
                <input
                  id="date-window-a-start"
                  type="date"
                  value={dateWindowA.start}
                  onChange={(e) =>
                    setDateWindowA((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="w-full bg-surface border border-hairline rounded-[2px] px-2 py-1 font-data text-ink text-xs"
                />
              </div>
              <div>
                <label htmlFor="date-window-a-end" className="text-text-secondary block mb-1">
                  End Date
                </label>
                <input
                  id="date-window-a-end"
                  type="date"
                  value={dateWindowA.end}
                  onChange={(e) =>
                    setDateWindowA((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="w-full bg-surface border border-hairline rounded-[2px] px-2 py-1 font-data text-ink text-xs"
                />
              </div>
            </div>
          </div>

          {/* Comparison Window (B) */}
          <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-2">
            <span className="font-semibold text-ink font-sans block">
              Comparison Window (Image B — Post-Event / Inundation)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="date-window-b-start" className="text-text-secondary block mb-1">
                  Start Date
                </label>
                <input
                  id="date-window-b-start"
                  type="date"
                  value={dateWindowB.start}
                  onChange={(e) =>
                    setDateWindowB((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="w-full bg-surface border border-hairline rounded-[2px] px-2 py-1 font-data text-ink text-xs"
                />
              </div>
              <div>
                <label htmlFor="date-window-b-end" className="text-text-secondary block mb-1">
                  End Date
                </label>
                <input
                  id="date-window-b-end"
                  type="date"
                  value={dateWindowB.end}
                  onChange={(e) =>
                    setDateWindowB((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="w-full bg-surface border border-hairline rounded-[2px] px-2 py-1 font-data text-ink text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Date Validation Alert */}
        {!dateValidation.valid && (
          <div className="p-2 border border-rust text-rust rounded-[2px] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{dateValidation.reason}</span>
          </div>
        )}

        {/* Seasonal Warning Callout */}
        <div className="p-3 border border-hairline rounded-[2px] bg-surface-2 flex items-start gap-2 text-xs text-text-secondary">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <span>{SEASONAL_WARNING_TEXT}</span>
        </div>

        {/* Satellite Selection & ASF Query Action */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary font-medium">Dataset:</label>
            <div className="inline-flex rounded-[2px] border border-hairline bg-surface-2 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAsfMode('s1')}
                className={`px-3 py-1 rounded-[2px] font-medium transition-colors cursor-pointer ${
                  asfMode === 's1'
                    ? 'bg-accent text-text-on-accent font-semibold'
                    : 'text-text-secondary hover:text-ink'
                }`}
              >
                Sentinel-1 C-Band
              </button>
              <button
                type="button"
                onClick={() => setAsfMode('nisar')}
                className={`px-3 py-1 rounded-[2px] font-medium transition-colors cursor-pointer ${
                  asfMode === 'nisar'
                    ? 'bg-accent text-text-on-accent font-semibold'
                    : 'text-text-secondary hover:text-ink'
                }`}
              >
                NISAR L-Band
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={asfLoading || !validation.valid || !dateValidation.valid}
            onClick={handleFindAcquisitions}
            className="px-4 py-2 text-xs font-semibold bg-accent text-text-on-accent rounded-[2px] hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2"
          >
            {asfLoading ? 'Searching ASF Archives...' : `Find ${asfMode === 's1' ? 'Sentinel-1' : 'NISAR'} Passes via ASF`}
          </button>
        </div>

        {/* Offline / Error Notifications */}
        {asfOfflineNotice && (
          <div className="p-3 border border-hairline bg-surface-2 rounded-[2px] text-xs text-text-secondary flex items-start gap-2">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ink">Offline Mode / Remote API Note</p>
              <p className="mt-0.5">{asfOfflineNotice}</p>
            </div>
          </div>
        )}

        {asfError && (
          <div className="p-3 border border-rust text-rust rounded-[2px] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{asfError}</span>
          </div>
        )}

        {/* Sentinel-1 Pass Groups Results Table */}
        {asfMode === 's1' && asfGroups.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink">
                Found {asfTotalCount} Sentinel-1 acquisition(s) across {asfGroups.length} distinct orbit track(s):
              </span>
              <span className="text-[11px] text-text-secondary">
                Select an orbit track below to set GEE export filter
              </span>
            </div>

            <div className="border border-hairline rounded-[2px] overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-hairline text-text-secondary">
                    <th className="py-2 px-3 w-8">Select</th>
                    <th className="py-2 px-3">Flight Direction</th>
                    <th className="py-2 px-3 font-data">Relative Orbit Track</th>
                    <th className="py-2 px-3 font-data">Before Window</th>
                    <th className="py-2 px-3 font-data">After Window</th>
                    <th className="py-2 px-3">Usability Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline bg-surface font-sans">
                  {asfGroups.map((grp) => {
                    const isSelected =
                      selectedTrackPass?.pass === grp.flightDirection &&
                      selectedTrackPass?.orbit === grp.relativeOrbit;

                    const handleSelectGroup = () => {
                      if (grp.flightDirection === 'ASCENDING' || grp.flightDirection === 'DESCENDING') {
                        setSelectedTrackPass({
                          pass: grp.flightDirection,
                          orbit: grp.relativeOrbit,
                        });
                      }
                    };

                    return (
                      <tr
                        key={grp.id}
                        onClick={handleSelectGroup}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="radio"
                            name="selected-track"
                            checked={isSelected}
                            onChange={handleSelectGroup}
                            className="accent-accent cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-medium">
                          {grp.flightDirection}
                        </td>
                        <td className="py-2 px-3 font-data font-semibold">
                          Track {grp.relativeOrbit}
                        </td>
                        <td className="py-2 px-3 font-data text-text-secondary">
                          {grp.beforeCount} scene(s)
                        </td>
                        <td className="py-2 px-3 font-data text-text-secondary">
                          {grp.afterCount} scene(s)
                        </td>
                        <td className="py-2 px-3">
                          {grp.usable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-teal/15 text-teal text-[11px] font-semibold">
                              <Check className="w-3 h-3" /> Ready: both windows
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-surface-2 border border-hairline text-text-secondary text-[11px]">
                              Incomplete (missing window)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-text-secondary">
                Active Selection: {selectedTrackPass ? `${selectedTrackPass.pass} Track ${selectedTrackPass.orbit}` : 'None (Manual filter)'}
              </span>
              {selectedTrackPass && (
                <button
                  type="button"
                  onClick={() => setSelectedTrackPass(null)}
                  className="text-text-secondary hover:text-ink text-[11px] underline cursor-pointer"
                >
                  Clear orbit constraint
                </button>
              )}
            </div>
          </div>
        )}

        {/* NISAR Granules Results Table */}
        {asfMode === 'nisar' && asfNisarGranules.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink">
                Found {asfNisarGranules.length} NISAR acquisition(s):
              </span>
              <a
                href={`https://search.asf.alaska.edu/#/?dataset=NISAR&polygon=${bbox.west},${bbox.south},${bbox.east},${bbox.north}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline text-xs flex items-center gap-1"
              >
                Explore on ASF Vertex <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="border border-hairline rounded-[2px] overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse font-data">
                <thead>
                  <tr className="bg-surface-2 border-b border-hairline text-text-secondary font-sans">
                    <th className="py-1.5 px-3">Scene Name</th>
                    <th className="py-1.5 px-3">Start Time</th>
                    <th className="py-1.5 px-3">Direction</th>
                    <th className="py-1.5 px-3">Track</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline bg-surface">
                  {asfNisarGranules.map((g, i) => (
                    <tr key={i} className="hover:bg-surface-2/60">
                      <td className="py-1.5 px-3 truncate max-w-xs">{g.sceneName || 'NISAR Granule'}</td>
                      <td className="py-1.5 px-3 text-text-secondary">{g.startTime?.slice(0, 10) || '—'}</td>
                      <td className="py-1.5 px-3 font-sans">{g.flightDirection || '—'}</td>
                      <td className="py-1.5 px-3">{g.pathNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Google Earth Engine Export Script Generator ── */}
      <div className="border border-hairline rounded-[2px] bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-sans">
              Google Earth Engine (GEE) Export Script
            </h4>
            <p className="text-xs text-text-secondary font-sans mt-0.5">
              Exports co-registered Sentinel-1 GRD IW VV GeoTIFFs to Google Drive using single-track look geometry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyScript}
              className="px-3 py-1.5 text-xs font-semibold border border-hairline bg-surface-2 hover:border-accent hover:text-accent rounded-[2px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {scriptCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal" />
                  <span className="text-teal">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </>
              )}
            </button>

            <a
              href="https://code.earthengine.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold bg-accent text-text-on-accent rounded-[2px] hover:bg-accent-hover transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Open Earth Engine Code Editor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Script Code View */}
        <div className="relative">
          <textarea
            readOnly
            value={geeScript}
            rows={14}
            className="w-full bg-[#111827] text-[#e5e7eb] font-mono text-[11px] p-3 rounded-[2px] border border-hairline focus:outline-none resize-y leading-relaxed select-all"
          />
        </div>

        {/* Instructions */}
        <div className="p-3 border border-hairline rounded-[2px] bg-surface-2 text-xs space-y-1 text-text-secondary font-sans">
          <p className="font-semibold text-ink">How to run this export:</p>
          <ol className="list-decimal list-inside space-y-0.5 pl-1">
            <li>Click <strong>Copy Script</strong> above and open the <a href="https://code.earthengine.google.com/" target="_blank" rel="noopener noreferrer" className="text-accent underline">Earth Engine Code Editor</a>.</li>
            <li>Paste into the editor and click <strong>Run</strong> at the top.</li>
            <li>In the <strong>Tasks</strong> tab on the right, click <strong>Run</strong> next to <code>image_a</code> and <code>image_b</code>.</li>
            <li>When export completes, download both files from your Google Drive folder and drop them into the upload boxes below.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
