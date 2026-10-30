# Independent Comparison & Validation Methodology

> **Mandatory Disclaimer:** Agreement with another model or map is not proof of accuracy. Both are estimates. We do not claim our results are validated ground truth. Where independent datasets exist, we measure spatial agreement. Where they do not, we document candidate sources for future comparison.

---

## 1. Validation Philosophy

Satellite Synthetic Aperture Radar (SAR) observations capture dielectric and surface roughness transitions at 10–20 meter resolution. In complex environments—such as flooded vegetation, steep mountainous topography, or dynamic braided rivers—even official reference datasets differ depending on sensor wavelength, acquisition timing, and classification thresholds.

TerraPulse's validation framework treats external datasets as **independent comparators**, evaluating spatial overlap and classification agreement without asserting unverified "ground truth".

---

## 2. Evaluation Metrics

Comparisons are evaluated on a common spatial grid. The reference raster or vector is reprojected and resampled using nearest-neighbor interpolation to match our native raster grid, masking out any non-finite or nodata pixels present in either dataset.

| Metric | Formula | Definition & Scientific Interpretation |
| :--- | :--- | :--- |
| **Intersection over Union (IoU / Jaccard)** | $\frac{TP}{TP + FP + FN}$ | Ratio of area where both models agree on change to the total union of all detected change area. Primary metric for spatial overlap. |
| **Precision** | $\frac{TP}{TP + FP}$ | Fraction of our detected change pixels that are corroborated by the reference dataset. |
| **Recall** | $\frac{TP}{TP + FN}$ | Fraction of the reference dataset's change pixels successfully detected by our pipeline. |
| **F1 Score (Dice Coefficient)** | $\frac{2 \cdot TP}{2 \cdot TP + FP + FN}$ | Harmonic mean of precision and recall. |
| **Our Area ($km^2$)** | $\sum \text{Pred}_{\text{valid}} \times \text{Pixel Area}$ | Total headline change area detected by TerraPulse. |
| **Reference Area ($km^2$)** | $\sum \text{Ref}_{\text{valid}} \times \text{Pixel Area}$ | Total change area reported by the reference dataset within the common valid footprint. |
| **Overlap Area ($km^2$)** | $\sum TP \times \text{Pixel Area}$ | Area where both TerraPulse and the reference dataset simultaneously report change. |
| **Valid Pixel Fraction** | $\frac{\text{Valid Pixels}}{\text{Total Grid Pixels}}$ | Proportion of the target frame containing valid, unmasked data in both rasters. |

### Agreement Categorization

In the user interface, agreement is classified using standard remote sensing overlap bands:
- **High Agreement**: $\text{IoU} \ge 0.60$ ($\ge 60\%$)
- **Moderate Agreement**: $0.30 \le \text{IoU} < 0.60$ ($30\% - 59\%$)
- **Low Agreement**: $\text{IoU} < 0.30$ ($< 30\%$)

---

## 3. Mandatory Integrity Check

To prevent drift between reported headline results and validation comparisons, `python-service/validate.py` executes an automated integrity check before performing any comparison:

1. The exact pipeline function and parameters (`mode`, `water_threshold`, `min_pixels`, `river_buffer`, `loss_threshold_db`, `filter_size`) are read from `data/precomputed/<caseId>/result.json`.
2. The pipeline is re-executed on the original input GeoTIFFs (`data/samples/<caseId>/image_a.tif` and `image_b.tif`).
3. If the recomputed area differs from the stored headline area by **more than $0.05\text{ km}^2$**, execution immediately aborts with:
   ```
   RuntimeError: Integrity check failed: computed area differs from headline
   ```

---

## 4. Execution & Folder Layout

### Directory Layout

External reference datasets should be organized under `data/reference/<case-id>/`:

```
dancing-with-sars/
├── data/
│   ├── samples/
│   │   └── <case-id>/
│   │       ├── image_a.tif
│   │       └── image_b.tif
│   ├── reference/
│   │   └── <case-id>/
│   │       ├── reference_raster.tif      # GeoTIFF raster (e.g. GFM / OPERA / JRC)
│   │       └── reference_vector.geojson  # GeoJSON vector (e.g. Copernicus EMS delineation)
│   └── validation/
│       └── <case-id>.json                # Machine-readable comparison output
```

### Running a Comparison

To compare a case study against a reference raster or GeoJSON vector:

```bash
# Compare a flood case against Copernicus EMS delineation GeoJSON
python python-service/validate.py \
  --case-id rio-grande-do-sul-2024 \
  --ref-path data/reference/rio-grande-do-sul-2024/emsr720_delineation.geojson \
  --ref-name "Copernicus EMS EMSR720" \
  --ref-source "Copernicus Emergency Management Service" \
  --ref-date "2024-05-06" \
  --ref-resolution 10.0 \
  --note "EMSR720 Rapid Mapping delineation derived from multi-sensor optical and radar data"
```

The script outputs `data/validation/<case-id>.json`. The web interface will immediately detect this file and display the **Independent Comparison** card in the case study view.

---

## 5. Candidate Reference Datasets

All candidate reference sources have been verified with active live endpoints:

### Flood & Inundation Cases

| Candidate Dataset | Provider | Access URL | Resolution | Format | Acquisition & Processing Method |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Copernicus EMS Rapid Mapping** (EMSR720, EMSR580) | European Commission / Copernicus | [rapidmapping.emergency.copernicus.eu](https://rapidmapping.emergency.copernicus.eu/) | 10–20 m | GeoJSON / SHP / GeoTIFF | Download emergency activation delineation and grading vector products; clip to AOI bounding box. |
| **Copernicus Global Flood Monitoring (GFM)** | Copernicus Emergency Management Service | [global-flood.emergency.copernicus.eu](https://global-flood.emergency.copernicus.eu/) | 20 m | GeoTIFF | Near-real-time automated global flood extent generated from Sentinel-1 IW GRD via ensemble algorithms. |
| **NASA OPERA DSWx-S1** | NASA JPL / PO.DAAC | [podaac.jpl.nasa.gov](https://podaac.jpl.nasa.gov/dataset/OPERA_L3_DSWX-S1_V1) | 30 m | Cloud-Optimized GeoTIFF | Dynamic Surface Water Extent from Sentinel-1; discoverable via NASA CMR granules search for post-late-2023 acquisitions. |
| **JRC Global Surface Water** | European Commission Joint Research Centre | [global-surface-water.appspot.com](https://global-surface-water.appspot.com/) | 30 m | GeoTIFF | Export multi-decadal water occurrence (`occurrence >= 80%`) via Earth Engine script (`scripts/gee/validation/jrc_permanent_water.js`). |

### Forest Canopy Loss (Deforestation)

| Candidate Dataset | Provider | Access URL | Resolution | Format | Acquisition & Processing Method |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Global Forest Watch (GFW)** | World Resources Institute / Hansen et al. | [globalforestwatch.org](https://www.globalforestwatch.org/) | 30 m | GeoTIFF | Annual global tree cover loss data from Landsat time series. Export via Earth Engine (`UMD/hansen/global_forest_change_2023_v1_11`). |
| **PRODES Amazon** | INPE (National Institute for Space Research, Brazil) | [obt.inpe.br/prodes](http://www.obt.inpe.br/OBT/assuntos/programas/amazonia/prodes) | 20–30 m | SHP / GeoTIFF | Official annual deforestation polygons monitoring clear-cut deforestation across the Legal Amazon. |
| **MapBiomas Brasil** | MapBiomas Consortium | [brasil.mapbiomas.org](https://brasil.mapbiomas.org/) | 30 m | GeoTIFF | Annual land cover and land use transition maps (Collection 8/9) classifying natural forest to pasture/agriculture. |

### River Channel Erosion & Morphology

| Candidate Dataset | Provider | Access URL | Resolution | Format | Acquisition & Processing Method |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **JRC Water Occurrence Transition** | European Commission Joint Research Centre | [global-surface-water.appspot.com](https://global-surface-water.appspot.com/) | 30 m | GeoTIFF | Distinguishes historical channel baseline from newly eroded riverbanks using multi-year recurrence. |
| **CEGIS Morphological Assessments** | Center for Environmental & Geographic Information Services | [cegisbd.com](https://www.cegisbd.com/) | Reports / Vector | PDF / Vector | Annual riverbank erosion vulnerability forecasts and historical cross-section surveys for Jamuna and Padma rivers. |

### Rapid Refugee Settlement (Cox's Bazar)

| Candidate Dataset | Provider | Access URL | Resolution | Format | Acquisition & Processing Method |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **UNHCR Settlement Extents** | UNHCR Operational Data Portal | [data.unhcr.org](https://data.unhcr.org/en/situations/myanmar_refugees) | Vector | GeoJSON / SHP | Official camp block boundaries and expansion perimeters mapped during the August–September 2017 influx. |
| **Copernicus EMS EMSR235** | Copernicus Emergency Management Service | [rapidmapping.emergency.copernicus.eu/EMSR235](https://rapidmapping.emergency.copernicus.eu/EMSR235) | High-res | GeoTIFF / Vector | Emergency activation maps capturing early camp formation and vegetation clearing around Kutupalong in 2017. |
| **REACH Initiative Influx Assessments** | REACH / IMPACT Initiatives | [reach-initiative.org](https://www.reach-initiative.org/) | Vector / GeoTIFF | Spatial Shapefiles | Multi-sector settlement density surveys documenting infrastructure expansion and hillside terracing. |
