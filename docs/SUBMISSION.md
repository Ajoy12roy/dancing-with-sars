# TerraPulse — NASA Space Apps Challenge 2026 Submission

**Challenge:** Dancing with the SARs (Synthetic Aperture Radar)  
**Project:** TerraPulse  
**Team:** Team Nova Strike's  
**License:** [MIT License](https://github.com/Ajoy12roy/dancing-with-sars/blob/main/LICENSE)  
**Repository:** [github.com/Ajoy12roy/dancing-with-sars](https://github.com/Ajoy12roy/dancing-with-sars)  
**Live Application:** [dancing-with-sars.vercel.app](https://dancing-with-sars.vercel.app)

---

## 1. Project Summary (248 words)

TerraPulse is an open-source, accessible scientific platform for analyzing and interpreting Earth surface changes using Synthetic Aperture Radar (SAR) imagery. Built for the NASA Space Apps Challenge 2026 "Dancing with the SARs", the platform bridges high-resolution satellite radar data with transparent, human-centered environmental insights.

The platform processes dual-frequency SAR observations: European Space Agency / European Commission Copernicus Sentinel-1 C-band (5.405 GHz) backscatter across 10 precomputed global hazard benchmarks, and NASA-ISRO NISAR L-band (1.25 GHz, ~24 cm wavelength) Level-2 geocoded backscatter (GCOV) provisional data distributed by the Alaska Satellite Facility (ASF) DAAC. Through an interactive interface, users inspect before-and-after radar composites, explore multi-threshold sensitivity distributions, review vector shoreline and flood extents, and examine a demographic exposure model combining Sentinel-1 change masks with WorldPop 2020 gridded population counts.

Recognizing that radar backscatter thresholds are empirical and uncalibrated against ground truth, TerraPulse introduces an honesty-first architecture: every headline measurement is accompanied by a systematic parameter perturbation range and an algorithmic sensitivity classification (stable, moderate, high). Furthermore, an inclusive, deterministic speech guide named "Chiku" vocalizes navigation hints, environmental contexts, and algorithmic caveats using the browser's built-in speech synthesis (with priority for installed local English voices; offline availability depends on the voices installed on the device) with zero generative models in the critical path.

TerraPulse demonstrates how satellite radar can democratize environmental monitoring without overclaiming certainty: providing clear observations through cloud decks and storm systems while remaining candid about sensor physics, provisional data statuses, and methodology boundaries.

---

## 2. Challenge Requirements Matrix

| Challenge Ask | What We Did | Where in the Application |
| :--- | :--- | :--- |
| **Use NISAR Data** | Integrated real NASA-ISRO NISAR L-band GCOV (Mode 4005, CRID P05023) provisional observations from ASF DAAC over Hakaluki Haor, Bangladesh. | `/explore#nisar` (Interactive NISAR Card, Multi-Threshold Timeseries SVG, and Preview Grids) |
| **Track Surface Change** | Built change detection engines across four core environmental modes: Flood Inundation, Riverbank Erosion, Deforestation / Disturbance, and Surface Water Dynamics. | `/explore` (Case selector, Interactive Before/After slider, Change vector overlays) |
| **Interactive Application** | Created a responsive web application featuring custom raster graticule coordinate viewers, threshold sensitivity sliders, and interactive geographic comparisons. | `/` (Home landing), `/explore` (Core workspace), `/how-it-works` (Interactive methodology) |
| **Polarizations & Frequencies** | Evaluated C-band (~5.6 cm, Sentinel-1) co-pol VV / cross-pol VH backscatter alongside L-band (~24 cm, NISAR) co-pol HH backscatter. Documented penetration and scattering differences. | `/how-it-works#radar-fundamentals`, `/data-sources` (Sensor technical tables) |
| **Time Series Analysis** | Processed a 10-date NISAR L-band time series (June–October 2026) across an 8-threshold sweep with pre-registered radiometric outlier detection. | `/explore#nisar-threshold-grid` (10-date time series curve with threshold highlighting) |
| **Ancillary Data** | Combined Sentinel-1 flood extents with WorldPop 2020 gridded population data (CC BY 4.0) to estimate demographic exposure across 218.10 km² of Sylhet Basin. | `/explore#exposure` (Sylhet Flood Exposure Card, demographic breakdown table, SVG bar chart) |
| **Physical Drivers as Hypotheses** | Framed backscatter changes as physically grounded hypotheses (specular reflection, double-bounce, volume scattering loss) rather than definitive ground truth. | `/how-it-works#physical-mechanisms`, `/explore#nisar` ("What this could mean" hypothesis block) |
| **Open Source** | Fully public GitHub repository under the permissive MIT License; documented reproducible Python processing scripts, test suites, and clean-clone workflows. | Root `LICENSE`, `README.md`, `python-service/`, `scripts/` |
| **Accessible to Broad Audience** | Built following WCAG 2.2 AA guidelines; not certified. Engineered high-contrast color tokens, keyboard focus outlines, live screen reader announcers (`aria-live`), and "Chiku"—a deterministic browser speech guide. | Header voice toggle, `components/chiku/ChikuGuide.tsx`, `/how-it-works#accessibility` |

---

## 3. Datasets and Satellite Services

| Dataset / Service | Provider / Gateway | Role | Link |
| :--- | :--- | :---: | :--- |
| **Copernicus Sentinel-1 (C-Band SAR GRD)** | European Space Agency (ESA) / European Commission via Google Earth Engine & ASF DAAC | **USED** | [developers.google.com/.../COPERNICUS_S1_GRD](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD) |
| **NASA-ISRO NISAR L-Band SAR (GCOV)** | NASA / ISRO via Alaska Satellite Facility (ASF) DAAC | **USED** | [nisar-docs.asf.alaska.edu/gcov](https://nisar-docs.asf.alaska.edu/gcov/) |
| **WorldPop Global Population Denominators** | University of Southampton / CIESIN Columbia University | **USED** | [hub.worldpop.org/geodata/summary?id=28451](https://hub.worldpop.org/geodata/summary?id=28451) |
| **Google Earth Engine (GEE)** | Google Cloud Platform | **USED** | [earthengine.google.com](https://earthengine.google.com/) |
| **Alaska Satellite Facility (ASF) DAAC** | NASA Earthdata Distributed Active Archive Center | **USED** | [asf.alaska.edu](https://asf.alaska.edu/) |
| **OpenStreetMap** | OpenStreetMap Foundation | **USED** | [openstreetmap.org/copyright](https://www.openstreetmap.org/copyright) |
| **NASA OPERA (DSWx-S1)** | NASA Jet Propulsion Laboratory / PO.DAAC / ASF DAAC | **REFERENCED** | [podaac.jpl.nasa.gov/dataset/OPERA_L3_DSWX-S1_V1](https://podaac.jpl.nasa.gov/dataset/OPERA_L3_DSWX-S1_V1) |
| **JRC Global Surface Water** | European Commission Joint Research Centre | **REFERENCED** | [global-surface-water.appspot.com](https://global-surface-water.appspot.com/) |
| **CEGIS River Morphology Reports** | Center for Environmental & Geographic Information Services | **REFERENCED** | [cegisbd.com](https://cegisbd.com/) |
| **INPE PRODES Deforestation** | Instituto Nacional de Pesquisas Espaciais (Brazil) | **REFERENCED** | [terrabrasilis.dpi.inpe.br](http://terrabrasilis.dpi.inpe.br/) |
| **NASA FIRMS** | NASA Earth Science Data and Information System (ESDIS) | **RESEARCH** | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/) (Wildfire research pipeline built; pre-registered radiometric sanity rule stopped run; no wildfire claims made) |

---

## 4. What This Project Does Not Do (Honest Limitations)

1. **No Forecasting:** It does not forecast floods, fires, or river erosion. The platform observes surface changes between historical satellite passes and does not make predictive forecasts.
2. **No Evacuation or Safety Advice:** It does not give evacuation, relief, or tactical safety advice. Retrospective satellite indicators must never replace authoritative disaster directives.
3. **Uncalibrated Empirical Thresholds:** Thresholds are not calibrated against ground truth; headline results are systematically presented with sensitivity ranges.
4. **Provisional NISAR Data:** NISAR results utilize PROVISIONAL Level-2 GCOV data that will be reprocessed by the science data system, covering a single geometry (Ascending Track 141 Frame 014) and partial coverage of the Hakaluki case bounding box (104.86 km², 32.4%).
5. **Demographic Estimates (Not Census Counts):** Exposure numbers are model estimates based on reprojecting binary SAR flood masks to WorldPop 2020 gridded population rasters (summing population × flood fraction per cell), not census counts of injured, displaced, or sheltered individuals.
6. **No Ground Truth Validation:** No result is validated against ground truth; the platform provides empirical radar change detections and sensitivity distributions, not verified ground truth.
7. **Wildfire Pipeline Result:** An event-first wildfire research pipeline was built combining NASA FIRMS thermal hotspots and NISAR L-band backscatter; however, pre-registered radiometric sanity checks halted the run due to processing artifacts, so no wildfire claims or products are made.

---

## 5. How to Run Locally (Offline Demo)

Precomputed cases, NISAR charts, and the exposure model load from local files and work offline; area search, acquisition lookup, and the AI insight use the internet; analysing uploaded files needs the local processing service.

```bash
# 1. Clone repository
git clone https://github.com/Ajoy12roy/dancing-with-sars.git
cd dancing-with-sars

# 2. Install Node.js dependencies
npm ci

# 3. Start development server (or run production build)
npm run dev
# Or production build:
npx next build --webpack
npx next start
```

Open `http://localhost:3000` in your web browser. All precomputed cases, NISAR charts, and exposure calculations load instantly from local JSON files.

### Run the analysis service locally (for custom GeoTIFF uploads)

```bash
# 1. Install prerequisites (Python 3.10+):
cd python-service
pip install -r requirements.txt

# 2. Start the local analysis server on port 8000:
uvicorn api:app --port 8000
```

---

## 6. How to Reproduce Scientific Computations

### 6.1 NISAR Time Series Extraction & Previews
- **Scripts:** `scripts/nisar/make_previews.py` (generates preview PNGs from sampled GeoTIFFs), `scripts/wildfire/fetch_nisar_windows_r2.py` / `scripts/nisar/download_granule.py` (streaming range requests via Bearer token).
- **Architecture:** Documented in `docs/NISAR-processing.md`; streams 1024×1024 pixel windows via HTTP range requests directly from ASF DAAC Cloud Storage without downloading full granules.
- **Required Environment Variable:** `EARTHDATA_TOKEN` (NASA Earthdata Login Bearer token; only required for online streaming from ASF DAAC).

### 6.2 Sylhet Population Exposure Model
- **Script:** `scripts/exposure/make_sylhet_exposure.py` (invoking `scripts/exposure/calculate_exposure.py`).
- **Required Environment Variable:** None (reads local raster files via GDAL/Rasterio).
- **Execution:** Reprojects binary SAR flood masks to the ~100 m WorldPop 2020 grid using average resampling and computes population count inside extent across threshold steps (-18.0 dB to -14.0 dB).

### 6.3 Baseline Radar Change Detection
- **Script:** `python-service/process_change.py`
- **Execution:**
  ```bash
  python python-service/process_change.py --aoi sylhet --input-dir data/samples/sylhet --output-dir scratch/sylhet_test/ --mode flood --water-threshold -16.0
  ```
  Expected output: Flooded Area 37.19 km² (17.05%).

### 6.4 Area Picker & Earth Engine Script Generator
- **Location:** Primary block of Upload mode on `/explore` (Cards 1 and 2 above the file drop zones).
- **Implementation:** Core math in `lib/aoi.ts`, interactive React component in `components/explore/AoiMapPicker.tsx`, and Next.js backend proxy routes in `app/api/asf-search/route.ts` and `app/api/geocode/route.ts`.
- **Capabilities:**
  - Dynamic Area of Interest (AOI) selection constrained to 2–30 km side lengths and $\le 900\text{ km}^2$.
  - Instant offline presets for 5 benchmark regions: Sylhet, Bangladesh (2022 Monsoon Floods); Tanguar Haor, Bangladesh (Wetland Dynamics); Jamuna River, Bangladesh (Braided Sandbars); Amazon Rainforest, Rondônia, Brazil (Canopy Loss); and Padma River / Naria, Bangladesh (Bank Erosion).
  - Rate-limited geocoding via OpenStreetMap Nominatim with full attribution.
  - Multi-window acquisition query via Alaska Satellite Facility (ASF) DAAC Search API (`/api/asf-search`).
  - Automatic orbit track grouping (`ASCENDING` / `DESCENDING`) isolating valid single-geometry pairs across before and after windows.
  - Parameterized Google Earth Engine export script generator matching `scripts/gee/verified_sylhet_picker.js` / `scripts/gee/export_sylhet.js` with automated spatial scaling keeping raster dimensions $\le 1500\text{ px}$.
- **Honest Boundaries:** Export execution requires a personal Google Earth Engine account; downloaded GeoTIFF pairs are subsequently analyzed by TerraPulse's processing pipeline.

---

## 7. Team & License

- **Team:** Team Nova Strike's (NASA International Space Apps Challenge 2026)
- **Project Repository:** [https://github.com/Ajoy12roy/dancing-with-sars](https://github.com/Ajoy12roy/dancing-with-sars)
- **License:** Open source under the [MIT License](LICENSE).

