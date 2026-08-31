$f = "$env:APPDATA\obs-studio\basic\scenes\未命名.json"
$raw = Get-Content $f -Raw
[regex]::Matches($raw, '"owner_name"\s*,\s*"string"\s*:\s*"[^"]*"') | ForEach-Object { $_.Value }
"---- capture types ----"
[regex]::Matches($raw, '"type"\s*,\s*"string"\s*:\s*"[^"]*capture[^"]*"') | ForEach-Object { $_.Value }
"---- window names ----"
[regex]::Matches($raw, '"window"\s*,\s*"string"\s*:\s*"[^"]*"') | ForEach-Object { $_.Value }
"---- method ----"
[regex]::Matches($raw, '"method"\s*,\s*"string"\s*:\s*"[^"]*"') | ForEach-Object { $_.Value }
