'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { ChangeData } from '@/hooks/useChangeData';
import { AreaOfInterest } from '@/types';
import { useAnalysisMode } from '@/context';
import type { BasemapMode } from './MapComponent';
import { DataPanel } from '@/components/ui/DataPanel';

interface ChangeMapProps {
  data: ChangeData;
  aoi?: AreaOfInterest;
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

export function ChangeMap({ data, aoi }: ChangeMapProps) {
  const { mode: contextMode, modeInfo } = useAnalysisMode();
  const activeMode = data?.mode || aoi?.mode || contextMode;

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

  // Prioritize result.bounds directly from Python result.json, fallback to aoi?.bounds
  const rawBounds = data?.bounds || aoi?.bounds;
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

  // Center calculated dynamically from result.bounds - zero hardcoded coordinates
  const centerLabel = validBounds
    ? `${((validBounds.north + validBounds.south) / 2).toFixed(2)}°N, ${((validBounds.east + validBounds.west) / 2).toFixed(2)}°E`
    : 'Geo-referenced';

  const warnings = data?.warnings || [];

  const effectiveBeforeImage =
    data.beforeImage ||
    (data.aoiId ? `/api/images?aoi=${data.aoiId}&type=before` : aoi?.id ? `/api/images?aoi=${aoi.id}&type=before` : '');

  return (
    <DataPanel
      title="Geospatial Classification"
      rightSlot={
        <div className="flex items-center gap-3">
          {/* Manual Basemap Toggle */}
          <div className="flex items-center gap-1 border border-hairline rounded-[2px] p-0.5 bg-surface-2">
            <button
              id="changemap-basemap-radar"
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
              id="changemap-basemap-street"
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
          <span className="font-data text-xs text-text-secondary hidden sm:inline shrink-0">
            {centerLabel}
          </span>
        </div>
      }
      className="h-130 xl:h-145 w-full"
      noPadding
    >

      {/* Map viewport (flex-1) */}
      <div className="relative flex-1 w-full overflow-hidden bg-surface-2">
        {validBounds ? (
          <MapComponent
            bounds={validBounds}
            changeMapImage={data.changeMapImage}
            beforeImage={effectiveBeforeImage}
            aoiId={data.aoiId || aoi?.id}
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
              The uploaded imagery does not contain embedded geospatial coordinate reference data. Inspect backscatter changes using the SAR comparison viewer.
            </p>
          </div>
        )}
      </div>

      {/* Quiet notice block for result.warnings under the map */}
      {warnings.length > 0 && (
        <div className="border-t border-hairline border-l-2 border-l-rust bg-surface px-4 py-2.5 text-xs text-text-secondary font-sans shrink-0">
          <div className="font-semibold text-ink text-[11px] mb-0.5">
            Observation Notice
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="leading-snug">{w}</p>
          ))}
        </div>
      )}

      {/* Footer / Legend bar */}
      <div className="min-h-11 py-2 px-4 border-t border-hairline flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 bg-surface shrink-0 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border border-hairline" style={{ backgroundColor: 'var(--color-rust)' }}></div>
            <span className="font-data text-xs text-ink">{modeInfo.hazardLabel}</span>
          </div>
          {activeMode !== 'deforestation' && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border border-hairline" style={{ backgroundColor: 'var(--color-teal)' }}></div>
              <span className="font-data text-xs text-ink">{modeInfo.oppositeLabel}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border border-hairline" style={{ backgroundColor: 'var(--color-ink-muted)' }}></div>
            <span className="font-data text-xs text-ink">{modeInfo.persistentLabel}</span>
          </div>
        </div>

        <span className="font-data text-[11px] text-text-secondary hidden sm:inline shrink-0">
          Sentinel-1 SAR
        </span>
      </div>
    </DataPanel>
  );
}
