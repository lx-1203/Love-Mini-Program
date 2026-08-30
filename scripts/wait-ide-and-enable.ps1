# wait-ide-and-enable.ps1 - wait for IDE restart, enable automation, probe runtime (ASCII only)
param(
  [string]$IDE,
  [string]$CLI,
  [string]$PROJECT,
  [int]$PORT = 9430
)

Write-Host "[wait] waiting for wechatdevtools process..."
$appeared = $false
for ($i = 0; $i -lt 30; $i++) {
  if (Get-Process -Name "wechatdevtools" -ErrorAction SilentlyContinue) { $appeared = $true; break }
  Start-Sleep -Seconds 4
}
if (-not $appeared) { Write-Host "[FAIL] no devtools process after 30 rounds"; exit 1 }
Write-Host "[wait] process found. waiting for IDE server..."
Start-Sleep -Seconds 8

& $CLI auto --project $PROJECT --port $PORT --trust-project 2>&1 | Select-Object -Last 3 | Out-Null
Write-Host "[wait] cli auto done. polling for mini-app runtime..."

$probe = $null
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 8
  $raw = & $IDE -c TraeCode automation_runtime_info --project $PROJECT --action currentPage 2>&1 | Out-String
  if ($raw -match '"success": true') { $probe = "ok"; Write-Host "[wait] runtime ready"; break }
  Write-Host "[wait] probe #$($i+1) not ready, keep waiting..."
}

if ($probe) {
  Write-Host "READY"
  exit 0
} else {
  Write-Host "[FAIL] runtime not ready. Please open project, compile (see login page), and enable 'Automation Test' in IDE status bar / Tools menu."
  exit 2
}