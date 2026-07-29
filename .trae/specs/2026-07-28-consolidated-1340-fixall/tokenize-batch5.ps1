$ErrorActionPreference = 'Stop'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$root = Join-Path $projectRoot 'apps\client\src'
Write-Host "Scanning root: $root"

$files = Get-ChildItem -LiteralPath $root -Recurse -Include '*.vue','*.scss' -File |
    Where-Object { $_.FullName -notmatch 'node_modules|tokens\.scss|design-variables\.scss' }

$replacements = New-Object System.Collections.ArrayList

# ========== ms-based transition durations ==========
# 150ms to var(--d-fast, 150ms)
[void]$replacements.Add(@{ Pattern = 'transition:\s*transform\s+150ms\s+cubic-bezier'; Replace = 'transition: transform var(--d-fast, 150ms) cubic-bezier' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*transform\s+150ms\s+ease'; Replace = 'transition: transform var(--d-fast, 150ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*background\s+150ms\s+ease'; Replace = 'transition: background var(--d-fast, 150ms) ease' })

# 160ms to var(--d-fast, 160ms)
[void]$replacements.Add(@{ Pattern = 'transition:\s*background-color\s+160ms\s+ease-out'; Replace = 'transition: background-color var(--d-fast, 160ms) ease-out' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*background\s+160ms\s+ease-out'; Replace = 'transition: background var(--d-fast, 160ms) ease-out' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*opacity\s+160ms\s+ease-out'; Replace = 'transition: opacity var(--d-fast, 160ms) ease-out' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*background\s+160ms\s+ease'; Replace = 'transition: background var(--d-fast, 160ms) ease' })

# 240ms to var(--d-slow, 240ms)
[void]$replacements.Add(@{ Pattern = 'transition:\s*opacity\s+240ms\s+cubic-bezier'; Replace = 'transition: opacity var(--d-slow, 240ms) cubic-bezier' })

# 280ms to var(--d-slow, 280ms)
[void]$replacements.Add(@{ Pattern = 'transition:\s*width\s+280ms\s+cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\),\s*background\s+280ms\s+ease'; Replace = 'transition: width var(--d-slow, 280ms) cubic-bezier(0.4, 0, 0.2, 1), background var(--d-slow, 280ms) ease' })

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
Write-Host "===== Batch 5 Tokenization Summary ====="
Write-Host "Files modified: $changedFiles"
Write-Host "Total replacements: $totalChanges"
