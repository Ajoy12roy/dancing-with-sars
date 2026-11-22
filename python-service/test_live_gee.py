"""
python-service/test_live_gee.py

Unit and integration tests for the Live Google Earth Engine fetch and analysis pipeline.
Uses standard Python unittest without requiring external test runners or httpx.
Mocks Earth Engine objects so no live credentials or network calls are required.
"""

import os
import sys
import io
import time
import zipfile
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from fastapi import HTTPException

# Ensure python-service directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from live_gee import (
    normalize_bbox,
    compute_bbox_dimensions,
    compute_export_scale,
    validate_live_request,
    select_group,
    _process_downloaded_raster,
    LiveError,
    MIN_SIDE_KM,
    MAX_SIDE_KM,
    MAX_AREA_KM2,
    MAX_WINDOW_DAYS,
)
from api import (
    app,
    live_jobs,
    live_jobs_lock,
    cleanup_expired_jobs,
    live_status,
    create_live_job,
    get_live_job,
)


def _create_test_geotiff(path: str, count: int = 1, width: int = 20, height: int = 20):
    transform = from_bounds(91.8, 24.85, 91.95, 24.98, width, height)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=count,
        dtype=np.float32,
        crs="EPSG:4326",
        transform=transform,
    ) as dst:
        for i in range(1, count + 1):
            data = np.full((height, width), fill_value=-12.5 + i, dtype=np.float32)
            dst.write(data, i)


class TestLiveValidationAndMath(unittest.TestCase):
    def test_normalize_bbox(self):
        w, s, e, n = normalize_bbox([92.0, 25.0, 91.0, 24.0])
        self.assertEqual((w, s, e, n), (91.0, 24.0, 92.0, 25.0))

        w, s, e, n = normalize_bbox({"west": 90.0, "south": 23.0, "east": 91.0, "north": 24.0})
        self.assertEqual((w, s, e, n), (90.0, 23.0, 91.0, 24.0))

        w, s, e, n = normalize_bbox([-200.0, -90.0, 200.0, 90.0])
        self.assertEqual((w, s, e, n), (-180.0, -85.0, 180.0, 85.0))

    def test_scale_parity_with_aoi_ts(self):
        sylhet_box = [91.8, 24.85, 91.95, 24.98]
        scale_sylhet = compute_export_scale(sylhet_box)
        self.assertEqual(scale_sylhet, 20)

        jamuna_box = [89.6498, 24.29979, 89.95002, 24.55015]
        scale_jamuna = compute_export_scale(jamuna_box)
        width, height, area = compute_bbox_dimensions(jamuna_box)
        max_dim = max(width, height) * 1000.0
        self.assertEqual(scale_jamuna, int(np.ceil((max_dim / 1500) / 10.0) * 10))

        amazon_box = [-62.20007, -10.35003, -61.99992, -10.14988]
        scale_amazon = compute_export_scale(amazon_box)
        self.assertGreaterEqual(scale_amazon, 10)

    def test_validate_live_request_valid(self):
        box = [91.8, 24.85, 91.95, 24.98]
        win_a = {"start": "2022-05-01", "end": "2022-05-15"}
        win_b = {"start": "2022-06-18", "end": "2022-06-25"}
        norm_box, scale = validate_live_request(box, win_a, win_b, "flood")
        self.assertEqual(len(norm_box), 4)
        self.assertEqual(scale, 20)

    def test_validate_live_request_invalid_modes(self):
        box = [91.8, 24.85, 91.95, 24.98]
        win_a = {"start": "2022-05-01", "end": "2022-05-15"}
        win_b = {"start": "2022-06-18", "end": "2022-06-25"}
        with self.assertRaises(LiveError) as ctx:
            validate_live_request(box, win_a, win_b, "unknown-mode")
        self.assertEqual(ctx.exception.code, "invalid_request")
        self.assertIn("Invalid mode", ctx.exception.message)

    def test_validate_live_request_size_limits(self):
        tiny_box = [91.800, 24.850, 91.805, 24.855]
        win_a = {"start": "2022-05-01", "end": "2022-05-15"}
        win_b = {"start": "2022-06-18", "end": "2022-06-25"}
        with self.assertRaises(LiveError) as ctx:
            validate_live_request(tiny_box, win_a, win_b, "flood")
        self.assertIn("at least 2.0 km", ctx.exception.message)

        giant_box = [91.0, 24.0, 91.5, 24.5]
        with self.assertRaises(LiveError) as ctx:
            validate_live_request(giant_box, win_a, win_b, "flood")
        self.assertIn("at most 30.0 km", ctx.exception.message)

    def test_validate_live_request_date_rules(self):
        box = [91.8, 24.85, 91.95, 24.98]

        with self.assertRaises(LiveError):
            validate_live_request(box, {"start": "invalid", "end": "2022-05-10"}, {"start": "2022-06-01", "end": "2022-06-10"}, "flood")

        with self.assertRaises(LiveError) as ctx:
            validate_live_request(box, {"start": "2022-05-15", "end": "2022-05-01"}, {"start": "2022-06-01", "end": "2022-06-10"}, "flood")
        self.assertIn("earlier than or equal to end date", ctx.exception.message)

        with self.assertRaises(LiveError) as ctx:
            validate_live_request(box, {"start": "2022-05-01", "end": "2022-06-05"}, {"start": "2022-06-01", "end": "2022-06-10"}, "flood")
        self.assertIn("windows cannot overlap", ctx.exception.message)

        with self.assertRaises(LiveError) as ctx:
            validate_live_request(box, {"start": "2022-01-01", "end": "2022-03-15"}, {"start": "2022-04-01", "end": "2022-04-10"}, "flood")
        self.assertIn("exceeds maximum allowed 60 days", ctx.exception.message)


class TestSingleGeometryOrbitSelection(unittest.TestCase):
    def test_select_group_common_orbit(self):
        mock_s1 = MagicMock()
        col_a = MagicMock()
        col_b = MagicMock()
        mock_s1.filterDate.side_effect = lambda s, e: col_a if "2022-05" in str(s) else col_b

        col_a.aggregate_array.side_effect = lambda prop: MagicMock(
            getInfo=lambda: ["DESCENDING", "ASCENDING"] if "pass" in prop else [77, 114]
        )
        col_b.aggregate_array.side_effect = lambda prop: MagicMock(
            getInfo=lambda: ["DESCENDING", "DESCENDING"] if "pass" in prop else [77, 150]
        )

        with patch("live_gee.ee.Date") as mock_date:
            mock_date.return_value.advance.return_value = "2022-05-11"
            group = select_group(mock_s1, "2022-05-01", "2022-05-10", "2022-06-18", "2022-06-25")

        self.assertEqual(group["pass"], "DESCENDING")
        self.assertEqual(group["orbit"], 77)
        self.assertEqual(group["beforeCount"], 1)
        self.assertEqual(group["afterCount"], 1)

    def test_select_group_tie_breaking(self):
        mock_s1 = MagicMock()
        col_a = MagicMock()
        col_b = MagicMock()
        mock_s1.filterDate.side_effect = lambda s, e: col_a if "2022-05" in str(s) else col_b

        col_a.aggregate_array.side_effect = lambda prop: MagicMock(
            getInfo=lambda: ["ASCENDING", "DESCENDING", "DESCENDING"] if "pass" in prop else [50, 120, 120]
        )
        col_b.aggregate_array.side_effect = lambda prop: MagicMock(
            getInfo=lambda: ["ASCENDING", "DESCENDING", "DESCENDING"] if "pass" in prop else [50, 120, 120]
        )

        with patch("live_gee.ee.Date") as mock_date:
            mock_date.return_value.advance.return_value = "2022-05-11"
            group = select_group(mock_s1, "2022-05-01", "2022-05-10", "2022-06-18", "2022-06-25")

        self.assertEqual(group["pass"], "DESCENDING")
        self.assertEqual(group["orbit"], 120)
        self.assertEqual(group["minCount"], 2)

    def test_select_group_no_common_orbit_raises(self):
        mock_s1 = MagicMock()
        col_a = MagicMock()
        col_b = MagicMock()
        mock_s1.filterDate.side_effect = lambda s, e: col_a if "2022-05" in str(s) else col_b

        col_a.aggregate_array.side_effect = lambda prop: MagicMock(
            getInfo=lambda: ["DESCENDING"] if "pass" in prop else [77]
        )
        col_b.aggregate_array.side_effect = lambda prop: MagicMock(
            getInfo=lambda: ["ASCENDING"] if "pass" in prop else [114]
        )

        with patch("live_gee.ee.Date") as mock_date:
            mock_date.return_value.advance.return_value = "2022-05-11"
            with self.assertRaises(LiveError) as ctx:
                select_group(mock_s1, "2022-05-01", "2022-05-10", "2022-06-18", "2022-06-25")

        self.assertEqual(ctx.exception.code, "no_common_orbit")
        self.assertIn("No single orbit geometry has images in both windows", ctx.exception.message)

    def test_select_group_empty_window_raises(self):
        mock_s1 = MagicMock()
        col_a = MagicMock()
        col_b = MagicMock()
        mock_s1.filterDate.side_effect = lambda s, e: col_a if "2022-05" in str(s) else col_b

        col_a.aggregate_array.side_effect = lambda prop: MagicMock(getInfo=lambda: [])
        col_b.aggregate_array.side_effect = lambda prop: MagicMock(getInfo=lambda: ["DESCENDING"])

        with patch("live_gee.ee.Date") as mock_date:
            mock_date.return_value.advance.return_value = "2022-05-11"
            with self.assertRaises(LiveError) as ctx:
                select_group(mock_s1, "2022-05-01", "2022-05-10", "2022-06-18", "2022-06-25")

        self.assertEqual(ctx.exception.code, "no_images_in_window")
        self.assertEqual(ctx.exception.window, "before")


class TestRasterProcessing(unittest.TestCase):
    def test_process_downloaded_raster_standalone_geotiff(self):
        import tempfile
        import shutil

        tmp_dir = tempfile.mkdtemp()
        try:
            raw_tif = os.path.join(tmp_dir, "raw.tif")
            out_tif = os.path.join(tmp_dir, "out.tif")
            _create_test_geotiff(raw_tif, count=2)

            _process_downloaded_raster(raw_tif, out_tif, (91.8, 24.85, 91.95, 24.98))
            self.assertTrue(os.path.exists(out_tif))

            with rasterio.open(out_tif) as src:
                self.assertEqual(src.count, 2)
                self.assertEqual(src.crs.to_string(), "EPSG:4326")
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_process_downloaded_raster_zip_archive(self):
        import tempfile
        import shutil

        tmp_dir = tempfile.mkdtemp()
        try:
            vv_tif = os.path.join(tmp_dir, "scene_VV.tif")
            vh_tif = os.path.join(tmp_dir, "scene_VH.tif")
            _create_test_geotiff(vv_tif, count=1)
            _create_test_geotiff(vh_tif, count=1)

            zip_path = os.path.join(tmp_dir, "download.zip")
            with zipfile.ZipFile(zip_path, "w") as z:
                z.write(vv_tif, arcname="scene_VV.tif")
                z.write(vh_tif, arcname="scene_VH.tif")

            out_tif = os.path.join(tmp_dir, "stacked.tif")
            _process_downloaded_raster(zip_path, out_tif, (91.8, 24.85, 91.95, 24.98))

            self.assertTrue(os.path.exists(out_tif))
            with rasterio.open(out_tif) as src:
                self.assertEqual(src.count, 2)
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_process_downloaded_raster_corrupted_format(self):
        import tempfile
        import shutil

        tmp_dir = tempfile.mkdtemp()
        try:
            corrupt_path = os.path.join(tmp_dir, "corrupt.bin")
            with open(corrupt_path, "wb") as f:
                f.write(b"NOT_A_ZIP_OR_TIFF_HEADER")

            out_tif = os.path.join(tmp_dir, "out.tif")
            with self.assertRaises(LiveError) as ctx:
                _process_downloaded_raster(corrupt_path, out_tif, (91.8, 24.85, 91.95, 24.98))
            self.assertEqual(ctx.exception.code, "processing_failed")
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)


class TestFastApiLiveJobs(unittest.IsolatedAsyncioTestCase):
    async def test_fastapi_live_status_endpoint(self):
        resp = await live_status()
        self.assertIn("installed", resp)
        self.assertIn("initialized", resp)

    async def test_fastapi_create_job_validation_error(self):
        mock_req = MagicMock()
        mock_req.headers = {}
        mock_req.client = MagicMock(host="127.0.0.1")
        mock_req.json = AsyncMock(return_value={})

        # Either 400 (if EE ready) or 503 (if EE not ready)
        with self.assertRaises(HTTPException) as ctx:
            await create_live_job(mock_req)
        self.assertIn(ctx.exception.status_code, [400, 503])

    async def test_job_cleanup_expired(self):
        import tempfile
        import shutil

        tmp_dir = tempfile.mkdtemp()
        old_time = time.time() - 3600  # 1 hour ago
        async with live_jobs_lock:
            live_jobs["expired_test_id"] = {
                "id": "expired_test_id",
                "status": "done",
                "created_at": old_time,
                "tmp_dir": tmp_dir,
            }

        self.assertIn("expired_test_id", live_jobs)
        await cleanup_expired_jobs()

        self.assertNotIn("expired_test_id", live_jobs)
        self.assertFalse(os.path.exists(tmp_dir))


if __name__ == "__main__":
    unittest.main()
