# Universal wechatide CLI wrapper: wx.ps1 <tool> [--key value]...
param(
  [Parameter(Mandatory = $true)][string]$Tool,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$ArgsList
)
$ErrorActionPreference = "Continue"
$base = "D:\微信开发者\微信web开发者工具"
Push-Location $base
$cmd = @("-c", "WorkBuddy", $Tool)
foreach ($a in $ArgsList) { $cmd += $a }
& ".\wechatide.cmd" @cmd *> "$env:TEMP\wx-cli-raw.txt"
Pop-Location
$raw = Get-Content "$env:TEMP\wx-cli-raw.txt" -Encoding UTF8 -Raw
$start = $raw.IndexOf("{")
$end = $raw.LastIndexOf("}")
if ($start -ge 0 -and $end -gt $start) {
  $json = $raw.Substring($start, $end - $start + 1)
  Set-Content -Path "$env:TEMP\wx-cli-out.json" -Value $json -Encoding UTF8
  $json
} else {
  $raw
}
