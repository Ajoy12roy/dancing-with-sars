'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { ChangeData } from '@/hooks/useChangeData';
import type { ResultCategory } from '@/types';
import type { BasemapMode } from './MapComponent';
import { DataPanel } from '@/components/ui/DataPanel';

interface ShorelineShiftCardProps {
  data: ChangeData;
  mode?: string;
  className?: string;
}

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-2 border border-hairline">
      <div className="text-text-secondary font-data text-xs">
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
    if (cat.kind === 'persistent' || cat.id.includes('persistent')) return 'var(--color-ink-muted)';
    return 'var(--color-text-secondary)';
  };

  return (
    <DataPanel
      title={cardTitle}
      subtitle={
        <span className="font-data text-[11px] text-text-secondary leading-tight truncate">
          {dateCaption}
        </span>
      }
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          {/* Manual Basemap Toggle */}
          <div className="flex items-center gap-1 border border-hairline rounded-[2px] p-0.5 bg-surface-2">
            <button
              id="shoreline-basemap-radar"
              type="button"
              onClick={() => handleManualModeChange('radar')}
              className={`px-2.5 py-1 text-xs rounded-sm font-sans transition-colors cursor-pointer ${
                basemapMode === 'radar'
                  ? 'bg-surface text-ink font-semibold border border-hairline'
                  : 'text-text-secondary hover:text-ink border border-transparent'
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
                  ? 'bg-surface text-ink font-semibold border border-hairline'
                  : 'text-text-secondary hover:text-ink border border-transparent'
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
                ? 'bg-surface text-ink border-hairline hover:border-ink'
                : 'bg-surface-2 text-text-secondary border-hairline'
            }`}
            aria-pressed={showPersistentWater}
          >
            {showPersistentWater ? 'Hide persistent water' : 'Show persistent water'}
          </button>
        </div>
      }
      className={`h-130 xl:h-145 w-full ${className || ''}`}
      noPadding
    >

      {/* Map viewport (flex-1) */}
      <div className="relative flex-1 w-full overflow-hidden bg-surface-2">
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
            scrollZoom={false}
          />
        ) : (
          <div className="w-full h-full border border-hairline bg-surface-2 flex flex-col items-center justify-center p-6 text-center">
            <span className="font-data text-xs text-ink font-semibold uppercase tracking-wider">
              Geographic Map Overlay Unavailable
            </span>
            <p className="text-xs text-text-secondary mt-2 max-w-sm font-sans">
              Geospatial bounding coordinates missing. Inspect backscatter changes using the SAR comparison viewer.
            </p>
          </div>
        )}
      </div>

      {/* Quiet notice block for result.warnings under the map */}
      {warnings.length > 0 && (
        <div className="border-t border-hairline border-l-2 border-l-rust bg-surface px-4 py-2 text-xs text-text-secondary font-sans shrink-0">
          <div className="font-semibold text-ink text-[11px] mb-0.5">
            Observation Notice
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="leading-snug">{w}</p>
          ))}
        </div>
      )}

      {/* Footer / Legend generated dynamically from result.categories (swatch + label + area in km² in IBM Plex Mono) */}
      <div className="min-h-11 py-2 px-4 border-t border-hairline flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 bg-surface shrink-0 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
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
                  className="w-3 h-3 border border-hairline shrink-0"
                  style={{ backgroundColor: getSwatchColor(cat) }}
                />
                <span className="font-sans text-xs text-ink">{cat.label}:</span>
                <span className="font-data text-xs text-text-secondary">
                  {cat.areaKm2.toFixed(2)} km²
                </span>
              </div>
            );
          })}
        </div>

        <span className="font-data text-[11px] text-text-secondary hidden md:inline shrink-0 pl-4">
          Sentinel-1 SAR
        </span>
      </div>
    </DataPanel>
  );
}
