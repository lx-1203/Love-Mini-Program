# R10 helper: pass JS safely to automation_evaluate (single quotes only inside JS)
$js = 'function(){ try { var a=getApp(); var vm=a[''$vm'']; if(!vm){return ''no-vm'';} var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm[''$pinia'']||gp[''$pinia'']; if(!p){return ''no-pinia'';} var keys=[]; p._s.forEach(function(v,k){keys.push(k);}); return ''stores=''+keys.join('',''); } catch(e){ return ''ERR ''+e.message; } }'
& "D:\微信开发者\微信web开发者工具\wechatide.cmd" -c ZCode automation_evaluate --project "D:\6\恋爱小程序" --fn-source $js *> "$env:TEMP\eval3.txt"
Get-Content "$env:TEMP\eval3.txt" -Encoding UTF8 | Select-String -Pattern '"result"|stores=|no-|ERR' | ForEach-Object { $_.Line }
