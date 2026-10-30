# Terra Pulse — Dancing with the SARs

> Earth insights. A safer tomorrow. — SAR before/after change-detection platform making NASA-accessible radar data easy for everyone.  
> **NASA International Space Apps Challenge 2026** — Challenge: *"Dancing with the SARs"*

Live demo: <add Render URL>

---

## Team: Team Nova Strike's

- **Team Leader**: Ajoy Roy
- **Team Members**:
  - Neamul Islam Siam
  - Sanjoy Prosad
  - Rajdeep Mondal Rudra
  - Rifat Jahan Anny
  - Md. Nibir Chowdhury

---

## What It Does

Terra Pulse performs bi-temporal change detection using Synthetic Aperture Radar (SAR) satellite imagery. Because SAR sensors transmit active microwave signals that penetrate clouds, rain, haze, smoke, and nocturnal darkness, the platform provides uninterrupted environmental monitoring across weather conditions that obstruct optical satellites.

The platform provides two primary workflows:
1. **Interactive Demo Explorer**: Instant visualization and analysis of **10 fully precomputed demonstration case studies** without requiring a local Python runtime or external API keys.
2. **Custom GeoTIFF Upload**: Ingestion and automated processing of user-uploaded paired SAR scenes (`image_a.tif` and `image_b.tif`) through a dedicated Python service (`python-service/process_change.py`).

### Four Core Environmental Modules

- **Flood Inundation (`flood`)**: Detects newly inundated land where calm water creates specular reflection of radar pulses away from the antenna, causing a sharp backscatter drop compared to dry soil or vegetation.
- **River Bank Erosion & Accretion (`river-erosion`)**: Analyzes channel migration along dynamic braided rivers by identifying land-to-water erosion and water-to-land sediment accretion within a spatial corridor buffered around the active river channel. Computes multi-year net land change and annualized erosion rates.
- **Forest Canopy Loss (`deforestation`)**: Flags canopy loss and clear-cutting by tracking volumetric radar backscatter loss across vegetative crown cover.
- **Surface Water Dynamics (`surface-water`)**: Quantifies seasonal surface water expansion, wetland fluctuations, and lake/reservoir depletion between two observation epochs.

---

## Ready Case Studies

The platform includes **10 READY** case studies bundled with precomputed outputs in `data/precomputed/`:

| Module | Case Study Title | Region & Country | Observation Epochs | Monitored Footprint | Primary Metric Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Flood** | **Sylhet Flood 2022** | Sylhet Basin, Bangladesh | 2022-05-01 → 2022-06-21 | 218.10 km² | Flooded Area: 37.19 km² (17.05%) |
| **River Erosion** | **Jamuna River Erosion** | Jamuna River, Bangladesh | 2019-02-15 → 2024-02-15 | 842.38 km² | Erosion: 47.59 km², Accretion: 42.38 km² |
| **Deforestation** | **Amazon Deforestation** | Rondônia, Brazil | 2021-01-01 → 2023-01-01 | 485.21 km² | Forest Canopy Loss: 0.62 km² |
| **Surface Water** | **Tanguar Haor Seasonal Water** | Sunamganj, Bangladesh | 2023-02-15 → 2023-08-15 | 418.40 km² | Water: 35.99 km² → 298.31 km² (+262.32 km²) |
| **Flood** | **Feni Flash Flood 2024** | Feni, Bangladesh | 2024-08-05 → 2024-08-21 | 674.20 km² | Flooded Area: 63.88 km² |
| **Flood** | **Pakistan Monsoon Floods 2022** | Sindh (Lake Manchar), Pakistan | 2022-07-20 → 2022-08-30 | 1,842.10 km² | Flooded Area: 412.35 km² |
| **Flood** | **Rio Grande do Sul Floods 2024** | Porto Alegre, Brazil | 2024-04-14 → 2024-05-08 | 512.60 km² | Flooded Area: 58.42 km² |
| **River Erosion** | **Padma River Bank Erosion** | Naria, Bangladesh | 2017-01-15 → 2024-01-15 | 812.50 km² | Bank Erosion: 31.20 km², Accretion: 28.40 km² |
| **Deforestation** | **Kutupalong Camp Forest Loss** | Cox's Bazar, Bangladesh | 2017-01-01 → 2018-01-01 | 492.30 km² | Forest Canopy Loss: 8.45 km² |
| **Surface Water** | **Hakaluki Haor Seasonal Wetland** | Moulvibazar, Bangladesh | 2023-02-15 → 2023-08-01 | 682.10 km² | Water: 42.10 km² → 385.20 km² (+343.10 km²) |

An additional **6 candidate case studies** are registered with status `pending-data` in `data/case-studies/seed.json` (awaiting precomputed imagery ingestion):
- *Majuli Island Erosion* (India, river-erosion)
- *Ucayali River Meander Migration* (Peru, river-erosion)
- *Kalimantan Forest Clearing* (Indonesia, deforestation)
- *Gran Chaco Clearing* (Paraguay, deforestation)
- *Poyang Lake Seasonal Water Extent* (China, surface-water)
- *Lake Urmia Shrinkage* (Iran, surface-water)

---

## Method in 5 Lines

1. **dB Scale Calibration**: Ingests paired SAR rasters via `rasterio`, auto-detecting linear amplitude vs. log scale and converting linear power to decibels using $10 \cdot \log_{10}(\text{amplitude})$.
2. **Speckle Noise Filtering**: Applies a spatial $5 \times 5$ median filter across valid pixels to suppress multiplicative radar speckle noise while preserving sharp water and land boundaries.
3. **Threshold-Based Water Segmentation**: Identifies open water where pixel backscatter drops below a physical threshold (fixed $-16.0\text{ dB}$ for VV, $-22.0\text{ dB}$ for VH).
4. **Morphological Noise Cleanup**: Prunes isolated speckle clusters below 20 connected pixels via `scipy.ndimage.label` and buffers active river corridors for erosion and accretion attribution.
5. **Geodesic Metric Integration**: Multiplies classified pixel counts by exact ellipsoidal ground area (accounting for latitude cosine scaling) to compute verified surface extent in square kilometers ($\text{km}^2$).

*Scientific Statement: This change detection methodology follows established peer-reviewed SAR remote sensing practices; it has NOT been formally validated, certified, or endorsed by NASA, ESA, or any governmental agency.*

---

## Data Sources & Provenance

- **Copernicus Sentinel-1 (C-Band SAR GRD)**:
  - All demo cases use Level-1 Ground Range Detected (GRD) scenes captured by the Copernicus Sentinel-1 constellation (European Space Agency / European Commission) at 10 m spatial resolution.
  - In our demo pipeline, scenes were accessed via **Google Earth Engine (GEE)** collection [`COPERNICUS/S1_GRD`](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD).
  - The exact same Sentinel-1 scenes are also publicly archived and freely distributed by NASA's SAR distributed active archive center:
    - [NASA Earthdata](https://www.earthdata.nasa.gov/)
    - [Alaska Satellite Facility (ASF) DAAC](https://asf.alaska.edu/)
    - [ASF Data Search (Vertex)](https://search.asf.alaska.edu/)
    - [ASF HyP3 On-Demand Processing](https://hyp3-docs.asf.alaska.edu/)
- **NASA Space Apps Challenge**:
  - Official challenge resource: [NASA Space Apps Challenge](https://www.spaceappschallenge.org/)

---

## Known Limitations

1. **Signal Strength is Not a Probability**: The displayed "Signal strength" metric represents the mean absolute backscatter change ($\Delta\text{dB}$) across detected change pixels scaled from 0 to 100%. It reflects radar contrast intensity, **not** a statistical probability, classification accuracy, or certainty score.
2. **Conservative VV-Only Forest Sensitivity**: When cross-polarized VH data is unavailable and single-band VV is used for deforestation analysis, forest loss estimates are conservative because VV is dominated by surface scattering rather than crown volume scattering.
3. **River Erosion Dynamics**: Bankline erosion and accretion figures include seasonal river stage variations and sandbar (char) sedimentation effects; dry-season low-flow baseline pairs are required for long-term morphological stability.
4. **Urban and Vegetated Flood Inundation**: Specular water detection can underestimate flooding in dense urban environments (due to double-bounce corner reflection off buildings) and beneath dense tree canopies.
5. **Algorithmic Threshold Sensitivity Classes**: The sensitivity span ratio $\frac{\text{maxArea} - \text{minArea}}{\text{centreArea}}$ varies across geographic environments:
   - **Stable (<15% span)**:
     - `sindh-pakistan-2022` (6.8% span)
     - `tanguar` (6.9% span)
     - `hakaluki-haor` (10.2% span)
     - `padma-naria` (11.8% span)
     *Characteristics*: Broad, open water bodies and flat wetlands with sharp radiometric contrast between calm water (<-18 dB) and surrounding terrain.
   - **Moderate (15–50% span)**:
     - `jamuna` (22.3% span)
     - `sylhet` (35.4% span)
     *Characteristics*: Dynamic braided sandbars and mixed wetland fringes with gradual moisture gradients.
   - **High (>50% span)**:
     - `rio-grande-do-sul-2024` (84.9% span)
     - `feni-2024` (102.8% span)
     - `cox-bazar-kutupalong-2017` (618.2% span)
     - `amazon` (740.3% span)
     *What makes an AOI sensitive*:
     - **Narrow valleys and steep terrain**: Mountain slopes induce radar layover, shadowing, and geometric foreshortening (e.g. Cox's Bazar hills).
     - **Urban and settlement structures**: Built infrastructure creates high double-bounce backscatter that masks standing water along streets.
     - **Subtle backscatter gradients / low contrast**: Selective logging and diffuse degradation produce fractional decibel shifts (e.g. Amazon canopy thinning), where small threshold moves trigger large area changes.
     - *Interpretation*: For high-sensitivity cases, headline figures should be treated as **indicative estimates**, and decision-makers should inspect the full sensitivity bracket.

---

## Validation Status & Independent Comparison

> **Scientific Honesty Notice**: Agreement with another model or map is not proof of accuracy. Both are estimates. We do not claim our results are validated ground truth. Where independent datasets exist, we measure spatial agreement. Where they do not, we document candidate sources for future comparison.

- **Current Validation Status**: Documented in full on [`/data-sources`](http://localhost:3000/data-sources) and in [`docs/VALIDATION.md`](docs/VALIDATION.md).
- **NASA CMR Archive Coverage**: We queried the NASA Common Metadata Repository (CMR) for `OPERA_L3_DSWX-S1_V1` granules across all 10 ready cases:
  - **Feni Flash Flood (2024)**: **2 granules confirmed available** in the NASA CMR archive.
  - **Pre-2023 cases** (`sylhet`, `sindh-pakistan-2022`, `cox-bazar-kutupalong-2017`): Pre-date OPERA S1 operational archive launch (late 2023).
  - **Full coverage table**: See [`docs/validation-coverage.md`](docs/validation-coverage.md).
- **Candidate Reference Datasets**: Documented with verified working URLs in [`docs/VALIDATION.md`](docs/VALIDATION.md) (Copernicus EMS Rapid Mapping activations EMSR720, EMSR580, EMSR235; Copernicus GFM; NASA OPERA DSWx-S1; JRC Global Surface Water; Global Forest Watch; INPE PRODES; MapBiomas Brasil; CEGIS Bangladesh; REACH/UNHCR).

---

## Project Structure

```
dancing-with-sars/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes (/api/ai-insight, /api/change-detection, /api/images)
│   ├── data-sources/         # Open data citations, NASA platforms & access guide
│   ├── explore/              # Interactive SAR viewer (Leaflet map + stats + AI insight)
│   ├── how-it-works/         # Methodological explanations and formula walk-throughs
│   ├── privacy/              # Privacy notice
│   ├── terms/                # Legal terms & open-access policy
│   ├── layout.tsx            # Global metadata, layout, self-hosted fonts
│   └── page.tsx              # Landing page
├── components/               # React UI Components
│   ├── ai/                   # AI insight panel & fallback narration
│   ├── home/                 # Landing page sections (Hero, Pipeline, Data Sources)
│   ├── layout/               # Navbar, Footer (with NASA open data column)
│   ├── ui/                   # Reusable hairline cards, tabs, buttons
│   └── visualization/        # Stats panels, Leaflet map, radar graticule basemap
├── constants/                # Mode configurations, dataset metadata, design tokens
├── data/
│   ├── case-studies/         # Registry metadata (seed.json)
│   ├── precomputed/          # 10 ready cases (result.json, before/after/change-map PNGs)
│   └── samples/              # Bundled sample GeoTIFF rasters (Sylhet flood)
├── lib/
│   ├── ai-insight-fallback.ts # Deterministic offline narrative generator
│   ├── case-studies.ts       # Central case study registry and helpers
│   └── utils/                # Formatting and spatial math utilities
├── python-service/           # Deterministic Python Processing Service
│   ├── process_change.py     # Core SAR pipeline (dB conversion, filter, thresholding)
│   ├── api.py                # FastAPI microservice for custom uploads
│   ├── test_process_change.py # Unit tests (16 test cases)
│   ├── Dockerfile            # Container deployment specification
│   └── requirements.txt      # Python dependencies (rasterio, numpy, scipy, pillow)
├── tools/                    # Repository check utilities (check-case-studies.mjs)
├── LICENSE                   # MIT License (2026 Team Nova Strike's)
├── package.json              # Next.js application config (terra-pulse)
└── README.md                 # Project documentation
```

---

## Running Locally

### 1. Prerequisites
- **Node.js**: `20.9.0` or later
- **npm**: `9.x` or later
- **Python**: `3.11` to `3.14` (with `pip`)

### 2. Frontend Development Server
```bash
# 1. Install dependencies
npm install

# 2. Run the Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application with all 10 precomputed demo cases available immediately.

### 3. Running Python Unit Tests
The repository includes a comprehensive 16-test unit test suite verifying synthetic rasters, known geometric targets, thresholding, and scale conversion:
```bash
cd python-service
python -m pytest
```
*Expected: 16 passed.*

### 4. Running the Bundled Sylhet Benchmark
Verify deterministic reproduction of the Sylhet flood case:
```bash
cd python-service
python process_change.py \
  --aoi sylhet \
  --input-dir samples/sylhet \
  --output-dir output_test \
  --mode flood \
  --date-a 2022-05-01 \
  --date-b 2022-06-21
```
*Expected output: Flooded Area 37.19 km² (17.05%), identical to `data/precomputed/sylhet/result.json`.*

### 5. Running the Python API Service (Optional)
```bash
cd python-service
uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

---

## Reproduce the Sensitivity Analysis

To evaluate how sensitive change detection results are to variations in the classification threshold, Terra Pulse includes a standalone sensitivity analysis pipeline (`python-service/sensitivity.py`).

### Input Folder Layout
The sensitivity pipeline expects paired GeoTIFF scenes for each case study in:
```
data/samples/<caseId>/
├── image_a.tif    # Pre-event / baseline GeoTIFF
└── image_b.tif    # Post-event / current GeoTIFF
```

### Running the Analysis
To compute sensitivity ranges across all 10 ready cases and verify exact reproduction against stored precomputed benchmarks:
```bash
cd python-service
python sensitivity.py
```
Outputs are saved as JSON files in `data/sensitivity/<caseId>.json`.

To run sensitivity for a single case:
```bash
cd python-service
python sensitivity.py --case sylhet
```

To run the sensitivity test suite (schema validation and centre-value integrity checks):
```bash
cd python-service
python -m pytest test_sensitivity.py
```

---

## Reproduce the Validation Checks

To verify independent dataset availability, test spatial comparison algorithms, and evaluate agreement against reference rasters/vectors:

### 1. Check NASA OPERA DSWx-S1 Coverage (CMR Query)
Queries the NASA CMR API across all 10 ready cases for `OPERA_L3_DSWX-S1_V1` granules:
```bash
python scripts/validation/check_opera_coverage.py
```
Outputs a live coverage summary table and updates `docs/validation-coverage.md`.

### 2. Run the Validation Test Suite
Verifies binary metric calculations (IoU, precision, recall, F1) on synthetic binary arrays and rasterio coordinate reprojection:
```bash
pytest python-service/test_validate.py
```
*Expected: 5 passed.*

### 3. Run an Independent Comparison
To compare any ready case against an external GeoTIFF or GeoJSON reference dataset (with automatic pipeline integrity check):
```bash
python python-service/validate.py \
  --case-id sylhet \
  --ref-path data/reference/sylhet/reference.tif \
  --ref-name "Copernicus EMS" \
  --ref-source "Copernicus Emergency Management Service" \
  --ref-date "2022-06-21"
```
Outputs `data/validation/<caseId>.json`, which is automatically rendered in the user interface.

---

## Offline Demo Reliability

The web application is engineered for zero-dependency offline resilience during hackathon judging and presentations:
- **Offline Radar Basemap**: When offline or if tile requests fail, the map automatically falls back to an SVG graticule coordinate canvas with the SAR `before.png` satellite scene (no third-party tile server required).
- **Self-Hosted Typography**: All fonts (`Source Serif 4`, `Public Sans`, `IBM Plex Mono`) are bundled locally in `app/fonts/`.
- **Deterministic Offline AI Insights**: When no Google Gemini API key is configured or network is disconnected, the platform produces structured 3-sentence scientific summaries directly from computed backscatter metrics.

---

## Future Work

- **NASA/ISRO NISAR L-Band Integration**: Incorporate upcoming 24 cm L-band SAR data from the NASA-ISRO SAR mission (`https://nisar.jpl.nasa.gov/`) for enhanced forest canopy penetration and ground deformation monitoring.
- **Interferometric SAR (InSAR)**: Implement phase coherence differencing for sub-centimeter land subsidence, sinkholes, and structural risk assessment.
- **Dual-Pol VH Ingestion for Deforestation**: Standardize dual-polarization cross-ratio processing ($\text{VH}/\text{VV}$) across all tropical forest monitoring basins.
- **Rigorous Ground-Truth Validation**: Conduct formal statistical error matrix validation and Cohen's kappa coefficient scoring against certified in-situ hydrological stations and high-resolution commercial optical orthomosaics.

---

## License & Attribution

- **Software License**: Distributed under the [MIT License](LICENSE). Copyright © 2026 Team Nova Strike's.
- **Data Attribution**: Contains modified Copernicus Sentinel data (2026), processed with Google Earth Engine.
- **Disclaimer**: Independent hackathon project developed for the NASA International Space Apps Challenge. Not endorsed by NASA, ESA, or any space agency.
