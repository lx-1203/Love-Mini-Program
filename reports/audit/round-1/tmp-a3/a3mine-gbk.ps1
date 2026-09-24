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
$root = 'D:\6\恋爱小程序\reports\screenshots\round-1-tour'
$tmp = 'D:\6\恋爱小程序\reports\audit\round-1\tmp-a3'
Crop-Zoom2 "$root\A\subpackages_tools_love-center_nearby__默认.png" "$tmp\v22-nearby-topright.png" 220 20 160 80 4
Crop-Zoom2 "$root\A\subpackages_tools_search_index__默认.png" "$tmp\v22-search-rightedge.png" 210 30 170 60 4
Crop-Zoom2 "$root\A\subpackages_tools_security_index__滚动-中部.png" "$tmp\v22-security-scrolltop.png" 0 0 375 80 3
Crop-Zoom2 "$root\A\subpackages_tools_love-center_mbti__默认.png" "$tmp\v22-mbti-top.png" 0 0 375 110 3
