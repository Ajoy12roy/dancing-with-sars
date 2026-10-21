'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { ChangeData } from '@/hooks/useChangeData';
import type { ResultCategory } from '@/types';
import type { BasemapMode } from './MapComponent';

interface ShorelineShiftCardProps {
  data: ChangeData;
  mode?: string;
  className?: string;
}

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-(--color-paper-warm) border border-(--color-hairline)">
      <div className="text-(--color-text-secondary) font-data text-xs">
        Loading map tiles...
      </div>
    </div>
  ),
});

export default function ShorelineShiftCard({ data, mode: propMode, className }: ShorelineShiftCardProps) {
  const activeMode = propMode || data.mode || 'river-erosion';

  const [showPersistentWater, setShowPersistentWater] = useState(true);
  const [filteredImageUrl, setFilteredImageUrl] = useState<string | null>(null);

  const isClientOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  const [basemapMode, setBasemapMode] = useState<BasemapMode>(() => (isClientOffline ? 'radar' : 'street'));
  const [showOfflineNotice, setShowOfflineNotice] = useState(isClientOffline);

  const handleAutoSwitchOffline = useCallback(() => {
    setBasemapMode('radar');
    setShowOfflineNotice(true);
  }, []);

  const handleManualModeChange = (mode: BasemapMode) => {
    setBasemapMode(mode);
    if (mode === 'street') {
      setShowOfflineNotice(false);
    } else {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setShowOfflineNotice(true);
      } else {
        setShowOfflineNotice(false);
      }
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setShowOfflineNotice(false);
    };
    const handleOffline = () => {
      handleAutoSwitchOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleAutoSwitchOffline]);

  // Filter out persistent water pixels ([125, 138, 146, 128]) when toggle is off
  useEffect(() => {
    if (showPersistentWater || !data.changeMapImage) {
      return;
    }

    let isCancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isCancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Persistent water in python pipeline is #7D8A92 -> [125, 138, 146, 128]
          if (r !== undefined && g !== undefined && b !== undefined) {
            if (r >= 110 && r <= 140 && g >= 125 && g <= 155 && b >= 135 && b <= 165) {
              d[i + 3] = 0; // Make transparent
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setFilteredImageUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Canvas pixel filtering unavailable (CORS or local asset restriction):', err);
      }
    };
    img.src = data.changeMapImage;

    return () => {
      isCancelled = true;
    };
  }, [showPersistentWater, data.changeMapImage]);

  // Mode title per requirement
  const cardTitle =
    activeMode === 'river-erosion'
      ? 'Shoreline Shift'
      : activeMode === 'flood'
      ? 'Flood Inundation Extent'
      : activeMode === 'surface-water'
      ? 'Surface Water Dynamics'
      : 'Shoreline Shift';

  // Dates caption from result.dates
  const dateCaption =
    data.dates?.a && data.dates?.b
      ? `${data.dates.a} → ${data.dates.b}${data.dates.days ? ` (${data.dates.days} days)` : ''}`
      : data.dateBefore && data.dateAfter
      ? `${data.dateBefore} → ${data.dateAfter}`
      : 'Temporal interval';

  // Strict bounds check from result.bounds
  const rawBounds = data.bounds;
  const hasValidBounds =
    rawBounds &&
    typeof rawBounds.south === 'number' &&
    typeof rawBounds.north === 'number' &&
    typeof rawBounds.west === 'number' &&
    typeof rawBounds.east === 'number' &&
    rawBounds.south !== rawBounds.north &&
    rawBounds.west !== rawBounds.east;

  const south = hasValidBounds ? Math.min(rawBounds.south, rawBounds.north) : 0;
  const north = hasValidBounds ? Math.max(rawBounds.south, rawBounds.north) : 0;
  const west = hasValidBounds ? Math.min(rawBounds.west, rawBounds.east) : 0;
  const east = hasValidBounds ? Math.max(rawBounds.west, rawBounds.east) : 0;

  const validBounds = hasValidBounds ? { south, north, west, east } : null;

  const overlayImage = !showPersistentWater && filteredImageUrl ? filteredImageUrl : data.changeMapImage;
  const categories: ResultCategory[] = data.categories || [];
  const warnings = data.warnings || [];

  const effectiveBeforeImage =
    data.beforeImage || (data.aoiId ? `/api/images?aoi=${data.aoiId}&type=before` : '');

  const getSwatchColor = (cat: ResultCategory) => {
    const isLoss = cat.kind === 'loss' || cat.id.includes('loss') || cat.id.includes('erosion') || cat.id.includes('flooded');
    const isGain = cat.kind === 'gain' || cat.id.includes('gain') || cat.id.includes('accretion');
    if (isLoss) return 'var(--color-rust)';
    if (isGain) return 'var(--color-teal)';
    if (cat.kind === 'persistent' || cat.id.includes('persistent')) return 'rgba(125, 138, 146, 0.8)';
    return '#4A4E52';
  };

  return (
    <div
      className={`border border-(--color-hairline) bg-(--color-paper) rounded-[2px] flex flex-col h-130 xl:h-145 overflow-hidden w-full ${
        className || ''
      }`}
    >
      {/* Header bar (h-12) with Mode Title, result.dates caption, basemap toggle, and persistent water toggle */}
      <div className="h-12 px-4 border-b border-(--color-hairline) flex items-center justify-between bg-(--color-paper) shrink-0 gap-2">
        <div className="flex flex-col min-w-0 pr-2">
          <h3 className="font-bold font-headline text-base text-(--color-ink) leading-tight truncate">
            {cardTitle}
          </h3>
          <span className="font-data text-[11px] text-(--color-text-secondary) leading-tight truncate">
            {dateCaption}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Manual Basemap Toggle */}
          <div className="flex items-center gap-1 border border-(--color-hairline) rounded-[2px] p-0.5 bg-(--color-paper-warm)">
            <button
              id="shoreline-basemap-radar"
              type="button"
              onClick={() => handleManualModeChange('radar')}
              className={`px-2.5 py-1 text-xs rounded-sm font-sans transition-colors cursor-pointer ${
                basemapMode === 'radar'
                  ? 'bg-(--color-paper) text-(--color-ink) font-semibold border border-(--color-hairline)'
                  : 'text-(--color-text-secondary) hover:text-(--color-ink) border border-transparent'
              }`}
              aria-pressed={basemapMode === 'radar'}
            >
              Radar
            </button>
            <button
              id="shoreline-basemap-street"
              type="button"
              onClick={() => handleManualModeChange('street')}
              className={`px-2.5 py-1 text-xs rounded-sm font-sans transition-colors cursor-pointer ${
                basemapMode === 'street'
                  ? 'bg-(--color-paper) text-(--color-ink) font-semibold border border-(--color-hairline)'
                  : 'text-(--color-text-secondary) hover:text-(--color-ink) border border-transparent'
              }`}
              aria-pressed={basemapMode === 'street'}
            >
              Street map
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPersistentWater((prev) => !prev)}
            className={`px-2.5 py-1 text-xs rounded-[2px] border transition-colors cursor-pointer shrink-0 font-sans ${
              showPersistentWater
                ? 'bg-(--color-paper) text-(--color-ink) border-(--color-hairline) hover:border-(--color-ink)'
                : 'bg-(--color-paper-warm) text-(--color-text-secondary) border-(--color-hairline)'
            }`}
            aria-pressed={showPersistentWater}
          >
            {showPersistentWater ? 'Hide persistent water' : 'Show persistent water'}
          </button>
        </div>
      </div>

      {/* Map viewport (flex-1) */}
      <div className="relative flex-1 w-full overflow-hidden bg-(--color-paper-warm)">
        {validBounds ? (
          <MapComponent
            bounds={validBounds}
            changeMapImage={overlayImage}
            beforeImage={effectiveBeforeImage}
            aoiId={data.aoiId}
            opacity={0.85}
            basemapMode={basemapMode}
            onBasemapModeChange={setBasemapMode}
            showOfflineNotice={showOfflineNotice}
            onAutoSwitchOffline={handleAutoSwitchOffline}
          />
        ) : (
          <div className="w-full h-full border border-(--color-hairline) bg-(--color-paper-warm) flex flex-col items-center justify-center p-6 text-center">
            <span className="font-data text-xs text-(--color-ink) font-semibold uppercase tracking-wider">
              Geographic Map Overlay Unavailable
            </span>
            <p className="text-xs text-(--color-text-secondary) mt-2 max-w-sm font-sans">
              Geospatial bounding coordinates missing. Inspect backscatter changes using the SAR comparison viewer.
            </p>
          </div>
        )}
      </div>

      {/* Quiet notice block for result.warnings under the map */}
      {warnings.length > 0 && (
        <div className="border-t border-(--color-hairline) border-l-2 border-l-(--color-rust) bg-(--color-paper) px-4 py-2 text-xs text-(--color-text-secondary) font-sans shrink-0">
          <div className="font-semibold text-(--color-ink) text-[11px] mb-0.5">
            Observation Notice
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="leading-snug">{w}</p>
          ))}
        </div>
      )}

      {/* Footer / Legend generated dynamically from result.categories (swatch + label + area in km² in IBM Plex Mono) */}
      <div className="h-11 px-4 border-t border-(--color-hairline) flex items-center justify-between bg-(--color-paper) shrink-0 overflow-x-auto text-xs">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {categories.map((cat) => {
            const isPersistent = cat.kind === 'persistent' || cat.id.includes('persistent');
            const isDimmed = isPersistent && !showPersistentWater;

            return (
              <div
                key={cat.id}
                className={`flex items-center gap-1.5 shrink-0 transition-opacity ${
                  isDimmed ? 'opacity-40 line-through' : 'opacity-100'
                }`}
              >
                <div
                  className="w-3 h-3 border border-(--color-hairline) shrink-0"
                  style={{ backgroundColor: getSwatchColor(cat) }}
                />
                <span className="font-sans text-xs text-(--color-ink)">{cat.label}:</span>
                <span className="font-data text-xs text-(--color-text-secondary)">
                  {cat.areaKm2.toFixed(2)} km²
                </span>
              </div>
            );
          })}
        </div>

        <span className="font-data text-[11px] text-(--color-text-secondary) hidden md:inline shrink-0 pl-4">
          Sentinel-1 SAR
        </span>
      </div>
    </div>
  );
}
