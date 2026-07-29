$ErrorActionPreference = 'Stop'
$root = 'd:\6\恋爱小程序\apps\client\src'
$files = Get-ChildItem -LiteralPath $root -Recurse -Include '*.vue','*.scss' -File |
    Where-Object { $_.FullName -notmatch 'node_modules|tokens\.scss|design-variables\.scss|global\.scss' }

$replacements = New-Object System.Collections.ArrayList

[void]$replacements.Add(@{ Pattern = 'transition:\s*all\s+0\.15s\s+ease'; Replace = 'transition: all var(--d-fast, 120ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*all\s+0\.2s\s+ease'; Replace = 'transition: all var(--d-normal, 200ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*all\s+0\.25s\s+ease'; Replace = 'transition: all var(--d-slow, 250ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*all\s+0\.3s\s+ease'; Replace = 'transition: all var(--d-fade, 300ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*all\s+0\.5s\s+ease'; Replace = 'transition: all var(--d-slowest, 600ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*transform\s+0\.15s\s+ease'; Replace = 'transition: transform var(--d-fast, 120ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*transform\s+0\.15s\s+ease-out'; Replace = 'transition: transform var(--d-fast, 120ms) ease-out' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*transform\s+0\.2s\s+ease'; Replace = 'transition: transform var(--d-normal, 200ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*transform\s+0\.3s\s+ease'; Replace = 'transition: transform var(--d-fade, 300ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*background\s+0\.15s\s+ease'; Replace = 'transition: background var(--d-fast, 120ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*background\s+0\.2s\s+ease'; Replace = 'transition: background var(--d-normal, 200ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*background\s+0\.2s;'; Replace = 'transition: background var(--d-normal, 200ms);' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*color\s+0\.25s\s+cubic-bezier'; Replace = 'transition: color var(--d-slow, 250ms) cubic-bezier' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*opacity\s+0\.15s\s+ease'; Replace = 'transition: opacity var(--d-fast, 120ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*left\s+0\.2s\s+ease'; Replace = 'transition: left var(--d-normal, 200ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*width\s+0\.5s\s+ease'; Replace = 'transition: width var(--d-slowest, 600ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*box-shadow\s+0\.15s\s+ease-out'; Replace = 'transition: box-shadow var(--d-fast, 120ms) ease-out' })

$totalChanges = 0
$changedFiles = 0

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    if (-not $content) { continue }
    $original = $content
    $fileChanges = 0

    foreach ($rep in $replacements) {
        $pattern = $rep.Pattern
        $replacement = $rep.Replace
        $newContent = [regex]::Replace($content, $pattern, $replacement)
        if ($newContent -ne $content) {
            $matchesCount = ([regex]::Matches($content, $pattern)).Count
            $fileChanges += $matchesCount
            $content = $newContent
        }
    }

    if ($content -ne $original) {
        Set-Content -LiteralPath $file.FullName -Value $content -NoNewline -Encoding UTF8
        $totalChanges += $fileChanges
        $changedFiles++
        Write-Host "Modified: $($file.FullName) ($fileChanges changes)"
    }
}

Write-Host ""
Write-Host "===== Batch Tokenization Summary ====="
Write-Host "Files modified: $changedFiles"
Write-Host "Total replacements: $totalChanges"
