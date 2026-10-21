# Dancing with the SARs — SAR Change Detection Platform

> **See the Earth change in radar's eyes.** A scientific geospatial platform that compares before/after Synthetic Aperture Radar (SAR) satellite imagery to detect, quantify, and explain surface changes — including floods, riverbank erosion, deforestation, and water body dynamics.

---

## Key Features

- **Multi-Hazard Analysis**: Specialized detection modes for flood inundation, river erosion/shoreline shift, deforestation, and surface water dynamics.
- **Scientific Dual-Mode Basemap**:
  - **"Radar" Basemap (Default Offline)**: Neutral survey background (`#F1F0EC`), AOI SAR `before.png` backscatter imagery as an `ImageOverlay`, latitude/longitude graticule with coordinate labels in `IBM Plex Mono` (drawn using plain Leaflet polylines, zero CDN plugins), and a metric scale bar.
  - **"Street map" Mode (Online)**: Standard OpenStreetMap raster tile layer with attribution, loaded strictly on-demand as the user views the map (no bulk tile caching, no prefetching, and no evasion delays).
  - **Resilient Auto-Switching**: Automatically falls back to **Radar** mode if `navigator.onLine` is false or when 3 or more tile error events occur within 5 seconds, displaying a quiet notice `"Offline: showing radar basemap"`. Includes a manual toggle between modes in card headers.
- **Self-Contained Offline Architecture**:
  - All Leaflet assets (marker icons, layer graphics, CSS) are bundled and served locally from `public/leaflet/images/` with zero external CDN (unpkg/cdnjs) dependencies.
  - Typography self-hosted via `next/font/local` (Source Serif 4, Public Sans, IBM Plex Mono).
  - Deterministic offline AI insights fallback when Gemini API keys or network connectivity are absent.
- **Local Python Processing Service**: Fast offline GeoTIFF processing using `rasterio`, `numpy`, and `scipy` for custom user-uploaded imagery.
- **Survey-Document Design System**: High-contrast, publication-grade editorial styling adhering to `DESIGN_SYSTEM.md` with hairline borders, zero box-shadows, and strict semantic coloring.

---

## Getting Started

### Prerequisites

- **Node.js**: 18.x or later
- **npm**: 9.x or later
- **Python** (optional, for custom GeoTIFF uploads): Python 3.10+ with `rasterio`, `numpy`, `scipy`, `pillow` (`pip install -r python-service/requirements.txt`)

### Installation & Development

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Start the local Next.js development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Offline Demo ("Wi-Fi Off") Presentation

This application is built for 100% reliable offline presentation:

1. Turn off Wi-Fi or disconnect Ethernet on your computer.
2. Launch the application:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.
4. Navigate to `/explore`:
   - Inspect precomputed demo AOIs (Sylhet, Jamuna, Amazon, Tanguar).
   - Observe that maps default to **Radar** mode with the SAR before imagery basemap, coordinate graticule in IBM Plex Mono, metric scale bar, and quiet `"Offline: showing radar basemap"` indicator.
   - Click the **"Street map"** toggle to test fault-tolerant auto-recovery back to Radar mode.
   - Click **"Explain with AI"** to see deterministic offline metrics and narrative generated without internet access.

For an exhaustive audit of network dependencies and offline strategies, see [OFFLINE-CHECKLIST.md](OFFLINE-CHECKLIST.md).

---

## Project Structure

```
dancing-with-sars/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # Change detection, AI insight, image serving APIs
│   ├── fonts/            # Self-hosted Source Serif 4, Public Sans, IBM Plex Mono
│   ├── explore/          # Interactive SAR change detection dashboard
│   ├── how-it-works/     # Remote sensing pipeline & SAR fundamentals
│   └── data-sources/     # Data governance, citations & software stack
├── components/           # Reusable UI & geospatial visualization components
│   ├── visualization/    # MapComponent, ChangeMap, ShorelineShiftCard, BeforeAfterViewer
│   ├── ai/               # AI insight drawer & narrative panel
│   └── layout/           # Navbar, Footer
├── data/precomputed/     # Precomputed GeoTIFF outputs (Sylhet, Jamuna, Amazon, Tanguar)
├── python-service/       # Python SAR change detection pipeline (rasterio/numpy/scipy)
├── public/
│   └── leaflet/images/   # Local Leaflet marker and layer assets (zero CDN)
├── DESIGN_SYSTEM.md      # Strict typography, palette & layout rules
└── OFFLINE-CHECKLIST.md  # Comprehensive offline readiness checklist
```

---

## License

Created for the NASA International Space Apps Challenge.
