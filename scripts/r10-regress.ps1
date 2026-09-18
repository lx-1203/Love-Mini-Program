# Round-10 regression tour: affected pages after fixes
$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shotsDir = "D:\6\恋爱小程序\reports\screenshots\r10-regress"
New-Item -ItemType Directory -Force -Path $shotsDir | Out-Null

function WiRaw([string[]]$argList) { return (& $wi @argList 2>&1 | Out-String) }
function Go([string]$url, [string]$name, [double]$wait = 4.0) {
  Write-Host ("=> {0}" -f $name)
  $js = "function(){ wx.reLaunch({ url: '" + $url + "', fail: function(e){ console.error('NAV_FAIL " + $url + " ' + JSON.stringify(e)); } }); return 'nav'; }"
  $null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$js)
  Start-Sleep -Milliseconds ([int]($wait*1000))
  $ok = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shotsDir "$name.png"))
  Write-Host ("   shot {0}" -f $(if ($ok -match '"success": true') {"ok"} else {"FAIL"}))
}
$seg = $args[0]
if ($seg -eq 1) {
  Go "/subpackages/circles/circles/circle-home?id=8" "R25-circle-home"
  Go "/subpackages/discover-extra/home/segment?type=online" "R33-home-segment"
  Go "/subpackages/tools/love-center/nearby" "R45-lc-nearby"
  Go "/subpackages/tools/love-center/consulting" "R47-consulting"
  Go "/subpackages/village/village/tag-posts?tag=%E6%91%84%E5%BD%B1" "R19-tagposts"
  Go "/subpackages/campus/campus/post-topic" "R28-campus-post"
  Go "/subpackages/campus/campus/topic-detail?id=153" "R29-campus-topic"
  Go "/subpackages/discover-extra/discover/history" "R35-history"
  Go "/subpackages/tools/love-center/mbti" "R46-mbti"
}
if ($seg -eq 2) {
  Go "/subpackages/profile-extra/profile/location" "R53-location"
  Go "/subpackages/profile-extra/verification/real-name" "R50-realname"
  Go "/subpackages/discover-extra/discover/match-success" "R32-match-success"
  Go "/subpackages/discover-extra/likes/index" "R36-likes"
  Go "/subpackages/campus/campus/hub" "R26-campus-hub"
  Go "/subpackages/tools/search/index" "R42-search"
  Go "/subpackages/tools/love-center/index" "R39-love-center"
  Go "/subpackages/profile-extra/profile/album" "R55-album"
  Go "/subpackages/chat/official-chat/index" "R61-official-chat"
  Go "/subpackages/discover/discussions/index" "R69-discussions"
  Go "/pages/discover/index" "R06-discover"
  Go "/subpackages/discover-extra/nearby/people" "R34-nearby-people"
}
Write-Host ("REGRESS SEG {0} DONE" -f $seg)
