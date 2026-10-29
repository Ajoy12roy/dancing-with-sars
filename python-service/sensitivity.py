#!/usr/bin/env python3
"""
Sensitivity Analysis Module — Dancing with the SARs (TerraPulse)
Measures variation in headline area and percentage when the core threshold is perturbed.
Strictly relies on the existing deterministic process_change pipeline without code duplication.
"""

import os
import sys
import json
import argparse
import subprocess
from typing import Dict, Any, List, Optional, Tuple

# Ensure python-service directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from process_change import run_change_detection

WATER_MODES = {"flood", "river-erosion", "surface-water"}
DEFORESTATION_MODES = {"deforestation"}

def get_git_commit_hash() -> str:
    """Retrieve the current git commit hash."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=True,
            text=True,
            check=True
        )
        return res.stdout.strip()
    except Exception:
        return "unknown"

def compute_case_sensitivity(
    case_id: str,
    samples_dir: str,
    precomputed_dir: str,
    out_dir: Optional[str] = None
) -> Tuple[bool, Optional[Dict[str, Any]], str]:
    """
    Computes threshold sensitivity for a given case study.
    Returns (success, result_dict, message).
    """
    precomputed_json_path = os.path.join(precomputed_dir, case_id, "result.json")
    if not os.path.exists(precomputed_json_path):
        return False, None, f"Precomputed result.json missing for {case_id}"

    image_a = os.path.join(samples_dir, case_id, "image_a.tif")
    image_b = os.path.join(samples_dir, case_id, "image_b.tif")

    if not os.path.exists(image_a) or not os.path.exists(image_b):
        missing = image_a if not os.path.exists(image_a) else image_b
        return False, None, f"Input raster not found: {missing}"

    with open(precomputed_json_path, "r", encoding="utf-8") as f:
        stored_result = json.load(f)

    mode = stored_result.get("mode", "flood")
    stored_aff = stored_result.get("affectedAreaKm2")
    stored_pct = stored_result.get("percentChanged")
    stored_params = stored_result.get("params", {})

    min_pixels = stored_params.get("minPixels", 20)
    filter_size = stored_params.get("filterSize", 5)
    river_buffer = stored_params.get("riverBuffer", 5)
    band = stored_params.get("band", 1)
    polarization = stored_params.get("polarization", "VV")

    if mode in DEFORESTATION_MODES:
        param_name = "loss_threshold_db"
        unit = "dB"
        # Real centre value read from stored parameters or code default (-3.0 dB)
        center_val = float(stored_params.get("lossThresholdDb", -3.0))
        # Deforestation: centre +- 1.0 dB in 0.5 dB steps (5 values: e.g. -4.0, -3.5, -3.0, -2.5, -2.0)
        steps_vals = [
            round(center_val - 1.0, 1),
            round(center_val - 0.5, 1),
            round(center_val, 1),
            round(center_val + 0.5, 1),
            round(center_val + 1.0, 1)
        ]
    else:
        param_name = "water_threshold"
        unit = "dB"
        # Real centre value read from stored parameters or code default (-16.0 dB)
        center_val = float(stored_params.get("waterThresholdDb", -16.0))
        # Water modes: centre +- 2 dB in 1 dB steps (5 values: e.g. -18.0, -17.0, -16.0, -15.0, -14.0)
        steps_vals = [
            round(center_val - 2.0, 1),
            round(center_val - 1.0, 1),
            round(center_val, 1),
            round(center_val + 1.0, 1),
            round(center_val + 2.0, 1)
        ]

    # --- Step 2b: Integrity check on centre run ---
    def run_pipeline(threshold_val: float) -> Dict[str, Any]:
        if mode in DEFORESTATION_MODES:
            return run_change_detection(
                image_a_path=image_a,
                image_b_path=image_b,
                mode=mode,
                loss_threshold_db=threshold_val,
                min_pixels=min_pixels,
                filter_size=filter_size,
                band=band,
                polarization=polarization
            )
        else:
            return run_change_detection(
                image_a_path=image_a,
                image_b_path=image_b,
                mode=mode,
                water_threshold=threshold_val,
                min_pixels=min_pixels,
                river_buffer=river_buffer,
                filter_size=filter_size,
                band=band,
                polarization=polarization
            )

    center_run = run_pipeline(center_val)
    center_aff = center_run.get("affectedAreaKm2", 0.0)
    center_pct = center_run.get("percentChanged", 0.0)

    # Check match to the rounding stored in result.json
    aff_match = round(center_aff, 2) == round(stored_aff, 2)
    pct_match = round(center_pct, 2) == round(stored_pct, 2)

    if not (aff_match and pct_match):
        return False, None, (
            f"Integrity check failed for {case_id}: "
            f"stored ({stored_aff} km², {stored_pct}%) != "
            f"computed ({center_aff} km², {center_pct}%)"
        )

    # --- Compute steps across threshold spectrum ---
    steps_data: List[Dict[str, Any]] = []
    for val in steps_vals:
        if val == center_val:
            step_aff = center_aff
            step_pct = center_pct
        else:
            step_run = run_pipeline(val)
            step_aff = step_run.get("affectedAreaKm2", 0.0)
            step_pct = step_run.get("percentChanged", 0.0)

        steps_data.append({
            "value": val,
            "areaKm2": round(float(step_aff), 2),
            "percentChanged": round(float(step_pct), 2)
        })

    areas = [s["areaKm2"] for s in steps_data]
    min_area = min(areas)
    max_area = max(areas)

    commit_hash = get_git_commit_hash()

    result_payload: Dict[str, Any] = {
        "caseId": case_id,
        "mode": mode,
        "parameterName": param_name,
        "unit": unit,
        "centre": center_val,
        "steps": steps_data,
        "minAreaKm2": min_area,
        "maxAreaKm2": max_area,
        "computedBy": "python-service/sensitivity.py",
        "gitCommit": commit_hash
    }

    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        out_file = os.path.join(out_dir, f"{case_id}.json")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(result_payload, f, indent=2)

    return True, result_payload, "OK"


def main():
    parser = argparse.ArgumentParser(description="Compute threshold sensitivity for SAR change detection.")
    parser.add_argument("--case", type=str, default="all", help="Case study ID or 'all'")
    parser.add_argument("--samples-dir", type=str, default="../data/samples", help="Path to input samples directory")
    parser.add_argument("--precomputed-dir", type=str, default="../data/precomputed", help="Path to precomputed data")
    parser.add_argument("--out-dir", type=str, default="../data/sensitivity", help="Path to output sensitivity directory")
    args = parser.parse_args()

    ready_cases = [
        "sylhet",
        "jamuna",
        "amazon",
        "tanguar",
        "feni-2024",
        "sindh-pakistan-2022",
        "rio-grande-do-sul-2024",
        "padma-naria",
        "cox-bazar-kutupalong-2017",
        "hakaluki-haor"
    ]

    target_cases = ready_cases if args.case == "all" else [args.case]

    print("================================================================================")
    print("TerraPulse SAR Sensitivity Analysis")
    print(f"Target cases: {', '.join(target_cases)}")
    print(f"Output directory: {os.path.abspath(args.out_dir)}")
    print("================================================================================")

    results = []
    for cid in target_cases:
        print(f"\nProcessing sensitivity for [{cid}]...")
        success, payload, msg = compute_case_sensitivity(
            case_id=cid,
            samples_dir=args.samples_dir,
            precomputed_dir=args.precomputed_dir,
            out_dir=args.out_dir
        )
        if success and payload:
            print(f"  Integrity Check: PASSED (centre={payload['centre']} {payload['unit']})")
            print(f"  Range: {payload['minAreaKm2']} to {payload['maxAreaKm2']} km² across steps:")
            for st in payload["steps"]:
                print(f"    {st['value']:+.1f} {payload['unit']}: {st['areaKm2']:>8.2f} km² ({st['percentChanged']:>6.2f}%)")
            results.append((cid, "PASS", payload["minAreaKm2"], payload["maxAreaKm2"]))
        else:
            print(f"  Integrity Check: FAILED / SKIPPED — {msg}")
            results.append((cid, f"FAIL ({msg})", "N/A", "N/A"))

    print("\n================================================================================")
    print("Sensitivity Analysis Summary Table")
    print(f"{'Case ID':<30} | {'Status':<10} | {'Min Area (km²)':<15} | {'Max Area (km²)'}")
    print("-" * 80)
    for cid, status, mina, maxa in results:
        print(f"{cid:<30} | {status:<10} | {str(mina):<15} | {str(maxa)}")
    print("================================================================================")


if __name__ == "__main__":
    main()
