$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shotsDir = "D:\6\恋爱小程序\reports\screenshots\r8-audit"
$name = "r3b-fix-likes-relogin"
$url = "/subpackages/discover-extra/likes/index"
$js = "function(){ wx.reLaunch({ url: '" + $url + "', fail: function(e){ console.error('NAV_FAIL'); } }); return 'nav'; }"
$null = (& $wi @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$js) 2>&1 | Out-String)
Start-Sleep -Milliseconds 6000
$ok = (& $wi @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shotsDir "$name.png")) 2>&1 | Out-String)
Write-Host ($ok -match '"success": true')
