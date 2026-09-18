# R10 helper: run a JS snippet inside the mini program and print result
param([Parameter(Mandatory=$true)][string]$JsFile)
$js = Get-Content -Raw -Encoding UTF8 $JsFile
& "D:\微信开发者\微信web开发者工具\wechatide.cmd" -c ZCode automation_evaluate --project "D:\6\恋爱小程序" --fn-source $js *> "$env:TEMP\eval-raw.txt"
$raw = Get-Content "$env:TEMP\eval-raw.txt" -Encoding UTF8 -Raw
$start = $raw.IndexOf("{"); $end = $raw.LastIndexOf("}")
if ($start -ge 0 -and $end -gt $start) { $raw.Substring($start, $end - $start + 1) } else { $raw }
