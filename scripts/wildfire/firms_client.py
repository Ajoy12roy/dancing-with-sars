"""
scripts/wildfire/firms_client.py

Client for NASA FIRMS (Fire Information for Resource Management System) REST API.
Conforms strictly to FIRMS API documentation:
https://firms.modaps.eosdis.nasa.gov/api/area/
"""

import csv
import io
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional


def get_firms_key() -> str:
    """
    Retrieves the FIRMS MAP_KEY from the environment or Windows registry.
    Never prints or logs the key.
    """
    key = os.environ.get("FIRMS_MAP_KEY")
    if key and key.strip():
        return key.strip()
    try:
        import winreg

        reg_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment")
        val, _ = winreg.QueryValueEx(reg_key, "FIRMS_MAP_KEY")
        if val and str(val).strip():
            # Sync to os.environ so child modules can read it
            os.environ["FIRMS_MAP_KEY"] = str(val).strip()
            return str(val).strip()
    except Exception:
        pass
    raise RuntimeError("FIRMS_MAP_KEY is not set in environment or registry.")


def get_earthdata_token() -> Optional[str]:
    """
    Retrieves the EARTHDATA_TOKEN from the environment or Windows registry.
    Never prints or logs the token.
    """
    token = os.environ.get("EARTHDATA_TOKEN")
    if token and token.strip():
        return token.strip()
    try:
        import winreg

        reg_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment")
        val, _ = winreg.QueryValueEx(reg_key, "EARTHDATA_TOKEN")
        if val and str(val).strip():
            os.environ["EARTHDATA_TOKEN"] = str(val).strip()
            return str(val).strip()
    except Exception:
        pass
    return None


def query_firms_area(
    source: str,
    bbox: List[float],
    day_range: int,
    date_str: str,
    timeout: int = 30,
) -> List[Dict[str, Any]]:
    """
    Queries FIRMS area endpoint for fire hotspots.

    Parameters:
    -----------
    source: FIRMS source (e.g., 'VIIRS_SNPP_SP', 'VIIRS_NOAA20_SP', 'VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT')
    bbox: [west, south, east, north] in EPSG:4326 degrees
    day_range: Number of days to return (1 to 5)
    date_str: Start date in YYYY-MM-DD format
    timeout: Request timeout in seconds

    Returns:
    --------
    List of hotspot record dictionaries.
    """
    if day_range < 1 or day_range > 5:
        raise ValueError(f"FIRMS day_range must be between 1 and 5, got {day_range}")

    firms_key = get_firms_key()

    # Coordinates format: west,south,east,north
    west, south, east, north = bbox
    coords = f"{west:.4f},{south:.4f},{east:.4f},{north:.4f}"

    url = (
        f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{firms_key}/{source}/{coords}/{day_range}/{date_str}"
    )

    req = urllib.request.Request(url, headers={"User-Agent": "Antigravity-Research/1.0"})

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw_csv = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        safe_msg = str(e).replace(firms_key, "[REDACTED]")
        raise RuntimeError(f"FIRMS HTTP error: {safe_msg}") from None
    except Exception as e:
        safe_msg = str(e).replace(firms_key, "[REDACTED]")
        raise RuntimeError(f"FIRMS network error: {safe_msg}") from None

    # Parse CSV records
    reader = csv.DictReader(io.StringIO(raw_csv))
    records: List[Dict[str, Any]] = []
    for row in reader:
        rec: Dict[str, Any] = {}
        for k, v in row.items():
            if k in ("latitude", "longitude", "bright_ti4", "bright_ti5", "scan", "track", "frp"):
                try:
                    rec[k] = float(v)
                except (ValueError, TypeError):
                    rec[k] = v
            else:
                rec[k] = v
        records.append(rec)

    return records

