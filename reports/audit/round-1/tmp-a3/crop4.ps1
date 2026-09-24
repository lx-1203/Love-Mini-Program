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
# 右缘竖带：身高值 → 学历值 → 感情状态值
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-right-strip.png" -X 300 -Y 262 -W 73 -H 200 -Scale 4
