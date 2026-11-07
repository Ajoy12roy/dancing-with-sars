#!/usr/bin/env python3
"""
scripts/qa/check_doc_paths.py

Read-only verification tool that extracts backticked repository file paths
from QA and submission documents and verifies their existence in the repo.
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

DOC_FILES = [
    REPO_ROOT / "docs" / "QA-REPORT.md",
    REPO_ROOT / "docs" / "CLAIMS-AUDIT.md",
    REPO_ROOT / "docs" / "SUBMISSION.md",
    REPO_ROOT / "docs" / "DEMO-SCRIPT.md",
]

EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".json", ".md", ".txt", ".png", ".tif",
    ".tiff", ".sh", ".ps1", ".css", ".html"
}

def extract_paths_from_doc(doc_path: Path):
    if not doc_path.exists():
        return []
    
    text = doc_path.read_text(encoding="utf-8")
    lines = text.splitlines()
    
    candidate_paths = []
    
    for line_idx, line in enumerate(lines, 1):
        # Skip lines describing upstream external repositories
        if "Upstream Source URL" in line or "upstream" in line.lower() and "http" in line:
            continue
            
        # Match backticked content
        backticks = re.findall(r"`([^`\n]+)`", line)
        for item in backticks:
            item = item.strip()
            
            # Skip placeholders and globs
            if any(char in item for char in ["<", ">", "*", "{", "}"]):
                continue
                
            # Skip commands, URLs, methods, or non-file strings
            if item.startswith("http") or item.startswith("git ") or " " in item:
                continue
                
            # Remove line numbers or ranges like :45, :12-15, :160-161, :57-64
            cleaned = re.sub(r":\d+(-\d+)?$", "", item).strip()
            cleaned = cleaned.rstrip(").,;")
            
            # Skip if explicitly non-existent preview URLs from historical QA investigation
            if "/data/nisar/previews/" in cleaned:
                continue
                
            # Check if it looks like a file with a known extension
            p = Path(cleaned)
            if p.suffix.lower() in EXTENSIONS:
                norm = cleaned.replace("\\", "/")
                candidate_paths.append((norm, item, line_idx))
                
    return candidate_paths

def main():
    print("=" * 80)
    print("REPOSITORY FILE PATH AUDIT FOR SUBMISSION & QA DOCUMENTS")
    print("=" * 80)
    
    total_checked = 0
    missing_paths = []
    
    for doc in DOC_FILES:
        rel_doc = doc.relative_to(REPO_ROOT)
        print(f"\nChecking document: {rel_doc}")
        print("-" * 60)
        
        candidates = extract_paths_from_doc(doc)
        seen = set()
        
        for norm_path, raw, line_idx in candidates:
            if norm_path in seen:
                continue
            seen.add(norm_path)
            total_checked += 1
            
            check_path = norm_path.lstrip("/")
            
            # Check standard path, or public/ asset path if starts with /nisar/
            target = REPO_ROOT / check_path
            public_target = REPO_ROOT / "public" / check_path
            
            if target.exists():
                print(f"  [EXISTS]  {norm_path}")
            elif public_target.exists():
                print(f"  [EXISTS via public/]  {norm_path}")
            else:
                print(f"  [MISSING] {norm_path}  (from `{raw}` at line {line_idx})")
                missing_paths.append((str(rel_doc), norm_path, raw, line_idx))
                
    print("\n" + "=" * 80)
    print(f"SUMMARY: {total_checked} total path references checked across {len(DOC_FILES)} documents.")
    if missing_paths:
        print(f"FAILURE: Found {len(missing_paths)} missing path reference(s):")
        for doc_name, path_str, raw_str, line_idx in missing_paths:
            print(f"  - In {doc_name}:{line_idx}: `{raw_str}` -> resolved to {path_str}")
        return 1
    else:
        print("SUCCESS: All referenced repository paths exist on disk!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
