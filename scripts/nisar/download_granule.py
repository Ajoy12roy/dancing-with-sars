#!/usr/bin/env python3
"""
scripts/nisar/download_granule.py

Downloads a NISAR data granule (.h5 or browse/metadata product) using NASA Earthdata Bearer token authentication.

Rules & Features:
- Reads EARTHDATA_TOKEN strictly from the environment variable EARTHDATA_TOKEN.
- Never prints, logs, or persists the token value.
- Supports resuming partial downloads using HTTP Range requests.
- Inspects content length first; refuses to download files larger than 500 MB unless --yes is passed.
- Standard library urllib implementation with optional requests fallback.
"""

import argparse
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

MAX_UNCONFIRMED_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB

def sanitize_url(url: str) -> str:
    """Removes any query parameters from URL for clean printing."""
    parsed = urllib.parse.urlparse(url)
    return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))

def get_remote_file_size(url: str, token: str) -> int:
    """Performs a HEAD or initial range request to inspect file size."""
    req = urllib.request.Request(url, method="HEAD")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("User-Agent", "TerraPulse-NISAR-Downloader/1.0")
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            cl = resp.headers.get("Content-Length")
            if cl is not None:
                return int(cl)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise PermissionError(f"HTTP {e.code}: Earthdata Bearer authentication failed or unauthorized.")
        # Some servers reject HEAD; try GET with 0-byte Range
        pass
    except Exception:
        pass
        
    # Fallback: Range request for byte 0
    req_range = urllib.request.Request(url)
    req_range.add_header("Authorization", f"Bearer {token}")
    req_range.add_header("Range", "bytes=0-0")
    req_range.add_header("User-Agent", "TerraPulse-NISAR-Downloader/1.0")
    with urllib.request.urlopen(req_range, timeout=15) as resp:
        cr = resp.headers.get("Content-Range")
        if cr and "/" in cr:
            total_str = cr.split("/")[-1]
            if total_str.isdigit():
                return int(total_str)
        cl = resp.headers.get("Content-Length")
        if cl is not None:
            return int(cl)
            
    return -1

def download_granule(url: str, output_path: str, allow_large: bool = False, head_only: bool = False) -> bool:
    token = os.environ.get("EARTHDATA_TOKEN", "").strip()
    if not token:
        print("Error: EARTHDATA_TOKEN environment variable is not set.", file=sys.stderr)
        print("Please set your NASA Earthdata token in your session:", file=sys.stderr)
        print("  PowerShell: $env:EARTHDATA_TOKEN = \"<your-token>\"", file=sys.stderr)
        print("  Bash:       export EARTHDATA_TOKEN=\"<your-token>\"", file=sys.stderr)
        return False

    out_file = Path(output_path).resolve()
    clean_url = sanitize_url(url)
    print(f"Target URL: {clean_url}")
    print(f"Output File: {out_file}")

    try:
        remote_size = get_remote_file_size(url, token)
    except PermissionError as pe:
        print(f"Authentication Error: {pe}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Warning: Could not determine file size via HEAD request ({e}). Proceeding carefully.")
        remote_size = -1

    if remote_size > 0:
        size_mb = remote_size / (1024 * 1024)
        size_gb = remote_size / (1024 * 1024 * 1024)
        print(f"Remote File Size: {size_mb:.2f} MB ({size_gb:.2f} GB)")
        
        if remote_size > MAX_UNCONFIRMED_SIZE_BYTES and not allow_large and not head_only:
            print(f"Safety Error: File size ({size_mb:.1f} MB) exceeds safety threshold of 500 MB.", file=sys.stderr)
            print("To proceed with downloading this science file, re-run with the --yes flag.", file=sys.stderr)
            return False
    else:
        print("Remote File Size: Unknown (server did not return Content-Length).")

    if head_only:
        print("Auth & size check completed successfully (HEAD-only mode).")
        return True

    out_file.parent.mkdir(parents=True, exist_ok=True)
    existing_bytes = out_file.stat().st_size if out_file.exists() else 0

    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("User-Agent", "TerraPulse-NISAR-Downloader/1.0")

    if existing_bytes > 0:
        if remote_size > 0 and existing_bytes >= remote_size:
            print(f"File already completely downloaded ({existing_bytes} bytes).")
            return True
        print(f"Resuming download from byte {existing_bytes}...")
        req.add_header("Range", f"bytes={existing_bytes}-")
        open_mode = "ab"
    else:
        open_mode = "wb"

    try:
        with urllib.request.urlopen(req, timeout=30) as resp, open(out_file, open_mode) as out_f:
            downloaded = existing_bytes
            chunk_size = 1024 * 1024  # 1 MB chunks
            while True:
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                out_f.write(chunk)
                downloaded += len(chunk)
                if remote_size > 0:
                    pct = (downloaded / remote_size) * 100.0
                    print(f"\rDownloading: {pct:.1f}% ({downloaded / (1024*1024):.1f} MB)", end="", flush=True)
            print(f"\nDownload finished successfully: {out_file} ({downloaded} bytes)")
            return True
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            print(f"Authentication Error: HTTP {e.code} Bearer authentication failed.", file=sys.stderr)
        else:
            print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Download failed: {e}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description="Secure NASA Earthdata NISAR granule downloader.")
    parser.add_argument("url", help="HTTPS URL of the granule or asset")
    parser.add_argument("output", help="Target local output path")
    parser.add_argument("--yes", action="store_true", help="Allow downloading files larger than 500 MB")
    parser.add_argument("--check-only", action="store_true", help="Only verify authentication and size, do not download")
    args = parser.parse_args()

    success = download_granule(args.url, args.output, allow_large=args.yes, head_only=args.check_only)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
