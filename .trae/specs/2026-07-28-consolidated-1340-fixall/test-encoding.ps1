$ErrorActionPreference = "Stop"
$testFile = "d:\6\恋爱小程序\apps\client\src\pages\chat-session\index.vue"
Write-Host "File exists: $(Test-Path $testFile)"
$content = [System.IO.File]::ReadAllLines($testFile, [System.Text.Encoding]::UTF8)
Write-Host "Total lines: $($content.Count)"
$chineseCount = 0
foreach ($line in $content) {
  for ($i = 0; $i -lt $line.Length; $i++) {
    $code = [int]$line[$i]
    if ($code -ge 0x4E00 -and $code -le 0x9FFF) {
      $chineseCount++
      break
    }
  }
}
Write-Host "Lines with Chinese: $chineseCount"
Write-Host "Sample line 308: $($content[307])"
Write-Host "Sample line 308 char codes:"
$line308 = $content[307]
for ($i = 0; $i -lt $line308.Length; $i++) {
  $code = [int]$line308[$i]
  if ($code -gt 127) {
    Write-Host "  char at $i = $code (0x$('{0:X}' -f $code))"
    break
  }
}
