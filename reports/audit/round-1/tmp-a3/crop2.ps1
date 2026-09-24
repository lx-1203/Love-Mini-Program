$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Crop-Zoom {
    param([string]$Src, [string]$Out, [int]$X, [int]$Y, [int]$W, [int]$H, [double]$Scale)
    $img = [System.Drawing.Image]::FromFile($Src)
    $rect = New-Object System.Drawing.Rectangle($X, $Y, $W, $H)
    $crop = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
    $g = [System.Drawing.Graphics]::FromImage($crop)
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0,0,$rect.Width,$rect.Height)), $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $sw = [int]($rect.Width * $Scale); $sh = [int]($rect.Height * $Scale)
    $zoom = New-Object System.Drawing.Bitmap($sw, $sh)
    $g2 = [System.Drawing.Graphics]::FromImage($zoom)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g2.DrawImage($crop, 0, 0, $sw, $sh)
    $g2.Dispose(); $zoom.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $zoom.Dispose(); $crop.Dispose(); $img.Dispose()
    Write-Host ("saved: " + $Out)
}

$B = 'D:\6\恋爱小程序\reports\screenshots\round-1-tour\B'
$Out = 'D:\6\恋爱小程序\reports\audit\round-1\tmp-a3'

# 默认态：分段控件 推荐/附近
Crop-Zoom -Src "$B\pages_discover_index__默认.png" -Out "$Out\def-segment.png" -X 0 -Y 105 -W 220 -H 55 -Scale 4
# 默认态：性别符 + 绿点 更高倍
Crop-Zoom -Src "$B\pages_discover_index__默认.png" -Out "$Out\def-gender4x.png" -X 115 -Y 365 -W 80 -H 40 -Scale 6
# 弹层态：身高滑杆 4x
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-slider4x.png" -X 0 -Y 290 -W 373 -H 55 -Scale 3
# 默认态：匹配环 vs 理想（对比条）
Crop-Zoom -Src "$B\pages_discover_index__默认.png" -Out "$Out\def-ring4x.png" -X 250 -Y 495 -W 110 -H 90 -Scale 4
