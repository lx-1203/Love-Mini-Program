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

# 弹层态：学历 head 整行
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-edu-head.png" -X 0 -Y 372 -W 373 -H 30 -Scale 3
# 弹层态：感情状态 head 整行
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-status-head.png" -X 0 -Y 432 -W 373 -H 30 -Scale 3
# 弹层态：身高 head 整行（对照）
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-height-head.png" -X 0 -Y 285 -W 373 -H 30 -Scale 3
# 弹层态：身高滑块细节（两次滑块叠放）
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-sliders-detail.png" -X 0 -Y 305 -W 373 -H 70 -Scale 3
