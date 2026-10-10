// ========================================================================
// ChangeMap — Renders SAR change detection overlay on a base map
// Uses Leaflet (dynamically imported to avoid SSR issues)
// ========================================================================

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ChangeData } from '@/hooks/useChangeData';
import { AreaOfInterest } from '@/types';

interface ChangeMapProps {
  data: ChangeData;
  aoi: AreaOfInterest;
}

// Dynamically import the map to avoid SSR "window is not defined" error
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-(--color-paper-warm) border border-(--color-hairline)">
      <div className="animate-pulse text-(--color-text-secondary) font-data text-sm">
        Loading map tiles...
      </div>
    </div>
  ),
});

export function ChangeMap({ data, aoi }: ChangeMapProps) {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {

    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Map Container */}
      <div className="relative w-full h-[45vh] xl:h-[60vh] min-h-100">
        {isOffline && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/80 backdrop-blur-sm border border-(--color-hairline)">
            <p className="text-(--color-text-secondary) font-bold">
              Offline Mode — Map tiles unavailable.
            </p>
          </div>
        )}
        <MapComponent 
          center={aoi.center}
          bounds={aoi.bounds}
          zoom={aoi.zoom}
          changeMapImage={data.changeMapImage}
          aoiId={aoi.id}
        />
      </div>

      {/* Legend Container */}
      <div className="w-full border border-(--color-hairline) bg-(--color-paper) p-4 flex flex-col sm:flex-row gap-6 justify-between items-center rounded-none">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-(--color-ink) text-sm uppercase tracking-wider">Change Detection Scale</span>
          <span className="text-(--color-text-secondary) text-xs">Based on Sentinel-1 SAR backscatter analysis</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-(--color-hairline)" style={{ backgroundColor: 'var(--color-rust)' }}></div>
            <span className="text-sm font-data text-(--color-ink)">Backscatter Decrease (e.g. Flooding)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-(--color-hairline)" style={{ backgroundColor: 'var(--color-teal)' }}></div>
            <span className="text-sm font-data text-(--color-ink)">Backscatter Increase (e.g. Urbanization)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
