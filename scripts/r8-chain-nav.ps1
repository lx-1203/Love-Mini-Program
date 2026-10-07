# 路径可推导：仓库根 = scripts/ 上一级；wechatide 走 WECHATIDE_DIR 或 PATH，不写盘符死路径。
$repo = Split-Path $PSScriptRoot -Parent
$wi = if ($env:WECHATIDE_DIR) { Join-Path $env:WECHATIDE_DIR 'wechatide.cmd' } else { 'wechatide.cmd' }
$proj = $repo
$shotsDir = Join-Path $repo 'reports\screenshots\r8-audit'
function WiRaw([string[]]$argList) { return (& $wi @argList 2>&1 | Out-String) }
function Go([string]$url, [string]$name, [double]$wait = 4.5) {
  $js = "function(){ wx.reLaunch({ url: '" + $url + "', fail: function(e){ console.error('NF'); } }); return 1; }"
  $null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$js)
  Start-Sleep -Milliseconds ([int]($wait*1000))
  $ok = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shotsDir "$name.png"))
  Write-Host ("{0} -> {1}" -f $name, ($ok -match '"success": true'))
}
Go "/pages/home/index" "chain-a1-home"
Go "/pages/nearby/index" "chain-a2-nearby"
Go "/subpackages/discover-extra/nearby/people" "chain-a3-people"
Go "/subpackages/profile-extra/profile/other?userId=10003" "chain-a4-other-profile"
Go "/subpackages/circles/circles/circle-home?circleId=8" "chain-c1-circle8-home"
Go "/subpackages/circles/circles/topics?circleId=8" "chain-c2-circle8-topics"
Go "/subpackages/campus/campus/hub" "chain-d1-campus-hub"
