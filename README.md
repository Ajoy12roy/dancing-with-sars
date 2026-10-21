# Dancing with the SARs — SAR Change Detection Platform

> **See the Earth change in radar's eyes.** A scientific geospatial platform that compares before/after Synthetic Aperture Radar (SAR) satellite imagery to detect, quantify, and explain surface changes — including floods, riverbank erosion, deforestation, and water body dynamics. Built for the NASA International Space Apps Challenge.

---

## Key Features

- **Multi-Hazard Analysis**: Specialized detection pipelines for flood inundation, river erosion/shoreline migration, forest canopy loss, and surface water dynamics.
- **Custom GeoTIFF Upload & Real-Time Processing**: Drag-and-drop your own paired GeoTIFF images (`image_a.tif` and `image_b.tif`) in the browser, choose an analysis mode, and run the deterministic local Python pipeline to produce instant map overlays, statistics, and AI interpretations.
- **Scientific Dual-Mode Basemap**:
  - **"Radar" Basemap (Default Offline)**: Neutral survey background (`#F1F0EC`), AOI SAR `before.png` backscatter imagery as an `ImageOverlay`, latitude/longitude graticule with coordinate labels in `IBM Plex Mono` (rendered using plain Leaflet polylines, zero CDN plugins), and a metric scale bar.
  - **"Street map" Mode (Online)**: Standard OpenStreetMap raster tile layer with attribution, loaded strictly on-demand as the user views the map (no bulk tile caching, no prefetching, and no evasion delays).
  - **Resilient Auto-Switching**: Automatically falls back to **Radar** mode if `navigator.onLine` is false or when 3 or more tile error events occur within 5 seconds, displaying a quiet notice `"Offline: showing radar basemap"`. Includes a manual toggle between modes in card headers.
- **Self-Contained Offline Architecture**:
  - All Leaflet assets (marker icons, layer graphics, CSS) are bundled and served locally from `public/leaflet/images/` with zero external CDN (unpkg/cdnjs) dependencies.
  - Typography self-hosted via `next/font/local` (Source Serif 4, Public Sans, IBM Plex Mono).
  - Deterministic offline AI insights fallback when Gemini API keys or network connectivity are absent.
- **Survey-Document Design System**: High-contrast, publication-grade editorial styling adhering to [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) with hairline borders, zero box-shadows, and strict semantic coloring.

---

## Four Analysis Modes

- **Flood Inundation (`flood`)**: Detects newly submerged terrestrial surfaces by identifying severe backscatter drops where specular water reflection replaces rough land scattering.
- **River Bank Erosion & Accretion (`river-erosion`)**: Tracks multi-year channel migration and shoreline shifts along dynamic braided rivers by analyzing water-to-land accretion and land-to-water erosion within a buffered channel corridor.
- **Forest Canopy Loss (`deforestation`)**: Identifies deforestation, logging, and canopy clearing in tropical biomes by flagging significant drops in volumetric radar backscatter (typically $\le -3.0$ dB).
- **Surface Water Dynamics (`surface-water`)**: Quantifies seasonal surface water area expansion, wetland storage cycles, or reservoir depletion between baseline and peak observation periods.

---

## Custom GeoTIFF Upload Feature

The platform provides a browser-based upload interface on the `/explore` page allowing researchers and emergency responders to analyze custom imagery:

1. **Drag-and-Drop Pairing**: Upload baseline (`image_a.tif`) and comparison (`image_b.tif`) GeoTIFF scenes exported from Copernicus Sentinel-1 or other SAR sensors.
2. **Mode Selection**: Choose the analysis mode (`flood`, `river-erosion`, `deforestation`, or `surface-water`) and optional date stamps.
3. **Local Subprocess Execution**: The Next.js API route (`/api/analyze-upload`) executes `python-service/process_change.py` locally without uploading rasters to external third-party cloud services.
4. **Instant Visualization**: Automatically renders categorical transparent PNG overlays, computes metric cards, updates breakdown charts, and generates radar interpretation.

---

## Getting Started

### Prerequisites

- **Node.js**: 18.x or later
- **npm**: 9.x or later
- **Python**: 3.10+ (for processing custom GeoTIFF uploads and reproducing rasters)

### 1. Web Application Setup

```bash
# Clone the repository
cd dancing-with-sars

# Install frontend dependencies
npm install

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Python Service Setup (Windows)

To enable the custom GeoTIFF upload processor or run the offline processing pipeline on Windows:

```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.venv\Scripts\activate

# Install required geospatial and scientific dependencies
pip install -r python-service/requirements.txt
```

*(On Linux / macOS, activate with `source .venv/bin/activate`)*.

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

For an exhaustive audit of network dependencies and offline strategies, see [`OFFLINE-CHECKLIST.md`](OFFLINE-CHECKLIST.md).

---

## Project Structure

```
dancing-with-sars/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # Change detection, AI insight, image serving, upload APIs
│   │   ├── ai-insight/
│   │   ├── analyze-upload/
│   │   ├── change-detection/
│   │   └── images/
│   ├── fonts/            # Self-hosted Source Serif 4, Public Sans, IBM Plex Mono
│   ├── explore/          # Interactive SAR change detection dashboard
│   ├── how-it-works/     # Remote sensing pipeline & SAR fundamentals
│   ├── data-sources/     # Data governance, citations & software stack
│   └── about/            # Project background, team, and license
├── components/           # Reusable UI & geospatial visualization components
│   ├── ai/               # AI insight drawer & narrative panel
│   ├── layout/           # Navbar, Footer
│   ├── ui/               # Badge, Button, Tabs, Modal
│   ├── upload/           # FileDropZone & HairlineProgress for custom GeoTIFF upload
│   └── visualization/    # MapComponent, ChangeMap, ShorelineShiftCard, BeforeAfterViewer, StatsPanel, CategoryBreakdownChart
├── constants/            # Design tokens, AOI definitions, metrics config, fallback narrations
├── context/              # React Context (AnalysisModeContext) for global state management
├── data/                 # Data directory
│   ├── precomputed/      # Precomputed result.json and PNG overlays (NO GeoTIFFs committed)
│   │   ├── sylhet/       # result.json, change-map.png, before.png, after.png
│   │   ├── jamuna/       # result.json, change-map.png, before.png, after.png
│   │   ├── amazon/       # result.json, change-map.png, before.png, after.png
│   │   └── tanguar/      # result.json, change-map.png, before.png, after.png
│   ├── samples/          # Local sample GeoTIFF rasters (gitignored)
│   └── README.md         # Data provenance and regeneration instructions
├── hooks/                # Custom React hooks (useChangeData, useUploadChangeData)
├── lib/                  # Utilities (AI insight fallback, image processing helpers)
├── public/               # Static assets & Leaflet marker/layer graphics (zero CDN)
│   └── leaflet/images/   # Bundled Leaflet marker-icon, shadow, and layers graphics
├── python-service/       # Python SAR change detection pipeline (rasterio, numpy, scipy)
│   ├── process_change.py # Core deterministic change detection engine
│   ├── requirements.txt  # Python package requirements
│   └── test_process_change.py # Unit tests
├── scripts/              # Helper scripts
│   ├── download-fonts.mjs # Font downloader utility
│   └── gee/              # Google Earth Engine data export scripts (JavaScript)
│       ├── export_sylhet.js
│       ├── export_jamuna.js
│       ├── export_amazon.js
│       └── export_tanguar.js
├── types/                # TypeScript type definitions (AOI, GeoJSON, metrics, etc.)
├── DESIGN_SYSTEM.md      # Strict typography, palette & layout rules
└── OFFLINE-CHECKLIST.md  # Comprehensive offline readiness checklist
```

---

## Limitations

- **No Groundwater Measurement**: Synthetic Aperture Radar (SAR) backscatter interacts exclusively with the Earth's upper surface skin and vegetative canopy (a few millimeters to centimeters depending on microwave frequency and soil moisture). **SAR cannot penetrate into deep sub-surface aquifers or measure groundwater storage directly.**
- **Default Heuristic Thresholds**: Detection thresholds (e.g., `-16.0 dB` for VV water detection, `-3.0 dB` for forest canopy loss) are empirical baseline defaults. In operational scenarios, these thresholds must be validated and calibrated against local field observations, in-situ hydrological river gauges, or meteorological data.
- **Indicative Remote Sensing Estimates**: Computed change areas, percentages, and confidence scores are indicative estimates intended for rapid disaster response, environmental screening, and situational awareness. They do not constitute cadastral land surveys or definitive legal boundary demarcations.
- **Environmental & Geometric Effects**: Surface roughness induced by strong winds across open water bodies, extreme variations in soil moisture, and radar layover/shadow effects in high-relief mountainous topography can influence backscatter coefficients.

---

## Data and Credits

- **Copernicus Sentinel-1 Data**: Contains modified Copernicus Sentinel data [2019–2024], operated by the European Space Agency (ESA) and accessed via Google Earth Engine and the Alaska Satellite Facility (ASF) DAAC under the European Commission's Copernicus Open Access Policy.
- **OpenStreetMap**: Interactive basemap tiles and reference geography provided by © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, licensed under the Open Data Commons Open Database License (ODbL).

---

## License

This project is open source and licensed under the [Apache License 2.0](LICENSE).  
Copyright © 2026 Ajoy Roy.
