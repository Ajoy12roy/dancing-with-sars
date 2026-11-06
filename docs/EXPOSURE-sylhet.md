# Sylhet Flood Exposure Analytics: Input Data Checks (Day 8a)

## 1. Population Input: WorldPop Bangladesh 2020

- **Source File**: `data/samples/worldpop/bgd_ppp_2020.tif` (copied from Day 8-R verified download)
- **Official URL**: `https://hub.worldpop.org/geodata/summary?id=28451`
- **File Size**: 80,527,506 bytes ($76.80\text{ MB}$)
- **Coordinate Reference System (CRS)**: `EPSG:4326` (WGS84)
- **Pixel Resolution**: $0.00083333^\circ \times 0.00083333^\circ$ (3.00 arc-seconds, $\approx 100\text{ m}$ at equator)
- **Data Type**: `float32`
- **NoData Value**: `-99999.0`
- **Raster Dimensions**: 7,272 rows $\times$ 5,596 columns
- **Spatial Bounds**: `[88.010416°E, 20.574583°N, 92.673750°E, 26.634583°N]`
- **Valid Pixels Count**: 16,977,358 pixels
- **Pixel Value Range**: $[0.0839, 3288.4536]$
- **National Raster Sum over Bangladesh**: $165,977,696.00$ ($165,977,696\text{ people}$)
- **Count vs. Density Verification**: Confirmed as a people-per-pixel COUNT raster (not a density per $\text{km}^2$), as the unweighted raster sum directly reproduces the 2020 national population of Bangladesh ($\approx 166\text{ million}$).
  - Dataset page excerpt on units: *"The units are number of people per pixel with country totals adjusted to match"* (14 words).
- **Licence**: Creative Commons Attribution 4.0 International (CC BY 4.0).
  - Licence excerpt: *"WorldPop datasets are available under the Creative Commons Attribution 4.0 International License."* (11 words).
- **Recommended Citation**:
  - Full sentence: *WorldPop (www.worldpop.org - School of Geography and Environmental Science, University of Southampton; Department of Geography and Geosciences, University of Louisville; Departement de Geographie, Universite de Namur) and Center for International Earth Science Information Network (CIESIN), Columbia University (2018). Global High Resolution Population Denominators Project - Funded by The Bill and Melinda Gates Foundation (OPP1134076). https://dx.doi.org/10.5258/SOTON/WP00660*
  - Citation excerpt: *"WorldPop (www.worldpop.org - School of Geography and Environmental Science, University of Southampton"* (12 words).

---

## 2. Administrative Boundaries: OCHA / HDX COD-AB

- **Directory Checked**: `data/samples/bgd-admin/`
- **Status**: **NOT RUN: admin boundaries not provided**
- **Observation**: `data/samples/bgd-admin/` does not exist or is empty; automated downloads from HDX are blocked by AWS WAF. In accordance with the prompt instructions, processing continues at the study area level without per-upazila results.

---

## 3. Comparison with Earlier Prototype (Day 8b Verification)

The earlier prototype differed by about 2.3% (72,703 vs 74,413 exposed people); the cause is not established.
