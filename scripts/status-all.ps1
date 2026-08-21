$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidDir = Join-Path $projectRoot '.dev-pids'

if (-not (Test-Path $pidDir)) {
  Write-Host 'No running services found.'
  exit 1
}

$services = @('backend', 'web')
$healthyCount = 0

function Test-ServiceHealth {
  param(
    [Parameter(Mandatory = $true)][string]$Service
  )

  $url = if ($Service -eq 'backend') { 'http://127.0.0.1:8000/health' } else { 'http://127.0.0.1:8081/' }

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

foreach ($service in $services) {
  $pidFile = Join-Path $pidDir ($service + '.pid')
  $isHealthy = Test-ServiceHealth -Service $service
  $pidValue = $null

  if (Test-Path $pidFile) {
    $pidValue = Get-Content $pidFile -ErrorAction SilentlyContinue
  }

  if ($isHealthy) {
    if ($pidValue) {
      Write-Host ($service + ': running (PID ' + $pidValue + ', health check passed)')
    } else {
      Write-Host ($service + ': running (health check passed)')
    }
    $healthyCount++
    continue
  }

  if (-not $pidValue) {
    Write-Host ($service + ': stopped')
    continue
  }

  $process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
  if (-not $process) {
    Write-Host ($service + ': stopped (stale pid file removed)')
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    continue
  }

  Write-Host ($service + ': unhealthy (PID ' + $pidValue + ' alive, health check failed)')
}

if ($healthyCount -lt 2) {
  exit 1
}
