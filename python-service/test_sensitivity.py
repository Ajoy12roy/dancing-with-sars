"""
Tests for SAR Sensitivity Analysis Module — Dancing with the SARs (TerraPulse)
"""

import os
import json
import pytest
from sensitivity import compute_case_sensitivity

def test_sylhet_sensitivity_centre_equals_stored():
    """Verify that the Sylhet centre run exactly reproduces the stored result.json values."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    samples_dir = os.path.join(base_dir, "data", "samples")
    precomputed_dir = os.path.join(base_dir, "data", "precomputed")

    # Read precomputed Sylhet baseline
    stored_json_path = os.path.join(precomputed_dir, "sylhet", "result.json")
    assert os.path.exists(stored_json_path), "Stored Sylhet result.json must exist"
    with open(stored_json_path, "r", encoding="utf-8") as f:
        stored_data = json.load(f)

    expected_aff = stored_data["affectedAreaKm2"]
    expected_pct = stored_data["percentChanged"]

    # Compute sensitivity
    success, payload, msg = compute_case_sensitivity(
        case_id="sylhet",
        samples_dir=samples_dir,
        precomputed_dir=precomputed_dir,
        out_dir=None
    )

    assert success is True, f"compute_case_sensitivity failed: {msg}"
    assert payload is not None

    # Centre value check (-16.0 dB)
    centre_step = next((s for s in payload["steps"] if s["value"] == -16.0), None)
    assert centre_step is not None, "Centre step -16.0 dB must exist in steps"
    assert centre_step["areaKm2"] == expected_aff, f"Centre area {centre_step['areaKm2']} must equal stored {expected_aff}"
    assert centre_step["percentChanged"] == expected_pct, f"Centre percent {centre_step['percentChanged']} must equal stored {expected_pct}"

def test_sensitivity_output_schema():
    """Verify that generated sensitivity JSON files adhere to the strict schema."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sens_dir = os.path.join(base_dir, "data", "sensitivity")
    assert os.path.exists(sens_dir), "data/sensitivity must exist"

    sens_files = [f for f in os.listdir(sens_dir) if f.endswith(".json")]
    assert len(sens_files) > 0, "At least one sensitivity file must be present"

    required_top_keys = {
        "caseId", "mode", "parameterName", "unit", "centre",
        "steps", "minAreaKm2", "maxAreaKm2", "computedBy", "gitCommit"
    }

    for sf in sens_files:
        filepath = os.path.join(sens_dir, sf)
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert required_top_keys.issubset(data.keys()), f"Missing keys in {sf}"
        assert isinstance(data["caseId"], str)
        assert isinstance(data["mode"], str)
        assert isinstance(data["parameterName"], str)
        assert isinstance(data["unit"], str)
        assert isinstance(data["centre"], (int, float))
        assert isinstance(data["minAreaKm2"], (int, float))
        assert isinstance(data["maxAreaKm2"], (int, float))
        assert data["minAreaKm2"] <= data["maxAreaKm2"]
        assert isinstance(data["steps"], list)
        assert len(data["steps"]) == 5

        for step in data["steps"]:
            assert "value" in step
            assert "areaKm2" in step
            assert "percentChanged" in step
            assert isinstance(step["value"], (int, float))
            assert isinstance(step["areaKm2"], (int, float))
            assert isinstance(step["percentChanged"], (int, float))
            assert step["areaKm2"] >= 0.0
            assert step["percentChanged"] >= 0.0

def test_sensitivity_classes_match_expected():
    """Verify computed sensitivity classes match expected classifications based on spanRatio."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sens_dir = os.path.join(base_dir, "data", "sensitivity")

    expected_classes = {
        "sindh-pakistan-2022": "stable",
        "tanguar": "stable",
        "hakaluki-haor": "stable",
        "padma-naria": "stable",
        "jamuna": "moderate",
        "sylhet": "moderate",
        "feni-2024": "high",
        "rio-grande-do-sul-2024": "high",
        "amazon": "high",
        "cox-bazar-kutupalong-2017": "high",
    }

    for case_id, expected_cls in expected_classes.items():
        filepath = os.path.join(sens_dir, f"{case_id}.json")
        assert os.path.exists(filepath), f"Sensitivity file for {case_id} must exist"
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        min_area = data["minAreaKm2"]
        max_area = data["maxAreaKm2"]
        centre_val = data["centre"]
        centre_step = next((s for s in data["steps"] if s["value"] == centre_val), None)
        assert centre_step is not None, f"Centre step missing for {case_id}"
        centre_area = centre_step["areaKm2"]
        assert centre_area > 0, f"Centre area must be positive for {case_id}"

        span_ratio = (max_area - min_area) / centre_area
        if span_ratio < 0.15:
            computed_cls = "stable"
        elif span_ratio <= 0.50:
            computed_cls = "moderate"
        else:
            computed_cls = "high"

        assert computed_cls == expected_cls, (
            f"Case {case_id} classified as {computed_cls} (spanRatio={span_ratio:.4f}), "
            f"expected {expected_cls}"
        )


