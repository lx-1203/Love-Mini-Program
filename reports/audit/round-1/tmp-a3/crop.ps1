param()
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
    $sw = [int]($rect.Width * $Scale)
    $sh = [int]($rect.Height * $Scale)
    $zoom = New-Object System.Drawing.Bitmap($sw, $sh)
    $g2 = [System.Drawing.Graphics]::FromImage($zoom)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g2.DrawImage($crop, 0, 0, $sw, $sh)
    $g2.Dispose()
    $zoom.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $zoom.Dispose(); $crop.Dispose(); $img.Dispose()
    Write-Host ("saved: " + $Out)
}

$B = 'D:\6\恋爱小程序\reports\screenshots\round-1-tour\B'
$Out = 'D:\6\恋爱小程序\reports\audit\round-1\tmp-a3'

$img = [System.Drawing.Image]::FromFile("$B\pages_discover_index__弹层态.png")
Write-Host ("pop size: " + $img.Width + "x" + $img.Height)
$img.Dispose()
$img2 = [System.Drawing.Image]::FromFile("$B\pages_discover_index__默认.png")
Write-Host ("default size: " + $img2.Width + "x" + $img2.Height)
$img2.Dispose()

# 弹层态：基础筛选/高级筛选 行（左缘）
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-tab-left.png" -X 0 -Y 180 -W 200 -H 90 -Scale 3
# 弹层态：身高滑杆区
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-height.png" -X 0 -Y 270 -W 375 -H 110 -Scale 2
# 弹层态：学历行右缘
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-edu-right.png" -X 250 -Y 370 -W 125 -H 60 -Scale 3
# 弹层态：感情状态行右缘
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-status-right.png" -X 250 -Y 430 -W 125 -H 60 -Scale 3
# 弹层态：底部按钮
Crop-Zoom -Src "$B\pages_discover_index__弹层态.png" -Out "$Out\pop-footer.png" -X 0 -Y 730 -W 375 -H 82 -Scale 2
# 默认态：头部右侧按钮（收藏入口核查）
Crop-Zoom -Src "$B\pages_discover_index__默认.png" -Out "$Out\def-header-right.png" -X 200 -Y 60 -W 175 -H 60 -Scale 3
# 默认态：姓名+年龄+性别符+在线点
Crop-Zoom -Src "$B\pages_discover_index__默认.png" -Out "$Out\def-name-row.png" -X 0 -Y 350 -W 260 -H 60 -Scale 3
# 默认态：匹配环右下角
Crop-Zoom -Src "$B\pages_discover_index__默认.png" -Out "$Out\def-ring.png" -X 230 -Y 480 -W 145 -H 110 -Scale 3
# 默认态：CTA 行
Crop-Zoom -Src "$B\pages_discover_index__默认.png" -Out "$Out\def-cta.png" -X 0 -Y 590 -W 375 -H 110 -Scale 2
# 默认态：卡片顶部 chips（距离chip+在线徽标）
Crop-Zoom -Src "$B\pages_discover_index__默认.png" -Out "$Out\def-chips.png" -X 0 -Y 155 -W 375 -H 60 -Scale 2
# 默认态：bio 区（引号）
Crop-Zoom -Src "$B\pages_discover_index__默认.png" -Out "$Out\def-bio.png" -X 0 -Y 470 -W 260 -H 50 -Scale 3
