# Round-8 independent audit: full-page real screenshots + console error capture
# Usage: powershell -ExecutionPolicy Bypass -File scripts/r8-audit-shoot.ps1
# Precondition: DevTools project window open (real build); Xifeng(100158) token injected
# Output: reports/screenshots/r8-audit/*.png + r8-console-errors.log

$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shotsDir = "D:\6\恋爱小程序\reports\screenshots\r8-audit"
$errLog = Join-Path $shotsDir "r8-console-errors.log"

New-Item -ItemType Directory -Force -Path $shotsDir | Out-Null
"== R8 console error capture $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==" | Set-Content -Path $errLog -Encoding UTF8

function WiRaw([string[]]$argList) {
  return (& $wi @argList 2>&1 | Out-String)
}

function Ev([string]$js, [double]$wait = 2.5) {
  $raw = WiRaw @("-c", "ZCode", "automation_evaluate", "--project", $proj, "--fn-source", $js)
  $ok = $raw -match '"success": true'
  Start-Sleep -Milliseconds ([int]($wait * 1000))
  return $ok
}

function Shot([string]$name, [double]$wait = 1.2) {
  $ok = WiRaw @("-c", "ZCode", "simulator_screenshot", "--project", $proj, "--path", (Join-Path $shotsDir "$name.png"))
  $ok2 = $ok -match '"success": true'
  Write-Host ("  [shot] {0} -> {1}" -f $name, $(if ($ok2) { "ok" } else { "FAIL" }))
  Start-Sleep -Milliseconds ([int]($wait * 1000))
}

function ConErr([string]$tag) {
  $raw = WiRaw @("-c", "ZCode", "get_simulator_console", "--project", $proj, "--command", "grep -iE `"error|is not defined|TypeError|ReferenceError`" | tail -8")
  if ($raw -match '"result": "\s*"' ) { return }
  if ($raw -match '"result": "(.+)"') {
    $m = $Matches[1]
    if ($m -and $m.Trim().Length -gt 2) {
      Add-Content -Path $errLog -Value ("### [{0}]" -f $tag) -Encoding UTF8
      Add-Content -Path $errLog -Value $m -Encoding UTF8
      Write-Host ("  [console] {0} -> CAPTURED" -f $tag) -ForegroundColor Yellow
    }
  }
}

function Go([string]$url, [string]$name, [double]$wait = 3.5) {
  Write-Host ("=> {0}" -f $name)
  $js = "function(){ wx.reLaunch({ url: '" + $url + "', fail: function(e){ console.error('NAV_FAIL " + $url + " ' + JSON.stringify(e)); } }); return 'nav'; }"
  $ok = Ev $js $wait
  if (-not $ok) { Write-Host ("  [nav FAIL] {0}" -f $url) -ForegroundColor Red }
  Shot $name
  ConErr $name
}

# ===== main package =====
Go "/pages/login/index" "01-login"
Go "/pages/register/index" "02-register"
Go "/pages/register/success" "03-register-success"
Go "/pages/home/index" "04-home"
Go "/pages/nearby/index" "05-nearby"
Go "/pages/discover/index" "06-discover"
Go "/pages/messages/index" "07-messages"
Go "/pages/profile/index" "08-profile"

# ===== core pages multi-state =====
Write-Host "=> home scroll states"
Ev "function(){ wx.pageScrollTo({ scrollTop: 800, duration: 0 }); return 'sc'; }" 1.5
Shot "09-home-mid"
Ev "function(){ wx.pageScrollTo({ scrollTop: 1600, duration: 0 }); return 'sc'; }" 1.5
Shot "10-home-bottom"
Go "/pages/profile/index" "11-profile-top" 3
Ev "function(){ wx.pageScrollTo({ scrollTop: 800, duration: 0 }); return 'sc'; }" 1.5
Shot "12-profile-mid"
Ev "function(){ wx.pageScrollTo({ scrollTop: 2000, duration: 0 }); return 'sc'; }" 1.5
Shot "13-profile-bottom"
Go "/pages/nearby/index" "14-nearby-top" 3
Ev "function(){ wx.pageScrollTo({ scrollTop: 900, duration: 0 }); return 'sc'; }" 1.5
Shot "15-nearby-mid"
Go "/pages/messages/index" "16-messages-top" 3
Ev "function(){ wx.pageScrollTo({ scrollTop: 900, duration: 0 }); return 'sc'; }" 1.5
Shot "17-messages-mid"

# ===== village =====
Go "/subpackages/village/village/index" "18-village"
Go "/subpackages/village/village/publish" "19-village-publish"
Go "/subpackages/village/village/post" "20-village-post"
Go "/subpackages/village/village/detail?id=225" "21-village-detail"
Go "/subpackages/village/village/tag-posts?tag=%E6%91%84%E5%BD%B1" "22-village-tagposts"
Go "/subpackages/village/village/history" "23-village-history"

# ===== circles =====
Go "/subpackages/circles/circles/index" "24-circles"
Go "/subpackages/circles/circles/topics" "25-circles-topics"
Go "/subpackages/circles/circles/topic-detail?id=37" "26-circles-topic-detail"
Go "/subpackages/circles/circles/post-topic?circleId=8" "27-circles-post-topic"
Go "/subpackages/circles/circles/circle-home?id=8" "28-circles-circle-home"

# ===== campus =====
Go "/subpackages/campus/campus/hub" "29-campus-hub"
Go "/subpackages/campus/campus/index" "30-campus-index"
Go "/subpackages/campus/campus/post-topic" "31-campus-post-topic"
Go "/subpackages/campus/campus/topic-detail?id=153" "32-campus-topic-detail"
Go "/subpackages/campus/campus/certification" "33-campus-certification"

# ===== discover-extra =====
Go "/subpackages/discover-extra/discover/matching" "34-discover-matching"
Go "/subpackages/discover-extra/discover/match-success" "35-discover-match-success"
Go "/subpackages/discover-extra/home/segment" "36-home-segment"
Go "/subpackages/discover-extra/nearby/people" "37-nearby-people"
Go "/subpackages/discover-extra/discover/history" "38-discover-history"
Go "/subpackages/discover-extra/likes/index" "39-likes"
Go "/subpackages/discover-extra/likes-visitors/index" "40-likes-visitors"

# ===== tools =====
Go "/subpackages/tools/daily-question/index" "41-daily-question"
Go "/subpackages/tools/love-center/index" "42-love-center"
Go "/subpackages/tools/help/index" "43-help"
Go "/subpackages/tools/security/index" "44-security"
Go "/subpackages/tools/search/index" "45-search"
Go "/subpackages/tools/heart-signals/index" "46-heart-signals"
Go "/subpackages/tools/activities/detail?id=11" "47-activities-detail"
Go "/subpackages/tools/love-center/nearby" "48-love-center-nearby"
Go "/subpackages/tools/love-center/mbti" "49-love-center-mbti"
Go "/subpackages/tools/love-center/consulting" "50-love-center-consulting"

# ===== profile-extra =====
Go "/subpackages/profile-extra/settings/index" "51-settings"
Go "/subpackages/profile-extra/verification/index" "52-verification"
Go "/subpackages/profile-extra/verification/real-name" "53-real-name"
Go "/subpackages/profile-extra/profile/visitors" "54-profile-visitors"
Go "/subpackages/profile-extra/profile/other?userId=100152" "55-profile-other"
Go "/subpackages/profile-extra/profile/location" "56-profile-location"
Go "/subpackages/profile-extra/profile/privacy" "57-profile-privacy"
Go "/subpackages/profile-extra/profile/album" "58-profile-album"
Go "/subpackages/profile-extra/profile/favorites" "59-profile-favorites"
Go "/subpackages/profile-extra/profile/tasks" "60-profile-tasks"
Go "/subpackages/profile-extra/settings/dnd" "61-settings-dnd"
Go "/subpackages/profile-extra/feedback/history" "62-feedback-history"

# ===== chat =====
Go "/subpackages/chat/chat-session/index?userId=10003" "63-chat-session"
Go "/subpackages/chat/official-chat/index" "64-official-chat"

# ===== setup =====
Go "/subpackages/setup/profile/index" "65-setup-profile"
Go "/subpackages/setup/campus/index" "66-setup-campus"
Go "/subpackages/setup/schedule/index" "67-setup-schedule"
Go "/subpackages/setup/recommend-pref/index" "68-setup-recommend-pref"
Go "/subpackages/setup/interest/index" "69-setup-interest"
Go "/subpackages/setup/showcase/index" "70-setup-showcase"

# ===== support / discover / legal / market / vip =====
Go "/subpackages/support/feedback/index" "71-feedback"
Go "/subpackages/discover/discussions/index" "72-discover-discussions"
Go "/subpackages/discover/activities/index" "73-discover-activities"
Go "/subpackages/legal/privacy/index" "74-legal-privacy"
Go "/subpackages/legal/agreement/index" "75-legal-agreement"
Go "/subpackages/market/detail/index?id=1" "76-market-detail"
Go "/subpackages/market/shop/index" "77-market-shop"
Go "/subpackages/market/wallet/index" "78-market-wallet"
Go "/subpackages/vip/index" "79-vip"
Go "/subpackages/vip/promo-code" "80-vip-promo-code"
Go "/subpackages/vip/bills" "81-vip-bills"

Ev "function(){ wx.switchTab({ url: '/pages/home/index' }); return 'back'; }" 2

Write-Host "R8 SHOOT DONE"
