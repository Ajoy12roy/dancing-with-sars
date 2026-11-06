"""
scripts/wildfire/select_wildfire_event.py

Evaluates consecutive NISAR pairs from inventory against real NASA FIRMS hotspots.
Applies mechanical selection rules with Union-Find spatial clustering (3 km threshold).
Saves top 10 candidate table, selected event metadata, and data/wildfire/<event-id>/hotspots.json.
"""

import csv
import datetime
import io
import json
import math
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from scripts.wildfire.firms_client import get_firms_key, query_firms_area

INVENTORY_PATH = REPO_ROOT / "scratch" / "nisar-footprints.json"
DATA_WILDFIRE_DIR = REPO_ROOT / "data" / "wildfire"


class DisjointSet:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.size = [1] * n

    def find(self, i: int) -> int:
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i: int, j: int):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.size[root_i] < self.size[root_j]:
                root_i, root_j = root_j, root_i
            self.parent[root_j] = root_i
            self.size[root_i] += self.size[root_j]


def project_points(hotspots: List[Dict[str, Any]]) -> List[Tuple[float, float]]:
    """Projects lat/lon to equidistant planar coordinates in meters."""
    if not hotspots:
        return []
    lat0 = sum(h["latitude"] for h in hotspots) / len(hotspots)
    lon0 = sum(h["longitude"] for h in hotspots) / len(hotspots)
    r = 6371000.0
    lat0_rad = math.radians(lat0)
    cos_lat0 = math.cos(lat0_rad)

    pts = []
    for h in hotspots:
        x = r * math.radians(h["longitude"] - lon0) * cos_lat0
        y = r * math.radians(h["latitude"] - lat0)
        pts.append((x, y))
    return pts


def cluster_hotspots(hotspots: List[Dict[str, Any]], threshold_m: float = 3000.0) -> Tuple[int, float, List[int]]:
    """
    Groups hotspots within threshold_m into connected components using Disjoint Set.
    Returns (largest_cluster_size, percent_in_largest_cluster, cluster_assignment_per_hotspot).
    """
    n = len(hotspots)
    if n == 0:
        return 0, 0.0, []
    if n == 1:
        return 1, 100.0, [0]

    pts = project_points(hotspots)
    dsu = DisjointSet(n)

    # Grid-accelerated neighbor search for efficiency
    grid_size = threshold_m
    grid = defaultdict(list)
    for idx, (x, y) in enumerate(pts):
        gx = int(math.floor(x / grid_size))
        gy = int(math.floor(y / grid_size))
        grid[(gx, gy)].append(idx)

    thresh_sq = threshold_m * threshold_m
    for (gx, gy), indices in grid.items():
        # Check current cell and neighboring cells
        for dx in (0, 1):
            for dy in (-1, 0, 1) if dx == 1 else (1,):
                neighbor_cell = (gx + dx, gy + dy)
                if neighbor_cell in grid:
                    for i in indices:
                        xi, yi = pts[i]
                        for j in grid[neighbor_cell]:
                            xj, yj = pts[j]
                            if (xi - xj) ** 2 + (yi - yj) ** 2 <= thresh_sq:
                                dsu.union(i, j)
        # Check within the same cell
        for k in range(len(indices)):
            i = indices[k]
            xi, yi = pts[i]
            for m in range(k + 1, len(indices)):
                j = indices[m]
                xj, yj = pts[j]
                if (xi - xj) ** 2 + (yi - yj) ** 2 <= thresh_sq:
                    dsu.union(i, j)

    # Count sizes per root
    cluster_counts = defaultdict(int)
    assignments = []
    for i in range(n):
        root = dsu.find(i)
        cluster_counts[root] += 1
        assignments.append(root)

    max_size = max(cluster_counts.values()) if cluster_counts else 0
    pct = (max_size / n) * 100.0 if n > 0 else 0.0
    return max_size, pct, assignments


def query_pair_hotspots(
    pair: Dict[str, Any],
    firms_request_counter: List[int],
    max_firms_requests: int = 150,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Queries FIRMS for the pair's intersection bounding box between t_0 and t_1.
    Returns (all_hotspots, qualifying_hotspots).
    """
    g1 = pair["granule_pre"]
    g2 = pair["granule_post"]

    b1 = g1["bbox"]
    b2 = g2["bbox"]
    if not b1 or not b2:
        return [], []

    # Intersection bounding box
    west = max(b1[0], b2[0])
    south = max(b1[1], b2[1])
    east = min(b1[2], b2[2])
    north = min(b1[3], b2[3])

    if west >= east or south >= north:
        return [], []

    inter_bbox = [west, south, east, north]

    t0_dt = datetime.datetime.fromisoformat(g1["start_time"].replace("Z", "+00:00"))
    t1_dt = datetime.datetime.fromisoformat(g2["start_time"].replace("Z", "+00:00"))

    total_days = max(1, (t1_dt.date() - t0_dt.date()).days + 1)
    # Chunk into <= 5 day intervals
    chunks = []
    curr = t0_dt.date()
    end_date = t1_dt.date()
    while curr <= end_date:
        days_left = (end_date - curr).days + 1
        day_range = min(5, days_left)
        chunks.append((curr.strftime("%Y-%m-%d"), day_range))
        curr += datetime.timedelta(days=day_range)

    all_hotspots = []
    for date_str, day_range in chunks:
        if firms_request_counter[0] >= max_firms_requests:
            break

        firms_request_counter[0] += 1
        # Try VIIRS_SNPP_SP first
        try:
            recs = query_firms_area("VIIRS_SNPP_SP", inter_bbox, day_range, date_str)
        except Exception:
            recs = []

        # If empty, fall back to VIIRS_SNPP_NRT
        if not recs and firms_request_counter[0] < max_firms_requests:
            firms_request_counter[0] += 1
            try:
                recs = query_firms_area("VIIRS_SNPP_NRT", inter_bbox, day_range, date_str)
            except Exception:
                recs = []

        all_hotspots.extend(recs)

    # Filter qualifying hotspots: confidence in ('nominal', 'high', 'n', 'h')
    qualifying = []
    for h in all_hotspots:
        conf = str(h.get("confidence", "")).lower().strip()
        if conf in ("nominal", "high", "n", "h"):
            # Ensure within intersection bbox
            lat = h.get("latitude")
            lon = h.get("longitude")
            if lat is not None and lon is not None:
                if west <= lon <= east and south <= lat <= north:
                    qualifying.append(h)

    return all_hotspots, qualifying


def run_event_selection() -> Dict[str, Any]:
    with open(INVENTORY_PATH, "r", encoding="utf-8") as f:
        inv = json.load(f)

    pairs = inv.get("pairs", [])
    # Filter out Antarctica (zero fire potential)
    land_pairs = [p for p in pairs if p.get("region") != "Antarctica / Southern Ocean"]
    # Sort chronologically by start_time
    land_pairs.sort(key=lambda p: p["granule_pre"]["start_time"])

    print(f"Total land candidate pairs to evaluate: {len(land_pairs)}")

    firms_counter = [0]
    evaluated_pairs = []

    for idx, pair in enumerate(land_pairs):
        if firms_counter[0] >= 150:
            print(f"Reached FIRMS request limit (150). Stopping evaluation after {idx} pairs.")
            break

        all_h, qual_h = query_pair_hotspots(pair, firms_counter, max_firms_requests=150)
        max_cluster_sz, cluster_pct, assignments = cluster_hotspots(qual_h, threshold_m=3000.0)

        total_frp = sum(float(h.get("frp", 0.0)) for h in qual_h)
        max_frp = max((float(h.get("frp", 0.0)) for h in qual_h), default=0.0)

        g1 = pair["granule_pre"]
        g2 = pair["granule_post"]

        res = {
            "pair_id": pair["pair_id"],
            "track": pair["track"],
            "frame": pair["frame"],
            "direction": pair["direction"],
            "t0": g1["start_time"][:10],
            "t1": g2["start_time"][:10],
            "region": pair["region"],
            "all_count": len(all_h),
            "qual_count": len(qual_h),
            "largest_cluster_size": max_cluster_sz,
            "cluster_pct": round(cluster_pct, 1),
            "total_frp": round(total_frp, 1),
            "max_frp": round(max_frp, 1),
            "pair": pair,
            "qual_hotspots": qual_h,
            "assignments": assignments,
        }
        evaluated_pairs.append(res)
        print(
            f"[{idx+1}/{len(land_pairs)}] Pair {pair['pair_id']} ({pair['region']}): "
            f"Qualifying={len(qual_h)}, Cluster={max_cluster_sz} ({cluster_pct:.1f}%), "
            f"Total FRP={total_frp:.1f} MW (FIRMS requests used: {firms_counter[0]})"
        )

    # Sort evaluated pairs by total FRP descending
    evaluated_pairs.sort(key=lambda x: x["total_frp"], reverse=True)

    print("\n--- Top 10 Candidate Pairs by Total FRP ---")
    top10 = evaluated_pairs[:10]
    for p in top10:
        print(
            f"{p['pair_id']} | T{p['track']}_F{p['frame']}_{p['direction']} | {p['t0']}->{p['t1']} | "
            f"{p['region']} | Qual={p['qual_count']} | Clust={p['largest_cluster_size']} ({p['cluster_pct']}%) | "
            f"Total FRP={p['total_frp']} MW | Max FRP={p['max_frp']} MW"
        )

    # Selection Rule:
    # 1. Largest sum of FRP with >= 200 qualifying hotspots AND >= 70% in a single cluster
    selected = None
    tier = None

    for p in evaluated_pairs:
        if p["qual_count"] >= 200 and p["cluster_pct"] >= 70.0:
            selected = p
            tier = "Tier 1 (>= 200 hotspots, >= 70% cluster)"
            break

    # 2. Relaxed: >= 100 qualifying hotspots AND >= 60% in a single cluster
    if not selected:
        for p in evaluated_pairs:
            if p["qual_count"] >= 100 and p["cluster_pct"] >= 60.0:
                selected = p
                tier = "Tier 2 (>= 100 hotspots, >= 60% cluster)"
                break

    out_result = {
        "firms_requests_used": firms_counter[0],
        "pairs_evaluated": len(evaluated_pairs),
        "top10": [
            {k: v for k, v in p.items() if k not in ("pair", "qual_hotspots", "assignments")}
            for p in top10
        ],
        "selected": None,
        "tier": tier,
    }

    if not selected:
        out_result["status"] = "NO EVENT SELECTED: rule not satisfied"
        print("\nNO EVENT SELECTED: rule not satisfied")
        with open(REPO_ROOT / "scratch" / "selected_event.json", "w", encoding="utf-8") as f:
            json.dump(out_result, f, indent=2)
        return out_result

    out_result["status"] = "SELECTED"
    print(f"\nSELECTED EVENT ({tier}): {selected['pair_id']}")

    # Formulate event ID and compute cluster bounding box + 3 km margin
    region_slug = selected["region"].lower().replace(" ", "-").replace("/", "-")
    event_id = f"wildfire-2026-T{selected['track']}-F{selected['frame']}-{region_slug}"

    # Extract hotspots belonging to the largest cluster
    largest_cluster_root = None
    if selected["assignments"]:
        counts = defaultdict(int)
        for a in selected["assignments"]:
            counts[a] += 1
        largest_cluster_root = max(counts.keys(), key=lambda k: counts[k])

    cluster_hotspots_list = []
    for h, a in zip(selected["qual_hotspots"], selected["assignments"]):
        if a == largest_cluster_root:
            cluster_hotspots_list.append(h)

    # Bounding box of the fire cluster + 3 km margin (~0.027 deg)
    lats = [h["latitude"] for h in cluster_hotspots_list]
    lons = [h["longitude"] for h in cluster_hotspots_list]
    margin_deg = 3000.0 / 111320.0  # ~0.027 deg
    cluster_bbox = [
        round(min(lons) - margin_deg, 4),
        round(min(lats) - margin_deg, 4),
        round(max(lons) + margin_deg, 4),
        round(max(lats) + margin_deg, 4),
    ]

    selected_info = {
        "event_id": event_id,
        "tier": tier,
        "pair_id": selected["pair_id"],
        "track": selected["track"],
        "frame": selected["frame"],
        "direction": selected["direction"],
        "t0": selected["t0"],
        "t1": selected["t1"],
        "region": selected["region"],
        "sensor": "VIIRS (Suomi-NPP / NOAA-20)",
        "qualifying_hotspot_count": selected["qual_count"],
        "cluster_hotspot_count": len(cluster_hotspots_list),
        "cluster_pct": selected["cluster_pct"],
        "total_frp_mw": selected["total_frp"],
        "max_frp_mw": selected["max_frp"],
        "cluster_bbox_with_3km_margin": cluster_bbox,
        "granule_pre": selected["pair"]["granule_pre"],
        "granule_post": selected["pair"]["granule_post"],
    }
    out_result["selected"] = selected_info

    # Save to data/wildfire/<event-id>/hotspots.json
    event_dir = DATA_WILDFIRE_DIR / event_id
    event_dir.mkdir(parents=True, exist_ok=True)
    hotspots_path = event_dir / "hotspots.json"

    clean_hotspots = []
    for h in cluster_hotspots_list:
        clean_hotspots.append({
            "latitude": h.get("latitude"),
            "longitude": h.get("longitude"),
            "acq_date": h.get("acq_date"),
            "acq_time": h.get("acq_time"),
            "confidence": h.get("confidence"),
            "frp": h.get("frp"),
            "daynight": h.get("daynight"),
        })

    with open(hotspots_path, "w", encoding="utf-8") as f:
        json.dump({
            "event_id": event_id,
            "cluster_bbox_with_3km_margin": cluster_bbox,
            "hotspot_count": len(clean_hotspots),
            "hotspots": clean_hotspots,
        }, f, indent=2)

    print(f"Saved {len(clean_hotspots)} cluster hotspots to {hotspots_path}")

    # Also save event selection summary to scratch/selected_event.json
    with open(REPO_ROOT / "scratch" / "selected_event.json", "w", encoding="utf-8") as f:
        json.dump(out_result, f, indent=2)

    return out_result


if __name__ == "__main__":
    run_event_selection()

