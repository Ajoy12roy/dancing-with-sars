'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MapContainer,
  TileLayer,
  Rectangle,
  Marker,
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
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNetworkMode, useAccessibility } from '@/context';
import { getCaseStudyById } from '@/lib/case-studies';

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
  resizeBounds,
  HandleType,
  AsfPassGroup,
  AsfGranule,
  MIN_SIDE_KM,
  MAX_SIDE_KM,
  MAX_AREA_KM2,
  PresetAoi,
  PRESET_AOIS,
  presetForCase,
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

// Map Click Handler to reposition AOI center (active when not in drawing mode)
function MapClickHandler({
  onCenterChange,
  enabled,
}: {
  onCenterChange: (lat: number, lon: number) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onCenterChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

const handleIconMap = new Map<string, L.DivIcon>();

function createHandleIcon(type: HandleType, isValid: boolean): L.DivIcon {
  const cursor =
    type === 'n' || type === 's'
      ? 'ns-resize'
      : type === 'w' || type === 'e'
      ? 'ew-resize'
      : type === 'nw' || type === 'se'
      ? 'nwse-resize'
      : 'nesw-resize';
  const borderColor = isValid ? 'var(--color-teal)' : 'var(--color-rust)';
  return L.divIcon({
    className: 'aoi-handle-marker',
    html: `<div data-handle="${type}" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:${cursor};touch-action:none;pointer-events:auto;">
      <div style="width:12px;height:12px;background:var(--color-surface);border:2px solid ${borderColor};border-radius:2px;box-sizing:border-box;pointer-events:none;"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function getHandleIcon(type: HandleType, isValid: boolean): L.DivIcon {
  const key = `${type}-${isValid ? 'valid' : 'invalid'}`;
  let icon = handleIconMap.get(key);
  if (!icon) {
    icon = createHandleIcon(type, isValid);
    handleIconMap.set(key, icon);
  }
  return icon;
}

interface AoiBoxControllerProps {
  bbox: BoundingBox;
  onBboxChange: (newBbox: BoundingBox) => void;
  onBboxChangeComplete: () => void;
  squareSelection: boolean;
  isDrawingMode: boolean;
  isValid: boolean;
  onClampNotice: (notice: string | null) => void;
}

function AoiBoxController({
  bbox,
  onBboxChange,
  onBboxChangeComplete,
  squareSelection,
  isDrawingMode,
  isValid,
  onClampNotice,
}: AoiBoxControllerProps) {
  const map = useMap();
  const activeDragRef = useRef<{
    handleType: HandleType;
    startPointerLatLng: L.LatLng;
    startBbox: BoundingBox;
    pointerId: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();

    const handlePointerDown = (e: PointerEvent) => {
      if (isDrawingMode) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const target = e.target as HTMLElement;
      const handleEl = target.closest('[data-handle]') as HTMLElement | null;
      const isBox = target.classList?.contains('aoi-draggable-box') || target.closest('.aoi-draggable-box');

      let handleType: HandleType | null = null;
      if (handleEl) {
        handleType = handleEl.getAttribute('data-handle') as HandleType;
      } else if (isBox) {
        handleType = 'move';
      }

      if (!handleType) return;

      e.preventDefault();
      e.stopPropagation();

      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }

      map.dragging.disable();
      map.doubleClickZoom.disable();

      const pointerLatLng = map.mouseEventToLatLng(e as unknown as MouseEvent);
      activeDragRef.current = {
        handleType,
        startPointerLatLng: pointerLatLng,
        startBbox: bbox,
        pointerId: e.pointerId,
      };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!activeDragRef.current) return;
      if (e.pointerId !== activeDragRef.current.pointerId) return;

      const { handleType, startPointerLatLng, startBbox } = activeDragRef.current;
      const currentPointerLatLng = map.mouseEventToLatLng(e as unknown as MouseEvent);

      const deltaLat = currentPointerLatLng.lat - startPointerLatLng.lat;
      const deltaLon = currentPointerLatLng.lng - startPointerLatLng.lng;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const result = resizeBounds(startBbox, handleType, deltaLat, deltaLon, squareSelection);
        onBboxChange(result.bbox);
        if (result.clamped && result.clampReason) {
          onClampNotice(result.clampReason);
        } else {
          onClampNotice(null);
        }
      });
    };

    const handlePointerEnd = (e: PointerEvent) => {
      if (!activeDragRef.current) return;
      if (e.pointerId !== activeDragRef.current.pointerId) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      activeDragRef.current = null;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }

      try {
        map.dragging.enable();
        map.doubleClickZoom.enable();
      } catch {
        // Ignored
      }

      onBboxChangeComplete();
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerEnd);
    container.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerEnd);
      container.removeEventListener('pointercancel', handlePointerEnd);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        map.dragging.enable();
        map.doubleClickZoom.enable();
      } catch {
        // Ignored
      }
    };
  }, [map, isDrawingMode, bbox, squareSelection, onBboxChange, onBboxChangeComplete, onClampNotice]);

  if (isDrawingMode) return null;

  const handles: Array<{ type: HandleType; position: [number, number] }> = [
    { type: 'nw', position: [bbox.north, bbox.west] },
    { type: 'ne', position: [bbox.north, bbox.east] },
    { type: 'sw', position: [bbox.south, bbox.west] },
    { type: 'se', position: [bbox.south, bbox.east] },
    { type: 'n', position: [bbox.north, (bbox.west + bbox.east) / 2] },
    { type: 's', position: [bbox.south, (bbox.west + bbox.east) / 2] },
    { type: 'w', position: [(bbox.south + bbox.north) / 2, bbox.west] },
    { type: 'e', position: [(bbox.south + bbox.north) / 2, bbox.east] },
  ];

  return (
    <>
      {handles.map(({ type, position }) => (
        <Marker
          key={type}
          position={position}
          icon={getHandleIcon(type, isValid)}
        />
      ))}
    </>
  );
}

interface MapDrawControllerProps {
  isDrawingMode: boolean;
  isDragging: boolean;
  squareSelection: boolean;
  onDrawStart: () => void;
  onDrawUpdate: (bbox: BoundingBox) => void;
  onDrawEnd: () => void;
  onCancel: () => void;
  onShowWheelHint: () => void;
}

function MapDrawController({
  isDrawingMode,
  isDragging,
  squareSelection,
  onDrawStart,
  onDrawUpdate,
  onDrawEnd,
  onCancel,
  onShowWheelHint,
}: MapDrawControllerProps) {
  const map = useMap();
  const startLatLngRef = useRef<L.LatLng | null>(null);
  const rafRef = useRef<number | null>(null);

  // Wheel event handling (Ctrl + scroll zoom, or temporary hint)
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          map.zoomIn(1);
        } else if (e.deltaY > 0) {
          map.zoomOut(1);
        }
      } else {
        onShowWheelHint();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [map, onShowWheelHint]);

  // Pointer event handling for rectangle drawing
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();

    const handlePointerDown = (e: PointerEvent) => {
      if (!isDrawingMode) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // Fallback if pointer capture is unsupported
      }

      map.dragging.disable();
      map.doubleClickZoom.disable();

      const latlng = map.mouseEventToLatLng(e as unknown as MouseEvent);
      startLatLngRef.current = latlng;
      onDrawStart();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingMode || !isDragging || !startLatLngRef.current) return;

      const currentLatLng = map.mouseEventToLatLng(e as unknown as MouseEvent);
      const start = startLatLngRef.current;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        let newBbox: BoundingBox;
        if (squareSelection) {
          const lat1 = start.lat;
          const lat2 = currentLatLng.lat;
          const lon1 = start.lng;
          const lon2 = currentLatLng.lng;
          const midLat = (lat1 + lat2) / 2;
          const rad = Math.PI / 180;
          const deltaLatKm = Math.abs(lat2 - lat1) * 111.195;
          const deltaLonKm = Math.abs(lon2 - lon1) * 111.195 * Math.cos(midLat * rad);
          const sideKm = Math.min(MAX_SIDE_KM, Math.max(MIN_SIDE_KM, Math.max(deltaLatKm, deltaLonKm)));

          const signLat = lat2 >= lat1 ? 1 : -1;
          const signLon = lon2 >= lon1 ? 1 : -1;
          const degLat = sideKm / 111.195;
          const degLon = sideKm / (111.195 * (Math.cos(midLat * rad) || 1));

          newBbox = {
            south: Math.min(lat1, lat1 + signLat * degLat),
            north: Math.max(lat1, lat1 + signLat * degLat),
            west: Math.min(lon1, lon1 + signLon * degLon),
            east: Math.max(lon1, lon1 + signLon * degLon),
          };
        } else {
          newBbox = {
            south: Math.min(start.lat, currentLatLng.lat),
            north: Math.max(start.lat, currentLatLng.lat),
            west: Math.min(start.lng, currentLatLng.lng),
            east: Math.max(start.lng, currentLatLng.lng),
          };
        }
        onDrawUpdate(newBbox);
      });
    };

    const finishDraw = (e?: PointerEvent) => {
      if (e) {
        try {
          if (container.hasPointerCapture(e.pointerId)) {
            container.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignored
        }
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startLatLngRef.current = null;
      try {
        map.dragging.enable();
        map.doubleClickZoom.enable();
      } catch {
        // Ignored
      }
      onDrawEnd();
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDrawingMode || !isDragging) return;
      finishDraw(e);
    };

    const handlePointerCancel = (e: PointerEvent) => {
      if (!isDrawingMode || !isDragging) return;
      finishDraw(e);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawingMode) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        startLatLngRef.current = null;
        try {
          map.dragging.enable();
          map.doubleClickZoom.enable();
        } catch {
          // Ignored
        }
        onCancel();
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('keydown', handleKeyDown);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        map.dragging.enable();
        map.doubleClickZoom.enable();
      } catch {
        // Ignored
      }
    };
  }, [map, isDrawingMode, isDragging, squareSelection, onDrawStart, onDrawUpdate, onDrawEnd, onCancel]);

  return null;
}

export interface AoiMapPickerProps {
  onSelectCaseStudy?: (caseId: string) => void;
  selectedCaseId?: string;
  onPresetChange?: (presetId: string) => void;
}

export default function AoiMapPicker({
  onSelectCaseStudy,
  selectedCaseId,
  onPresetChange,
}: AoiMapPickerProps = {}) {
  const { effectiveOffline } = useNetworkMode();
  const { announce } = useAccessibility();

  // ── AOI Bounding Box State ──
  const [bbox, setBbox] = useState<BoundingBox>(() => {
    if (selectedCaseId) {
      const initialPreset = presetForCase(selectedCaseId);
      if (initialPreset) return initialPreset.bbox;
    }
    return {
      west: 91.8,
      south: 24.85,
      east: 91.95,
      north: 24.98,
    };
  });

  // Notice when selected case has no preset
  const [noPresetNotice, setNoPresetNotice] = useState<string | null>(null);

  // Recenter counter to force MapController to re-fit bounds
  const [recenterCount, setRecenterCount] = useState<number>(1);

  // ── Drawing and Pointer State ──
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [squareSelection, setSquareSelection] = useState<boolean>(false);
  const [showWheelHint, setShowWheelHint] = useState<boolean>(false);
  const [clampNotice, setClampNotice] = useState<string | null>(null);
  const wheelHintTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClampNotice = useCallback((notice: string | null) => {
    setClampNotice(notice);
    if (notice) {
      announce(notice);
    }
  }, [announce]);

  const handleBboxChangeComplete = useCallback(() => {
    announce('Area selection updated.');
    setTimeout(() => {
      setClampNotice(null);
    }, 3000);
  }, [announce]);

  useEffect(() => {
    return () => {
      if (wheelHintTimerRef.current) {
        clearTimeout(wheelHintTimerRef.current);
      }
    };
  }, []);

  const handleShowWheelHint = useCallback(() => {
    setShowWheelHint(true);
    if (wheelHintTimerRef.current) {
      clearTimeout(wheelHintTimerRef.current);
    }
    wheelHintTimerRef.current = setTimeout(() => {
      setShowWheelHint(false);
    }, 1500);
  }, []);

  const handleDrawStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrawUpdate = useCallback((newBbox: BoundingBox) => {
    setBbox(normalizeBbox(newBbox));
  }, []);

  const handleDrawEnd = useCallback(() => {
    setIsDragging(false);
    setIsDrawingMode(false);
    announce('Area selection updated.');
  }, [announce]);

  const handleCancelDraw = useCallback(() => {
    setIsDragging(false);
    setIsDrawingMode(false);
  }, []);

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

  // ── Dimension Change Handlers ──
  const handleDimensionChange = useCallback(
    (dim: 'width' | 'height', val: number) => {
      if (isNaN(val)) return;
      const clampedVal = Math.min(MAX_SIDE_KM, Math.max(MIN_SIDE_KM, val));
      const targetWidthKm = squareSelection ? clampedVal : dim === 'width' ? clampedVal : dimensions.widthKm;
      const targetHeightKm = squareSelection ? clampedVal : dim === 'height' ? clampedVal : dimensions.heightKm;

      const midLat = (bbox.south + bbox.north) / 2;
      const midLon = (bbox.west + bbox.east) / 2;
      const rad = Math.PI / 180;

      const halfHeightDeg = targetHeightKm / 111.195 / 2;
      const cosLat = Math.cos(midLat * rad);
      const halfWidthDeg = targetWidthKm / (111.195 * (cosLat || 1)) / 2;

      setBbox(
        normalizeBbox({
          west: Number((midLon - halfWidthDeg).toFixed(5)),
          south: Number((midLat - halfHeightDeg).toFixed(5)),
          east: Number((midLon + halfWidthDeg).toFixed(5)),
          north: Number((midLat + halfHeightDeg).toFixed(5)),
        })
      );
    },
    [bbox, dimensions, squareSelection]
  );

  const handleSquareToggle = useCallback(
    (enabled: boolean) => {
      setSquareSelection(enabled);
      if (enabled) {
        const side = Math.min(
          MAX_SIDE_KM,
          Math.max(MIN_SIDE_KM, Math.max(dimensions.widthKm, dimensions.heightKm))
        );
        const midLat = (bbox.south + bbox.north) / 2;
        const midLon = (bbox.west + bbox.east) / 2;
        const rad = Math.PI / 180;

        const halfHeightDeg = side / 111.195 / 2;
        const cosLat = Math.cos(midLat * rad);
        const halfWidthDeg = side / (111.195 * (cosLat || 1)) / 2;

        setBbox(
          normalizeBbox({
            west: Number((midLon - halfWidthDeg).toFixed(5)),
            south: Number((midLat - halfHeightDeg).toFixed(5)),
            east: Number((midLon + halfWidthDeg).toFixed(5)),
            north: Number((midLat + halfHeightDeg).toFixed(5)),
          })
        );
      }
    },
    [bbox, dimensions]
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

  // ── Synchronize with selectedCaseId prop from page (adjust state during render) ──
  const [prevCaseId, setPrevCaseId] = useState(selectedCaseId);
  if (selectedCaseId && selectedCaseId !== prevCaseId) {
    setPrevCaseId(selectedCaseId);
    const preset = presetForCase(selectedCaseId);
    if (preset) {
      setNoPresetNotice(null);
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
    } else {
      setNoPresetNotice('No area preset is available for this case. Draw an area on the map.');
    }
  }

  // ── Preset Selection ──
  const handleSelectPreset = (preset: PresetAoi) => {
    setPrevCaseId(preset.id);
    setNoPresetNotice(null);
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
    const dims = computeBboxDimensions(preset.bbox);
    announce(`Loaded preset ${preset.name.split(' (')[0]}. Area: ${dims.widthKm} by ${dims.heightKm} kilometers.`);
    onPresetChange?.(preset.id);
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
    const targetDims = computeBboxDimensions(targetBbox);
    announce(`Selected location ${result.name}. Area: ${targetDims.widthKm} by ${targetDims.heightKm} kilometers.`);
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

  const baselineDays = Math.max(
    1,
    Math.round((Date.parse(dateWindowA.end) - Date.parse(dateWindowA.start)) / 86400000) + 1
  );
  const comparisonDays = Math.max(
    1,
    Math.round((Date.parse(dateWindowB.end) - Date.parse(dateWindowB.start)) / 86400000) + 1
  );

  const midLat = (bbox.south + bbox.north) / 2;
  const midLon = (bbox.west + bbox.east) / 2;

  const currentPreset =
    PRESET_AOIS.find((p) => {
      return (
        Math.abs(p.bbox.west - bbox.west) < 0.001 &&
        Math.abs(p.bbox.east - bbox.east) < 0.001 &&
        Math.abs(p.bbox.south - bbox.south) < 0.001 &&
        Math.abs(p.bbox.north - bbox.north) < 0.001
      );
    }) ||
    (selectedCaseId ? presetForCase(selectedCaseId) : undefined);

  const readyCase = currentPreset ? getCaseStudyById(currentPreset.id) : null;
  const isReady = Boolean(readyCase && readyCase.status === 'ready');

  return (
    <div className="space-y-6 text-ink">
      {/* ── Card 1: Choose an area and dates ── */}
      <section className="border border-hairline bg-surface p-5 sm:p-6 rounded-[2px] space-y-6">
        <div>
          <h2 className="text-xl font-semibold font-headline text-ink">
            1. Choose an area and dates
          </h2>
        </div>

        {/* Preset Select, "View precomputed analysis" button, and Place Search in one compact row */}
        <div className="space-y-3">
          {noPresetNotice && (
            <div className="p-3 border border-hairline bg-surface-2 rounded-[2px] text-sm text-text-secondary font-sans" role="status">
              {noPresetNotice}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            {/* Preset select and precomputed button */}
            <div className="lg:col-span-6 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <div className="flex-1">
                <label htmlFor="preset-aoi-select" className="block text-sm font-medium text-text-secondary mb-1 font-sans">
                  Preset area
                </label>
                <select
                  id="preset-aoi-select"
                  value={currentPreset?.id || ''}
                  onChange={(e) => {
                    const found = PRESET_AOIS.find((p) => p.id === e.target.value);
                    if (found) handleSelectPreset(found);
                  }}
                  className="w-full bg-surface-2 border border-hairline rounded-[2px] px-3 py-2 text-base text-ink min-h-[44px] focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="" disabled>
                    {currentPreset ? 'Select a preset...' : 'Custom area'}
                  </option>
                  {PRESET_AOIS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              {isReady && onSelectCaseStudy && readyCase && (
                <button
                  type="button"
                  onClick={() => onSelectCaseStudy(readyCase.id)}
                  className="min-h-[44px] px-3.5 py-2 text-sm font-semibold border border-teal text-teal hover:bg-teal hover:text-text-on-accent rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <span>View precomputed analysis</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Bar (Nominatim Submit-Only) */}
            <div className="lg:col-span-6">
              <form onSubmit={handleSearchSubmit} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="geocode-input" className="block text-sm font-medium text-text-secondary mb-1 font-sans">
                    Search location
                  </label>
                  <span className="text-xs text-text-secondary">
                    © OpenStreetMap
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="geocode-input"
                      type="text"
                      disabled={effectiveOffline}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        effectiveOffline
                          ? 'Search requires a network connection.'
                          : 'e.g. Sylhet, Sunamganj, Sirajganj...'
                      }
                      className="w-full bg-surface-2 border border-hairline rounded-[2px] py-2 pl-9 pr-3 text-base text-ink placeholder:text-text-secondary focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    />
                    <Search className="w-4 h-4 absolute left-3 top-3.5 text-text-secondary pointer-events-none" />
                  </div>
                  <button
                    type="submit"
                    disabled={effectiveOffline || searchLoading || searchQuery.trim().length < 2}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold bg-accent text-text-on-accent rounded-[2px] hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                  >
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {searchError && (
            <p className="text-sm text-rust font-sans">{searchError}</p>
          )}

          {searchResults.length > 0 && (
            <div className="border border-hairline rounded-[2px] bg-surface-2 divide-y divide-hairline">
              {searchResults.map((res, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface text-ink transition-colors cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className="truncate">{res.name}</span>
                  <span className="text-xs text-text-secondary shrink-0 font-data">
                    {res.lat.toFixed(2)}°, {res.lon.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Map */}
        <div className="border border-hairline rounded-[2px] overflow-hidden bg-surface-2 flex flex-col">
          <div
            className="relative flex flex-col min-h-[320px] h-[340px] sm:h-[440px]"
            style={{ touchAction: isDrawingMode ? 'none' : 'pan-y' }}
          >
            {/* Top-right draw rectangle toggle */}
            <div className="absolute top-2 right-2 z-[400]">
              <button
                type="button"
                onClick={() => {
                  setIsDrawingMode((prev) => {
                    const next = !prev;
                    if (!next) setIsDragging(false);
                    return next;
                  });
                }}
                className={`min-h-[36px] px-3 py-1.5 text-sm font-medium rounded-[2px] border transition-colors cursor-pointer ${
                  isDrawingMode
                    ? 'bg-rust text-text-on-accent border-rust'
                    : 'bg-surface border-hairline text-ink hover:border-accent hover:text-accent'
                }`}
              >
                {isDrawingMode ? 'Cancel drawing (Esc)' : 'Draw rectangle'}
              </button>
            </div>

            {/* Wheel hint toast */}
            {showWheelHint && (
              <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
                <div className="bg-surface/95 border border-hairline px-3 py-1.5 rounded-[2px] text-xs font-sans text-ink shadow-md transition-opacity duration-300">
                  Use Ctrl + scroll to zoom the map.
                </div>
              </div>
            )}

            {effectiveOffline && (
              <div className="absolute bottom-10 left-2 z-[400] bg-surface/90 border border-hairline px-2 py-1 text-xs text-text-secondary font-sans pointer-events-none">
                Street map requires a network connection.
              </div>
            )}

            <MapContainer
              center={[midLat, midLon]}
              zoom={10}
              scrollWheelZoom={false}
              touchZoom={true}
              style={{
                width: '100%',
                height: '100%',
                cursor: isDrawingMode ? 'crosshair' : 'default',
              }}
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
                  color: validation.valid ? 'var(--color-teal)' : 'var(--color-rust)',
                  weight: 2,
                  fillColor: validation.valid ? 'var(--color-teal)' : 'var(--color-rust)',
                  fillOpacity: 0.15,
                  dashArray: isDragging ? '6, 6' : undefined,
                  className: 'aoi-draggable-box',
                }}
              />
              <AoiBoxController
                bbox={bbox}
                onBboxChange={setBbox}
                onBboxChangeComplete={handleBboxChangeComplete}
                squareSelection={squareSelection}
                isDrawingMode={isDrawingMode}
                isValid={validation.valid}
                onClampNotice={handleClampNotice}
              />
              <MapController bbox={bbox} recenterTrigger={recenterCount} />
              <MapClickHandler
                onCenterChange={handleMapCenterClick}
                enabled={!isDrawingMode}
              />
              <MapDrawController
                isDrawingMode={isDrawingMode}
                isDragging={isDragging}
                squareSelection={squareSelection}
                onDrawStart={handleDrawStart}
                onDrawUpdate={handleDrawUpdate}
                onDrawEnd={handleDrawEnd}
                onCancel={handleCancelDraw}
                onShowWheelHint={handleShowWheelHint}
              />
            </MapContainer>
          </div>

          {/* Map Guidance & Live Readout below map */}
          <div className="p-3 border-t border-hairline bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-text-secondary text-sm font-sans">
                Drag a handle to resize the area, or drag inside the box to move it.
              </p>
              {clampNotice && (
                <p className="text-rust text-sm font-sans font-medium" role="status">
                  {clampNotice}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <span className="font-data text-sm text-ink bg-surface-2 px-2.5 py-1 rounded-[2px] border border-hairline">
                {dimensions.widthKm} km × {dimensions.heightKm} km ({dimensions.areaKm2} km²)
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-sm font-sans text-text-secondary select-none">
                <input
                  type="checkbox"
                  checked={squareSelection}
                  onChange={(e) => handleSquareToggle(e.target.checked)}
                  className="accent-accent cursor-pointer"
                />
                <span>Square selection</span>
              </label>
              <button
                type="button"
                onClick={() => setRecenterCount((c) => c + 1)}
                className="text-accent hover:underline text-sm cursor-pointer font-sans min-h-[36px] px-1"
              >
                Fit map
              </button>
            </div>
          </div>

          {/* Collapsed Manual Coordinate Entry (Optional) directly under map */}
          <details className="border-t border-hairline bg-surface-2 group">
            <summary
              tabIndex={0}
              className="p-3 text-sm font-semibold text-text-secondary font-sans cursor-pointer select-none hover:text-ink focus:outline-none focus:ring-1 focus:ring-accent flex items-center justify-between"
            >
              <span>Manual coordinate entry (optional)</span>
              <ChevronDown className="w-4 h-4 text-text-secondary group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-4 border-t border-hairline bg-surface space-y-4">
              {/* Dimensions */}
              <div className="p-3 border border-hairline rounded-[2px] bg-surface-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink font-sans">Dimensions</span>
                  <span className="text-xs text-text-secondary font-sans">{MIN_SIDE_KM}–{MAX_SIDE_KM} km per side</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label htmlFor="dim-width-km" className="text-text-secondary font-medium block mb-1">
                      Width (km)
                    </label>
                    <input
                      id="dim-width-km"
                      type="number"
                      min={MIN_SIDE_KM}
                      max={MAX_SIDE_KM}
                      step="0.5"
                      value={dimensions.widthKm}
                      onChange={(e) => handleDimensionChange('width', parseFloat(e.target.value))}
                      className="w-full bg-surface border border-hairline rounded-[2px] px-3 py-2 font-data text-ink text-base min-h-[40px] focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="dim-height-km" className="text-text-secondary font-medium block mb-1">
                      Height (km)
                    </label>
                    <input
                      id="dim-height-km"
                      type="number"
                      min={MIN_SIDE_KM}
                      max={MAX_SIDE_KM}
                      step="0.5"
                      value={dimensions.heightKm}
                      onChange={(e) => handleDimensionChange('height', parseFloat(e.target.value))}
                      className="w-full bg-surface border border-hairline rounded-[2px] px-3 py-2 font-data text-ink text-base min-h-[40px] focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* 4 Coordinate Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
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
                      className="w-full bg-surface-2 border border-hairline rounded-[2px] px-2.5 py-1.5 font-data text-ink text-base min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleNudgeCoordinate('north', 0.01)}
                      className="min-h-[40px] px-2 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-sm"
                      title="Nudge North +0.01°"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeCoordinate('north', -0.01)}
                      className="min-h-[40px] px-2 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-sm"
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
                      className="w-full bg-surface-2 border border-hairline rounded-[2px] px-2.5 py-1.5 font-data text-ink text-base min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleNudgeCoordinate('south', 0.01)}
                      className="min-h-[40px] px-2 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-sm"
                      title="Nudge South +0.01°"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeCoordinate('south', -0.01)}
                      className="min-h-[40px] px-2 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-sm"
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
                      className="w-full bg-surface-2 border border-hairline rounded-[2px] px-2.5 py-1.5 font-data text-ink text-base min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleNudgeCoordinate('west', 0.01)}
                      className="min-h-[40px] px-2 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-sm"
                      title="Nudge West +0.01°"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeCoordinate('west', -0.01)}
                      className="min-h-[40px] px-2 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-sm"
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
                      className="w-full bg-surface-2 border border-hairline rounded-[2px] px-2.5 py-1.5 font-data text-ink text-base min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleNudgeCoordinate('east', 0.01)}
                      className="min-h-[40px] px-2 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-sm"
                      title="Nudge East +0.01°"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeCoordinate('east', -0.01)}
                      className="min-h-[40px] px-2 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-ink text-sm"
                      title="Nudge East -0.01°"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Shift / Resize */}
              <div className="pt-3 border-t border-hairline flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-secondary text-sm">Shift 10%:</span>
                  <button
                    type="button"
                    onClick={() => handleShiftBox('N')}
                    className="min-h-[36px] px-2.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-sm"
                  >
                    ↑ N
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftBox('S')}
                    className="min-h-[36px] px-2.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-sm"
                  >
                    ↓ S
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftBox('W')}
                    className="min-h-[36px] px-2.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-sm"
                  >
                    ← W
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftBox('E')}
                    className="min-h-[36px] px-2.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-sm"
                  >
                    → E
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-text-secondary text-sm">Scale:</span>
                  <button
                    type="button"
                    onClick={() => handleResizeBox(1.1)}
                    className="min-h-[36px] px-2.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-sm"
                    title="Expand box by 10%"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResizeBox(0.9)}
                    className="min-h-[36px] px-2.5 py-1 border border-hairline rounded-[2px] bg-surface-2 hover:bg-surface text-sm"
                    title="Shrink box by 10%"
                  >
                    -10%
                  </button>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Validation Banner if invalid */}
        {!validation.valid && (
          <div className="p-3 border border-rust text-rust rounded-[2px] text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{validation.reason}</span>
          </div>
        )}

        {/* Two Date Inputs in Two Columns */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider font-sans">
              Acquisition date windows
            </h3>

            <button
              type="button"
              onClick={() => setShowEventHelper((v) => !v)}
              className="text-sm text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showEventHelper ? (
                <>
                  Hide event helper <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Suggest windows around event date <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Collapsible Event Date Suggestion Helper */}
          {showEventHelper && (
            <div className="border border-hairline rounded-[2px] bg-surface-2 p-3 space-y-2 text-sm">
              <p className="text-text-secondary font-sans">
                Enter an event date to configure 12-day pre-event baseline and post-event comparison windows:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={eventDateInput}
                  onChange={(e) => setEventDateInput(e.target.value)}
                  className="bg-surface border border-hairline rounded-[2px] px-3 py-1.5 text-base text-ink font-data min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={handleApplyEventSuggestion}
                  className="min-h-[40px] px-3.5 py-1.5 bg-accent text-text-on-accent font-semibold rounded-[2px] hover:bg-accent-hover transition-colors cursor-pointer text-sm"
                >
                  Apply suggestion
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline Window (A) */}
            <div className="border border-hairline rounded-[2px] bg-surface-2 p-4 space-y-3">
              <span className="font-semibold text-ink text-sm font-sans block">
                Baseline window (Image A, pre-event)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="date-window-a-start" className="text-sm font-medium text-text-secondary block mb-1">
                    Start date
                  </label>
                  <input
                    id="date-window-a-start"
                    type="date"
                    value={dateWindowA.start}
                    onChange={(e) =>
                      setDateWindowA((prev) => ({ ...prev, start: e.target.value }))
                    }
                    className="w-full bg-surface border border-hairline rounded-[2px] px-3 py-2 font-data text-ink text-base min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="date-window-a-end" className="text-sm font-medium text-text-secondary block mb-1">
                    End date
                  </label>
                  <input
                    id="date-window-a-end"
                    type="date"
                    value={dateWindowA.end}
                    onChange={(e) =>
                      setDateWindowA((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className="w-full bg-surface border border-hairline rounded-[2px] px-3 py-2 font-data text-ink text-base min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Comparison Window (B) */}
            <div className="border border-hairline rounded-[2px] bg-surface-2 p-4 space-y-3">
              <span className="font-semibold text-ink text-sm font-sans block">
                Comparison window (Image B, post-event)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="date-window-b-start" className="text-sm font-medium text-text-secondary block mb-1">
                    Start date
                  </label>
                  <input
                    id="date-window-b-start"
                    type="date"
                    value={dateWindowB.start}
                    onChange={(e) =>
                      setDateWindowB((prev) => ({ ...prev, start: e.target.value }))
                    }
                    className="w-full bg-surface border border-hairline rounded-[2px] px-3 py-2 font-data text-ink text-base min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="date-window-b-end" className="text-sm font-medium text-text-secondary block mb-1">
                    End date
                  </label>
                  <input
                    id="date-window-b-end"
                    type="date"
                    value={dateWindowB.end}
                    onChange={(e) =>
                      setDateWindowB((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className="w-full bg-surface border border-hairline rounded-[2px] px-3 py-2 font-data text-ink text-base min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {!dateValidation.valid && (
            <div className="p-3 border border-rust text-rust rounded-[2px] text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dateValidation.reason}</span>
            </div>
          )}
        </div>

        {/* Find Matching Acquisitions (Compact: button + one-line summary + collapsible table) */}
        <div className="border border-hairline rounded-[2px] bg-surface-2 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-text-secondary">Dataset:</label>
                <div className="inline-flex rounded-[2px] border border-hairline bg-surface p-0.5 text-sm">
                  <button
                    type="button"
                    onClick={() => setAsfMode('s1')}
                    className={`px-3 py-1 rounded-[2px] font-medium transition-colors cursor-pointer ${
                      asfMode === 's1'
                        ? 'bg-accent text-text-on-accent font-semibold'
                        : 'text-text-secondary hover:text-ink'
                    }`}
                  >
                    Sentinel-1 C-band
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
                    NISAR L-band
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={effectiveOffline || asfLoading || !validation.valid || !dateValidation.valid}
                onClick={handleFindAcquisitions}
                className="min-h-[44px] px-4 py-2 text-sm font-semibold bg-accent text-text-on-accent rounded-[2px] hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2"
              >
                {asfLoading
                  ? 'Searching ASF archives...'
                  : asfMode === 's1'
                  ? 'Find Sentinel-1 passes'
                  : 'Find NISAR passes'}
              </button>
            </div>

            <div className="text-sm text-text-secondary font-sans">
              {asfMode === 's1' && asfGroups.length > 0 ? (
                <span className="text-ink font-medium">
                  {asfGroups.filter((g) => g.usable).length} usable orbit {asfGroups.filter((g) => g.usable).length === 1 ? 'group' : 'groups'} found ({asfTotalCount} total scenes).
                </span>
              ) : asfMode === 'nisar' && asfNisarGranules.length > 0 ? (
                <span className="text-ink font-medium">
                  {asfNisarGranules.length} NISAR acquisition(s) found.
                </span>
              ) : (
                <span>Query matching satellite passes via the Alaska Satellite Facility.</span>
              )}
            </div>
          </div>

          {effectiveOffline && (
            <div className="p-3 border border-hairline bg-surface rounded-[2px] text-sm text-text-secondary flex items-start gap-2">
              <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-ink">Offline mode notice</p>
                <p className="mt-0.5">
                  Satellite acquisition lookup requires a network connection.
                </p>
              </div>
            </div>
          )}

          {asfOfflineNotice && (
            <div className="p-3 border border-hairline bg-surface rounded-[2px] text-sm text-text-secondary flex items-start gap-2">
              <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-ink">Offline mode notice</p>
                <p className="mt-0.5">{asfOfflineNotice}</p>
              </div>
            </div>
          )}

          {asfError && (
            <div className="p-3 border border-rust text-rust rounded-[2px] text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{asfError}</span>
            </div>
          )}

          {/* Collapsible Acquisitions Table */}
          {((asfMode === 's1' && asfGroups.length > 0) || (asfMode === 'nisar' && asfNisarGranules.length > 0)) && (
            <details className="border border-hairline rounded-[2px] bg-surface group mt-2">
              <summary className="p-3 text-sm font-semibold text-ink cursor-pointer select-none flex items-center justify-between">
                <span>Show all acquisitions</span>
                <ChevronDown className="w-4 h-4 text-text-secondary group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-3 border-t border-hairline space-y-3">
                {asfMode === 's1' && asfGroups.length > 0 && (
                  <div className="space-y-2">
                    <div className="border border-hairline rounded-[2px] overflow-hidden">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-2 border-b border-hairline text-text-secondary">
                            <th className="py-2 px-3 w-8">Select</th>
                            <th className="py-2 px-3">Flight direction</th>
                            <th className="py-2 px-3 font-data">Relative orbit track</th>
                            <th className="py-2 px-3 font-data">Before window</th>
                            <th className="py-2 px-3 font-data">After window</th>
                            <th className="py-2 px-3">Usability status</th>
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
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-teal/15 text-teal text-xs font-semibold">
                                      <Check className="w-3 h-3" /> Ready in both windows
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-surface-2 border border-hairline text-text-secondary text-xs">
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
                        Active selection: {selectedTrackPass ? `${selectedTrackPass.pass} Track ${selectedTrackPass.orbit}` : 'None (auto-selection)'}
                      </span>
                      {selectedTrackPass && (
                        <button
                          type="button"
                          onClick={() => setSelectedTrackPass(null)}
                          className="text-text-secondary hover:text-ink text-xs underline cursor-pointer"
                        >
                          Clear orbit constraint
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {asfMode === 'nisar' && asfNisarGranules.length > 0 && (
                  <div className="space-y-2">
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
                        Open ASF Vertex <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="border border-hairline rounded-[2px] overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse font-data">
                        <thead>
                          <tr className="bg-surface-2 border-b border-hairline text-text-secondary font-sans">
                            <th className="py-1.5 px-3">Scene name</th>
                            <th className="py-1.5 px-3">Start time</th>
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
            </details>
          )}
        </div>
      </section>

      {/* ── Card 2: Export the images from Google Earth Engine ── */}
      <section className="border border-hairline bg-surface p-5 sm:p-6 rounded-[2px] space-y-6">
        <div>
          <h2 className="text-xl font-semibold font-headline text-ink">
            2. Export the images from Google Earth Engine
          </h2>
          <p className="text-base text-text-secondary mt-1 font-sans leading-relaxed">
            Generate a Google Earth Engine script to export co-registered Sentinel-1 GeoTIFF pairs. The script enforces single-orbit geometry and optimal spatial resolution for analysis.
          </p>
        </div>

        {/* Two Collapsed Details Blocks */}
        <div className="space-y-4">
          {/* Details 1: Show export script */}
          <details className="border border-hairline rounded-[2px] bg-surface-2 group">
            <summary className="p-3 sm:p-4 text-sm font-semibold text-ink cursor-pointer select-none flex items-center justify-between">
              <span>Show export script</span>
              <ChevronDown className="w-4 h-4 text-text-secondary group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-4 border-t border-hairline bg-surface space-y-4 font-sans">
              {currentPreset && (
                <p className="text-sm text-text-secondary italic leading-relaxed">
                  Provenance: {currentPreset.provenanceNote}
                </p>
              )}

              <div className="text-sm text-text-secondary space-y-1">
                <p>Baseline window: {baselineDays} days. Comparison window: {comparisonDays} days.</p>
                <p>Selected spatial resolution: {scaleInfo.scale} m ({scaleInfo.pixelsX} × {scaleInfo.pixelsY} px, ~{scaleInfo.uncompressedMb} MB uncompressed).</p>
                <p>The script prints the selected orbit group in the Console.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold border border-hairline bg-surface-2 hover:border-accent hover:text-accent rounded-[2px] transition-colors cursor-pointer flex items-center gap-2"
                >
                  {scriptCopied ? (
                    <>
                      <Check className="w-4 h-4 text-teal" />
                      <span className="text-teal">Copied to clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy script</span>
                    </>
                  )}
                </button>

                <a
                  href="https://code.earthengine.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold bg-accent text-text-on-accent rounded-[2px] hover:bg-accent-hover transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span>Open Earth Engine Code Editor</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={geeScript}
                  rows={14}
                  className="w-full bg-surface-2 text-ink font-mono text-xs sm:text-[13px] p-3 rounded-[2px] border border-hairline focus:outline-none resize-y leading-relaxed select-all"
                />
              </div>
            </div>
          </details>

          {/* Details 2: How to run the script */}
          <details className="border border-hairline rounded-[2px] bg-surface-2 group">
            <summary className="p-3 sm:p-4 text-sm font-semibold text-ink cursor-pointer select-none flex items-center justify-between">
              <span>How to run the script</span>
              <ChevronDown className="w-4 h-4 text-text-secondary group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-4 border-t border-hairline bg-surface space-y-3 font-sans">
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-text-secondary leading-relaxed">
                <li>Copy the export script above and open the Google Earth Engine Code Editor.</li>
                <li>Paste the script into the center editor pane and click <strong>Run</strong>.</li>
                <li>In the <strong>Tasks</strong> tab in the upper-right pane, click <strong>Run</strong> next to <code>image_a</code> and <code>image_b</code> to export the GeoTIFFs to Google Drive.</li>
              </ol>
              <div className="pt-2">
                <Link
                  href="/how-it-works#earth-engine-export"
                  className="text-teal hover:underline text-sm font-medium inline-flex items-center gap-1"
                >
                  <span>Full guide</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
