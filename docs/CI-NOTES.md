# CI Notes: Python Pytest Workflow Analysis and Fix

## 1. Problem Description
On GitHub Actions CI runners for Python 3.11 and Python 3.12 (`CI / Python 3.11 (Pytest)` and `CI / Python 3.12 (Pytest)`), the `pytest` step failed while local `pytest` passed.

## 2. Root Cause Established
Evidence from `.github/workflows/ci.yml`, `.gitignore`, and test execution:
1. **Missing Sample TIF Files**:
   - `data/samples/` is explicitly listed in `.gitignore` and is not committed to the repository.
   - `python-service/test_sensitivity.py` looked exclusively for `data/samples/sylhet/sylhet_test_20220516.tif` and `data/samples/sylhet/sylhet_test_20220609.tif`.
   - On a fresh CI runner checkout without `data/samples/`, `test_sensitivity.py` raised `FileNotFoundError`.
2. **Missing Optional NISAR Dependencies**:
   - `python-service/requirements-nisar.txt` contains optional packages (`h5py`, `requests`, `certifi`, `fsspec`).
   - The CI workflow initially installed only `-r python-service/requirements.txt`.
   - `python-service/test_nisar_timeseries.py` imported `h5py` unconditionally at module level, raising `ModuleNotFoundError: No module named 'h5py'`.

## 3. Resolution Applied
In commit `54fedb0` (`fix(ci): robust sample path resolution and optional nisar dependency handling`):
1. **Dependency Installation in CI**:
   - Updated `.github/workflows/ci.yml` to install both `requirements.txt` and `requirements-nisar.txt`:
     ```yaml
     pip install -r python-service/requirements.txt -r python-service/requirements-nisar.txt
     ```
   - Updated cache dependency paths to track both requirement files.
2. **Graceful Dependency Fallback**:
   - In `python-service/test_nisar_timeseries.py`, replaced raw `import h5py` with `h5py = pytest.importorskip("h5py")`, allowing tests to skip cleanly if run in a minimal Python environment without NISAR dependencies.
3. **Sample Path Resolution**:
   - In `python-service/test_sensitivity.py`, updated sample path resolution to check `data/samples/sylhet/` first, fallback to the tracked `python-service/samples/sylhet/` directory (where sample test rasters are checked into git), and if neither is available, call `pytest.skip("Sylhet sample files not present")` rather than crashing on missing gitignored data.

## 4. Verification
- All 35 tests pass locally with `pytest python-service/`:
  - 17 test_change.py tests
  - 5 test_validation.py tests
  - 5 test_sensitivity.py tests
  - 6 test_nisar_gcov.py tests
  - 2 test_nisar_timeseries.py tests
- No assertions weakened, no tests removed.


## 5. Update: Dependency Installation Failure on Python 3.11 (Fixed)

### GitHub Actions Failure Log
In GitHub Actions CI job `CI / Python 3.11 (Pytest)`:
```text
ERROR: Ignored the following versions that require a different python version: 1.5.0 Requires-Python >=3.12; 1.5.1 Requires-Python >=3.12
ERROR: No matching distribution found for rasterio==1.5.1
```

### Cause (ESTABLISHED)
Inspecting PyPI metadata (`https://pypi.org/pypi/<pkg>/<version>/json`) revealed that three pinned packages in `python-service/requirements.txt` require Python 3.12 or newer:
- `rasterio==1.5.1` specifies `Requires-Python: >=3.12` (previous release for 3.11 is `1.4.4` with `Requires-Python: >=3.10`)
- `numpy==2.5.3` specifies `Requires-Python: >=3.12` (previous release for 3.11 is `2.4.6` with `Requires-Python: >=3.11`)
- `scipy==1.18.1` specifies `Requires-Python: >=3.12` (previous release for 3.11 is `1.17.1` with `Requires-Python: >=3.11`)

Because pip on Python 3.11 strictly enforces `Requires-Python`, no distribution exists on PyPI for `rasterio==1.5.1`, `numpy==2.5.3`, or `scipy==1.18.1` on Python 3.11 runners.

### Correction to Earlier CI Notes
The earlier notes above addressed test runtime execution failures (missing `data/samples/` and unhandled `h5py` imports). They did not address this pre-test installation step failure in `pip install -r python-service/requirements.txt` on the Python 3.11 CI runner.

### Resolution Applied
Added PEP 508 environment markers to `python-service/requirements.txt` so Python 3.12 continues to use the exact same pins while Python 3.11 installs the latest compatible releases:
```text
rasterio==1.5.1 ; python_version >= "3.12"
rasterio==1.4.4 ; python_version < "3.12"
numpy==2.5.3 ; python_version >= "3.12"
numpy==2.4.6 ; python_version < "3.12"
scipy==1.18.1 ; python_version >= "3.12"
scipy==1.17.1 ; python_version < "3.12"
```

All 3.11 wheels (`rasterio 1.4.4`, `numpy 2.4.6`, `scipy 1.17.1` and their dependencies) resolve and download cleanly against Linux manylinux binary targets without conflicts.
