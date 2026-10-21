# Sample Upload GeoTIFFs

This folder is reserved for small, co-registered GeoTIFF scene pairs used to test the browser upload and real-time processing feature on the `/explore` page.

Unlike large raw scenes, files placed here are explicitly allowed by `.gitignore` (`!data/sample-uploads/*.tif`).

---

## Test Pair Reference Guide

When testing custom GeoTIFF uploads in the browser interface, configure the analysis mode and dates according to the target scene pair:

| AOI | Recommended Files | Analysis Mode | Recommended Dates | Description & Expected Change |
| :--- | :--- | :--- | :--- | :--- |
| **Sylhet, Bangladesh** | `sylhet_before.tif`<br>`sylhet_after.tif` | **Flood** (`flood`) | Before: `2022-05-05`<br>After: `2022-06-20` | Detects severe monsoon flood inundation across the Surma River basin. Flooded land shows dramatic radar backscatter drops (specular reflection). |
| **Jamuna River, Bangladesh** | `jamuna_before.tif`<br>`jamuna_after.tif` | **River Erosion** (`river-erosion`) | Before: `2019-02-15`<br>After: `2024-02-15` | Quantifies 5-year channel migration, sandbar accretion, and bank erosion along the braided Jamuna River corridor. |
| **Amazon (Rondônia), Brazil** | `amazon_before.tif`<br>`amazon_after.tif` | **Deforestation** (`deforestation`) | Before: `2021-01-01`<br>After: `2023-01-01` | Identifies 2-year tropical forest canopy clearing and disturbance (significant loss in volumetric radar backscatter). |
| **Tanguar Haor, Bangladesh** | `tanguar_before.tif`<br>`tanguar_after.tif` | **Surface Water** (`surface-water`) | Before: `2023-02-15`<br>After: `2023-08-15` | Measures seasonal water body expansion between dry-season wetland baseline and monsoon maximum storage. |

---

## Data Provenance & How to Export

All test imagery originates from **Copernicus Sentinel-1 C-band Synthetic Aperture Radar (SAR)** Ground Range Detected (GRD) products, operated by the European Space Agency (ESA) and accessed via Google Earth Engine (GEE).

To export fresh or cropped test pairs directly from Google Earth Engine:
1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Run the corresponding export script located in [`scripts/gee/`](../../scripts/gee/):
   - [`scripts/gee/export_sylhet.js`](../../scripts/gee/export_sylhet.js)
   - [`scripts/gee/export_jamuna.js`](../../scripts/gee/export_jamuna.js)
   - [`scripts/gee/export_amazon.js`](../../scripts/gee/export_amazon.js)
   - [`scripts/gee/export_tanguar.js`](../../scripts/gee/export_tanguar.js)
3. Download the exported GeoTIFF files from your Google Drive and place them in this folder.

---

## How to Test in the Browser

1. Start the local server:
   ```bash
   npm run dev
   ```
2. Navigate to [http://localhost:3000/explore](http://localhost:3000/explore) and click **"Upload Your Own"**.
3. Choose the **Analysis type** from the dropdown (`Flood`, `River erosion`, `Deforestation`, or `Surface water`).
4. (Optional) Enter the **Before date** and **After date** from the table above.
5. Drag-and-drop or select your `before.tif` and `after.tif` files into the upload zones.
6. Click **Analyze**. The server executes `python-service/process_change.py` locally and renders the resulting change map overlay, category breakdown, metric cards, and radar interpretation.
