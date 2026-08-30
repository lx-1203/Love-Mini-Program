# shot-full.ps1 — 全链路逐页截图（wechatide 官方通道，2026-08-26）
# 用法: powershell -ExecutionPolicy Bypass -File scripts\shot-full.ps1
$ErrorActionPreference = "Continue"
$IDE = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$PROJECT = "D:\6\恋爱小程序"
$OUT = "D:\6\恋爱小程序\截图存档\2026-08-26-全链路"
New-Item -ItemType Directory -Force -Path $OUT | Out-Null

function Invoke-IdeTool {
  param([string[]]$ArgsList)
  $raw = & $IDE -c TraeCode @ArgsList 2>&1 | Out-String
  $jsonMatch = [regex]::Match($raw, '\{[\s\S]*\}')
  if ($jsonMatch.Success) {
    try { return ($jsonMatch.Value | ConvertFrom-Json) } catch { return $null }
  }
  return $null
}

function Shot-Page {
  param([string]$name, [string]$url, [int]$wait = 5)
  Write-Host ">>> $name : $url"
  $nav = Invoke-IdeTool @("automation_navigate", "--project", $PROJECT, "--action", "reLaunch", "--url", $url, "--wait", "$wait")
  if (-not $nav.result -or $nav.result.success -ne $true) {
    Write-Host "    NAV FAIL: $($nav.result.error)"
    return
  }
  Start-Sleep -Seconds 2
  $path = Join-Path $OUT "$name.png"
  $shot = Invoke-IdeTool @("simulator_screenshot", "--project", $PROJECT, "--path", $path, "--optimize", "false")
  if ($shot.result -and $shot.result.success -eq $true) {
    Write-Host "    SHOT OK -> $path"
  } else {
    Write-Host "    SHOT FAIL: $($shot.result.error)"
  }
}

# 1) 到登录页并进入登录态（mock/dev 构建有 DEV 入口；备选“临时体验号”）
Write-Host "== login 注入 =="
Invoke-IdeTool @("automation_navigate", "--project", $PROJECT, "--action", "reLaunch", "--url", "/pages/login/index", "--wait", "5") | Out-Null
Start-Sleep -Seconds 2
$tap = Invoke-IdeTool @("automation_element_action", "--project", $PROJECT, "--action", "tap", "--selector", ".dev-user-entry")
if (-not $tap.result -or $tap.result.success -ne $true) {
  Write-Host "    DEV entry tap 未生效，尝试临时体验号按钮"
  Invoke-IdeTool @("automation_element_action", "--project", $PROJECT, "--action", "tap", "--selector", ".btn-guest") | Out-Null
}
Start-Sleep -Seconds 3

# 2) 逐页截图
Shot-Page "01-login"        "/pages/login/index"
Shot-Page "02-home"         "/pages/home/index"
Shot-Page "03-discover"      "/pages/discover/index"
Shot-Page "04-nearby-explore" "/pages/nearby/index"
Shot-Page "05-circles-index" "/pages/circles/index"
Shot-Page "06-campus"        "/pages/campus/index"
Shot-Page "07-activity-detail" "/pages/activities/detail?id=2001"
Shot-Page "08-post-create"   "/pages/village/post"
Shot-Page "09-post-detail"   "/pages/village/detail?id=1"
Shot-Page "10-messages"      "/pages/messages/index"
Shot-Page "11-official-chat" "/pages/official-chat/index"
Shot-Page "12-profile-mine"  "/pages/profile/index"
Shot-Page "13-profile-other" "/pages/profile/other?userId=1"
Shot-Page "14-settings"      "/pages/settings/index"
Shot-Page "15-security"      "/pages/security/index"

Write-Host "== done. output: $OUT =="
Get-ChildItem "$OUT\*.png" | Select-Object Name, Length | Format-Table -AutoSize