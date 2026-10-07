# R10 helper: run a JS snippet inside the mini program and print result
param([Parameter(Mandatory=$true)][string]$JsFile)
$js = Get-Content -Raw -Encoding UTF8 $JsFile
# 路径可推导：仓库根 = scripts/ 上一级；wechatide 走 WECHATIDE_DIR 或 PATH，不写盘符死路径。
$repo = Split-Path $PSScriptRoot -Parent
$wi = if ($env:WECHATIDE_DIR) { Join-Path $env:WECHATIDE_DIR 'wechatide.cmd' } else { 'wechatide.cmd' }
& $wi -c ZCode automation_evaluate --project $repo --fn-source $js *> "$env:TEMP\eval-raw.txt"
$raw = Get-Content "$env:TEMP\eval-raw.txt" -Encoding UTF8 -Raw
$start = $raw.IndexOf("{"); $end = $raw.LastIndexOf("}")
if ($start -ge 0 -and $end -gt $start) { $raw.Substring($start, $end - $start + 1) } else { $raw }
