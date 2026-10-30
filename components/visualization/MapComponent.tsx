'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, ImageOverlay, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Plus, Minus } from 'lucide-react';

// Ensure all default marker assets and layer controls resolve locally, not from unpkg or any CDN
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
  imagePath: '/leaflet/images/',
});

// Guard Leaflet DomUtil methods against undefined elements during unmount / fast switching
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const originalGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: HTMLElement) {
    if (!el) {
      return new L.Point(0, 0);
    }
    try {
      return originalGetPosition ? originalGetPosition.call(L.DomUtil, el) : (el as unknown as { _leaflet_pos?: L.Point })._leaflet_pos || new L.Point(0, 0);
    } catch {
      return new L.Point(0, 0);
    }
  };

  const originalSetPosition = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el: HTMLElement, point: L.Point) {
    if (!el) return;
    try {
      if (originalSetPosition) {
        originalSetPosition.call(L.DomUtil, el, point);
      } else {
        (el as unknown as { _leaflet_pos?: L.Point })._leaflet_pos = point;
      }
    } catch {
      // Element destroyed during unmount
    }
  };
}

export type BasemapMode = 'radar' | 'street';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapComponentProps {
  bounds: MapBounds;
  changeMapImage: string;
  beforeImage?: string;
  aoiId?: string;
  opacity?: number;
  basemapMode?: BasemapMode;
  onBasemapModeChange?: (mode: BasemapMode) => void;
  showOfflineNotice?: boolean;
  onAutoSwitchOffline?: () => void;
  scrollZoom?: boolean;
}

// Clean up running animations on unmount
function MapUnmountHandler() {
  const map = useMap();
  useEffect(() => {
    return () => {
      try {
        if (map) {
          map.stop();
        }
      } catch {
        // Ignore during unmount
      }
    };
  }, [map]);
  return null;
}

// Automatically fit map viewport to the provided geospatial bounds (unmount-safe, non-animated for case switches)
function MapBoundsUpdater({ leafletBounds }: { leafletBounds: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    if (
      map &&
      leafletBounds &&
      leafletBounds[0] &&
      leafletBounds[1] &&
      isFinite(leafletBounds[0][0]) &&
      isFinite(leafletBounds[1][0])
    ) {
      try {
        const container = map.getContainer();
        if (container && container.clientWidth > 0 && container.clientHeight > 0 && container.parentElement) {
          map.stop();
          map.fitBounds(leafletBounds, { padding: [16, 16], maxZoom: 14, animate: false });
        }
      } catch {
        // Map container is not yet measured or unmounting
      }
    }
    return () => {
      try {
        if (map) {
          map.stop();
        }
      } catch {
        // Ignore during unmount
      }
    };
  }, [leafletBounds, map]);
  return null;
}

// Metric scale bar in bottom-left
function MetricScaleControl() {
  const map = useMap();
  useEffect(() => {
    let scaleControl: L.Control.Scale | null = null;
    try {
      const container = map.getContainer();
      if (container && container.parentElement) {
        scaleControl = L.control.scale({
          metric: true,
          imperial: false,
          position: 'bottomleft',
        });
        scaleControl.addTo(map);
      }
    } catch {
      // Container not ready or unmounting
    }
    return () => {
      if (scaleControl) {
        try {
          scaleControl.remove();
        } catch {
          // Ignore during unmount
        }
      }
    };
  }, [map]);
  return null;
}

// Dedicated Zoom Control with Plus/Minus buttons in top-left
function CustomZoomControl() {
  const map = useMap();
  const [zoom, setZoom] = useState(() => {
    try {
      return map.getZoom();
    } catch {
      return 11;
    }
  });
  const [minZoom, setMinZoom] = useState(() => {
    try {
      return map.getMinZoom();
    } catch {
      return 0;
    }
  });
  const [maxZoom, setMaxZoom] = useState(() => {
    try {
      return map.getMaxZoom();
    } catch {
      return 18;
    }
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateZoom = () => {
      try {
        const container = map.getContainer();
        if (container && container.parentElement) {
          setZoom(map.getZoom());
          setMinZoom(map.getMinZoom());
          setMaxZoom(map.getMaxZoom());
        }
      } catch {
        // Map unmounted or destroyed
      }
    };
    map.on('zoomend', updateZoom);
    map.on('viewreset', updateZoom);
    return () => {
      try {
        map.off('zoomend', updateZoom);
        map.off('viewreset', updateZoom);
      } catch {
        // Ignore
      }
    };
  }, [map]);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const isAtMin = zoom <= minZoom;
  const isAtMax = zoom >= maxZoom;

  return (
    <div
      ref={containerRef}
      className="absolute top-2 left-2 z-400 flex flex-col border border-hairline rounded-[2px] bg-surface-2 overflow-hidden select-none"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isAtMax) {
            try {
              map.zoomIn(1, { animate: false });
            } catch {
              // Ignore
            }
          }
        }}
        disabled={isAtMax}
        aria-label="Zoom in"
        className="w-7 h-7 flex items-center justify-center bg-surface-2 text-ink hover:bg-hairline disabled:text-text-secondary disabled:hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer border-b border-hairline focus:outline-none"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isAtMin) {
            try {
              map.zoomOut(1, { animate: false });
            } catch {
              // Ignore
            }
          }
        }}
        disabled={isAtMin}
        aria-label="Zoom out"
        className="w-7 h-7 flex items-center justify-center bg-surface-2 text-ink hover:bg-hairline disabled:text-text-secondary disabled:hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none"
      >
        <Minus className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function formatLat(lat: number): string {
  const dir = lat >= 0 ? 'N' : 'S';
  const abs = Math.abs(lat);
  const decimals = abs % 1 === 0 ? 1 : 2;
  return `${abs.toFixed(decimals)}°${dir}`;
}

function formatLon(lon: number): string {
  const dir = lon >= 0 ? 'E' : 'W';
  const abs = Math.abs(lon);
  const decimals = abs % 1 === 0 ? 1 : 2;
  return `${abs.toFixed(decimals)}°${dir}`;
}

const CANDIDATE_STEPS = [0.005, 0.01, 0.02, 0.025, 0.05, 0.1, 0.2, 0.25, 0.5, 1.0, 2.0];

// Latitude / longitude graticule drawn with plain Leaflet polylines and IBM Plex Mono coordinate labels
function Graticule({ bounds }: { bounds: MapBounds }) {
  const map = useMap();
  const [, setTick] = useState(0);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const container = map.getContainer();
        if (container && container.parentElement) {
          setTick((t) => t + 1);
        }
      } catch {
        // Map unmounting
      }
    };
    map.on('moveend', handleUpdate);
    map.on('zoomend', handleUpdate);
    return () => {
      try {
        map.off('moveend', handleUpdate);
        map.off('zoomend', handleUpdate);
      } catch {
        // Ignore during unmount
      }
    };
  }, [map]);

  const south = Math.min(bounds.south, bounds.north);
  const north = Math.max(bounds.south, bounds.north);
  const west = Math.min(bounds.west, bounds.east);
  const east = Math.max(bounds.west, bounds.east);

  const latSpan = north - south;
  const lonSpan = east - west;
  const minSpan = Math.min(latSpan, lonSpan);

  // Compute step that yields ~4 to 7 divisions
  const targetStep = minSpan / 5;
  let step: number = 0.05;
  let minDiff = Infinity;
  for (const s of CANDIDATE_STEPS) {
    const diff = Math.abs(s - targetStep);
    if (diff < minDiff) {
      minDiff = diff;
      step = s;
    }
  }

  // Calculate latitude lines
  const lats: number[] = [];
  const startLat = Math.ceil(south / step) * step;
  for (let lat = startLat; lat < north - 1e-5; lat += step) {
    const rounded = Math.round(lat * 10000) / 10000;
    if (rounded > south + 1e-5 && rounded < north - 1e-5) {
      lats.push(rounded);
    }
  }

  // Calculate longitude lines
  const lons: number[] = [];
  const startLon = Math.ceil(west / step) * step;
  for (let lon = startLon; lon < east - 1e-5; lon += step) {
    const rounded = Math.round(lon * 10000) / 10000;
    if (rounded > west + 1e-5 && rounded < east - 1e-5) {
      lons.push(rounded);
    }
  }

  // Viewport bounds for keeping labels visible at edge when zoomed
  let labelWest = west;
  let labelSouth = south;
  try {
    const mapBounds = map.getBounds();
    const mapWest = mapBounds.getWest();
    const mapSouth = mapBounds.getSouth();
    if (mapWest > west && mapWest < east) labelWest = mapWest;
    if (mapSouth > south && mapSouth < north) labelSouth = mapSouth;
  } catch {
    // Fallback to outer bounds
  }

  const frameColor = isDark ? '#283648' : '#A9A69F';
  const graticuleLineColor = isDark ? '#1F2A38' : '#C7C4BC';
  const labelBg = isDark ? '#141B26' : '#F1F0EC';
  const labelText = isDark ? '#E8EDF2' : '#4A4E52';
  const labelBorder = isDark ? '#1F2A38' : '#C7C4BC';

  return (
    <>
      {/* Outer bounding frame of the AOI */}
      <Polyline
        positions={[
          [north, west],
          [north, east],
          [south, east],
          [south, west],
          [north, west],
        ]}
        pathOptions={{
          color: frameColor,
          weight: 1,
          opacity: 0.9,
        }}
        interactive={false}
      />

      {/* Latitude parallels */}
      {lats.map((lat) => (
        <React.Fragment key={`lat-${lat}`}>
          <Polyline
            positions={[
              [lat, west],
              [lat, east],
            ]}
            pathOptions={{
              color: graticuleLineColor,
              weight: 1,
              dashArray: '2, 4',
              opacity: 0.9,
            }}
            interactive={false}
          />
          <Marker
            position={[lat, labelWest]}
            interactive={false}
            icon={L.divIcon({
              className: 'graticule-lat-label',
              html: `<span style="display:inline-block; font-family: var(--font-data, 'IBM Plex Mono', monospace); font-size: 10px; line-height: 1; color: ${labelText}; background: ${labelBg}; padding: 1px 3px; border: 1px solid ${labelBorder}; border-radius: 1px; white-space: nowrap; pointer-events: none;">${formatLat(lat)}</span>`,
              iconAnchor: [-4, 7],
              iconSize: [0, 0],
            })}
          />
        </React.Fragment>
      ))}

      {/* Longitude meridians */}
      {lons.map((lon) => (
        <React.Fragment key={`lon-${lon}`}>
          <Polyline
            positions={[
              [south, lon],
              [north, lon],
            ]}
            pathOptions={{
              color: graticuleLineColor,
              weight: 1,
              dashArray: '2, 4',
              opacity: 0.9,
            }}
            interactive={false}
          />
          <Marker
            position={[labelSouth, lon]}
            interactive={false}
            icon={L.divIcon({
              className: 'graticule-lon-label',
              html: `<span style="display:inline-block; font-family: var(--font-data, 'IBM Plex Mono', monospace); font-size: 10px; line-height: 1; color: ${labelText}; background: ${labelBg}; padding: 1px 3px; border: 1px solid ${labelBorder}; border-radius: 1px; white-space: nowrap; pointer-events: none;">${formatLon(lon)}</span>`,
              iconAnchor: [24, 18],
              iconSize: [0, 0],
            })}
          />
        </React.Fragment>
      ))}
    </>
  );
}

export default function MapComponent({
  bounds,
  changeMapImage,
  beforeImage,
  aoiId,
  opacity = 0.85,
  basemapMode: propBasemapMode,
  onBasemapModeChange,
  showOfflineNotice: propShowOfflineNotice,
  onAutoSwitchOffline,
  scrollZoom = true,
}: MapComponentProps) {
  // Ensure strict ordering: south <= north, west <= east
  const south = Math.min(bounds.south, bounds.north);
  const north = Math.max(bounds.south, bounds.north);
  const west = Math.min(bounds.west, bounds.east);
  const east = Math.max(bounds.west, bounds.east);

  const leafletBounds: [[number, number], [number, number]] = [
    [south, west],
    [north, east],
  ];

  const center: [number, number] = [(south + north) / 2, (west + east) / 2];

  // Default to radar mode if offline
  const isClientOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  const [internalMode, setInternalMode] = useState<BasemapMode>(() => (isClientOffline ? 'radar' : 'street'));
  const basemapMode = propBasemapMode !== undefined ? propBasemapMode : internalMode;

  const [internalOfflineNotice, setInternalOfflineNotice] = useState(isClientOffline);
  const showOfflineNotice = propShowOfflineNotice !== undefined ? propShowOfflineNotice : internalOfflineNotice;

  const tileErrorsRef = useRef<number[]>([]);

  const handleAutoSwitchToRadar = useCallback(() => {
    if (propBasemapMode === undefined) {
      setInternalMode('radar');
    }
    setInternalOfflineNotice(true);
    onBasemapModeChange?.('radar');
    onAutoSwitchOffline?.();
  }, [propBasemapMode, onBasemapModeChange, onAutoSwitchOffline]);

  // Handle tileerror events: auto-switch to Radar if 3+ errors occur within 5 seconds
  const handleTileError = useCallback(() => {
    const now = Date.now();
    const recent = tileErrorsRef.current.filter((t) => now - t <= 5000);
    recent.push(now);
    tileErrorsRef.current = recent;

    if (recent.length >= 3) {
      handleAutoSwitchToRadar();
    }
  }, [handleAutoSwitchToRadar]);

  // Auto-switch to Radar if offline event fires
  useEffect(() => {
    const handleOffline = () => {
      handleAutoSwitchToRadar();
    };

    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleAutoSwitchToRadar]);

  const effectiveBeforeImage = beforeImage || (aoiId ? `/api/images?aoi=${aoiId}&type=before` : '');

  return (
    <div className="relative w-full h-full border border-hairline z-0 bg-surface overflow-hidden">
      {/* Quiet notice: "Offline: showing radar basemap" */}
      {showOfflineNotice && basemapMode === 'radar' && (
        <div
          className={`absolute top-2 ${
            scrollZoom === false ? 'left-11' : 'left-2'
          } z-400 bg-surface-2 border border-hairline px-2.5 py-1 text-xs text-text-secondary font-sans rounded-[2px] pointer-events-none select-none`}
        >
          Offline: showing radar basemap
        </div>
      )}

      <MapContainer
        center={center}
        zoom={11}
        style={{ width: '100%', height: '100%', background: 'var(--leaflet-bg, #F1F0EC)' }}
        zoomControl={false}
        scrollWheelZoom={scrollZoom}
      >
        <MapUnmountHandler />
        <MapBoundsUpdater leafletBounds={leafletBounds} />
        <MetricScaleControl />
        {scrollZoom === false && <CustomZoomControl />}

        {basemapMode === 'street' ? (
          /* Street map mode: normal OpenStreetMap tile layer with attribution, loaded only on view */
          <TileLayer
            key="osm-tiles"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            eventHandlers={{
              tileerror: () => {
                handleTileError();
              },
            }}
          />
        ) : (
          /* Radar mode: background #F1F0EC, AOI before.png ImageOverlay in tilePane, graticule with coordinate labels */
          <React.Fragment key="radar-basemap">
            {effectiveBeforeImage && (
              <ImageOverlay
                url={effectiveBeforeImage}
                bounds={leafletBounds}
                opacity={1.0}
                pane="tilePane"
              />
            )}
            <Graticule bounds={bounds} />
          </React.Fragment>
        )}

        {/* Change map classification overlay on top */}
        <ImageOverlay url={changeMapImage} bounds={leafletBounds} opacity={opacity} zIndex={10} />
      </MapContainer>
    </div>
  );
}
