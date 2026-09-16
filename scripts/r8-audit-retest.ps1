# R8 retest of pages that showed blank during the long reLaunch storm
$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shotsDir = "D:\6\恋爱小程序\reports\screenshots\r8-audit"

function WiRaw([string[]]$argList) {
  return (& $wi @argList 2>&1 | Out-String)
}
function Go([string]$url, [string]$name, [double]$wait = 4) {
  Write-Host ("=> {0}" -f $name)
  $js = "function(){ wx.reLaunch({ url: '" + $url + "', fail: function(e){ console.error('NAV_FAIL " + $url + " ' + JSON.stringify(e)); } }); return 'nav'; }"
  $raw = WiRaw @("-c", "ZCode", "automation_evaluate", "--project", $proj, "--fn-source", $js)
  Start-Sleep -Milliseconds ([int]($wait * 1000))
  $ok = WiRaw @("-c", "ZCode", "simulator_screenshot", "--project", $proj, "--path", (Join-Path $shotsDir "$name.png"))
  $ok2 = $ok -match '"success": true'
  Write-Host ("  [shot] {0} -> {1}" -f $name, $(if ($ok2) { "ok" } else { "FAIL" }))
}

Go "/subpackages/discover-extra/likes/index" "r2-39-likes"
Go "/subpackages/tools/help/index" "r2-43-help"
Go "/subpackages/tools/security/index" "r2-44-security"
Go "/subpackages/tools/search/index" "r2-45-search"
Go "/subpackages/tools/heart-signals/index" "r2-46-heart-signals"
Go "/subpackages/tools/activities/detail?id=11" "r2-47-activities-detail"
Go "/subpackages/tools/love-center/mbti" "r2-49-mbti"
Go "/subpackages/tools/love-center/consulting" "r2-50-consulting"
Go "/subpackages/profile-extra/settings/index" "r2-51-settings"
Go "/subpackages/profile-extra/verification/index" "r2-52-verification"
Go "/subpackages/profile-extra/profile/album" "r2-58-album"
Go "/subpackages/chat/chat-session/index?userId=10003" "r2-63-chat-session"
Go "/subpackages/chat/official-chat/index" "r2-64-official-chat"
Go "/subpackages/setup/profile/index" "r2-65-setup-profile"
Go "/subpackages/setup/interest/index" "r2-69-setup-interest"
Go "/subpackages/support/feedback/index" "r2-71-feedback"
Go "/subpackages/discover/discussions/index" "r2-72-discussions"
Go "/subpackages/legal/privacy/index" "r2-74-privacy"
Go "/subpackages/market/detail/index?id=1" "r2-76-market-detail"
Go "/subpackages/market/shop/index" "r2-77-market-shop"
Go "/subpackages/market/wallet/index" "r2-78-wallet"
Go "/subpackages/vip/index" "r2-79-vip"
Go "/subpackages/vip/promo-code" "r2-80-promo"
Go "/subpackages/vip/bills" "r2-81-bills"
Go "/pages/home/index" "r2-home-final"

Write-Host "RETEST DONE"
