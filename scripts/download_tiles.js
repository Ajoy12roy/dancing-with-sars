const fs = require('fs');
const path = require('path');
const https = require('https');

// ========================================================================
// Tile Download Script for Offline Demo
// Run this once before the event to cache map tiles for the demo AOIs.
// Usage: node scripts/download_tiles.js
// ========================================================================

const AOIS = {
  'sylhet': {
    bounds: { north: 25.15, south: 24.50, east: 92.20, west: 91.50 },
    zooms: [8, 9, 10, 11, 12, 13]
  },
  'amazon': {
    bounds: { north: -8.0, south: -9.5, east: -62.0, west: -64.0 },
    zooms: [8, 9, 10, 11, 12, 13]
  }
};

function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

async function downloadTile(z, x, y, aoiPath) {
  const url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const tileDir = path.join(aoiPath, String(z), String(x));
  const tilePath = path.join(tileDir, `${y}.png`);

  if (!fs.existsSync(tileDir)) {
    fs.mkdirSync(tileDir, { recursive: true });
  }

  if (fs.existsSync(tilePath)) {
    return;
  }

  return new Promise((resolve) => {
    https
      .get(url, { headers: { 'User-Agent': 'DancingWithSARs/1.0' } }, (res) => {
        if (res.statusCode === 200) {
          const file = fs.createWriteStream(tilePath);
          res.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        } else {
          console.warn(`Failed to download tile: ${url} (Status: ${res.statusCode})`);
          resolve();
        }
      })
      .on('error', (err) => {
        console.error(`Error downloading ${url}: ${err.message}`);
        resolve();
      });
  });
}

async function run() {
  for (const [aoi, config] of Object.entries(AOIS)) {
    console.log(`Starting download for AOI: ${aoi}`);
    const aoiPath = path.join(__dirname, '..', 'public', 'tiles', aoi);

    for (const zoom of config.zooms) {
      const xMin = lon2tile(config.bounds.west, zoom);
      const xMax = lon2tile(config.bounds.east, zoom);
      const yMin = lat2tile(config.bounds.north, zoom);
      const yMax = lat2tile(config.bounds.south, zoom);

      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          await downloadTile(zoom, x, y, aoiPath);
          // Delay to respect OSM usage policy
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    }
    console.log(`Finished download for AOI: ${aoi}`);
  }
}

run().catch(console.error);
