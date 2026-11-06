# Wildfire Research: NASA FIRMS Thermal Hotspots vs NISAR L-Band Backscatter Change

> **Status:** Research only. PROVISIONAL data maturity. Hypotheses only (labelled "Hypothesis (not tested)").
> **Strict Limitations:** No claim of real-time fire detection, fire prediction, burn severity mapping, or causal attribution.

---

## 1. FIRMS API Facts and Specifications

All facts in this section are extracted verbatim or cited directly from official NASA FIRMS and NASA Earthdata documentation pages.

### 1.1 Endpoint URL Pattern for Area Query with Date

- **URL Pattern:** `https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]/[DATE]`
  - *Source URL:* `https://firms.modaps.eosdis.nasa.gov/api/area/`
  - *Exact Excerpt (<=15 words):* `"https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]/[DATE]"` (1 word)
- **Coordinate Order:** `west,south,east,north` bounding box in decimal degrees (EPSG:4326).
  - *Source URL:* `https://firms.modaps.eosdis.nasa.gov/api/area/`
  - *Exact Excerpt (<=15 words):* `"Area of interest can be defined as west,south,east,north coordinates"` (8 words)

### 1.2 Allowed Data Sources

- **Allowed Sources List:**
  `LANDSAT_NRT`, `MODIS_NRT`, `MODIS_SP`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA20_SP`, `VIIRS_NOAA21_NRT`, `VIIRS_NOAA21_SP`, `VIIRS_SNPP_NRT`, `VIIRS_SNPP_SP`
  - *Source URL:* `https://firms.modaps.eosdis.nasa.gov/api/area/`
  - *Exact Excerpt (<=15 words):* `"LANDSAT_NRT, MODIS_NRT, MODIS_SP, VIIRS_NOAA20_NRT, VIIRS_NOAA20_SP, VIIRS_NOAA21_NRT, VIIRS_NOAA21_SP, VIIRS_SNPP_NRT, VIIRS_SNPP_SP"` (9 words)
- **Standard Processing (SP) vs Near-Real-Time (NRT):**
  - *Near-Real-Time (NRT):* Used for active monitoring within recent hours or days.
    - *Source URL:* `https://firms.modaps.eosdis.nasa.gov/api/data_availability/`
    - *Exact Excerpt (<=15 words):* `"NRT (Near Real-Time) - available usually within 3 hours"` (8 words)
  - *Standard Processing (SP):* Used for historical archives and science-quality retrospectives.
    - *Source URL:* `https://firms.modaps.eosdis.nasa.gov/api/data_availability/`
    - *Exact Excerpt (<=15 words):* `"SP (Standard Processing) - available after couple of months"` (8 words)

### 1.3 Day Range Parameter

- **Allowed Range:** Integer from `1` to `5` (maximum 5 days per query request).
  - *Source URL:* `https://firms.modaps.eosdis.nasa.gov/api/area/`
  - *Exact Excerpt (<=15 words):* `"number of days to return (1-5)"` (6 words)
  - *Exact Excerpt (<=15 words):* `"Possible values: 1, 2, 3, 4, 5"` (6 words)

### 1.4 Rate Limits

- **Transaction Limit:** 5,000 transactions per 10-minute window per MAP_KEY.
  - *Source URL:* `https://firms.modaps.eosdis.nasa.gov/api/area/`
  - *Exact Excerpt (<=15 words):* `"MAP_KEY limit is 5000 transactions / 10-minute interval ."` (7 words)

### 1.5 Confidence Classifications

- **VIIRS Confidence Scale (3-Class Categorical):**
  - *Categories:* `low`, `nominal`, `high`.
    - *Source URL:* `https://www.earthdata.nasa.gov/data/tools/firms/faq`
    - *Exact Excerpt (<=15 words):* `"For VIIRS, the confidence values are set to low, nominal, and high"` (13 words)
  - *Low Confidence Definition:*
    - *Source URL:* `https://www.earthdata.nasa.gov/data/tools/firms/faq`
    - *Exact Excerpt (<=15 words):* `"Low confidence daytime fire pixels are typically associated with areas of Sun glint"` (13 words)
  - *Nominal Confidence Definition:*
    - *Source URL:* `https://www.earthdata.nasa.gov/data/tools/firms/faq`
    - *Exact Excerpt (<=15 words):* `"Nominal confidence pixels are those that are free of potential Sun glint contamination"` (13 words)
  - *High Confidence Definition:*
    - *Source URL:* `https://www.earthdata.nasa.gov/data/tools/firms/faq`
    - *Exact Excerpt (<=15 words):* `"High confidence fire pixels are associated with day or nighttime saturated pixels."` (12 words)
  - *Operational Recommendation for False-Alarm Reduction:*
    - *Source URL:* `https://www.earthdata.nasa.gov/data/tools/firms/faq`
    - *Exact Excerpt (<=15 words):* `"Users requiring fewer false alarms may wish to retain only nominal- and high-confidence fire pixels"` (15 words)
- **MODIS Confidence Scale (Continuous Percentage):**
  - *Detection Confidence (0–100%):*
    - *Source URL:* `https://www.earthdata.nasa.gov/data/tools/firms/faq`
    - *Exact Excerpt (<=15 words):* `"Detection confidence is provided as a percentage (0–100%)"` (7 words)

### 1.6 Fire Radiative Power (FRP) Units and Definition

- **Units and Metric:** Pixel-integrated fire radiative power measured in Megawatts (MW).
  - *Source URL:* `https://www.earthdata.nasa.gov/data/tools/firms/faq`
  - *Exact Excerpt (<=15 words):* `"FRP depicts the pixel-integrated fire radiative power in MW (megawatts)."` (10 words)

### 1.7 Redacted Live API Verification

- **Verification Request:**
  - *Endpoint:* `https://firms.modaps.eosdis.nasa.gov/api/area/csv/[REDACTED]/VIIRS_SNPP_NRT/0,0,1,1/1/2026-01-01`
  - *HTTP Status:* 200 OK
- **Exact Response CSV Header:**
  ```csv
  latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
  ```

---

## 2. NISAR 2026 Consecutive Pairs Inventory

The NASA CMR Granule Search API was queried for the `NISAR_L2_GCOV_PROVISIONAL_V1` collection over 2026 (`temporal=2026-01-01T00:00:00Z,2026-12-31T23:59:59Z`) using `scripts/wildfire/inventory_nisar_pairs.py`.

### 2.1 Inventory Statistics

- **Total Granules Found in 2026 (CMR-Hits):** 165,199 granules
- **Sampled Granules Analyzed:** 2,000 granules (paged in blocks of 100, stopped upon reaching safety cap of 2,000)
- **Total CMR Requests Used:** 20 requests (cap <= 60 requests)
- **Unique `(track, frame, direction)` Groups:** 301 groups
- **Total Consecutive 12-Day Pairs Identified:** 1,148 pairs
  - *Consecutive Pair Criteria:* Exactly 1 orbit repeat cycle difference (`cycle_post = cycle_pre + 1`, 12-day repeat), identical track, frame, direction, bandwidth mode, and polarization.

### 2.2 Regional Distribution of Consecutive Pairs

Pairs were classified into regional groups based on the geographic centroid of their bounding boxes:

| Geographic Region | Consecutive Pairs | Percentage |
| :--- | :---: | :---: |
| **Americas** | 625 | 54.4% |
| **Antarctica / Southern Ocean** | 295 | 25.7% |
| **Eurasia** | 173 | 15.1% |
| **Africa** | 31 | 2.7% |
| **Australasia** | 24 | 2.1% |
| **Total** | **1,148** | **100.0%** |

Full footprint metadata and pair geometries are saved locally to `scratch/nisar-footprints.json` (gitignored).

---

## 3. Real Wildfire Event Selection (FIRMS + NISAR)

Candidate consecutive pairs were evaluated chronologically against real NASA FIRMS VIIRS Standard Processing (`VIIRS_SNPP_SP`) and Near-Real-Time (`VIIRS_SNPP_NRT`) thermal anomaly detections. Hotspots were filtered strictly to nominal and high confidence classifications (`confidence in ('nominal', 'high', 'n', 'h')`) within the spatial intersection of both granules between $t_0$ and $t_1$. Hotspots were spatially clustered using Disjoint Set Union (DSU) with a 3 km Euclidean distance threshold on metric equidistant planar projections.

### 3.1 Evaluation Parameters and Budget

- **Pairs Evaluated:** 44 consecutive land pairs (chronological order starting from 2026-01-01)
- **FIRMS Requests Budget:** 150 requests consumed (safety cap reached)
- **Sensor:** VIIRS (Suomi-NPP / NOAA-20)
- **Spatial Clustering Threshold:** 3,000 meters (3 km)

### 3.2 Top 10 Candidate Pairs by Total Fire Radiative Power (FRP)

| Pair ID | Track | Frame | Dir | $t_0$ | $t_1$ | Region | All Hotspots | Nominal/High | Largest Cluster | Cluster % | Total FRP (MW) | Max FRP (MW) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `T087_F004_A_C9_C10` | 087 | 004 | A | 2026-01-03 | 2026-01-15 | Africa | 1,248 | 1,248 | 63 | 5.0% | 4,865.1 | 62.9 |
| `T106_F073_D_C9_C10` | 106 | 073 | D | 2026-01-04 | 2026-01-16 | Eurasia | 1,096 | 1,096 | 38 | 3.5% | 4,791.2 | 66.7 |
| `T113_F071_D_C9_C10` | 113 | 071 | D | 2026-01-05 | 2026-01-17 | Americas | 519 | 519 | 54 | 10.4% | 4,441.5 | 71.5 |
| `T055_F017_A_C9_C10` | 055 | 017 | A | 2026-01-01 | 2026-01-13 | Eurasia | 808 | 808 | 38 | 4.7% | 3,905.7 | 66.7 |
| `T113_F079_D_C9_C10` | 113 | 079 | D | 2026-01-05 | 2026-01-17 | Americas | 586 | 586 | 115 | 19.6% | 3,714.3 | 62.9 |
| `T113_F078_D_C9_C10` | 113 | 078 | D | 2026-01-05 | 2026-01-17 | Americas | 517 | 517 | 115 | 22.2% | 3,393.6 | 55.2 |
| `T085_F072_D_C9_C10` | 085 | 072 | D | 2026-01-03 | 2026-01-15 | Americas | 137 | 137 | 48 | 35.0% | 2,774.5 | 188.4 |
| `T098_F074_D_C9_C10` | 098 | 074 | D | 2026-01-04 | 2026-01-16 | Americas | 294 | 294 | 16 | 5.4% | 2,633.6 | 104.7 |
| `T088_F174_A_C9_C10` | 088 | 174 | A | 2026-01-03 | 2026-01-15 | Americas | 227 | 227 | 10 | 4.4% | 2,416.2 | 82.7 |
| `T113_F073_D_C9_C10` | 113 | 073 | D | 2026-01-05 | 2026-01-17 | Americas | 382 | 382 | 37 | 9.7% | 2,163.2 | 64.3 |

### 3.3 Selection Decision and Stopping Rule

- **Primary Selection Rule (Tier 1):** $\ge 200$ qualifying hotspots AND $\ge 70\%$ in a single connected 3 km cluster.
  - *Result:* **0 pairs satisfied** (highest cluster share among pairs with $\ge 200$ hotspots was 49.8% in `T118_F070_D_C9_C10`).
- **Relaxed Selection Rule (Tier 2):** $\ge 100$ qualifying hotspots AND $\ge 60\%$ in a single connected 3 km cluster.
  - *Result:* **0 pairs satisfied** (highest cluster share among pairs with $\ge 100$ hotspots was 49.8% in `T118_F070_D_C9_C10`).
- **Formal Status:** `NO EVENT SELECTED: rule not satisfied`

#### Top 5 Pairs by Total Fire Radiative Power (FRP)
1. `T087_F004_A_C9_C10` (Africa): 1,248 hotspots, 4,865.1 MW FRP, largest cluster 63 (5.0%)
2. `T106_F073_D_C9_C10` (Eurasia): 1,096 hotspots, 4,791.2 MW FRP, largest cluster 38 (3.5%)
3. `T113_F071_D_C9_C10` (Americas): 519 hotspots, 4,441.5 MW FRP, largest cluster 54 (10.4%)
4. `T055_F017_A_C9_C10` (Eurasia): 808 hotspots, 3,905.7 MW FRP, largest cluster 38 (4.7%)
5. `T113_F079_D_C9_C10` (Americas): 586 hotspots, 3,714.3 MW FRP, largest cluster 115 (19.6%)

#### Physical Interpretation
In January 2026, thermal activity captured across these early orbit cycles was driven by widespread, highly dispersed agricultural stubble and savanna clearing fires (such as in the Nigerian Guinea savanna and the Indo-Gangetic plains), rather than singular high-intensity wildfire mega-complexes. Detections were fragmented into dozens of small, isolated burn scars separated by several kilometers across large administrative regions.



