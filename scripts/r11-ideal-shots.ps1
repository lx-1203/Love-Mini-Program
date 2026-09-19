# R11: ideal-image comparison shots (11 pages, fresh build + fresh session)
$ErrorActionPreference = "Continue"
$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shots = "D:\6\恋爱小程序\reports\screenshots\r11-ideal"
New-Item -ItemType Directory -Force -Path $shots | Out-Null
function WiRaw([string[]]$argList) { return (& $wi @argList 2>&1 | Out-String) }

$token = (Get-Content "D:\6\恋爱小程序\tmp_r11_login.json" -Raw | ConvertFrom-Json).token
$jsBoot = 'function(){ try { wx.setStorageSync(''token'', ''' + $token + '''); var app=getApp(); var vm=app[''$vm'']; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm[''$pinia'']||gp[''$pinia'']; var s=p._s.get(''session''); if(s&&s.bootstrap){ s.bootstrap(); } return ''ok''; } catch(e){ return ''ERR''; } }'
$null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$jsBoot)
Start-Sleep -Seconds 5

$pages = @(
  @("home", "/pages/home/index"),
  @("nearby", "/pages/nearby/index"),
  @("discover", "/pages/discover/index"),
  @("match-success", "/subpackages/discover-extra/discover/match-success"),
  @("messages", "/pages/messages/index"),
  @("profile", "/pages/profile/index"),
  @("circles-index", "/subpackages/circles/circles/index"),
  @("circle-home", "/subpackages/circles/circles/circle-home?circleId=8"),
  @("campus-hub", "/subpackages/campus/campus/hub"),
  @("village-post", "/subpackages/village/village/post"),
  @("village-detail", "/subpackages/village/village/detail?id=225")
)
foreach ($p in $pages) {
  $name = $p[0]; $url = $p[1]
  $js = 'function(){ wx.reLaunch({ url: ''' + $url + ''' }); return 1; }'
  $null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$js)
  Start-Sleep -Seconds 7
  $null = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shots ("cur-" + $name + ".png")))
  Write-Host ("shot " + $name)
}
# logout state for login page ideal comparison
$null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",'function(){ wx.removeStorageSync(''token''); var app=getApp(); var vm=app[''$vm'']; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm[''$pinia'']||gp[''$pinia'']; var s=p._s.get(''session''); if(s){ s.userSession = null; } wx.reLaunch({ url: ''/pages/login/index'' }); return 1; }')
Start-Sleep -Seconds 7
$null = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shots "cur-login.png"))
Write-Host "shot login (logged out)"
# restore session
$jsBoot2 = 'function(){ try { wx.setStorageSync(''token'', ''' + $token + '''); var s2=null; var app=getApp(); var vm=app[''$vm'']; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm[''$pinia'']||gp[''$pinia'']; var s=p._s.get(''session''); if(s&&s.bootstrap){ s.bootstrap(); } wx.reLaunch({ url: ''/pages/home/index'' }); return 1; } catch(e){ return ''ERR''; } }'
$null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$jsBoot2)
Write-Host "IDEAL SHOTS DONE"
