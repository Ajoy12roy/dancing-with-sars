# NISAR L-Band SAR Access & Discovery Guide

## 1. What is NISAR L2 GCOV?

The **NASA-ISRO Synthetic Aperture Radar (NISAR)** is a joint Earth-observing mission equipped with an L-band SAR (1.25 GHz, ~24 cm wavelength, provided by NASA/JPL) and an S-band SAR (3.2 GHz, ~9.3 cm wavelength, provided by ISRO).

The primary analysis-ready backscatter product for terrestrial and hydrological change detection is the **Level 2 Geocoded Polarimetric Covariance (GCOV)** product:
- **Calibrated Radar Backscatter**: Radiometrically Terrain Corrected (RTC) and normalized to Gamma-0 ($\gamma^0$) power values using Copernicus 30-m DEM.
- **Geocoded Map Grids**: Provided directly on standard Universal Transverse Mercator (UTM) map projections with 10-meter or 20-meter pixel spacing.
- **Polarimetric Covariance Terms**: Stored in HDF5 format under `/science/LSAR/GCOV/grids/frequencyA/` with diagonal intensity terms:
  - `HHHH`: Horizontal transmit, Horizontal receive ($|\text{HH}|^2$)
  - `HVHV`: Horizontal transmit, Vertical receive ($|\text{HV}|^2$)
  - `VVVV`: Vertical transmit, Vertical receive ($|\text{VV}|^2$)
  - `VHVH`: Vertical transmit, Horizontal receive ($|\text{VH}|^2$)
- **File Format**: Standard hierarchical HDF5 container (`.h5`) containing calibrated raster arrays, coordinate vectors (`xCoordinates`, `yCoordinates`), and grid mapping metadata (`projection`).

---

## 2. Data Maturity Levels: BETA vs PROVISIONAL

NISAR science products cataloged in the NASA Common Metadata Repository (CMR) adhere to distinct data maturity phases:

| Maturity Level | Collection Short Name | Concept ID | Intended Use & Reprocessing Status |
| :--- | :--- | :---: | :--- |
| **BETA** | `NISAR_L2_GCOV_BETA_V1` | `C3622214170-ASF` | Early post-launch engineering and validation products released to verify format compliance, coordinate registration, and reader pipelines. Not intended for publication-grade scientific change detection. |
| **PROVISIONAL** | `NISAR_L2_GCOV_PROVISIONAL_V1` | `C2854338529-ASF` | Science-grade calibrated products generated with validated processing algorithms. **Important Note**: All provisional data are subject to planned future reprocessing once full on-orbit calibration matrices, antenna patterns, and pointing models stabilize across all observation cycles. |

> **Consistency Rule**: Never mix or pair BETA granules with PROVISIONAL granules in a change-detection pair. Always compare observations with identical maturity tiers.

---

## 3. Mission Timeline & Public Release Dates

As documented by the Alaska Satellite Facility (ASF) and NASA Jet Propulsion Laboratory (JPL):
- **July 20, 2026**: Initial public release of calibrated L-band science data products. This initial release covers science observations acquired on or after **June 17, 2026**.
- **Historical Ingestion**: Earlier commissioning and calibration phase observations are progressively staged and ingested into the public archive.
- **End of 2026**: A complete, fully calibrated first-year mission observation record is scheduled to be available across all global operational tracks.

---

## 4. Search & Discovery Portals

NISAR L-band data distributed by NASA and ASF can be searched, filtered, and previewed using:

1. **ASF Vertex (GUI Portal)**:
   - URL: [https://search.asf.alaska.edu/#/?dataset=NISAR](https://search.asf.alaska.edu/#/?dataset=NISAR)
   - Interactive map-based search with polygon AOI drawing, track/frame filters, polarization mode selectors, and instant footprint visualization.
2. **NASA Earthdata Search**:
   - URL: [https://search.earthdata.nasa.gov/search](https://search.earthdata.nasa.gov/search)
   - Cross-mission NASA catalog searching supporting complex temporal and spatial queries.
3. **ASF Search Python Package (`asf_search`)**:
   - Programmatic search client for automated inventory pipelines and bulk granule queries via Python scripts.

---

## 5. Step-by-Step User Access & Download Guide

Downloading NISAR science data granules from the NASA Earthdata Cloud requires a free Earthdata Login account and an authorized access token.

### Step 1: Create a Free NASA Earthdata Login Account
1. Visit the Earthdata Login portal: [https://urs.earthdata.nasa.gov/](https://urs.earthdata.nasa.gov/)
2. Register for a free account (if you do not already have one).
3. Under **Applications** $\rightarrow$ **Authorized Apps**, authorize the **Alaska Satellite Facility (ASF) DAAC**.

### Step 2: Generate a Personal Access Token
1. In your Earthdata Login profile page, navigate to **Generate Token**.
2. Click **Generate User Token** and copy the resulting alphanumeric token string.

### Step 3: Set Your Session Environment Variable
Set the token for your current terminal session only. **Never write the token into source code or commit it to Git.**

- **PowerShell (Windows)**:
  ```powershell
  $env:EARTHDATA_TOKEN = "your_actual_token_here"
  ```
- **Bash / Zsh (Linux / macOS)**:
  ```bash
  export EARTHDATA_TOKEN="your_actual_token_here"
  ```

### Step 4: Download Granules Using the Repository Downloader
Terra Pulse provides a secure, token-aware downloader script (`scripts/nisar/download_granule.py`):
```bash
python scripts/nisar/download_granule.py <granule_https_url> data/samples/<caseId>/<filename>.h5
```
- **Target Folder**: Downloaded science files should be saved under `data/samples/<caseId>/` (e.g. `data/samples/sylhet/`).
- **Git Safety Verification**: The directory pattern `data/samples/` is explicitly listed in `.gitignore` to prevent multi-gigabyte HDF5 files from entering git tracking.
- **Large File Protection**: Granules exceeding 500 MB require passing the `--yes` confirmation flag to prevent accidental quota exhaustion.
- **Partial Resumption**: The script automatically inspects existing local files and sends HTTP `Range` headers to resume interrupted downloads.

> [!WARNING]
> **Token Security Protocol**: An Earthdata token grants full API access to your profile. Never print, echo, write to `.env` files committed to Git, or paste your token into public chat or PR descriptions.

---

## 6. ISRO S-Band SAR Data (Out of Scope)

ISRO's S-band SAR instrument on NISAR operates primarily over the Indian subcontinent and select polar regions.
- **Distribution Portal**: Distributed independently by ISRO via the **Bhoonidhi Geoportal**: [https://bhoonidhi.nrsc.gov.in](https://bhoonidhi.nrsc.gov.in) (user registration and Indian Space Program credentials required).
- **Project Scope**: Terra Pulse focuses on global L-band coverage through the open NASA/ASF CMR API. ISRO Bhoonidhi S-band data distribution is operated under separate authentication and data governance protocols and is currently **out of scope**.

---

## 7. Official Documentation & Specifications

All technical specifications, HDF5 datasets, and projection definitions were verified against official reference documents:
- **ASF NISAR User Guide (GCOV)**: [https://nisar-docs.asf.alaska.edu/gcov/](https://nisar-docs.asf.alaska.edu/gcov/)
- **NISAR Level 2 GCOV Product Specification**: [Shiroma (2026), Rev F, JPL D-102274](https://cumulus.asf.earthdatacloud.nasa.gov/PUBLIC/DATA/NISAR/NISAR_D-102274_RevF_NASA_SDS_Product_Specification_L2_GCOV_w-esigs.pdf)
- **NASA CMR Collections API**: [https://cmr.earthdata.nasa.gov/search/collections.json](https://cmr.earthdata.nasa.gov/search/collections.json)

*(All 7 reference URLs listed in this guide have been actively validated with HTTP 200 responses).*

---

## 8. NASA Space Apps Challenge 2026 Reference ("Dancing with the SARs")

Key observation targets highlighted by the NASA challenge text:
- wetlands and floodplains
- surface movement on the centimeter scale, such as for earthquakes and land subsidence

