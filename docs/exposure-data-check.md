# Exposure Dataset Feasibility & Catalog Verification

This document verifies the technical availability, temporal coverage, spatial resolution, licensing terms, and required attribution for candidate human exposure and land-cover datasets from the Google Earth Engine (GEE) Data Catalog.

In accordance with Step 6 requirements, all entries were verified directly against their official Earth Engine catalog pages via live HTTP queries. **No exposure computation or overlay processing is performed in this step.**

---

## Catalog Verification Summary Table

| Dataset Name | Exact Dataset ID (GEE Snippet) | Catalog ID Match | Temporal Coverage | Spatial Resolution | License | Required Attribution / Citation Text |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **JRC GHSL Population Grid** | `JRC/GHSL/P2023A/GHS_POP` | **MATCH** | `1975-01-01` to `2030-12-31` (5-year epochs) | 100 meters | Open and free data (European Commission Reuse and Copyright Notice) | Schiavina, Marcello; Freire, Sergio; Alessandra Carioli; MacManus, Kytt (2023): GHS-POP R2023A - GHS population grid multitemporal (1975-2030). European Commission, Joint Research Centre (JRC) PID: http://data.europa.eu/89h/2ff68a52-5b5b-4a22-8f40-c41da8332cfe doi:10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE |
| **WorldPop Global Project Population** | `WorldPop/GP/100m/pop` | **MATCH** | `2000-01-01` to `2021-01-01` (Annual) | 92.77 meters (~3 arc-seconds at equator) | Creative Commons Attribution 4.0 International (CC-BY 4.0) | Please cite the WorldPop website as the source: www.worldpop.org. Americas: Sorichetta et al. (2015), Scientific Data, doi:10.1038/sdata.2015.45. Africa: Linard et al. (2012), PLoS ONE, doi:10.1371/journal.pone.0031743. |
| **ESA WorldCover 10m 2021 v200** | `ESA/WorldCover/v200` | **MATCH** | `2021-01-01` to `2022-01-01` (Single epoch 2021) | 10 meters | Creative Commons Attribution 4.0 International (CC-BY 4.0) | Zanaga, D., Van De Kerchove, R., Daems, D., De Keersmaecker, W., Brockmann, C., Kirches, G., Wevers, J., Cartus, O., Santoro, M., Fritz, S., Lesiv, M., Herold, M., Tsendbazar, N.E., Xu, P., Ramoino, F., Arino, O., 2022. ESA WorldCover 10 m 2021 v200. doi:10.5281/zenodo.7254221. |

---

## Detailed Dataset Profiles

### 1. JRC Global Human Settlement Layer: Population (GHS-POP)

- **Dataset ID**: `JRC/GHSL/P2023A/GHS_POP`
- **Earth Engine Snippet**: `ee.ImageCollection("JRC/GHSL/P2023A/GHS_POP")`
- **Producer**: European Commission, Joint Research Centre (EC JRC)
- **Dataset Availability**: `1975-01-01T00:00:00Z` to `2030-12-31T00:00:00Z`
  - Provides residential population estimates disaggregated into 5-year multitemporal epochs: 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025, and 2030.
- **Resolution**: `100 meters` (band `population_count`).
- **License & Reuse Terms**: 
  - Open and free data under the European Commission Reuse and Copyright Notice.
  - Commercial and non-commercial reuse is authorized provided the source and DOI are acknowledged.
- **Official Citation**:
  > Schiavina, Marcello; Freire, Sergio; Alessandra Carioli; MacManus, Kytt (2023): *GHS-POP R2023A - GHS population grid multitemporal (1975-2030)*. European Commission, Joint Research Centre (JRC). PID: `http://data.europa.eu/89h/2ff68a52-5b5b-4a22-8f40-c41da8332cfe`, DOI: `10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE`.
  > Methodology: Pesaresi, M., Schiavina, M., Politis, P., Freire, S. (2023). *GHSL Data Package 2023*, EUR 31448 EN, Publications Office of the European Union, Luxembourg, ISBN 978-92-68-00984-0, DOI: `10.2760/314115`.

---

### 2. WorldPop Global High Resolution Population Counts

- **Dataset ID**: `WorldPop/GP/100m/pop`
- **Earth Engine Snippet**: `ee.ImageCollection("WorldPop/GP/100m/pop")`
- **Producer**: WorldPop (University of Southampton)
- **Dataset Availability**: `2000-01-01T00:00:00Z` to `2021-01-01T00:00:00Z`
  - Provides annual national and regional gridded population counts from 2000 through 2020.
- **Resolution**: `92.77 meters` (~3 arc-seconds at the equator; band `population`).
- **License & Reuse Terms**: 
  - Licensed under the Creative Commons Attribution 4.0 International License (**CC-BY 4.0**).
  - Users are free to copy, distribute, transmit, and adapt the dataset for any purpose as long as clear source attribution is maintained.
- **Official Citation**:
  > Citation required: WorldPop (www.worldpop.org - School of Geography and Environmental Science, University of Southampton; Department of Geography and Geosciences, University of Louisville; Departement de Geographie, Universite de Namur) and Center for International Earth Science Information Network (CIESIN), Columbia University (2018). Global High Resolution Population-Denominators Project - Funded by the Bill and Melinda Gates Foundation (OPP1134076).
  > Americas dataset: Sorichetta, A., et al. (2015). *High-resolution gridded population datasets for Latin America and the Caribbean in 2010, 2015, and 2020*, Scientific Data, DOI: `10.1038/sdata.2015.45`.
  > Africa dataset: Linard, C., et al. (2012). *Population distribution, settlement patterns and accessibility across Africa in 2010*, PLoS ONE, DOI: `10.1371/journal.pone.0031743`.

---

### 3. ESA WorldCover 10 m 2021 v200

- **Dataset ID**: `ESA/WorldCover/v200`
- **Earth Engine Snippet**: `ee.ImageCollection("ESA/WorldCover/v200")`
- **Producer**: ESA WorldCover Consortium (VITO Remote Sensing, Brockmann Consult, Gamma Remote Sensing, IIASA, Wageningen University)
- **Dataset Availability**: `2021-01-01T00:00:00Z` to `2022-01-01T00:00:00Z` (Representative calendar year 2021).
- **Resolution**: `10 meters` (band `Map`, matching Sentinel-1/Sentinel-2 10 m native ground sampling distance).
- **Land Cover Classes**: 11 discrete land cover categories (Tree cover, Shrubland, Grassland, Cropland, Built-up, Bare/sparse vegetation, Snow/ice, Permanent water bodies, Herbaceous wetland, Mangroves, Moss/lichen).
- **License & Reuse Terms**: 
  - Licensed under Creative Commons Attribution 4.0 International (**CC-BY 4.0**).
  - Free and open access for commercial, academic, and non-profit usage.
- **Official Citation**:
  > Zanaga, D., Van De Kerchove, R., Daems, D., De Keersmaecker, W., Brockmann, C., Kirches, G., Wevers, J., Cartus, O., Santoro, M., Fritz, S., Lesiv, M., Herold, M., Tsendbazar, N.E., Xu, P., Ramoino, F., Arino, O., (2022). *ESA WorldCover 10 m 2021 v200*. DOI: `10.5281/zenodo.7254221`.

---

## Architectural Feasibility Assessment for SAR Exposure Overlay

1. **Resolution Alignment**:
   - `ESA/WorldCover/v200` (10 m) matches the exact pixel grid of Terra Pulse's Sentinel-1 and NISAR high-resolution GCOV products (10 m), enabling direct pixel-to-pixel intersection without resampling artifacts.
   - `JRC/GHSL/P2023A/GHS_POP` and `WorldPop/GP/100m/pop` (~100 m) provide population counts suitable for regional aggregate summaries (e.g., estimating total persons living within the flood hazard polygon).
2. **Temporal Alignment**:
   - For historical case studies (e.g., 2022 Sylhet floods, 2024 Rio Grande do Sul floods), JRC GHSL provides 2020 and 2025 epoch grids, and WorldPop provides annual coverage through 2020.
3. **Licensing**:
   - All three datasets are open access under permissive licenses (CC-BY 4.0 and EC JRC Open Access), making them fully compliant with open-source hackathon publication standards provided required attribution texts are cited.
