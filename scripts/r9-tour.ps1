$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shotsDir = "D:\6\恋爱小程序\reports\screenshots\r9-lifecycle"
function WiRaw([string[]]$argList) { return (& $wi @argList 2>&1 | Out-String) }
function Go([string]$url, [string]$name, [double]$wait = 4.5) {
  $js = "function(){ wx.reLaunch({ url: '" + $url + "', fail: function(e){ console.error('NAV_FAIL'); } }); return 1; }"
  $null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$js)
  Start-Sleep -Milliseconds ([int]($wait*1000))
  $ok = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shotsDir "$name.png"))
  Write-Host ("{0} -> {1}" -f $name, ($ok -match '"success": true'))
}
Go "/pages/nearby/index" "27-nearby-newuser"
Go "/pages/messages/index" "28-messages-newuser"
Go "/pages/profile/index" "29-profile-newuser"
Go "/subpackages/discover-extra/likes/index" "30-likes-newuser"
Go "/subpackages/discover-extra/likes-visitors/index" "31-visitors-newuser"
Go "/subpackages/profile-extra/profile/visitors" "32-profile-visitors-newuser"
Go "/subpackages/circles/circles/index" "33-circles-newuser"
Go "/subpackages/village/village/index" "34-village-newuser"
Go "/subpackages/tools/daily-question/index" "35-daily-question-newuser"
Go "/subpackages/tools/heart-signals/index" "36-heart-signals-newuser"
Go "/subpackages/profile-extra/verification/real-name" "37-realname-newuser"
Go "/subpackages/profile-extra/verification/index" "38-verification-center-newuser"
Go "/subpackages/profile-extra/profile/album" "39-album-newuser"
Go "/subpackages/tools/search/index" "40-search-newuser"
Go "/subpackages/profile-extra/settings/index" "41-settings-newuser"
Write-Host "TOUR DONE"
