'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, ImageOverlay, useMap } from 'react-leaflet';
import type { TileErrorEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapComponentProps {
  center: [number, number];
  bounds: { north: number; south: number; east: number; west: number };
  zoom: number;
  changeMapImage: string;
  aoiId: string;
}

// Update map view when center/zoom changes
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapComponent({ center, bounds, zoom, changeMapImage, aoiId }: MapComponentProps) {
  const leafletBounds: [[number, number], [number, number]] = [
    [bounds.south, bounds.west],
    [bounds.north, bounds.east],
  ];

  return (
    <div className="relative w-full h-full border border-(--color-hairline) z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ width: '100%', height: '100%', background: 'var(--color-paper-warm)' }}
        zoomControl={false}
      >
        <MapUpdater center={center} zoom={zoom} />
        <TileLayer
          url={`/tiles/${aoiId}/{z}/{x}/{y}.png`}
          eventHandlers={{
            tileerror: (error: TileErrorEvent) => {
              const tile = error.tile;
              if (tile && tile.src && tile.src.includes('/tiles/')) {
                const match = tile.src.match(/\/tiles\/[^\/]+\/(\d+)\/(\d+)\/(\d+)\.png/);
                if (match) {
                  const [, z, x, y] = match;
                  const s = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
                  tile.src = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
                }
              }
            }
          }}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ImageOverlay url={changeMapImage} bounds={leafletBounds} opacity={0.8} />
      </MapContainer>
    </div>
  );
}
