#!/usr/bin/env python3
"""
Generate data/exposure/sylhet.json.
Calculates count-conserving population in mapped new-water extent across threshold sweep.
"""

import os
import sys
import json
import subprocess

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPTS_DIR = os.path.join(REPO_ROOT, "scripts", "exposure")
sys.path.insert(0, SCRIPTS_DIR)

import calculate_exposure

def get_git_commit():
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=REPO_ROOT,
            stderr=subprocess.DEVNULL
        ).decode("ascii").strip()
        return commit
    except Exception:
        return "unknown"

def generate_sylhet_exposure():
    print("Computing exposure analytics for Sylhet...")
    results = calculate_exposure.compute_sylhet_exposure()

    commit_hash = get_git_commit()

    rows = []
    for r in results["threshold_rows"]:
        rows.append({
            "thresholdDb": r["threshold_db"],
            "pipelineAreaKm2": r["flooded_area_km2"],
            "estimatedPeopleInExtent": r["estimated_people_in_extent"],
            "populationSharePct": r["population_share_pct"]
        })

    min_row = next(r for r in rows if r["thresholdDb"] == -18.0)
    default_row = next(r for r in rows if r["thresholdDb"] == -16.0)
    max_row = next(r for r in rows if r["thresholdDb"] == -14.0)

    output_data = {
        "schemaVersion": "1.0.0",
        "caseId": "sylhet",
        "quantity": "estimated people living inside the mapped new-water extent",
        "method": "count-conserving areal weighting",
        "populationSource": {
            "name": "WorldPop Global High Resolution Population Denominators",
            "year": 2020,
            "licenceName": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
            "citation": "WorldPop (www.worldpop.org - School of Geography and Environmental Science, University of Southampton; Department of Geography and Geosciences, University of Louisville; Departement de Geographie, Universite de Namur) and Center for International Earth Science Information Network (CIESIN), Columbia University (2018). Global High Resolution Population Denominators Project - Funded by The Bill and Melinda Gates Foundation (OPP1134076).",
            "url": "https://hub.worldpop.org/geodata/summary?id=28451",
            "resolution": "3.00 arc-seconds (~100m at equator)",
            "units": "number of people per pixel with country totals adjusted to match"
        },
        "maskSource": {
            "case": "sylhet",
            "dateBefore": "2022-05-10",
            "dateAfter": "2022-06-20",
            "polarization": "VV",
            "thresholds": [-18.0, -17.0, -16.0, -15.0, -14.0],
            "centreThresholdDb": -16.0
        },
        "perThresholdRows": rows,
        "minDefaultMax": {
            "min": min_row,
            "default": default_row,
            "max": max_row
        },
        "aoiTotalPopulation": results["aoi_total_population"],
        "aoiTotalAreaKm2": results["aoi_total_area_km2"],
        "perUpazila": None,
        "perUpazilaNote": "NOT RUN: admin boundaries not provided",
        "limitations": [
            "Threshold sweep only is reflected in the range; population-model error not included.",
            "Temporal mismatch: 2020 population model vs 2022 flood event.",
            "Spatial resolution mismatch: 100 m population grid vs 20 m SAR flood mask.",
            "Ground-level census dasymetric model; does not account for vertical building evacuation or multistory shelter.",
            "No real-time human presence or mobility tracking.",
            "SAR flood mask accuracy subject to radar shadow, specular non-water surfaces, and emergent vegetation limitations."
        ],
        "status": "prototype, not validated",
        "notFor": [
            "relief routing",
            "casualty estimates"
        ],
        "computedBy": "scripts/exposure/make_sylhet_exposure.py",
        "gitCommit": commit_hash
    }

    out_dir = os.path.join(REPO_ROOT, "data", "exposure")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "sylhet.json")

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    file_size_bytes = os.path.getsize(out_file)
    print(f"Generated {out_file} successfully ({file_size_bytes} bytes / {file_size_bytes / 1024:.2f} KB)")
    return out_file, file_size_bytes

if __name__ == "__main__":
    out_file, size = generate_sylhet_exposure()
