# R11 G6: re-shoot flagged scenes with fresh tokens
$ErrorActionPreference = "Continue"
# 路径可推导：仓库根 = scripts/ 上一级；wechatide 走 WECHATIDE_DIR 或 PATH，不写盘符死路径。
$repo = Split-Path $PSScriptRoot -Parent
$wi = if ($env:WECHATIDE_DIR) { Join-Path $env:WECHATIDE_DIR 'wechatide.cmd' } else { 'wechatide.cmd' }
$proj = $repo
$stamp = "b0919-r12c"
$shots = Join-Path $repo 'reports\screenshots\r11-acceptance'
$ident = $args[0]
$tokfile = Join-Path $repo 'tmp_r11_login.json'
if ($ident -eq "B") { $tokfile = Join-Path $repo 'tmp_r11_guest.json' }

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
