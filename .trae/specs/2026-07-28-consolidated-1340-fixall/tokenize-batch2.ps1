$ErrorActionPreference = 'Stop'
$root = 'd:\6\恋爱小程序\apps\client\src'
$files = Get-ChildItem -LiteralPath $root -Recurse -Include '*.vue','*.scss' -File |
    Where-Object { $_.FullName -notmatch 'node_modules|tokens\.scss|design-variables\.scss|global\.scss' }

$replacements = New-Object System.Collections.ArrayList

# 剩余 transition duration
[void]$replacements.Add(@{ Pattern = 'transition:\s*all\s+0\.2s\s+cubic-bezier'; Replace = 'transition: all var(--d-normal, 200ms) cubic-bezier' })
[void]$replacements.Add(@{ Pattern = 'transition:\s*transform\s+0\.1s\s+ease'; Replace = 'transition: transform var(--d-fast, 120ms) ease' })

# animation duration：1.5s → var(--d-particle, 1500ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.5s\s+ease'; Replace = 'animation: $1 var(--d-particle, 1500ms) ease' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.5s\s+ease-out'; Replace = 'animation: $1 var(--d-particle, 1500ms) ease-out' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+1\.5s\s+ease-in-out'; Replace = 'animation: $1 var(--d-particle, 1500ms) ease-in-out' })

# animation duration：0.6s → var(--d-slowest, 600ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.6s\s+ease'; Replace = 'animation: $1 var(--d-slowest, 600ms) ease' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.6s\s+linear'; Replace = 'animation: $1 var(--d-slowest, 600ms) linear' })

# animation duration：0.4s → var(--d-bounce, 400ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.4s\s+ease'; Replace = 'animation: $1 var(--d-bounce, 400ms) ease' })

# animation duration：0.5s → var(--d-slower, 350ms) 最接近的语义 token
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.5s\s+cubic-bezier'; Replace = 'animation: $1 var(--d-slower, 350ms) cubic-bezier' })
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.5s\s+ease'; Replace = 'animation: $1 var(--d-slower, 350ms) ease' })

# animation duration：0.2s → var(--d-normal, 200ms)
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.2s\s+ease'; Replace = 'animation: $1 var(--d-normal, 200ms) ease' })

# animation duration：0.24s → var(--d-slow, 250ms) 最接近
[void]$replacements.Add(@{ Pattern = 'animation:\s*([\w-]+)\s+0\.24s\s+ease-out'; Replace = 'animation: $1 var(--d-slow, 250ms) ease-out' })

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
Write-Host "===== Batch 2 Tokenization Summary ====="
Write-Host "Files modified: $changedFiles"
Write-Host "Total replacements: $totalChanges"
