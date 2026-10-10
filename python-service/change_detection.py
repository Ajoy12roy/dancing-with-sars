# Python SAR Processing Service
# Dancing with the SARs — NASA Space Apps Challenge 2026
#
# This directory will contain the Python processing pipeline:
# - SAR GeoTIFF loading (rasterio)
# - Calibration / normalization
# - Speckle noise reduction (scipy median filter)
# - Change detection (difference, ratio, or log-ratio)
# - Export: change map PNG + statistics JSON
#
# Dependencies: rasterio, numpy, scipy, (optional) FastAPI
#
# Setup:
#   python -m venv .venv
#   .venv\Scripts\activate
#   pip install rasterio numpy scipy
#
# Usage:
#   python change_detection.py --before data/sylhet/before.tif --after data/sylhet/after.tif --output data/sylhet/

print("SAR Processing Service — placeholder. See README for setup instructions.")
