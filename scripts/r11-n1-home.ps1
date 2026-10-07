# R11-N1: home blank investigation — bootstrap session, navigate home x3, entropy check each shot
$ErrorActionPreference = "Continue"
# 路径可推导：仓库根 = scripts/ 上一级；wechatide 走 WECHATIDE_DIR 或 PATH，不写盘符死路径。
$repo = Split-Path $PSScriptRoot -Parent
$wi = if ($env:WECHATIDE_DIR) { Join-Path $env:WECHATIDE_DIR 'wechatide.cmd' } else { 'wechatide.cmd' }
$proj = $repo
$shots = Join-Path $repo 'reports\screenshots\r11-acceptance'
$token = (Get-Content (Join-Path $repo 'tmp_r11_login.json') -Raw | ConvertFrom-Json).token

function WiEval([string]$js) {
  & $wi -c ZCode automation_evaluate --project $proj --fn-source $js *> "$env:TEMP\n1eval.txt"
  return (Get-Content "$env:TEMP\n1eval.txt" -Encoding UTF8 -Raw)
}
function Shot([string]$name) {
  & $wi -c ZCode simulator_screenshot --project $proj --path (Join-Path $shots $name) *> "$env:TEMP\n1shot.txt"
}

# 1) token + bootstrap (two-step login restore)
$jsSet = 'function(){ try { wx.setStorageSync(''token'', ''' + $token + '''); var app=getApp(); var vm=app[''$vm'']; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm[''$pinia'']||gp[''$pinia'']; var s=p._s.get(''session''); if(s&&s.bootstrap){ s.bootstrap(); } return ''ok''; } catch(e){ return ''ERR ''+e.message; } }'
$null = WiEval $jsSet
Start-Sleep -Seconds 4

# 2) home x3 cold navigation + shots
for ($i = 1; $i -le 3; $i++) {
  $null = WiEval 'function(){ wx.reLaunch({ url: ''/pages/home/index'' }); return 1; }'
  Start-Sleep -Seconds (4 + $i)
  Shot ("N1-home-attempt{0}.png" -f $i)
  Write-Host ("shot {0}" -f $i)
}
Write-Host "N1 shots done"
