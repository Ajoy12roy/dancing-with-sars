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

- **Node.js**: `20.9.0` or later (as required by Next.js 16 in `package.json` engines and [`.nvmrc`](.nvmrc)).
- **npm**: `9.x` or later.
- **Python**: Tested with Python 3.14 on Windows; **Python 3.11 or 3.12 is strongly recommended** (specified in [`.python-version`](.python-version)) to ensure pre-compiled binary wheels for `rasterio` and its underlying GDAL bindings are readily available across Windows, macOS, and Linux without requiring local C++ compilation.

> [!CAUTION]
> **Security Notice**: The custom GeoTIFF Upload feature executes local Python processes on uploaded files and is strictly intended for local / workstation analysis. **Do not deploy or expose this upload endpoint publicly** on untrusted networks without sandboxed container environments and authentication.

---

### Quick Start

Clone the repository and run the single setup script for your platform:

#### Windows (PowerShell)
```powershell
# 1. Clone repository
git clone https://github.com/Ajoy12roy/dancing-with-sars.git
cd dancing-with-sars

# 2. Run setup script (creates python-service/.venv, installs dependencies, prepares .env.local)
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

# 3. Start development server
npm run dev
```

#### macOS / Linux (Bash)
```bash
# 1. Clone repository
git clone https://github.com/Ajoy12roy/dancing-with-sars.git
cd dancing-with-sars

# 2. Run setup script (creates python-service/.venv, installs dependencies, prepares .env.local)
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. Start development server
npm run dev
```

Once running, open [http://localhost:3000](http://localhost:3000) in your web browser.

---

### What Works Offline

This platform was built to work completely offline with zero network connectivity and zero external API keys:

1. **No API Key Required (`GEMINI_API_KEY`)**:
   - The application does not require a Google Gemini API key to run or build.
   - When no `GEMINI_API_KEY` is provided in `.env.local` (or if your computer is offline), the AI interpretation panel automatically falls back to an **offline summary** generated deterministically from the real computed remote sensing metrics.
2. **No Python Required for Quick Demo**:
   - The **Quick Demo** tab on `/explore` works out-of-the-box without Python installed. It uses committed, precomputed assets (`result.json`, `change-map.png`, `before.png`, `after.png`) for all four demonstration areas (Sylhet, Jamuna, Amazon, Tanguar Haor).
   - If Python is not installed, the **Upload Your Own** tab displays a clear informational notice and HTTP 503 explanation guiding you back to Quick Demo or advising how to install Python.
3. **Radar Basemap Offline**:
   - Defaults to the local SAR before-scene backscatter overlay with an SVG/polyline graticule (`IBM Plex Mono`) and metric scale bar, requiring no internet connection and no third-party tile downloads.
   - For an exhaustive audit of network dependencies and offline strategies, see [`OFFLINE-CHECKLIST.md`](OFFLINE-CHECKLIST.md).

---

### Run the Checks

To verify code formatting, type safety, production compilation, and Python unit tests:

```bash
# 1. Run ESLint checks
npm run lint

# 2. Validate Next.js production build (does NOT require GEMINI_API_KEY)
npm run build

# 3. Run Python change detection pipeline unit tests
python -m pytest python-service/test_process_change.py
```

*(Alternatively, run `pytest` directly inside the `python-service/` directory after activating the virtual environment).*

---

### Regenerate a Demo Area

The repository includes precomputed outputs for four case studies in `data/precomputed/`. To re-run the deterministic Python processing pipeline from raw GeoTIFF samples, download the imagery via Google Earth Engine (see [`scripts/gee/README.md`](scripts/gee/README.md) and [`data/README.md`](data/README.md)), place `image_a.tif` and `image_b.tif` in `data/samples/<aoi>/`, and execute:

#### Sylhet Flood Inundation (`flood` mode)
```bash
python python-service/process_change.py \
  --aoi sylhet \
  --input-dir data/samples/sylhet \
  --output-dir data/precomputed/sylhet \
  --mode flood \
  --date-a 2022-05-01 \
  --date-b 2022-06-21 \
  --water-threshold -16.0 \
  --min-pixels 20
```

#### Jamuna River Bank Erosion (`river-erosion` mode)
```bash
python python-service/process_change.py \
  --aoi jamuna \
  --input-dir data/samples/jamuna \
  --output-dir data/precomputed/jamuna \
  --mode river-erosion \
  --date-a 2019-02-15 \
  --date-b 2024-02-15 \
  --water-threshold -16.0 \
  --river-buffer 5 \
  --min-pixels 20
```

#### Amazon Forest Canopy Loss (`deforestation` mode)
```bash
python python-service/process_change.py \
  --aoi amazon \
  --input-dir data/samples/amazon \
  --output-dir data/precomputed/amazon \
  --mode deforestation \
  --date-a 2021-01-01 \
  --date-b 2023-01-01 \
  --loss-threshold-db -3.0
```

#### Tanguar Haor Seasonal Water Dynamics (`surface-water` mode)
```bash
python python-service/process_change.py \
  --aoi tanguar \
  --input-dir data/samples/tanguar \
  --output-dir data/precomputed/tanguar \
  --mode surface-water \
  --date-a 2023-02-15 \
  --date-b 2023-08-15 \
  --water-threshold -16.0 \
  --min-pixels 20
```

---

### Troubleshooting

- **Python runtime not found**:
  - Ensure Python is installed and added to your system PATH.
  - On Windows, verify that the `python` or `py` launcher works in PowerShell (`python --version`).
  - You can also explicitly specify your Python executable path via the environment variable `PYTHON_BIN=/path/to/python`.
- **`rasterio` installation fails with C++ or GDAL compilation errors**:
  - This typically happens on very recent Python versions (such as Python 3.13 or 3.14 pre-releases) where binary wheels are not yet available on PyPI.
  - Install Python 3.11 or 3.12 (e.g. via `pyenv` or official installer), where pre-built binary wheels include GDAL and GEOS without compiling.
- **Port 3000 is busy**:
  - Another process is occupying port 3000. Start on a different port:
    ```bash
    PORT=3001 npm run dev
    # or
    npx next dev -p 3001
    ```
- **Custom upload returns HTTP 503**:
  - HTTP 503 indicates that the backend could not invoke Python or is missing required scientific dependencies (`rasterio`, `numpy`, `scipy`, `pillow`, `affine`).
  - Run `scripts/setup.ps1` (Windows) or `scripts/setup.sh` (macOS/Linux) to set up `python-service/.venv`, or manually execute:
    ```bash
    python -m venv python-service/.venv
    # activate .venv and run:
    pip install -r python-service/requirements.txt
    ```
  - Note that you can continue using the **Quick Demo** tab without installing Python.

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
