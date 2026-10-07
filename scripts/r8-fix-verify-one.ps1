# 路径可推导：仓库根 = scripts/ 上一级；wechatide 走 WECHATIDE_DIR 或 PATH，不写盘符死路径。
$repo = Split-Path $PSScriptRoot -Parent
$wi = if ($env:WECHATIDE_DIR) { Join-Path $env:WECHATIDE_DIR 'wechatide.cmd' } else { 'wechatide.cmd' }
$proj = $repo
$shotsDir = Join-Path $repo 'reports\screenshots\r8-audit'
$name = "r3b-fix-likes-relogin"
$url = "/subpackages/discover-extra/likes/index"
$js = "function(){ wx.reLaunch({ url: '" + $url + "', fail: function(e){ console.error('NAV_FAIL'); } }); return 'nav'; }"
$null = (& $wi @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$js) 2>&1 | Out-String)
Start-Sleep -Milliseconds 6000
$ok = (& $wi @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shotsDir "$name.png")) 2>&1 | Out-String)
Write-Host ($ok -match '"success": true')
