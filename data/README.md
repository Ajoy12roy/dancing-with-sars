# Cached SAR Data — Dancing with the SARs
#
# This directory holds pre-processed SAR imagery and computed results
# for offline demo support. Structure:
#
# data/
# ├── sylhet/
# │   ├── before.png       # Pre-event SAR preview
# │   ├── after.png        # Post-event SAR preview
# │   ├── change-map.png   # Change detection overlay
# │   └── result.json      # Precomputed statistics
# ├── amazon/
# │   ├── before.png
# │   ├── after.png
# │   ├── change-map.png
# │   └── result.json
# └── README.md
#
# To populate: run python-service/change_detection.py with your GeoTIFFs.
# All files here must be committed so the demo works with wifi off.
