Add-Type -AssemblyName System.Drawing
function Crop-Zoom2 {
    param([string]$Src, [string]$Out, [int]$X, [int]$Y, [int]$W, [int]$H, [double]$Scale)
    $img = [System.Drawing.Image]::FromFile($Src)
    $rect = New-Object System.Drawing.Rectangle($X, $Y, $W, $H)
    $crop = $img.Clone($rect, $img.PixelFormat)
    $zw = [int]($W * $Scale); $zh = [int]($H * $Scale)
    $zoom = New-Object System.Drawing.Bitmap($zw, $zh)
    $g = [System.Drawing.Graphics]::FromImage($zoom)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.DrawImage($crop, 0, 0, $zw, $zh)
    $zoom.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $zoom.Dispose(); $crop.Dispose(); $img.Dispose()
    Write-Host ("saved " + $Out)
}
$root = 'D:\6\???\reports\screenshots\round-1-tour'
$tmp = 'D:\6\???\reports\audit\round-1\tmp-a3'
function Find-Shot([string]$dir, [string]$pattern) {
    return (Get-ChildItem -LiteralPath $dir -Filter $pattern | Select-Object -First 1).FullName
}
$p1 = Find-Shot "$root\A" 'subpackages_tools_love-center_nearby__*.png'
$p2 = Find-Shot "$root\A" 'subpackages_tools_search_index__*.png'
$p3 = Find-Shot "$root\A" 'subpackages_tools_security_index__*.png'
$p4 = Find-Shot "$root\A" 'subpackages_tools_love-center_mbti__*.png'
Write-Host "found: $p1 | $p2 | $p3 | $p4"
Crop-Zoom2 $p1 "$tmp\v22-nearby-topright.png" 220 20 160 80 4
Crop-Zoom2 $p2 "$tmp\v22-search-rightedge.png" 210 30 170 60 4
Crop-Zoom2 $p3 "$tmp\v22-security-scrolltop.png" 0 0 375 80 3
Crop-Zoom2 $p4 "$tmp\v22-mbti-top.png" 0 0 375 110 3
