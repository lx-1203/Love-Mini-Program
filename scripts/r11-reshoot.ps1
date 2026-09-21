# R11 G6: re-shoot flagged scenes with fresh tokens
$ErrorActionPreference = "Continue"
$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$stamp = "b0919-r12c"
$shots = "D:\6\恋爱小程序\reports\screenshots\r11-acceptance"
$ident = $args[0]
$tokfile = "D:\6\恋爱小程序\tmp_r11_login.json"
if ($ident -eq "B") { $tokfile = "D:\6\恋爱小程序\tmp_r11_guest.json" }

function WiRaw([string[]]$argList) { return (& $wi @argList 2>&1 | Out-String) }

$token = (Get-Content $tokfile -Raw | ConvertFrom-Json).token
$jsBoot = 'function(){ try { wx.setStorageSync(''token'', ''' + $token + '''); var app=getApp(); var vm=app[''$vm'']; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm[''$pinia'']||gp[''$pinia'']; var s=p._s.get(''session''); if(s&&s.bootstrap){ s.bootstrap(); } return ''boot-ok''; } catch(e){ return ''ERR ''+e.message; } }'
$null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$jsBoot)
Start-Sleep -Seconds 5

$rows = @(
  "B|subpackages/profile-extra/settings/dnd"
  "B|subpackages/setup/profile/index"
  "B|subpackages/setup/interest/index"
  "B|subpackages/discover/activities/index"
  "B|subpackages/market/shop/index"
  "A|pages/home/index"
  "A|pages/home/index"
  "A|pages/home/index"
)

foreach ($row in $rows) {
  $parts = $row.Split("|")
  $url = "/" + $parts[1]
  $name = $parts[1].Replace("/", "_")
  $file = Join-Path $shots ("{0}-{1}-{2}.png" -f $ident, $stamp, $name)
  $navJs = 'function(){ wx.reLaunch({ url: ''' + $url + ''', fail: function(e){ console.error(''NAV_FAIL '' + $name); } }); return 1; }'
  $null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$navJs)
  Start-Sleep -Seconds 7
  $null = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",$file)
  Write-Host ("  done {0}" -f $name)
}
Write-Host ("RESHOOT DONE {0}" -f $ident)
