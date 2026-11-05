# Feasibility Research: Multi-Hazard SAR Analytics (Day 8-R)

## Executive Summary

This document evaluates the scientific and technical feasibility of expanding the Terra Pulse SAR analytics platform from surface water extent and haor monitoring into three additional hazard domains:
1. **Flood Exposure Analytics** (population and administrative impact overlay)
2. **Wildfire Burn Scar Mapping** (combining thermal hotspots with SAR backscatter change)
3. **Volcano Ground Deformation** (interferometric displacement vs. eruption forecasting)

All findings are based on live official API queries, data documentation fetched from authoritative repositories (NASA Earthdata, Alaska Satellite Facility, USGS Volcano Hazards Program, WorldPop, OCHA/HDX), and read-only scratch prototyping.

---

## Part A — Flood Exposure Analytics

### A1. Sylhet Baseline Case & Mask Availability
From `data/case-studies/seed.json` and `data/precomputed/sylhet/result.json`:
- **Bounding Box**: `[91.799917°E, 24.849916°N, 91.950115°E, 24.980172°N]`
- **Observation Dates**: Pre-flood `2022-05-15`, Post-flood `2022-06-08` (June 2022 Sylhet megaflood)
- **Total Study Area**: $218.10\text{ km}^2$
- **Change Mask Storage**: Stored as 8-bit display PNGs (`change-map.png` / `sylhet_change_map.png`) in `data/precomputed/sylhet/`.
- **Pixel-Level Raster Reproducibility**: The pixel-level change mask raster can be reproduced on demand from tracked raw samples `python-service/samples/sylhet/image_a.tif` and `image_b.tif` using the existing pipeline without editing `process_change.py`. Calling `process_change.py` read-only yields:
  - **Grid CRS**: `EPSG:4326` (WGS84)
  - **Pixel Size**: $0.000179663^\circ \times 0.000179663^\circ$ ($\approx 18.14\text{ m}$ E-W $\times 20.00\text{ m}$ N-S at $24.9^\circ\text{N}$, area $\approx 362.8\text{ m}^2/\text{pixel}$)
  - **Raster Shape**: $725\text{ rows} \times 836\text{ columns}$ ($606,100\text{ pixels}$)
  - **New Water Area**: $37.19\text{ km}^2$ ($17.05\%$ of study area) at baseline threshold $-16.0\text{ dB}$ (VV).

### A2. Population Data Candidates

| Dataset | Version / Epoch | Native Resolution | Licence / Terms | Access Method | File Size (Bangladesh / AOI) | Official URL & Citation Excerpt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **WorldPop Bangladesh** (Selected) | 2020 Unconstrained (`bgd_ppp_2020.tif`) | 3 arc-sec ($\approx 100\text{ m}$) | CC BY 4.0 | Direct HTTP 200 (No login required) | $76.80\text{ MB}$ (Full Country GeoTIFF) | `https://hub.worldpop.org/geodata/summary?id=28451`<br>Excerpt: *"WorldPop datasets are available under the Creative Commons Attribution 4.0 International License."* (11 words) |
| **NASA SEDAC GPWv4** | Revision 11 (2020 projection) | 30 arc-sec ($\approx 1\text{ km}$) | CC BY 4.0 | Earthdata Login required (HTTP 303 redirect) | $405.21\text{ MB}$ (Global zip; exceeds 200 MB limit) | `https://cmr.earthdata.nasa.gov/search/collections.json?doi=10.7927/H4JW8BX5`<br>Excerpt: *"Creative Commons Attribution 4.0 International"* (5 words) |
| **Copernicus GHSL (GHS-POP)** | R2023A (2020 epoch) | 3 arc-sec / $100\text{ m}$ | CC BY 4.0 | Open access via European Commission JRC | $\approx 500\text{ MB} - 1.2\text{ GB}$ per tile (exceeds single download limit) | `https://human-settlement.emergency.copernicus.eu/GHSLhowToCite.php`<br>Excerpt: *"The GHSL data are provided under the Creative Commons Attribution 4.0 International (CC BY 4.0)"* (15 words) |

### A3. Administrative Boundaries
- **Dataset**: OCHA / HDX Common Operational Datasets (COD-AB) for Bangladesh
- **Official URL**: `https://data.humdata.org/dataset/cod-ab-bgd`
- **Administrative Levels Available**:
  - Admin 0: National boundary
  - Admin 1: 8 Divisions
  - Admin 2: 64 Districts
  - Admin 3: 507 Upazilas / City Corporations
  - *Note*: Admin 4 (Unions) are **not included** in COD-AB Bangladesh.
- **Licence**: Creative Commons Attribution for Intergovernmental Organisations (CC BY-IGO).
  - Excerpt: *"Creative Commons Attribution for Intergovernmental Organisations"* (5 words).
- **Distribution Formats & Sizes**:
  - Geodatabase: $15.07\text{ MB}$
  - Shapefile: $31.52\text{ MB}$
  - GeoJSON: $36.01\text{ MB}$
  - Excel/XLSX attribute table: $0.60\text{ MB}$
- **Sylhet Inclusion**: Sylhet Division (Admin 1), Sylhet District (Admin 2), and Sylhet upazilas (Sylhet Sadar, Fenchuganj, Golapganj, Balaganj) are present in Admin 3.
- **Automated Access Note**: Programmatic `urllib`/`curl` downloads to `data.humdata.org` return HTTP 202 with header `x-amzn-waf-action: challenge` (AWS WAF anti-bot gate). Direct browser downloads work without restriction.

### A4. Optional Context Layers
- **OpenStreetMap (OSM) Infrastructure**: Roads, clinics, hospitals, emergency shelters.
- **Official URL**: `https://www.openstreetmap.org/copyright`
- **Licence**: Open Data Commons Open Database License (ODbL).
- **Attribution Excerpt**: *"Provide credit to OpenStreetMap by displaying our attribution notice."* (9 words).

### A5. Prototype Execution (`scratch/prototype_flood_exposure.py`)
Using the downloaded WorldPop 2020 Bangladesh raster ($76.8\text{ MB}$) clipped and resampled onto the Sylhet 20m SAR grid ($725 \times 836$), masking nodata (`-99999.0`) and scaling population counts by pixel area ratio:
- **Total Study Area Population**: $1,041,743\text{ residents}$
- **Inundation Exposure (Prototype, Not Validated)**:
  - **Sensitivity Minimum** ($-18.0\text{ dB}$, $30.91\text{ km}^2$ flooded): **$56,349\text{ people}$** ($5.4\%$ of AOI population)
  - **Default Baseline** ($-16.0\text{ dB}$, $37.26\text{ km}^2$ flooded): **$72,703\text{ people}$** ($7.0\%$ of AOI population)
  - **Sensitivity Maximum** ($-14.0\text{ dB}$, $44.05\text{ km}^2$ flooded): **$91,213\text{ people}$** ($8.8\%$ of AOI population)
  - **Exposure Sensitivity Range**: **$56,349\text{ to }91,213\text{ people}$**
- **Primary Error Sources**:
  1. *Resolution Disaggregation*: Disaggregating 100m ambient population into 20m radar pixels assumes uniform distribution within each 100m cell.
  2. *Temporal Mismatch*: 2020 census model vs. June 2022 flood event (unrecorded displacement and demographic shift).
  3. *Vertical Structure & Evacuation*: Ambient population counts assume ground-level presence; in Sylhet urban and peri-urban zones, residents evacuate vertically to upper floors.
  4. *Radar Classification Noise*: Submerged vegetation in haors, specular road reflections, or wind-induced wave roughening alter the inundation boundary.

### A6. Scope of Supported Claims
- **Supported Claims**:
  - *"Estimated ambient resident population living within the SAR-detected flood inundation footprint during the satellite overpass, bounded by radar sensitivity thresholds."*
  - *"Relative spatial concentration of inundated population by administrative upazila."*
- **NOT Supported**:
  - Tactical relief routing or boat navigation plans.
  - Triage casualty, mortality, or injury predictions.
  - Accurate food/shelter quota calculations.

---

## Part B — Wildfire Analytics

### B1. NASA FIRMS API Specifications
- **Official Documentation URL**: `https://firms.modaps.eosdis.nasa.gov/api/area/`
- **Sensor Products Available**:
  - `LANDSAT_NRT` (US/Canada only)
  - `MODIS_NRT` (Near Real-Time, Real-Time, Ultra Real-Time)
  - `MODIS_SP` (Standard Processing / Archive)
  - `VIIRS_NOAA20_NRT`
  - `VIIRS_NOAA20_SP`
  - `VIIRS_NOAA21_NRT`
  - `VIIRS_NOAA21_SP`
  - `VIIRS_SNPP_NRT`
  - `VIIRS_SNPP_SP`
- **Latency / Processing Streams**:
  - Near-Real-Time (`_NRT`): 1–3 hours latency; Ultra Real-Time (`_URT`) within minutes.
  - Standard Processing (`_SP`): Science-quality archive (processed within several months).
- **Key Requirement**:
  - Excerpt: *"Due to heavy server resource demand when generating data, MAP_KEY is needed"* (12 words).
  - Free registration at `https://firms.modaps.eosdis.nasa.gov/api/map_key/`.
- **Request Limits**:
  - Excerpt: *"MAP_KEY limit is 5000 transactions / 10-minute interval ."* (8 words).
- **Date Range Limits**:
  - `DAY_RANGE: 1 .. 5` (number of days to query at one time via area API; up to 10 on certain endpoints).
- **Licence & Attribution Excerpt**:
  - URL: `https://www.earthdata.nasa.gov/data/tools/firms`
  - Excerpt: *"We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System"* (14 words).

### B2. Candidate 2026 Fire Event Identification
- **Status**: `NOT RUN: FIRMS_MAP_KEY not set` (environment variable `FIRMS_MAP_KEY` is not defined in the execution environment).
- **Three Official Alternatives for Identifying 2026 Fire Events**:
  1. **NASA FIRMS Fire Map Web Viewer**:
     - URL: `https://firms.modaps.eosdis.nasa.gov/map/`
     - Description: Interactive global web viewer displaying thermal anomalies without requiring an API key.
     - Excerpt: `https://www.earthdata.nasa.gov/data/tools/firms`: *"FIRMS was developed to provide near real-time active fire locations to natural resource managers"* (14 words).
  2. **Global Wildfire Information System (GWIS)**:
     - URL: `https://gwis.jrc.ec.europa.eu/`
     - Description: Joint initiative of GEO and Copernicus providing global fire danger and near-real-time burnt area events.
     - Excerpt: `https://gwis.jrc.ec.europa.eu/`: *"The Global Wildfire Information System (GWIS) is a joint initiative of the GEO and the Copernicus"* (15 words).
  3. **NASA Earth Observatory (Fires Topic)**:
     - URL: `https://earthobservatory.nasa.gov/topic/fires`
     - Description: Curated satellite documentation of major global wildfire incidents.
     - Excerpt: `https://earthobservatory.nasa.gov/topic/fires`: *"human-set fires spread in a landscape parched by drought."* (9 words).

### B3. NASA CMR Coverage Check for Candidate Wildfires
Queried NASA CMR for `NISAR_L2_GCOV_PROVISIONAL_V1` granules covering candidate 2026 fire events:

1. **Candidate 1: Chile Biobio Wildfire Region** (`[-73.5°W, -38.0°S, -71.5°W, -36.5°S]`):
   - **Pre-Event Granule**: `NISAR_L2_PR_GCOV_014_003_A_159_2005_DHDH_A_20260226T105150_20260226T105226_P05023_N_F_J_001`
     - Acquisition Date: `2026-02-26T10:51:50Z` (Track 159, Frame 2005, Ascending)
   - **Post-Event Granule**: `NISAR_L2_PR_GCOV_015_003_A_159_2005_DHDH_A_20260310T105150_20260310T105226_P05023_N_F_J_001`
     - Acquisition Date: `2026-03-10T10:51:50Z` (Track 159, Frame 2005, Ascending)
   - **Repeat Period**: Exactly 12 days on the identical orbital track and frame.

2. **Candidate 2: Brazil Pantanal / Corumbá Region** (`[-58.0°W, -20.0°S, -56.5°W, -18.5°S]`):
   - CMR Hits: 0.
   - Status: **No coverage found** in the 2026 provisional collection.

3. **Candidate 3: Texas Panhandle Region** (`[-102.0°W, 35.0°N, -100.0°W, 36.5°N]`):
   - CMR Hits: 0.
   - Status: **No coverage found** in the 2026 provisional collection.

### B4. SAR Wildfire Documentation & Sentinel-1 Fallback
- **Documentation Verification**:
  - `https://nisar-docs.asf.alaska.edu/gcov/`: Excerpt: *"Geocoded Polarimetric Covariance ( GCOV ) products provide calibrated backscatter measurements corrected for both radiometric and terrain distortions"* (15 words). Wildfire and burn scars are not explicitly documented on `nisar-docs.asf.alaska.edu` (**NOT VERIFIED** for fire keywords on ASF NISAR docs).
  - General SAR Remote Sensing Principles: Wildfires remove vegetative canopy, reducing microwave volume scattering (especially in cross-polarization VH or HV). However, post-fire soil exposure and moisture shifts can increase surface backscatter, causing ambiguous net changes.
- **Sentinel-1 Fallback in Existing Pipeline**:
  - `python-service/process_change.py` already implements `mode="deforestation"` using cross-polarization VH with `loss_threshold_db=-3.0 dB`.
  - Because canopy combustion produces severe volume scattering loss analogous to deforestation, Sentinel-1 GRD VH pre-fire and post-fire pairs can be processed directly by the existing codebase without adding any new dependencies.

### B5. Scope of Supported Claims
- **Supported Claims**:
  - *"Burned-area change in SAR backscatter compared with thermal hotspots."*
  - *"Observed reduction in radar volume backscatter (VH/HV) within regions of satellite-confirmed active fire detections."*
- **NOT Supported**:
  - Real-time active flame detection (SAR measures physical surface structure, not emitted heat).
  - Fire spread forecasting or flame front propagation.
  - Smoke plume or air quality dispersion.

---

## Part C — Volcano Deformation Analytics

### C1. NISAR Provisional Products & Deformation Suitability
From `https://nisar-docs.asf.alaska.edu/availability-overview/`:
- **NISAR Provisional Products Released (July 2026, CRID P05023)**:
  - `RRSD`: Radar Raw Signal Data (Level-0B)
  - `RSLC`: Range Doppler Single Look Complex (Level-1)
  - `GSLC`: Geocoded Single Look Complex (Level-1)
  - `GCOV`: Geocoded Polarimetric Covariance (Level-2)
  - `RIFG`: Range Doppler Wrapped Interferogram (Level-2)
  - `RUNW`: Range Doppler Unwrapped Interferogram (Level-2)
  - `GUNW`: Geocoded Unwrapped Interferogram (Level-2)
  - `ROFF`: Range Doppler Pixel Offsets (Level-2)
  - `GOFF`: Geocoded Pixel Offsets (Level-2)
- **Documentation Excerpts**:
  - *"NISAR PROVISIONAL collections are available for all mission products from Level 0 to Level 3"* (15 words).
  - *"These products are fully calibrated and have undergone validation at a limited set of sites"* (15 words).
- **Suitability for Surface Deformation**:
  - **Deformation-Capable**: `GUNW` (Geocoded Unwrapped Interferograms), `RIFG`, `RUNW`, `GOFF` provide phase interferometry and pixel offsets measuring centimeter-to-millimeter surface displacement along the radar line-of-sight.
  - **NOT Deformation-Capable**: `GCOV` (calibrated backscatter amplitude) only reflects surface roughness and dielectric changes, not millimeter ground deformation.

### C2. Authoritative Volcano Monitoring Principles
From USGS Volcano Hazards Program (`https://www.usgs.gov/programs/VHP/comprehensive-monitoring-provides-timely-warnings-volcano-reawakening` and `https://www.usgs.gov/faqs/how-can-we-tell-when-a-volcano-will-erupt`):
- **Monitoring Requirements Excerpt**:
  - *"monitoring should include several types of observations (earthquakes, ground movement, volcanic gas"* (12 words).
- **Forecasting Uncertainty Excerpt**:
  - *"or they can subside at any time and not be followed by an eruption."* (14 words).
  - *"These precursors do not indicate the type or scale of an expected eruption"* (12 words).
- **Single-Sensor Eruption Probability**:
  - **NOT VERIFIED**. No authoritative volcano observatory (USGS, Smithsonian GVP, INGV) produces or validates an eruption probability percentage from a single sensor. Ground inflation can persist for decades or subside without an eruption (e.g., Campi Flegrei, Yellowstone).

### C3. Scientific Conclusion & Disclaimer Policy
**Conclusion**: An eruption probability percentage **CANNOT** be computed from data available to this project. Eruption forecasting requires continuous, multi-parameter monitoring (seismicity networks, gas flux, hydrothermal chemistry) interpreted by mandated geological observatories.

#### Proposed UI Text: What We Deliberately Do Not Predict
1. Terra Pulse does not compute eruption probability percentages or forecast the timing or scale of volcanic eruptions.
2. Volcanic forecasting requires integrated multi-parameter monitoring—including continuous seismic networks, volcanic gas emissions, and thermal measurements—which satellite radar alone cannot provide.
3. Satellite radar observations provide measurements of surface backscatter or line-of-sight displacement, but ground deformation frequently persists for decades or subsides without an eruption.
4. Official volcanic alert levels and evacuation directives are issued exclusively by authorized national volcano observatories.

### C4. 2026 NISAR Volcanic Coverage & Deformation Pipeline Requirements
- **Volcanic AOI**: Hawaii Island (Kīlauea / Mauna Loa), `[-155.8°W, 19.2°N, -155.1°W, 19.6°N]`
- **2026 CMR Coverage**: 29 `NISAR_L2_GUNW_PROVISIONAL_V1` granules available in CMR.
- **Sample Granule**: `NISAR_L2_PR_GUNW_009_072_D_079_010_4000_SH_20260102T045817_20260102T045836_20260114T045817_20260114T045837_P05023_N_P_J_001`
  - Track 079, Frame 010, Descending, Pair dates `2026-01-02` to `2026-01-14`.
- **Pipeline Requirements for a Deformation Demonstration**:
  1. HDF5 / NetCDF reader (`h5py`) to extract unwrapped phase from `/science/LSAR/GUNW/grids/frequencyA/unwrappedPhase/unwrappedPhase`.
  2. Phase-to-displacement conversion: $\Delta r = -\frac{\lambda \cdot \Delta \phi}{4\pi}$ ($\lambda \approx 0.24\text{ m}$ for L-band).
  3. Reference station tie-point selection to convert relative line-of-sight phase into displacement.
  4. Atmospheric delay filtering and temporal coherence masking ($>0.3$).
  5. Colormap rendering (cm LOS displacement) and GeoTIFF export.

---

## Part D — Multi-Hazard Recommendation Matrix

| Hazard Domain | Verdict | Primary Data & Licence | Estimated Implementation Effort | Primary Technical / Scientific Risk | Claims Allowed | Claims NOT Allowed | Mandatory UI Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Flood Exposure** | **FEASIBLE** | - Sentinel-1 / NISAR SAR Water Mask (`process_change.py`)<br>- WorldPop Bangladesh 2020 (CC BY 4.0, $76.8\text{ MB}$)<br>- OCHA/HDX COD-AB Bangladesh (CC BY-IGO) | **8–12 hours**<br>(3–4 Antigravity prompts) | Spatial mismatch between 100m ambient population and 20m SAR pixels; residential night/day census assumption; unmodeled vertical evacuation in multi-story structures. | - Estimated ambient population residing within radar-detected water boundaries.<br>- Sensitivity bounds (min/max range).<br>- Relative district/upazila exposure comparisons. | - Boat/vehicle rescue route dispatching.<br>- Casualty or death toll predictions.<br>- Emergency humanitarian food/medicine quotas. | Banner: *"Prototype exposure model based on 2020 census disaggregation (WorldPop) and 20m SAR inundation. Does not model building height, vertical evacuation, or real-time presence. Not for tactical evacuation dispatch."* |
| **Wildfire (Burn Scars)** | **PARTLY FEASIBLE** | - NASA FIRMS Active Fire Points (VIIRS/MODIS, Open data with citation)<br>- NISAR L2 GCOV (Provisional P05023) or Sentinel-1 VH (`mode="deforestation"`) | **16–24 hours**<br>(6–8 Antigravity prompts) | Temporal revisit latency (6–12 days); backscatter ambiguity where soil exposure and rain counteract vegetative volume loss; cloud-penetrating SAR does not detect active heat. | - Burned-area change in SAR backscatter compared with thermal hotspots.<br>- Delineation of vegetative canopy loss after fire events. | - Real-time active flame detection.<br>- Fire propagation / spread forecasting.<br>- Smoke dispersion / air quality modeling. | Banner: *"SAR measures changes in physical surface structure between repeat orbits (days to weeks apart). Thermal points indicate active heat anomalies at pass time. SAR does not detect active flames or predict fire paths."* |
| **Volcano (Ground Deformation)** | **NOT FEASIBLE** *(for eruption forecasting)*<br><br>**PARTLY FEASIBLE** *(for exploratory InSAR surface displacement)* | - NISAR L2 GUNW (Provisional P05023, public domain)<br>- USGS Volcano Hazards Program reference data | **20–30 hours** *(displacement viewer)*<br><br>*Infinite / Impossible for eruption forecasting* | False alarms from treating deformation as eruption prediction; ground deformation can persist for decades without eruption; phreatic eruptions can occur without deformation. | - Satellite line-of-sight relative surface displacement between two radar acquisitions (cm scale). | - Eruption probability percentages.<br>- Eruption date or time forecasts.<br>- Official volcanic hazard alert designations. | Mandatory Section: *"What We Deliberately Do Not Predict"*. Permanent banner: *"Surface displacement measurements do not predict eruptions. Consult official USGS or national volcano observatories for official hazard alerts."* |

---
