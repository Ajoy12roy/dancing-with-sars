# Data Architecture & Pipeline Assets — Dancing with the SARs

This directory stores satellite imagery assets, precomputed demonstration artifacts, and cached results used for deterministic offline evaluation.

---

## 1. Raw GeoTIFFs are NOT Committed

Due to file size constraints, raw Sentinel-1 Level-1 GRD GeoTIFF files (`*.tif`) are **excluded from Git tracking via `.gitignore`**. 

The repository ships with lightweight, precomputed artifacts in [`data/precomputed/`](precomputed/) (`result.json`, `change-map.png`, `before.png`, `after.png`), allowing the Next.js application to function completely offline without downloading gigabytes of satellite rasters.

---

## 2. Exporting GeoTIFFs with Google Earth Engine (GEE)

To export the original satellite GeoTIFF rasters from Copernicus Sentinel-1:

1. Navigate to the [`scripts/gee/`](../scripts/gee/) directory.
2. Open the corresponding script in the [Google Earth Engine Code Editor](https://code.earthengine.google.com/):
   - [`export_sylhet.js`](../scripts/gee/export_sylhet.js) — Sylhet 2022 flood inundation
   - [`export_jamuna.js`](../scripts/gee/export_jamuna.js) — Jamuna riverbank erosion (2019–2024)
   - [`export_amazon.js`](../scripts/gee/export_amazon.js) — Amazon canopy loss (2021–2023)
   - [`export_tanguar.js`](../scripts/gee/export_tanguar.js) — Tanguar Haor seasonal water dynamics
3. Run the script and trigger the export tasks in the **Tasks** panel to save `image_a.tif` and `image_b.tif` to Google Drive.
4. Download the files into the expected sample layout below.

---

## 3. Expected Folder Layout

When testing or reproducing computations locally, structure your raw rasters as follows:

```
data/
├── precomputed/              # Committed lightweight web assets
│   ├── sylhet/
│   │   ├── before.png        # Grayscale SAR baseline preview (max 1600px)
│   │   ├── after.png         # Grayscale SAR comparison preview (max 1600px)
│   │   ├── change-map.png    # Categorical transparent RGBA PNG overlay
│   │   └── result.json       # Georeferenced metrics, bounds, and category breakdown
│   ├── jamuna/
│   ├── amazon/
│   └── tanguar/
└── samples/                  # Raw GeoTIFF rasters (gitignored)
    ├── sylhet/
    │   ├── image_a.tif       # 2022-05-01/10 baseline (EPSG:4326, VV)
    │   └── image_b.tif       # 2022-06-20/21 comparison (EPSG:4326, VV)
    ├── jamuna/
    │   ├── image_a.tif       # 2019-02-15 baseline (EPSG:4326, VV+VH)
    │   └── image_b.tif       # 2024-02-15 comparison (EPSG:4326, VV+VH)
    ├── amazon/
    │   ├── image_a.tif       # 2021-01-01 baseline (EPSG:4326, VV)
    │   └── image_b.tif       # 2023-01-01 comparison (EPSG:4326, VV)
    └── tanguar/
        ├── image_a.tif       # 2023-02-15 dry season (EPSG:4326, VV+VH)
        └── image_b.tif       # 2023-08-15 monsoon peak (EPSG:4326, VV+VH)
```

---

## 4. Commands to Regenerate `data/precomputed/`

Activate your Python virtual environment and run `python-service/process_change.py`:

### Sylhet Flood Inundation (`flood` mode)
```bash
python python-service/process_change.py \
  --aoi sylhet \
  --input-dir data/samples/sylhet \
  --output-dir data/precomputed/sylhet \
  --mode flood \
  --date-a 2022-05-01 \
  --date-b 2022-06-21 \
  --water-threshold -16.0 \
  --min-pixels 20
```

### Jamuna River Bank Erosion & Accretion (`river-erosion` mode)
```bash
python python-service/process_change.py \
  --aoi jamuna \
  --input-dir data/samples/jamuna \
  --output-dir data/precomputed/jamuna \
  --mode river-erosion \
  --date-a 2019-02-15 \
  --date-b 2024-02-15 \
  --water-threshold -16.0 \
  --river-buffer 5 \
  --min-pixels 20
```

### Amazon Forest Canopy Loss (`deforestation` mode)
```bash
python python-service/process_change.py \
  --aoi amazon \
  --input-dir data/samples/amazon \
  --output-dir data/precomputed/amazon \
  --mode deforestation \
  --date-a 2021-01-01 \
  --date-b 2023-01-01 \
  --loss-threshold-db -3.0
```

### Tanguar Haor Seasonal Water Dynamics (`surface-water` mode)
```bash
python python-service/process_change.py \
  --aoi tanguar \
  --input-dir data/samples/tanguar \
  --output-dir data/precomputed/tanguar \
  --mode surface-water \
  --date-a 2023-02-15 \
  --date-b 2023-08-15 \
  --water-threshold -16.0 \
  --min-pixels 20
```
