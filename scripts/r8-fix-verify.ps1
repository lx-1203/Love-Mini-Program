# R8 fix-verification screenshots (after rebuild)
$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shotsDir = "D:\6\恋爱小程序\reports\screenshots\r8-audit"

function WiRaw([string[]]$argList) {
  return (& $wi @argList 2>&1 | Out-String)
}
function Go([string]$url, [string]$name, [double]$wait = 4.5) {
  Write-Host ("=> {0}" -f $name)
  $js = "function(){ wx.reLaunch({ url: '" + $url + "', fail: function(e){ console.error('NAV_FAIL " + $url + " ' + JSON.stringify(e)); } }); return 'nav'; }"
  $raw = WiRaw @("-c", "ZCode", "automation_evaluate", "--project", $proj, "--fn-source", $js)
  Start-Sleep -Milliseconds ([int]($wait * 1000))
  $ok = WiRaw @("-c", "ZCode", "simulator_screenshot", "--project", $proj, "--path", (Join-Path $shotsDir "$name.png"))
  $ok2 = $ok -match '"success": true'
  Write-Host ("  [shot] {0} -> {1}" -f $name, $(if ($ok2) { "ok" } else { "FAIL" }))
}

# fixed pages
Go "/subpackages/discover-extra/likes/index" "r3-fix-likes-statusbar-data"
Go "/subpackages/profile-extra/profile/album" "r3-fix-album-statusbar"
Go "/subpackages/tools/heart-signals/index" "r3-fix-heart-signals-statusbar-lockpct"
Go "/subpackages/village/village/index" "r3-fix-village-lockpct"
Go "/subpackages/circles/circles/topic-detail?id=37" "r3-fix-topic37-reply-avatars"
Go "/subpackages/village/village/detail?id=225" "r3-fix-village225-no-follow"
Go "/subpackages/campus/campus/hub" "r3-fix-campus-hub-titles"
Go "/subpackages/village/village/publish" "r3-fix-publish-no-stale-draft"
Go "/subpackages/village/village/post" "r3-fix-post-no-stale-draft"

Write-Host "FIX VERIFY DONE"
