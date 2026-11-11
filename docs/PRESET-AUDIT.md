# Preset Audit against ASF Search API

**Date:** 2026-11-11  
**Tool:** `scripts/qa/audit-presets.mjs`  
**API Endpoint:** `https://api.daac.asf.alaska.edu/services/search/param`  
**Satellite:** Copernicus Sentinel-1 (C-band SAR, IW mode)  

## Verification Disclaimer
> **Notice:** This audit uses the official Alaska Satellite Facility (ASF) DAAC catalogue as a proxy for Google Earth Engine availability. A real Earth Engine execution for each preset is **NOT VERIFIED**.

---

## Audit Results Table

| Preset ID | Preset Name | Bounding Box [W, S, E, N] | Windows Used (Before / After) | Acquisitions by Group & Window | Chosen Orbit Group | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`sylhet`** | Sylhet Division, Bangladesh (Flood Inundation) | `[91.8, 24.85, 91.95, 24.98]` | **Before:** 2022-05-01 to 2022-05-10<br>**After:** 2022-06-18 to 2022-06-22 | **Before:** DESCENDING 77: 8<br>**After:** DESCENDING 77: 8 | **DESCENDING track 77** | Golden benchmark retained unchanged |
| **`tanguar`** | Tanguar Haor, Bangladesh (Wetland Dynamics) | `[90.98, 25.05, 91.20, 25.22]` | **Before:** 2023-02-01 to 2023-02-25<br>**After:** 2023-08-07 to 2023-08-31 | **Before:** DESCENDING 77: 33, ASCENDING 41: 28, DESCENDING 150: 28, ASCENDING 114: 24<br>**After:** DESCENDING 150: 28, ASCENDING 41: 28, ASCENDING 114: 24, DESCENDING 77: 22 | **DESCENDING track 150** | Stored usable group DESCENDING track 150 (tie-break over ASCENDING 41 per DESCENDING priority) |
| **`jamuna`** | Jamuna River, Bangladesh (Braided Sandbars) | `[89.65, 24.30, 89.95, 24.55]` | **Before:** 2019-02-01 to 2019-02-25<br>**After:** 2024-02-04 to 2024-02-28 | **Before:** ASCENDING 114: 61, DESCENDING 150: 16<br>**After:** ASCENDING 114: 22, DESCENDING 150: 16 | **ASCENDING track 114** | Stored usable group ASCENDING track 114 (highest minimum count: 22) |
| **`amazon`** | Amazon Rainforest, Rondônia, Brazil (Canopy Loss) | `[-62.20, -10.35, -62.00, -10.15]` | **Before:** 2022-08-20 to 2022-09-13<br>**After:** 2023-01-01 to 2023-01-25 | **Before:** DESCENDING 83: 28, DESCENDING 10: 16<br>**After:** DESCENDING 83: 28, DESCENDING 10: 16 | **DESCENDING track 83** | Stored usable group DESCENDING track 83 (highest minimum count: 28) |
| **`padma-naria`** | Padma River / Naria, Bangladesh (Bank Erosion) | `[90.23, 23.31, 90.43, 23.49]` | **Before:** 2017-01-15 to 2017-02-08<br>**After:** 2024-01-15 to 2024-02-08 | **Before:** ASCENDING 114: 21, DESCENDING 150: 17<br>**After:** DESCENDING 150: 28, ASCENDING 114: 22 | **ASCENDING track 114** | Stored usable group ASCENDING track 114 (highest minimum count: 21) |

---

## Methodology & Invariants
1. **Single Orbit Geometry Rule**: A change detection pair must be captured with identical flight direction (ASCENDING vs. DESCENDING) and identical relative orbit number to avoid false positive backscatter changes caused by different look azimuth and incidence angles.
2. **Pacing & Timeout**: All queries to `https://api.daac.asf.alaska.edu/services/search/param` were issued with a minimum 1.0-second delay between requests and a 20-second timeout with up to 3 retries.
3. **Audit Execution**: Real HTTP responses returned `200 OK` for all five preset locations.
