# Google Earth Engine (GEE) Export Scripts

This directory contains JavaScript export scripts for the Google Earth Engine (GEE) Code Editor ([code.earthengine.google.com](https://code.earthengine.google.com/)). They were used to extract the Sentinel-1 GRD SAR GeoTIFF sample pairs for the four demonstration Areas of Interest (AOIs).

---

## Script Files

| Script | AOI | Phenomena | Mode | Bounds (EPSG:4326) | Scale | Bands |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [`export_sylhet.js`](export_sylhet.js) | Sylhet, Bangladesh | 2022 Monsoon Floods | `flood` | `[91.800, 24.850, 91.950, 24.980]` | 20m | VV |
| [`export_jamuna.js`](export_jamuna.js) | Jamuna River, Bangladesh | 5-Year River Bank Erosion | `river-erosion` | `[89.650, 24.300, 89.950, 24.550]` | 30m | VV, VH |
| [`export_amazon.js`](export_amazon.js) | Rondônia, Brazil | 2-Year Forest Canopy Loss | `deforestation` | `[-62.200, -10.350, -62.000, -10.150]` | 20m | VV |
| [`export_tanguar.js`](export_tanguar.js) | Tanguar Haor, Bangladesh | Seasonal Wetland Water Dynamics | `surface-water` | `[90.980, 25.050, 91.200, 25.220]` | 30m | VV, VH |

---

## How to Run in Google Earth Engine

1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Copy and paste the contents of the desired script (e.g., `export_sylhet.js`) into the script editor.
3. Click **Run**.
4. In the right-hand panel, switch to the **Tasks** tab.
5. Click **Run** on the generated export tasks (`image_a` and `image_b`) to export the GeoTIFF files directly to your Google Drive folder.
6. Once download completes, place the GeoTIFFs into the local repository layout:
   ```
   data/samples/<aoi>/
   ├── image_a.tif
   └── image_b.tif
   ```
7. Regenerate precomputed assets using the commands documented in [`data/README.md`](../../data/README.md).
