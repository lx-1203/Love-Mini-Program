# R10 helper: pass JS safely to automation_evaluate
$js = 'function(){ var a=getApp(); var vm=a["$vm"]; return vm ? "has-vm" : "no-vm"; }'
# 路径可推导：仓库根 = scripts/ 上一级；wechatide 走 WECHATIDE_DIR 或 PATH，不写盘符死路径。
$repo = Split-Path $PSScriptRoot -Parent
$wi = if ($env:WECHATIDE_DIR) { Join-Path $env:WECHATIDE_DIR 'wechatide.cmd' } else { 'wechatide.cmd' }
& $wi -c ZCode automation_evaluate --project $repo --fn-source $js *> "$env:TEMP\eval2.txt"
Get-Content "$env:TEMP\eval2.txt" -Encoding UTF8 | Select-String -Pattern "result|error" | ForEach-Object { $_.Line }
