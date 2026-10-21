# scripts/setup.ps1 - Windows PowerShell Setup Script
# Idempotent: safe to run multiple times.
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

Write-Host "=== Dancing with the SARs - Windows Setup ===" -ForegroundColor Cyan

# 1. Locate Python executable
$PythonCmd = $null
$Candidates = @("python", "py -3.12", "py -3.11", "py", "python3")

foreach ($cand in $Candidates) {
    try {
        $parts = $cand -split " "
        $exe = $parts[0]
        $args = if ($parts.Length -gt 1) { $parts[1..($parts.Length - 1)] } else { @() }
        $check = & $exe @args --version 2>&1
        if ($LASTEXITCODE -eq 0 -or $check -match "Python \d") {
            $PythonCmd = $cand
            Write-Host "[OK] Found Python: $check ($cand)" -ForegroundColor Green
            break
        }
    } catch {
        # Continue searching
    }
}

if (-not $PythonCmd) {
    Write-Warning "Python was not found in PATH or via Python Launcher."
    Write-Warning "Custom GeoTIFF uploads require Python 3.11 or 3.12 with rasterio."
    Write-Warning "Precomputed Quick Demo case studies will still work without Python."
} else {
    # 2. Create python-service/.venv if not already present
    $VenvDir = Join-Path $RootDir "python-service\.venv"
    $VenvPython = Join-Path $VenvDir "Scripts\python.exe"

    if (-not (Test-Path $VenvPython)) {
        Write-Host "Creating Python virtual environment in python-service\.venv..." -ForegroundColor Yellow
        $parts = $PythonCmd -split " "
        $exe = $parts[0]
        $args = if ($parts.Length -gt 1) { $parts[1..($parts.Length - 1)] } else { @() }
        & $exe @args -m venv (Join-Path $RootDir "python-service\.venv")
    } else {
        Write-Host "[OK] Existing Python virtual environment found at python-service\.venv" -ForegroundColor Green
    }

    # 3. Install Python dependencies in venv
    if (Test-Path $VenvPython) {
        Write-Host "Installing Python requirements into .venv..." -ForegroundColor Yellow
        & "$VenvPython" -m pip install --quiet --upgrade pip
        & "$VenvPython" -m pip install --quiet -r (Join-Path $RootDir "python-service\requirements.txt")
        Write-Host "[OK] Python dependencies installed successfully." -ForegroundColor Green
    }
}

# 4. Install Node.js dependencies
Write-Host "Installing Node.js dependencies (npm install)..." -ForegroundColor Yellow
npm install
Write-Host "[OK] Node dependencies installed." -ForegroundColor Green

# 5. Handle .env.local (ONLY copy if not exists; never overwrite)
$EnvLocal = Join-Path $RootDir ".env.local"
if (-not (Test-Path $EnvLocal)) {
    Write-Host "Creating .env.local (empty API key)..." -ForegroundColor Yellow
    Set-Content -Path $EnvLocal -Value "GEMINI_API_KEY=" -Encoding UTF8
    Write-Host "[OK] Created .env.local" -ForegroundColor Green
} else {
    Write-Host "[OK] .env.local already exists (left untouched)." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Start local dev server:  npm run dev" -ForegroundColor Yellow
Write-Host "  2. Open application:        http://localhost:3000" -ForegroundColor Yellow
Write-Host "  3. (Optional) Add your Gemini API key to .env.local for live AI insights." -ForegroundColor Gray
Write-Host "     Precomputed demo case studies work 100% offline without any API key." -ForegroundColor Gray
Write-Host ""
