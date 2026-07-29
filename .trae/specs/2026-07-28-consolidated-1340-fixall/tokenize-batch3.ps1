$ErrorActionPreference = 'Stop'
# Derive project root from script location to avoid Chinese path encoding issues
# Script: .trae/specs/2026-07-28-consolidated-1340-fixall/tokenize-batch3.ps1
# Project root: 3 levels up from script dir
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$root = Join-Path $projectRoot 'apps\client\src'
Write-Host "Scanning root: $root"

$files = Get-ChildItem -LiteralPath $root -Recurse -Include '*.vue','*.scss' -File |
    Where-Object { $_.FullName -notmatch 'node_modules|tokens\.scss|design-variables\.scss' }

$replacements = New-Object System.Collections.ArrayList

# ========== Transition duration remaining 3 items ==========
[void]$replacements.Add(@{ Pattern = 'transition:\s*transform\s+0\.2s,\s*opacity\s+0\.2s'; Replace = 'transition: transform var(--d-normal, 200ms), opacity var(--d-normal, 200ms)' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*transform\s+0\.1s\s+ease'; Replace = 'transition: transform var(--d-fast, 120ms) ease' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*all\s+0\.2s\s+cubic-bezier'; Replace = 'transition: all var(--d-normal, 200ms) cubic-bezier' })

# ========== Animation duration remaining 19 items ==========
# 0.6s to var(--d-slowest, 600ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.6s\s+linear'; Replace = 'animation: $1 var(--d-slowest, 600ms) linear' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.6s\s+ease\s+0\.1s'; Replace = 'animation: $1 var(--d-slowest, 600ms) ease 0.1s' })

# 0.24s to var(--d-slow, 250ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.24s\s+ease-out'; Replace = 'animation: $1 var(--d-slow, 250ms) ease-out' })

# 0.8s to var(--d-spinner, 800ms) spinner rotation
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.8s\s+linear'; Replace = 'animation: $1 var(--d-spinner, 800ms) linear' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.8s\s+ease-in-out'; Replace = 'animation: $1 var(--d-spinner, 800ms) ease-in-out' })

# 0.4s to var(--d-bounce, 400ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.4s\s+ease'; Replace = 'animation: $1 var(--d-bounce, 400ms) ease' })

# 0.5s to var(--d-slower, 350ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.5s\s+cubic-bezier'; Replace = 'animation: $1 var(--d-slower, 350ms) cubic-bezier' })

# 0.3s to var(--d-fade, 300ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.3s\s+cubic-bezier'; Replace = 'animation: $1 var(--d-fade, 300ms) cubic-bezier' })

# 0.35s to var(--d-slower, 350ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.35s\s+ease'; Replace = 'animation: $1 var(--d-slower, 350ms) ease' })

# 0.2s to var(--d-normal, 200ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.2s\s+ease'; Replace = 'animation: $1 var(--d-normal, 200ms) ease' })

# ========== box-shadow remaining 1 item (_components.scss:48 fully hardcoded) ==========
[void]$replacements.Add(@{ Pattern = 'box-shadow:\s*0\s+12rpx\s+32rpx\s+rgba\(15,\s*23,\s*42,\s*0\.08\)'; Replace = 'box-shadow: var(--s-lg, 0 12rpx 32rpx var(--c-neutral-shadow-md, rgba(15, 23, 42, 0.08)))' })

# ========== rgba background hardcoded remaining 5 items ==========
[void]$replacements.Add(@{ Pattern = 'background:\s*rgba\(255,\s*255,\s*255,\s*0\.25\)'; Replace = 'background: var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25))' })
[void]$replacements.Add(@{ Pattern = 'background:\s*rgba\(0,\s*0,\s*0,\s*0\.45\)'; Replace = 'background: var(--c-bg-overlay, rgba(15, 23, 42, 0.45))' })
[void]$replacements.Add(@{ Pattern = 'background:\s*rgba\(0,\s*0,\s*0,\s*0\.7\)'; Replace = 'background: var(--c-overlay-strong, rgba(15, 23, 42, 0.7))' })
[void]$replacements.Add(@{ Pattern = 'background:\s*rgba\(0,\s*0,\s*0,\s*0\.55\)'; Replace = 'background: var(--c-overlay-mid, rgba(15, 23, 42, 0.55))' })

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
Write-Host "===== Batch 3 Tokenization Summary ====="
Write-Host "Files modified: $changedFiles"
Write-Host "Total replacements: $totalChanges"
