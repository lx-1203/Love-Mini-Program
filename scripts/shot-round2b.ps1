# shot-round2b.ps1 - targeted re-screenshot of fixed pages
param([int]$MaxPages = 999)
$ErrorActionPreference = "Continue"
$IDE = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$PROJECT = "D:\6\恋爱小程序"
$OUT = "D:\6\恋爱小程序\截图存档\2026-08-27-round\pages"
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

function Shot-One {
  param([string]$name, [string]$url, [int]$wait)
  Write-Host ">>> $name : $url"
  $nav = Invoke-IdeTool @("automation_navigate", "--project", $PROJECT, "--action", "reLaunch", "--url", $url, "--wait", "$wait")
  if (-not $nav -or -not $nav.result -or $nav.result.success -ne $true) {
    Write-Host "    NAV FAIL: $($nav.result.error)"
    return
  }
  Start-Sleep -Seconds 4
  Invoke-IdeTool @("automation_viewport_action", "--project", $PROJECT, "--action", "pageScrollTo", "--scroll-top", "0") | Out-Null
  Start-Sleep -Seconds 2
  $top = Join-Path $OUT "$name-top.png"
  $s1 = Invoke-IdeTool @("simulator_screenshot", "--project", $PROJECT, "--path", $top, "--optimize", "false")
  if ($s1 -and $s1.result -and $s1.result.success -eq $true) { Write-Host "    TOP OK -> $top" }
  else { Write-Host "    TOP FAIL" }
  Invoke-IdeTool @("automation_viewport_action", "--project", $PROJECT, "--action", "pageScrollTo", "--scroll-top", "99999") | Out-Null
  Start-Sleep -Seconds 2
  $btm = Join-Path $OUT "$name-bottom.png"
  $s2 = Invoke-IdeTool @("simulator_screenshot", "--project", $PROJECT, "--path", $btm, "--optimize", "false")
  if ($s2 -and $s2.result -and $s2.result.success -eq $true) { Write-Host "    BOTTOM OK -> $btm" }
  else { Write-Host "    BOTTOM FAIL" }
}

$PAGE_LIST = @(
  @{ n = "02-home";         u = "/pages/home/index";                        w = 6 },
  @{ n = "07-circles-index";u = "/pages/circles/index";                     w = 6 },
  @{ n = "08-circles-topics";u = "/pages/circles/topics?circleId=1";        w = 6 },
  @{ n = "09-campus";       u = "/pages/campus/index";                      w = 6 },
  @{ n = "10-village";      u = "/pages/village/index";                     w = 6 },
  @{ n = "11-post-create";  u = "/pages/village/post";                      w = 6 },
  @{ n = "12-post-detail";  u = "/pages/village/detail?id=1";               w = 6 },
  @{ n = "13-messages";     u = "/pages/messages/index";                    w = 6 },
  @{ n = "16-profile-own";  u = "/pages/profile/index";                     w = 6 },
  @{ n = "17-profile-other";u = "/pages/profile/other?userId=2";            w = 6 },
  @{ n = "23-circles-detail";u = "/pages/circles/topic-detail?id=1";        w = 6 }
)

$idx = 0
foreach ($p in $PAGE_LIST) {
  $idx++
  if ($idx -gt $MaxPages) { break }
  Shot-One $p.n $p.u $p.w
  Start-Sleep -Seconds 2
}
Write-Host "== done. output: $OUT =="
