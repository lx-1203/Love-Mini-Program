$ErrorActionPreference = 'Stop'
# Derive project root from script location to avoid Chinese path encoding issues
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$root = Join-Path $projectRoot 'apps\client\src'
Write-Host "Scanning root: $root"

$files = Get-ChildItem -LiteralPath $root -Recurse -Include '*.vue','*.scss' -File |
    Where-Object { $_.FullName -notmatch 'node_modules|tokens\.scss|design-variables\.scss' }

$replacements = New-Object System.Collections.ArrayList

# ========== Long loop animation durations ==========
# 1s to var(--d-loop, 1000ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1s\s+linear'; Replace = 'animation: $1 var(--d-loop, 1000ms) linear' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1s\s+ease'; Replace = 'animation: $1 var(--d-loop, 1000ms) ease' })

# 1.2s to var(--d-loop, 1200ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.2s\s+cubic-bezier'; Replace = 'animation: $1 var(--d-loop, 1200ms) cubic-bezier' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.2s\s+ease'; Replace = 'animation: $1 var(--d-loop, 1200ms) ease' })

# 1.4s to var(--d-loop, 1400ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.4s\s+ease'; Replace = 'animation: $1 var(--d-loop, 1400ms) ease' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.4s\s+ease-in-out'; Replace = 'animation: $1 var(--d-loop, 1400ms) ease-in-out' })

# 1.5s to var(--d-particle, 1500ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.5s\s+ease-in-out'; Replace = 'animation: $1 var(--d-particle, 1500ms) ease-in-out' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.5s\s+ease-out'; Replace = 'animation: $1 var(--d-particle, 1500ms) ease-out' })

# 1.6s to var(--d-particle, 1600ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.6s\s+ease-in-out'; Replace = 'animation: $1 var(--d-particle, 1600ms) ease-in-out' })

# 2s to var(--d-loop-slow, 2000ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+2s\s+ease-in-out'; Replace = 'animation: $1 var(--d-loop-slow, 2000ms) ease-in-out' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+2s\s+linear'; Replace = 'animation: $1 var(--d-loop-slow, 2000ms) linear' })

# 2.4s to var(--d-loop-slow, 2400ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+2\.4s\s+ease-out'; Replace = 'animation: $1 var(--d-loop-slow, 2400ms) ease-out' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+2\.4s\s+ease-in-out'; Replace = 'animation: $1 var(--d-loop-slow, 2400ms) ease-in-out' })

# 3s to var(--d-breathe, 3000ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+3s\s+ease-in-out'; Replace = 'animation: $1 var(--d-breathe, 3000ms) ease-in-out' })

# 3.5s to var(--d-breathe, 3500ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+3\.5s\s+ease-in-out'; Replace = 'animation: $1 var(--d-breathe, 3500ms) ease-in-out' })

# 4s to var(--d-breathe-slow, 4000ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+4s\s+ease-in-out'; Replace = 'animation: $1 var(--d-breathe-slow, 4000ms) ease-in-out' })

# 4.5s to var(--d-breathe-slow, 4500ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+4\.5s\s+ease-in-out'; Replace = 'animation: $1 var(--d-breathe-slow, 4500ms) ease-in-out' })

# 5s to var(--d-breathe-slow, 5000ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+5s\s+ease-in-out'; Replace = 'animation: $1 var(--d-breathe-slow, 5000ms) ease-in-out' })

# 8s to var(--d-rotate-slow, 8000ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+8s\s+linear'; Replace = 'animation: $1 var(--d-rotate-slow, 8000ms) linear' })

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
Write-Host "===== Batch 4 Tokenization Summary ====="
Write-Host "Files modified: $changedFiles"
Write-Host "Total replacements: $totalChanges"
