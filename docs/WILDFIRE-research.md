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
