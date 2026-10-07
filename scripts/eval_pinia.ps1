# R10 helper: pass JS safely to automation_evaluate (single quotes only inside JS)
$js = 'function(){ try { var a=getApp(); var vm=a[''$vm'']; if(!vm){return ''no-vm'';} var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm[''$pinia'']||gp[''$pinia'']; if(!p){return ''no-pinia'';} var keys=[]; p._s.forEach(function(v,k){keys.push(k);}); return ''stores=''+keys.join('',''); } catch(e){ return ''ERR ''+e.message; } }'
# 路径可推导：仓库根 = scripts/ 上一级；wechatide 走 WECHATIDE_DIR 或 PATH，不写盘符死路径。
$repo = Split-Path $PSScriptRoot -Parent
$wi = if ($env:WECHATIDE_DIR) { Join-Path $env:WECHATIDE_DIR 'wechatide.cmd' } else { 'wechatide.cmd' }
& $wi -c ZCode automation_evaluate --project $repo --fn-source $js *> "$env:TEMP\eval3.txt"
Get-Content "$env:TEMP\eval3.txt" -Encoding UTF8 | Select-String -Pattern '"result"|stores=|no-|ERR' | ForEach-Object { $_.Line }
