$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidDir      = Join-Path $projectRoot '.dev-pids'
$backendLog  = Join-Path $pidDir 'backend.log'
$backendErr  = Join-Path $pidDir 'backend.err.log'
$expoLog     = Join-Path $pidDir 'expo.log'

Write-Host ""
Write-Host "==========================================="
Write-Host " STARTING VOLUNTEER SYSTEM"
Write-Host "==========================================="
Write-Host ""

# ── 0. Ensure .dev-pids directory exists ───────────────────────────────────
if (-not (Test-Path $pidDir)) {
  New-Item -Path $pidDir -ItemType Directory | Out-Null
}

# ── 1. Force-stop anything on ports 8000 / 8081 before starting ────────────
foreach ($port in @(8000, 8081)) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
          Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($p in $pids) {
    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    Write-Host "  Cleared port $port (PID $p)"
  }
}

# Wait for ports to release
Start-Sleep -Seconds 2

# ── 2. Start backend ────────────────────────────────────────────────────────
Write-Host "  Starting backend on port 8000..."

if (Test-Path $backendLog) { Remove-Item $backendLog -Force -ErrorAction SilentlyContinue }
if (Test-Path $backendErr) { Remove-Item $backendErr -Force -ErrorAction SilentlyContinue }

$escapedRoot = $projectRoot.Replace("'", "''")
$backendCmd  = "Set-Location '$escapedRoot'; npm run backend:stable 2>&1 | Tee-Object -FilePath '$($backendLog.Replace("'","''"))'"

$backendProc = Start-Process -FilePath 'powershell.exe' `
  -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $backendCmd) `
  -PassThru -WindowStyle Hidden

Set-Content -Path (Join-Path $pidDir 'backend.pid') -Value $backendProc.Id
Write-Host "  Backend started (PID $($backendProc.Id))"

# ── 3. Wait for backend to be healthy (max 30 s) ───────────────────────────
Write-Host "  Waiting for backend to be ready..."
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
  # Check the process is still alive
  $alive = Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue
  if (-not $alive) {
    Write-Warning "  Backend process exited unexpectedly. Check $backendLog"
    break
  }

  try {
    $resp = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($resp.status -eq 'ok') {
      $healthy = $true
      Write-Host "  Backend is healthy! (mode: $($resp.mode))" -ForegroundColor Green
      break
    }
  } catch {
    # still starting up
  }
  Start-Sleep -Seconds 1
}

if (-not $healthy) {
  Write-Warning "  Backend did not respond in time — Expo will still start."
}

# ── 4. Start Expo web (in foreground so QR code displays) ──────────────────
Write-Host "  Starting Expo web on port 8081..."
Write-Host ""

# Start Expo in background to monitor readiness
$expoProc = Start-Process -FilePath 'powershell.exe' `
  -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', "Set-Location '$escapedRoot'; npx expo start --web --clear") `
  -PassThru -WindowStyle Hidden

# ── 5. Wait for Expo web to be ready, then open browsers (ONCE) ────────────
Write-Host "  Waiting for Expo web to be ready before opening browsers..."

Start-Sleep -Seconds 5  # Give Expo time to start

# Wait for web to be ready (max 60 seconds)
$webReady = $false
$browsersOpened = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:8081' -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($resp.StatusCode -eq 200 -and -not $browsersOpened) {
      $webReady = $true
      Write-Host "  Expo web is ready!" -ForegroundColor Green
      Write-Host ""
      Write-Host "  Opening browsers (1 desktop + 1 mobile view)..." -ForegroundColor Cyan
      Write-Host "    - Desktop Web: http://localhost:8081" -ForegroundColor Gray
      Write-Host "    - Mobile Web:  http://localhost:8081?mode=mobile" -ForegroundColor Gray
      Write-Host ""
      
      # Open ONLY 1 desktop web view
      Start-Process "http://localhost:8081"
      Start-Sleep -Milliseconds 800
      
      # Open ONLY 1 mobile web view
      Start-Process "http://localhost:8081?mode=mobile"
      $browsersOpened = $true
      break
    }
  } catch {
    # still starting up
  }
  Start-Sleep -Seconds 1
}

if (-not $webReady) {
  Write-Warning "  Expo web did not start in time. You may need to open browsers manually."
}

# Stop the background Expo process
Stop-Process -Id $expoProc.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "  Restarting Expo in foreground for QR code display..."
Write-Host "  Press Ctrl+C to stop the entire system."
Write-Host ""

# Run Expo directly in this terminal so QR code shows (won't open more browsers)
Set-Location $projectRoot
npx expo start --web

