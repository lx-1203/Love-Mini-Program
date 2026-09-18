# Round-10 wechatide wrapper (client=ZCode)
param([Parameter(Mandatory=$true)][string]$Tool,[Parameter(ValueFromRemainingArguments=$true)][string[]]$ArgsList)
$ErrorActionPreference="Continue"
$base="D:\微信开发者\微信web开发者工具"
Push-Location $base
$cmd=@("-c","ZCode",$Tool)
foreach($a in $ArgsList){$cmd+=$a}
& ".\wechatide.cmd" @cmd *> "$env:TEMP\wx10-raw.txt"
Pop-Location
$raw=Get-Content "$env:TEMP\wx10-raw.txt" -Encoding UTF8 -Raw
$start=$raw.IndexOf("{");$end=$raw.LastIndexOf("}")
if($start -ge 0 -and $end -gt $start){Set-Content -Path "$env:TEMP\wx10-out.json" -Value $raw.Substring($start,$end-$start+1) -Encoding UTF8; Get-Content "$env:TEMP\wx10-out.json" -Encoding UTF8 -Raw}else{$raw}
