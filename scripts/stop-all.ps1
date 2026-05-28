$ErrorActionPreference = 'Continue'

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidDir      = Join-Path $projectRoot '.dev-pids'

Write-Host ""
Write-Host "==========================================="
Write-Host " STOPPING VOLUNTEER SYSTEM"
Write-Host "==========================================="
Write-Host ""

# ── 1. Kill processes recorded in .dev-pids/*.pid ──────────────────────────
if (Test-Path $pidDir) {
  Get-ChildItem -Path $pidDir -Filter '*.pid' | ForEach-Object {
    $svc      = $_.BaseName
    $pidValue = (Get-Content $_.FullName -ErrorAction SilentlyContinue) -as [int]
    if ($pidValue) {
      $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
      if ($proc) {
        Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped $svc (PID $pidValue)"
      }
    }
    Remove-Item $_.FullName -ErrorAction SilentlyContinue
  }
}

# ── 2. Kill anything still holding port 8000 (backend) ─────────────────────
$port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid8000 in $port8000) {
  $proc = Get-Process -Id $pid8000 -ErrorAction SilentlyContinue
  if ($proc) {
    Stop-Process -Id $pid8000 -Force -ErrorAction SilentlyContinue
    Write-Host "  Killed port-8000 process: $($proc.ProcessName) (PID $pid8000)"
  }
}

# ── 3. Kill anything still holding port 8081 (Expo web) ────────────────────
$port8081 = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid8081 in $port8081) {
  $proc = Get-Process -Id $pid8081 -ErrorAction SilentlyContinue
  if ($proc) {
    Stop-Process -Id $pid8081 -Force -ErrorAction SilentlyContinue
    Write-Host "  Killed port-8081 process: $($proc.ProcessName) (PID $pid8081)"
  }
}

# ── 4. Wait for ports to fully release ─────────────────────────────────────
$waited = 0
while ($waited -lt 8) {
  $still8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
  $still8081 = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
  if (-not $still8000 -and -not $still8081) { break }
  Start-Sleep -Seconds 1
  $waited++
}

Write-Host ""
Write-Host "  All services stopped. Ports 8000 and 8081 are free."
Write-Host ""
Write-Host "==========================================="
Write-Host ""
