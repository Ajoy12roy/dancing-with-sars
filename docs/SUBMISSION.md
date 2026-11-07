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

Recognizing that radar backscatter thresholds are empirical and uncalibrated against ground truth, TerraPulse introduces an honesty-first architecture: every headline measurement is accompanied by a systematic parameter perturbation range and an algorithmic sensitivity classification (stable, moderate, high). Furthermore, an inclusive, deterministic speech guide named "Chiku" vocalizes navigation hints, environmental contexts, and algorithmic caveats using the browser's native Web Speech API—operating completely offline with zero generative models in the critical path.

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
| **Accessible to Broad Audience** | Engineered high-contrast WCAG 2.1 AA tokens, keyboard focus outlines, live screen reader announcers (`aria-live`), and "Chiku"—an offline deterministic voice guide. | Header voice toggle, `components/chiku/ChikuGuide.tsx`, `/how-it-works#accessibility` |

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
| **NASA OPERA (DSWx-S1)** | NASA Jet Propulsion Laboratory / ASF DAAC | **REFERENCED** | [opera-docs.asf.alaska.edu](https://opera-docs.asf.alaska.edu/) |
| **JRC Global Surface Water** | European Commission Joint Research Centre | **REFERENCED** | [global-surface-water.appspot.com](https://global-surface-water.appspot.com/) |
| **CEGIS River Morphology Reports** | Center for Environmental & Geographic Information Services | **REFERENCED** | [cegisbd.com](https://cegisbd.com/) |
| **INPE PRODES Deforestation** | Instituto Nacional de Pesquisas Espaciais (Brazil) | **REFERENCED** | [terrabrasilis.dpi.inpe.br](http://terrabrasilis.dpi.inpe.br/) |
| **NASA FIRMS** | NASA Earth Science Data and Information System (ESDIS) | **FUTURE WORK** | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/) |

---

## 4. What This Project Does Not Do (Honest Limitations)

1. **No Forecasting:** It does not forecast floods, fires, or river erosion. The platform observes surface changes between historical satellite passes and does not make predictive forecasts.
2. **No Evacuation or Safety Advice:** It does not give evacuation, relief, or tactical safety advice. Retrospective satellite indicators must never replace authoritative disaster directives.
3. **Uncalibrated Empirical Thresholds:** Thresholds are not calibrated against ground truth; headline results are systematically presented with sensitivity ranges.
4. **Provisional NISAR Data:** NISAR results utilize PROVISIONAL Level-2 GCOV data that will be reprocessed by the science data system, covering a single geometry (Ascending Track 141 Frame 014) and 32.4% of the Hakaluki case bounding box.
5. **Demographic Estimates (Not Counts):** Exposure numbers are areal dasymetric model estimates based on WorldPop 2020 rasters, not counts of injured, displaced, or sheltered individuals.
6. **No Unverified Ground Truth Claims:** No result is claimed as ground-truth validated unless explicitly cross-referenced with a published validation file.

---

## 5. How to Run Locally (Offline Demo)

The entire application runs locally with zero external API dependencies:

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

---

## 6. How to Reproduce Scientific Computations

### 6.1 NISAR Time Series Extraction
- **Script:** `scripts/nisar/stream_window_timeseries.py`
- **Required Environment Variable:** `EARTHDATA_TOKEN` (NASA Earthdata Login Bearer token)
- **Execution:** Streams 1024×1024 pixel windows via HTTP range requests directly from ASF DAAC Cloud Storage without downloading full granules.

### 6.2 Sylhet Population Exposure Model
- **Script:** `scripts/exposure/compute_sylhet_exposure.py`
- **Required Environment Variable:** None (reads local raster files via GDAL/Rasterio)
- **Execution:** Intersects raster cell centers with flood inundation masks across threshold steps (-18.0 dB to -14.0 dB) conserving demographic counts.

### 6.3 Baseline Radar Change Detection
- **Script:** `python-service/process_change.py`
- **Execution:**
  ```bash
  python python-service/process_change.py --aoi sylhet --input-dir data/samples/sylhet --output-dir scratch/sylhet_test/ --mode flood --water-threshold -16.0
  ```
  Expected output: Flooded Area 37.19 km² (17.05%).

---

## 7. Team & License

- **Team:** Team Nova Strike's (NASA International Space Apps Challenge 2026)
- **Project Repository:** [https://github.com/Ajoy12roy/dancing-with-sars](https://github.com/Ajoy12roy/dancing-with-sars)
- **License:** Open source under the [MIT License](LICENSE).

