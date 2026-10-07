$t = $null; $e = $null
$repo = Split-Path $PSScriptRoot -Parent   # scripts/ 上一级 = 仓库根
[void][System.Management.Automation.Language.Parser]::ParseFile((Join-Path $repo 'scripts\r7-journey.ps1'), [ref]$t, [ref]$e)
if ($e.Count -eq 0) { "SYNTAX-OK" } else { $e | ForEach-Object { $_.Message + " @line " + $_.Extent.StartLineNumber } }
