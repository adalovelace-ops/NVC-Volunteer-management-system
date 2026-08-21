$ErrorActionPreference = 'Continue'

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidDir      = Join-Path $projectRoot '.dev-pids'

Write-Host ""
Write-Host "==========================================="
Write-Host " STOPPING VOLUNTEER SYSTEM"
Write-Host "==========================================="
Write-Host ""

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

foreach ($port in @(8000, 8081)) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pidValue in $pids) {
    $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($proc) {
      Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
      Write-Host "  Killed port-$port process: $($proc.ProcessName) (PID $pidValue)"
    }
  }
}

$waited = 0
while ($waited -lt 8) {
  $still8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
  $still8081 = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
  if (-not $still8000 -and -not $still8081) { break }
  Start-Sleep -Seconds 1
  $waited++
}

Write-Host "  Clearing Python cache..."
$pycacheDir = Join-Path $projectRoot 'backend\__pycache__'
if (Test-Path $pycacheDir) {
  Remove-Item -Path $pycacheDir -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "  Python cache cleared"
}

Get-ChildItem -Path $env:TEMP -Filter 'metro-*' -ErrorAction SilentlyContinue | ForEach-Object {
  Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "  Metro bundler cache cleared"

Get-ChildItem -Path $env:TEMP -Filter 'react-*' -ErrorAction SilentlyContinue | ForEach-Object {
  Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "  React Native cache cleared"

Write-Host "  Clearing web cache..."
foreach ($cacheName in @('dist', '.cache')) {
  $cacheDir = Join-Path $projectRoot $cacheName
  if (Test-Path $cacheDir) {
    Remove-Item -Path $cacheDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Web cache ($cacheName) cleared"
  }
}

Write-Host ""
Write-Host "  All services stopped. Ports 8000 and 8081 are free."
Write-Host "  All caches cleared (Python, Metro, React Native, Web)"
Write-Host ""
Write-Host "==========================================="
Write-Host ""
