$ErrorActionPreference = "SilentlyContinue"
$root = "d:\6\恋爱小程序\apps\client\src"
$results = New-Object System.Collections.ArrayList

Get-ChildItem -Path $root -Recurse -Include "*.vue","*.ts" | Where-Object { $_.FullName -notmatch 'i18n\\locales' -and $_.FullName -notmatch '\\tests\\' -and $_.FullName -notmatch 'mocks\\fixtures' } | ForEach-Object {
  $file = $_
  $lineNum = 0
  $content = [System.IO.File]::ReadAllLines($file.FullName, [System.Text.Encoding]::UTF8)
  foreach ($line in $content) {
    $lineNum++
    $trimmed = $line.Trim()
    
    # Skip empty lines
    if (-not $trimmed) { continue }
    
    # Skip comment lines (single-line // comments, /* */ block comments, * doc comments, <!-- --> HTML comments)
    if ($trimmed.StartsWith('//') -or $trimmed.StartsWith('/*') -or $trimmed.StartsWith('*') -or $trimmed.StartsWith('<!--') -or $trimmed.StartsWith('*/')) { continue }
    
    # Skip lines that are just inline comments
    # Check if the line has Chinese characters
    $hasChinese = $false
    for ($i = 0; $i -lt $line.Length; $i++) {
      $code = [int]$line[$i]
      if ($code -ge 0x4E00 -and $code -le 0x9FFF) {
        $hasChinese = $true
        break
      }
    }
    if (-not $hasChinese) { continue }
    
    # Skip lines that are pure comments (line starts with whitespace then //)
    if ($trimmed -match '^\//' -or $trimmed -match '^\*\s' -or $trimmed -match '^\*[^/]') { continue }
    
    # Skip lines that are pure CSS comments
    if ($trimmed -match '^/\*') { continue }
    
    # Skip lines that contain only $t() or t() calls (already i18n-ized)
    # Remove all $t('...') and t('...') calls and check if there's still Chinese
    $stripped = $line -replace "\\\$t\([^)]*\)", "" -replace "\bt\([^)]*\)", ""
    $strippedHasChinese = $false
    for ($i = 0; $i -lt $stripped.Length; $i++) {
      $code = [int]$stripped[$i]
      if ($code -ge 0x4E00 -and $code -le 0x9FFF) {
        $strippedHasChinese = $true
        break
      }
    }
    if (-not $strippedHasChinese) { continue }
    
    [void]$results.Add([PSCustomObject]@{ File = $file.Name; Path = $file.FullName; Line = $lineNum; Content = $line })
  }
}
Write-Host "Total files with non-comment Chinese: $($results | Select-Object -ExpandProperty File -Unique | Measure-Object | Select-Object -ExpandProperty Count)"
Write-Host "Total non-comment Chinese lines: $($results.Count)"
Write-Host ""
Write-Host "Top 30 files:"
$results | Group-Object File | Sort-Object Count -Descending | Select-Object -First 30 | ForEach-Object {
  Write-Host ("{0}: {1}" -f $_.Name, $_.Count)
}
