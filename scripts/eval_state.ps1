# R10: check session store state
$js = 'function(){ try { var app=getApp(); var vm=app[''$vm'']; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm[''$pinia'']||gp[''$pinia'']; var s=p._s.get(''session''); if(!s){return ''no-session-store'';} var u=s.userSession; return JSON.stringify({loggedIn: s.isLoggedIn, name: u?u.displayName:null, uid: u?u.userId:null}); } catch(e){ return ''ERR ''+e.message; } }'
# 路径可推导：仓库根 = scripts/ 上一级；wechatide 走 WECHATIDE_DIR 或 PATH，不写盘符死路径。
$repo = Split-Path $PSScriptRoot -Parent
$wi = if ($env:WECHATIDE_DIR) { Join-Path $env:WECHATIDE_DIR 'wechatide.cmd' } else { 'wechatide.cmd' }
& $wi -c ZCode automation_evaluate --project $repo --fn-source $js *> "$env:TEMP\eval5.txt"
Get-Content "$env:TEMP\eval5.txt" -Encoding UTF8 | Select-String -Pattern '"result"|loggedIn|ERR|no-' | ForEach-Object { $_.Line }
