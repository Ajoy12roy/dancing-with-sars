# SAR Change Detection Service (`process_change.py`)

Deterministic radar remote sensing pipeline for Sentinel-1 / SAR imagery analysis, supporting flood inundation mapping, riverbank erosion/accretion dynamics, forest canopy loss (deforestation), and surface water area accounting.

---

## Capabilities & Analysis Modes

| Mode | Target Phenomenon | Core Methodology | Primary Metric |
| :--- | :--- | :--- | :--- |
| `flood` *(default)* | Flood inundation & recession | Water transition class 2 (land $\to$ new water) | `floodedAreaKm2` |
| `river-erosion` | River channel migration | Dilated persistent river (class 1) intersected with class 2 (erosion) & class 3 (accretion) | `erosionAreaKm2`, `accretionAreaKm2`, `netLandChangeKm2`, `erosionRateKm2PerYear` |
| `deforestation` | Forest canopy clearing | Backscatter loss $\Delta \text{dB} \le -3.0$ dB (VH preferred) minus small speckle noise | `forestLossKm2` |
| `surface-water` | Reservoir / wetland storage | Total water in Scene A vs Scene B, delta km², and percentage change | `waterAreaAKm2`, `waterAreaBKm2`, `waterDeltaKm2`, `waterDeltaPercent` |

---

## CLI Options

| Argument | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--aoi` | `string` | *(required)* | Identifier for the Area of Interest (e.g. `sylhet`, `jamuna`, `amazon`). |
| `--input-dir` | `path` | *(required)* | Path to directory containing `image_a.tif` and `image_b.tif`. |
| `--output-dir` | `path` | *(required)* | Destination directory for output maps and metrics. |
| `--mode` | `string` | `flood` | Mode: `flood`, `river-erosion`, `deforestation`, `surface-water`, or `change`. |
| `--date-a` | `string` | `None` | Acquisition date of image A in ISO format (`YYYY-MM-DD`). |
| `--date-b` | `string` | `None` | Acquisition date of image B in ISO format (`YYYY-MM-DD`). |
| `--water-threshold`| `float` | `None` | Water threshold in dB (defaults: `-16.0` dB for VV, `-22.0` dB for VH). |
| `--min-pixels` | `int` | `20` | Minimum connected component size in pixels (removes speckle/noise). |
| `--river-buffer` | `int` | `5` | Dilation distance in pixels from persistent water channel for river bank erosion/accretion. |
| `--loss-threshold-db`| `float` | `-3.0` | Deforestation backscatter drop threshold in dB (loss $\le$ threshold). |
| `--band` | `int` | `None` | Explicit band index: `1` (VV) or `2` (VH). |
| `--polarization` | `string` | `None` | Desired polarization: `'VV'` or `'VH'`. |
| `--threshold` | `float` | `3.0` | dB magnitude threshold for legacy `change` mode. |

---

## Example Commands

### 1. Flood Inundation Analysis
Detect newly inundated land (class 2) caused by seasonal monsoons or heavy rainfall:
```bash
python process_change.py \
  --aoi sylhet \
  --input-dir ./data/sylhet \
  --output-dir ./output/sylhet \
  --mode flood \
  --date-a 2022-05-10 \
  --date-b 2022-06-18
```

### 2. River Bank Erosion & Accretion Analysis
Track river channel movement, erosion of banks, accretion of sandbars (chars), and annualized erosion rate:
```bash
python process_change.py \
  --aoi jamuna \
  --input-dir ./data/jamuna \
  --output-dir ./output/jamuna \
  --mode river-erosion \
  --river-buffer 5 \
  --date-a 2021-10-15 \
  --date-b 2022-10-20
```

### 3. Forest Canopy Loss (Deforestation)
Detect forest clearance using cross-polarized VH backscatter drops ($\le -3.0$ dB):
```bash
python process_change.py \
  --aoi amazon \
  --input-dir ./data/amazon \
  --output-dir ./output/amazon \
  --mode deforestation \
  --loss-threshold-db -3.0 \
  --date-a 2023-01-10 \
  --date-b 2023-07-15
```

### 4. Surface Water Body Monitoring
Measure seasonal water extent expansion or lake/reservoir shrinkage:
```bash
python process_change.py \
  --aoi kaptai \
  --input-dir ./data/kaptai \
  --output-dir ./output/kaptai \
  --mode surface-water \
  --date-a 2023-03-01 \
  --date-b 2023-09-01
```

---

## Output Files

For every execution, the output directory contains:

- `result.json`: Comprehensive structured output including mode metadata, area metrics in km², coordinate bounds (EPSG:4326), confidence score, signal strength, date intervals, and warnings.
- `change-map.png`: Transparent-background RGBA overlay (max 2000px wide, reprojected to EPSG:4326 if needed) using design system color palette:
  - Flagged hazard change (new flood water, bank erosion, forest loss, surface-water loss): `#A8462E`
  - Opposite change (deposition/accretion, receded water, surface-water gain): `#2C5C61`
  - Persistent water channel / water body: `#7D8A92` (50% opacity)
  - Stable land / background: Transparent (`[0, 0, 0, 0]`)
- `before.png` & `after.png`: 8-bit grayscale preview images normalized to `-25..0` dB, max 1600px wide (kept intact if already generated).

---

## Running Unit Tests

Run the full pytest suite with synthetic test rasters and hand-computed geometric verification:
```bash
python -m pytest
```
