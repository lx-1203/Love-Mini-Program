# Debug script to verify font-size patterns match
$file = 'd:\6\恋爱小程序\apps\client\src\pages\vip\index.vue'
$content = Get-Content $file -Raw -Encoding UTF8
Write-Host "File size: $($content.Length)"
$matches = [regex]::Matches($content, 'font-size:\s*\d+rpx\s*;')
Write-Host "Total matches: $($matches.Count)"
$matches56 = [regex]::Matches($content, 'font-size:\s*56rpx\s*;')
Write-Host "56rpx matches: $($matches56.Count)"
if ($matches56.Count -gt 0) {
    Write-Host "First 56rpx match: '$($matches56[0].Value)'"
}
