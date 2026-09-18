# R10 helper: pass JS safely to automation_evaluate
$js = 'function(){ var a=getApp(); var vm=a["$vm"]; return vm ? "has-vm" : "no-vm"; }'
& "D:\微信开发者\微信web开发者工具\wechatide.cmd" -c ZCode automation_evaluate --project "D:\6\恋爱小程序" --fn-source $js *> "$env:TEMP\eval2.txt"
Get-Content "$env:TEMP\eval2.txt" -Encoding UTF8 | Select-String -Pattern "result|error" | ForEach-Object { $_.Line }
