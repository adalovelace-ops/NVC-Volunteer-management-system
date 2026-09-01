$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidDir      = Join-Path $projectRoot '.dev-pids'
$backendLog  = Join-Path $pidDir 'backend.log'
$backendErr  = Join-Path $pidDir 'backend.err.log'
$webLog      = Join-Path $pidDir 'web.log'

Write-Host ""
Write-Host "==========================================="
Write-Host " STARTING VOLUNTEER SYSTEM"
Write-Host "==========================================="
Write-Host ""

if (-not (Test-Path $pidDir)) {
  New-Item -Path $pidDir -ItemType Directory | Out-Null
}

foreach ($port in @(8000, 8081)) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($p in $pids) {
    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    Write-Host "  Cleared port $port (PID $p)"
  }
}

Start-Sleep -Seconds 2

Write-Host "  Starting backend on port 8000..."

if (Test-Path $backendLog) { Remove-Item $backendLog -Force -ErrorAction SilentlyContinue }
if (Test-Path $backendErr) { Remove-Item $backendErr -Force -ErrorAction SilentlyContinue }
if (Test-Path $webLog) { Remove-Item $webLog -Force -ErrorAction SilentlyContinue }

$escapedRoot = $projectRoot.Replace("'", "''")
$backendCmd  = "Set-Location '$escapedRoot'; npm run backend:stable 2>&1 | Tee-Object -FilePath '$($backendLog.Replace("'", "''"))'"
$backendProc = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $backendCmd) -PassThru -WindowStyle Hidden

Set-Content -Path (Join-Path $pidDir 'backend.pid') -Value $backendProc.Id
Write-Host "  Backend started (PID $($backendProc.Id))"

Write-Host "  Waiting for backend to be ready..."
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
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
  Write-Warning "  Backend did not respond in time - web app will still start."
}

Write-Host "  Starting web app on port 8081..."
$webCmd = "Set-Location '$escapedRoot'; npm run web 2>&1 | Tee-Object -FilePath '$($webLog.Replace("'", "''"))'"
$webProc = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $webCmd) -PassThru -WindowStyle Hidden

Set-Content -Path (Join-Path $pidDir 'web.pid') -Value $webProc.Id
Write-Host "  Web app started (PID $($webProc.Id))"
Write-Host "  Waiting for web app to be ready before opening browsers..."

$webReady = $false
for ($i = 0; $i -lt 60; $i++) {
  $alive = Get-Process -Id $webProc.Id -ErrorAction SilentlyContinue
  if (-not $alive) {
    Write-Warning "  Web app process exited unexpectedly. Check $webLog"
    break
  }

  try {
    $resp = Invoke-WebRequest -Uri "http://$($env:COMPUTERNAME):8081" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
      $webReady = $true
      Write-Host "  Web app is ready!" -ForegroundColor Green
      Write-Host ""
      Write-Host "  Opening browsers (1 desktop + 1 mobile view)..." -ForegroundColor Cyan
      Write-Host "    - Desktop Web: http://$($env:COMPUTERNAME):8081" -ForegroundColor Gray
      Write-Host "    - Mobile Web:  http://$($env:COMPUTERNAME):8081?mode=mobile" -ForegroundColor Gray
      Write-Host ""
      Start-Process "http://$($env:COMPUTERNAME):8081"
      Start-Sleep -Milliseconds 800
      Start-Process "http://$($env:COMPUTERNAME):8081?mode=mobile"
      break
    }
  } catch {
    # still starting up
  }
  Start-Sleep -Seconds 1
}

if (-not $webReady) {
  Write-Warning "  Web app did not start in time. You may need to open the system web URL manually."
}

Write-Host ""
Write-Host "  Volunteer System is running."
Write-Host "  Desktop Web: http://$($env:COMPUTERNAME):8081"
Write-Host "  Mobile Web:  http://$($env:COMPUTERNAME):8081?mode=mobile"
Write-Host "  Run npm stop to stop backend and web app."
Write-Host ""
