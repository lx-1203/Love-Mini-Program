# R10: check session store state
$js = 'function(){ try { var app=getApp(); var vm=app[''$vm'']; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm[''$pinia'']||gp[''$pinia'']; var s=p._s.get(''session''); if(!s){return ''no-session-store'';} var u=s.userSession; return JSON.stringify({loggedIn: s.isLoggedIn, name: u?u.displayName:null, uid: u?u.userId:null}); } catch(e){ return ''ERR ''+e.message; } }'
& "D:\微信开发者\微信web开发者工具\wechatide.cmd" -c ZCode automation_evaluate --project "D:\6\恋爱小程序" --fn-source $js *> "$env:TEMP\eval5.txt"
Get-Content "$env:TEMP\eval5.txt" -Encoding UTF8 | Select-String -Pattern '"result"|loggedIn|ERR|no-' | ForEach-Object { $_.Line }
