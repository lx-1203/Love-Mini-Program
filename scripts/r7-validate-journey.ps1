$t = $null; $e = $null
[void][System.Management.Automation.Language.Parser]::ParseFile("D:\6\恋爱小程序\scripts\r7-journey.ps1", [ref]$t, [ref]$e)
if ($e.Count -eq 0) { "SYNTAX-OK" } else { $e | ForEach-Object { $_.Message + " @line " + $_.Extent.StartLineNumber } }
