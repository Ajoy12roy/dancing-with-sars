# Offline Demo Checklist — Dancing with the SARs

This document details every potential network dependency in the application, its offline architecture, and verification steps for a zero-connectivity ("wifi-off") presentation.

---

## Summary Matrix

| Subsystem | Potential Network Dependency | Offline Strategy | Offline Behavior | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Typography / Fonts** | Google Fonts CDN | Self-hosted via `next/font/local` in `app/fonts/` | 100% offline. Zero HTTP requests made for fonts. | Verified |
| **Map Basemap** | OpenStreetMap (`tile.openstreetmap.org`) | Self-contained "Radar" basemap mode with graticule & local before SAR overlay | Zero bulk tile downloading. Defaults to offline Radar mode on #F1F0EC background with latitude/longitude graticule and metric scale bar. Seamless online on-demand OSM Street map fallback. | Verified |
| **Leaflet Assets** | Unpkg / cdnjs CDN for markers and styles | Local CSS bundle and local marker assets in `public/leaflet/images/` | 100% offline. `L.Icon.Default` configured to resolve all images locally. Zero CDN dependencies. | Verified |
| **AI Insights** | Gemini API (`gemini-3.5-flash`) | Local template engine in `lib/ai-insight-fallback.ts` | Automatically falls back to deterministic explanation generated from computed data. No API key or internet required. | Verified |
| **Satellite Imagery** | Remote GIS servers / Earth Engine | Precomputed rasters in `data/precomputed/` | Pre-rendered `before.png`, `after.png`, and `change-map.png` served via internal Next.js API routes. | Verified |
| **Custom Uploads** | Cloud processing / External compute | Local Python service (`python-service/process_change.py`) | Processes rasters locally via `rasterio`, `numpy`, and `scipy`. Clear diagnostic guidance if Python is uninstalled. | Verified |
| **UI Scripts & Styles** | External CDNs / Unpkg / Cloudflare | Bundled in Next.js bundle | Zero external `<script>` or `<link>` tags. Leaflet CSS bundled directly from `node_modules`. | Verified |
| **Analytics & Telemetry** | Google Analytics / Mixpanel / Vercel | None | Zero tracking scripts or analytics beacons included. | Verified |

---

## Detailed Subsystem Breakdown

### 1. Typography & Fonts
- **Source**: Source Serif 4, Public Sans, and IBM Plex Mono.
- **Previous State**: Loaded dynamically via `next/font/google` at build/request time.
- **Offline Configuration**: Downloaded `.woff2` font files into `app/fonts/` via `scripts/download-fonts.mjs` and registered with `next/font/local` in `app/layout.tsx`.
- **Offline Assurance**: Next.js bundles the font files directly into the client assets. The browser never makes requests to `fonts.googleapis.com` or `fonts.gstatic.com`.

### 2. Map Basemap & Geospatial Visualization
- **Previous Architecture**: Downloaded thousands of OpenStreetMap raster tiles in bulk via a cache script into `public/tiles/`.
- **New Offline Architecture**: Bulk OSM tile caching has been completely removed. The application features a self-contained offline basemap with two active modes:
  1. **"Radar" Basemap (default when offline)**:
     - Neutral survey background (`#F1F0EC`).
     - The AOI's `before.png` SAR backscatter scene rendered as an `ImageOverlay` using `result.bounds`.
     - Full latitude and longitude graticule with coordinate labels formatted in `IBM Plex Mono` (e.g. `24.80°N`, `91.80°E`), rendered strictly with plain Leaflet polylines and `L.divIcon` — zero CDN plugins required.
     - Metric scale bar in the bottom-left corner (`L.control.scale({ metric: true, imperial: false })`).
     - Classified change detection map (`change-map.png`) overlaid directly on top of the radar before scene.
  2. **"Street map" Mode (online)**:
     - Standard OpenStreetMap raster tile layer with attribution (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).
     - Tiles load strictly on-demand as the user views and pans the map.
     - No custom headers, no delays, no tile prefetching, and no bulk downloading.
- **Fault-Tolerant Auto-Switching**:
  - Automatically switches to **Radar** mode when `navigator.onLine === false` or when 3 or more `tileerror` events occur within 5 seconds.
  - Displays an unobtrusive, quiet `text-secondary` notice: `"Offline: showing radar basemap"`.
  - Manual toggle (`[Radar | Street map]`) located in both `ChangeMap` and `ShorelineShiftCard` header bars allows immediate switching at any time.
  - The previous modal overlay `"Map tiles unavailable"` has been completely removed.

### 3. Leaflet Assets & Local Serving
- **Source**: Leaflet CSS, default marker icons, and layer control graphics.
- **Offline Configuration**:
  - Leaflet CSS is imported directly from `leaflet/dist/leaflet.css` in the local bundle.
  - Leaflet default marker icons (`marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png`) and layer icons (`layers.png`, `layers-2x.png`) are served locally from `public/leaflet/images/`.
  - Leaflet's default icon resolver is explicitly pointed to `/leaflet/images/` via `L.Icon.Default.mergeOptions({ imagePath: '/leaflet/images/' })`.
- **Offline Assurance**: Zero requests are made to unpkg, cdnjs, or any third-party CDN.

### 4. AI Explanation & Narrative Panel
- **Source**: Google Gemini 3.5 Flash API via `@google/generative-ai`.
- **Offline Configuration**: `app/api/ai-insight/route.ts` detects missing API keys (`GEMINI_API_KEY` / `GOOGLE_API_KEY`) or network timeouts / socket disconnections (`ENOTFOUND`, `ECONNREFUSED`, timeout after 12s).
- **Offline Assurance**:
  - Seamlessly invokes `generateFallbackInsight(payload)` from `lib/ai-insight-fallback.ts`.
  - Explains only real computed metrics (affected area, percentage change, annualized erosion rates, signal strength) without hallucinations.
  - Returns `usedFallback: true`, prompting the UI to display the `"Deterministic Offline Narrative"` badge.

### 5. Custom File Upload & Python Processing
- **Source**: `python-service/process_change.py` via `POST /api/analyze-upload`.
- **Offline Configuration**: Operates entirely on the local system using `child_process.spawn('python', ...)`.
- **Offline Assurance**:
  - Requires no internet connection to process GeoTIFF pairs.
  - If Python or required packages (`rasterio`, `numpy`, `scipy`) are not installed on the host machine, the API returns a structured HTTP 503 error with exact remediation instructions (`pip install -r python-service/requirements.txt`).
  - In `app/explore/page.tsx`, the error state provides a clear **"Return to Quick Demo"** button so the offline presentation never stalls.

### 6. Codebase Scan for External References
A regex audit for external URLs confirmed:
- No external CDNs (no unpkg, cdnjs, jsdelivr, or bootstrap).
- No external image tags or third-party web icons (all SVG icons are local in `public/` or inline React components).
- Outbound hyperlinks (e.g. documentation links in the footer and OpenStreetMap copyright) are standard `<a>` tags with `target="_blank"` and do not initiate automatic network traffic.

---

## Offline Demo Verification Steps
To rehearse the offline demonstration:
1. Turn off Wi-Fi or disconnect Ethernet on the presentation laptop.
2. Launch the application:
   ```cmd
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.
4. Verify:
   - Fonts render in Source Serif 4, Public Sans, and IBM Plex Mono with no browser console font errors.
   - Navigate to `/explore`: select each demo AOI (Sylhet, Jamuna, Amazon, Tanguar).
   - Observe that maps open seamlessly in **Radar** mode:
     * Background is `#F1F0EC`.
     * The AOI's SAR `before.png` is displayed as the basemap.
     * Coordinate graticule lines and labels in `IBM Plex Mono` render across the area.
     * Metric scale bar appears in the lower-left.
     * The quiet notice `"Offline: showing radar basemap"` is visible.
     * The classified change overlay is rendered on top with transparency.
   - Click the manual toggle **"Street map"**: verify that when offline or if 3 tile errors occur within 5 seconds, the map auto-switches back to **Radar** mode without breaking.
   - Click **"Explain with AI"**: verify deterministic explanation appears immediately with the offline badge.
   - Navigate to `/how-it-works` and `/data-sources`: confirm all layouts render crisply.
