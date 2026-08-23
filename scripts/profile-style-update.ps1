# Profile Page Design Token Batch Update Script
# Updates only CSS/style values in profile-related Vue files

$dir = "d:\6\恋爱小程序\apps\client\src"
$profilePaths = @(
  "$dir\pages\profile",
  "$dir\components\profile",
  "$dir\components\profile\mine",
  "$dir\components\profile\public",
  "$dir\components\profile\common"
)

# Collect all .vue files
$allFiles = @()
foreach ($p in $profilePaths) {
  $allFiles += Get-ChildItem -Path "$p\*.vue" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
}

Write-Host "Total files: $($allFiles.Count)"

# Replacements map: old -> new
$replacements = @(
  # Primary text colors
  @{ Old = '#222222'; New = '#333A37' },
  @{ Old = '#1E1E1E'; New = '#333A37' },
  @{ Old = '#1A1E1C'; New = '#333A37' },
  @{ Old = '#1f2937'; New = '#333A37' },
  
  # Secondary text
  @{ Old = '#666666'; New = '#4A524E' },
  
  # Tertiary text (body text)
  @{ Old = '#777777'; New = '#6B7571' },
  @{ Old = '#8A9694'; New = '#6B7571' },
  
  # Quaternary text (meta text)
  @{ Old = '#999999'; New = '#9AA39F' },
  @{ Old = '#9ca3af'; New = '#9AA39F' },
  
  # Brand green variants
  @{ Old = '#168B65'; New = '#36C99A' },
  @{ Old = '#12805A'; New = '#36C99A' },
  @{ Old = '#1F8D6A'; New = '#36C99A' },
  @{ Old = '#0d9488'; New = '#36C99A' },
  
  # Romance pink
  @{ Old = '#F472B6'; New = '#FF6B81' },
  
  # Purple
  @{ Old = '#8D7BFF'; New = '#A29BFE' },
  
  # Orange/warning
  @{ Old = '#FF9A57'; New = '#FF9F43' },
  @{ Old = '#F59E0B'; New = '#FF9F43' },
  
  # Shadow RGB values
  @{ Old = 'rgba(61, 201, 148'; New = 'rgba(54, 201, 154' },
  @{ Old = 'rgba(255, 104, 145'; New = 'rgba(255, 107, 129' },
  
  # Border colors
  @{ Old = '#ECEFF2'; New = '#EEF2F0' },
  @{ Old = '#E2E8F0'; New = '#DDE3E0' },
  @{ Old = '#CBD5E1'; New = '#C2CAC6' },
  @{ Old = '#eef1f5'; New = '#EEF2F0' },
  @{ Old = '#EEF3F1'; New = '#EEF2F0' },
  
  # Standardize light green backgrounds
  @{ Old = '#E8FAF3'; New = '#E8FBF3' },
  @{ Old = '#E8F8F1'; New = '#E8FBF3' },
  @{ Old = '#E8F8F0'; New = '#E8FBF3' },
  @{ Old = '#EAF8F3'; New = '#E8FBF3' },
  @{ Old = '#E6F5EF'; New = '#E8FBF3' },
  
  # Pink variant
  @{ Old = '#FF6B91'; New = '#FF6B81' }
)

$totalChanges = 0
$fileChanges = @{}

foreach ($file in $allFiles) {
  $content = Get-Content -Path $file -Raw -Encoding UTF8
  $originalContent = $content
  $fileChangeCount = 0
  
  foreach ($r in $replacements) {
    if ($content.Contains($r.Old)) {
      $count = ([regex]::Matches($content, [regex]::Escape($r.Old))).Count
      $content = $content.Replace($r.Old, $r.New)
      $fileChangeCount += $count
    }
  }
  
  if ($content -ne $originalContent) {
    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    $relativePath = $file.Replace("d:\6\恋爱小程序\", "")
    $fileChanges[$relativePath] = $fileChangeCount
    $totalChanges += $fileChangeCount
    Write-Host "  Modified: $relativePath ($fileChangeCount replacements)"
  }
}

Write-Host ""
Write-Host "=== SUMMARY ==="
Write-Host "Files modified: $($fileChanges.Count)"
Write-Host "Total replacements: $totalChanges"
Write-Host ""
Write-Host "Detailed changes:"
foreach ($k in ($fileChanges.Keys | Sort-Object)) {
  Write-Host "  $k : $($fileChanges[$k]) replacements"
}
