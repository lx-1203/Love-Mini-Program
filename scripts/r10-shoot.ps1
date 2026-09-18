# Round-10 full audit shoot: all pages + multi-state, segmented with refresh
$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shotsDir = "D:\6\恋爱小程序\reports\screenshots\r10-audit"
$errLog = Join-Path $shotsDir "r10-console-errors.log"
New-Item -ItemType Directory -Force -Path $shotsDir | Out-Null

function WiRaw([string[]]$argList) { return (& $wi @argList 2>&1 | Out-String) }
function Ev([string]$js, [double]$wait = 2.5) {
  $raw = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$js)
  Start-Sleep -Milliseconds ([int]($wait*1000))
  return ($raw -match '"success": true')
}
function Shot([string]$name) {
  $ok = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shotsDir "$name.png"))
  Write-Host ("  [shot] {0} -> {1}" -f $name, $(if ($ok -match '"success": true') {"ok"} else {"FAIL"}))
  Start-Sleep -Milliseconds 800
}
function ConErr([string]$tag) {
  $raw = WiRaw @("-c","ZCode","get_simulator_console","--project",$proj,"--command","grep -iE 'error|TypeError|NAV_FAIL|undefined is not' | tail -8")
  if ($raw -match '"result":\s*""') { return }
  if ($raw -match '"result":\s*"(.+)"') {
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

$segment = $args[0]

if ($segment -eq 1) {
  # ===== main package + core states =====
  Go "/pages/home/index" "01-home"
  Ev "function(){ wx.pageScrollTo({ scrollTop: 900, duration: 0 }); return 'sc'; }" 1.5; Shot "02-home-mid"
  Ev "function(){ wx.pageScrollTo({ scrollTop: 2000, duration: 0 }); return 'sc'; }" 1.5; Shot "03-home-bottom"
  Go "/pages/nearby/index" "04-nearby"
  Ev "function(){ wx.pageScrollTo({ scrollTop: 900, duration: 0 }); return 'sc'; }" 1.5; Shot "05-nearby-mid"
  Go "/pages/discover/index" "06-discover"
  Go "/pages/messages/index" "07-messages"
  Ev "function(){ wx.pageScrollTo({ scrollTop: 900, duration: 0 }); return 'sc'; }" 1.5; Shot "08-messages-mid"
  Go "/pages/profile/index" "09-profile"
  Ev "function(){ wx.pageScrollTo({ scrollTop: 900, duration: 0 }); return 'sc'; }" 1.5; Shot "10-profile-mid"
  Ev "function(){ wx.pageScrollTo({ scrollTop: 2200, duration: 0 }); return 'sc'; }" 1.5; Shot "11-profile-bottom"
  Go "/pages/login/index" "12-login"
  Go "/pages/register/index" "13-register"
  Go "/pages/register/success" "14-register-success"
  Go "/subpackages/village/village/index" "15-village"
  Go "/subpackages/village/village/publish" "16-village-publish"
  Go "/subpackages/village/village/post?id=225" "17-village-post"
  Go "/subpackages/village/village/detail?id=225" "18-village-detail"
  Go "/subpackages/village/village/tag-posts?tag=%E6%91%84%E5%BD%B1" "19-village-tagposts"
  Go "/subpackages/village/village/history" "20-village-history"
  Ev "function(){ wx.switchTab({ url: '/pages/home/index' }); return 'b'; }" 2
}
if ($segment -eq 2) {
  # ===== circles + campus + discover-extra =====
  Go "/subpackages/circles/circles/index" "21-circles"
  Go "/subpackages/circles/circles/topics" "22-circles-topics"
  Go "/subpackages/circles/circles/topic-detail?id=37" "23-circles-topic-detail"
  Go "/subpackages/circles/circles/post-topic?circleId=8" "24-circles-post-topic"
  Go "/subpackages/circles/circles/circle-home?id=8" "25-circles-circle-home"
  Go "/subpackages/campus/campus/hub" "26-campus-hub"
  Go "/subpackages/campus/campus/index" "27-campus-index"
  Go "/subpackages/campus/campus/post-topic" "28-campus-post-topic"
  Go "/subpackages/campus/campus/topic-detail?id=153" "29-campus-topic-detail"
  Go "/subpackages/campus/campus/certification" "30-campus-certification"
  Go "/subpackages/discover-extra/discover/matching" "31-discover-matching"
  Go "/subpackages/discover-extra/discover/match-success" "32-match-success"
  Go "/subpackages/discover-extra/home/segment" "33-home-segment"
  Go "/subpackages/discover-extra/nearby/people" "34-nearby-people"
  Go "/subpackages/discover-extra/discover/history" "35-discover-history"
  Go "/subpackages/discover-extra/likes/index" "36-likes"
  Go "/subpackages/discover-extra/likes-visitors/index" "37-likes-visitors"
  Ev "function(){ wx.switchTab({ url: '/pages/home/index' }); return 'b'; }" 2
}
if ($segment -eq 3) {
  # ===== tools + profile-extra =====
  Go "/subpackages/tools/daily-question/index" "38-daily-question"
  Go "/subpackages/tools/love-center/index" "39-love-center"
  Go "/subpackages/tools/help/index" "40-help"
  Go "/subpackages/tools/security/index" "41-security"
  Go "/subpackages/tools/search/index" "42-search"
  Go "/subpackages/tools/heart-signals/index" "43-heart-signals"
  Go "/subpackages/tools/activities/detail?id=11" "44-activities-detail"
  Go "/subpackages/tools/love-center/nearby" "45-love-center-nearby"
  Go "/subpackages/tools/love-center/mbti" "46-love-center-mbti"
  Go "/subpackages/tools/love-center/consulting" "47-love-center-consulting"
  Go "/subpackages/profile-extra/settings/index" "48-settings"
  Go "/subpackages/profile-extra/verification/index" "49-verification"
  Go "/subpackages/profile-extra/verification/real-name" "50-real-name"
  Go "/subpackages/profile-extra/profile/visitors" "51-profile-visitors"
  Go "/subpackages/profile-extra/profile/other?userId=100152" "52-profile-other"
  Go "/subpackages/profile-extra/profile/location" "53-profile-location"
  Go "/subpackages/profile-extra/profile/privacy" "54-profile-privacy"
  Go "/subpackages/profile-extra/profile/album" "55-profile-album"
  Go "/subpackages/profile-extra/profile/favorites" "56-profile-favorites"
  Go "/subpackages/profile-extra/profile/tasks" "57-profile-tasks"
  Go "/subpackages/profile-extra/settings/dnd" "58-settings-dnd"
  Go "/subpackages/profile-extra/feedback/history" "59-feedback-history"
  Ev "function(){ wx.switchTab({ url: '/pages/home/index' }); return 'b'; }" 2
}
if ($segment -eq 4) {
  # ===== chat + setup + support + market + vip =====
  Go "/subpackages/chat/chat-session/index?userId=10003" "60-chat-session"
  Go "/subpackages/chat/official-chat/index" "61-official-chat"
  Go "/subpackages/setup/profile/index" "62-setup-profile"
  Go "/subpackages/setup/campus/index" "63-setup-campus"
  Go "/subpackages/setup/schedule/index" "64-setup-schedule"
  Go "/subpackages/setup/recommend-pref/index" "65-setup-recommend-pref"
  Go "/subpackages/setup/interest/index" "66-setup-interest"
  Go "/subpackages/setup/showcase/index" "67-setup-showcase"
  Go "/subpackages/support/feedback/index" "68-feedback"
  Go "/subpackages/discover/discussions/index" "69-discover-discussions"
  Go "/subpackages/discover/activities/index" "70-discover-activities"
  Go "/subpackages/legal/privacy/index" "71-legal-privacy"
  Go "/subpackages/legal/agreement/index" "72-legal-agreement"
  Go "/subpackages/market/detail/index?id=1" "73-market-detail"
  Go "/subpackages/market/shop/index" "74-market-shop"
  Go "/subpackages/market/wallet/index" "75-market-wallet"
  Go "/subpackages/vip/index" "76-vip"
  Go "/subpackages/vip/promo-code" "77-vip-promo-code"
  Go "/subpackages/vip/bills" "78-vip-bills"
  Ev "function(){ wx.switchTab({ url: '/pages/home/index' }); return 'b'; }" 2
}
Write-Host ("SEGMENT {0} DONE" -f $segment)
