#!/usr/bin/env bash
# scripts/setup.sh - macOS and Linux Setup Script
# Idempotent: safe to run multiple times.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Dancing with the SARs - Setup ==="

# 1. Locate Python 3
PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
fi

if [ -z "$PYTHON_CMD" ]; then
  echo "WARNING: Python 3 was not found in PATH."
  echo "Custom GeoTIFF uploads require Python 3.11 or 3.12 with rasterio."
  echo "Precomputed Quick Demo case studies will still work without Python."
else
  echo "[OK] Found Python: $($PYTHON_CMD --version)"

  # 2. Create python-service/.venv if not already present
  if [ ! -d "python-service/.venv" ]; then
    echo "Creating Python virtual environment in python-service/.venv..."
    "$PYTHON_CMD" -m venv python-service/.venv
  else
    echo "[OK] Existing Python virtual environment found in python-service/.venv"
  fi

  # 3. Activate and install dependencies
  if [ -f "python-service/.venv/bin/python" ]; then
    echo "Installing Python dependencies into python-service/.venv..."
    python-service/.venv/bin/python -m pip install --quiet --upgrade pip
    python-service/.venv/bin/python -m pip install --quiet -r python-service/requirements.txt
    echo "[OK] Python dependencies installed successfully."
  fi
fi

# 4. Install Node.js dependencies
echo "Installing Node.js dependencies (npm install)..."
npm install
echo "[OK] Node dependencies installed."

# 5. Handle .env.local (ONLY copy if not exists; never overwrite)
if [ ! -f ".env.local" ]; then
  echo "Creating .env.local (empty API key)..."
  echo "GEMINI_API_KEY=" > .env.local
  echo "[OK] Created .env.local"
else
  echo "[OK] .env.local already exists (left untouched)."
fi

echo ""
echo "=== Setup Complete! ==="
echo "Next steps:"
echo "  1. Start local dev server:  npm run dev"
echo "  2. Open application:        http://localhost:3000"
echo "  3. (Optional) Add your Gemini API key to .env.local for live AI insights."
echo "     Precomputed demo case studies work 100% offline without any API key."
echo ""
