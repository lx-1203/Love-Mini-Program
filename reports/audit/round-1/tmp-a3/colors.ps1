$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$ideal = New-Object System.Drawing.Bitmap('D:\6\恋爱小程序\素材\理想效果图\寻觅匹配卡片页面.png')
$act = New-Object System.Drawing.Bitmap('D:\6\恋爱小程序\reports\screenshots\round-1-tour\B\pages_discover_index__默认.png')

Write-Host ("ideal size: " + $ideal.Width + "x" + $ideal.Height)

function Px {
    param([string]$Name, [System.Drawing.Bitmap]$b, [int]$X, [int]$Y)
    $p = $b.GetPixel($X, $Y)
    Write-Host ("{0} @({1},{2}) RGB=({3},{4},{5}) #{5:X2}{4:X2}{3:X2}" -f $Name, $X, $Y, $p.R, $p.G, $p.B)
}

Write-Host '--- 理想图 ---'
Px -Name 'ideal ring-top'    -b $ideal -X 700  -Y 1062
Px -Name 'ideal ring-left'   -b $ideal -X 610  -Y 1150
Px -Name 'ideal ring-right'  -b $ideal -X 790  -Y 1150
Px -Name 'ideal like-btn'    -b $ideal -X 677  -Y 1432
Px -Name 'ideal underline'   -b $ideal -X 130  -Y 272
Px -Name 'ideal heart-badge' -b $ideal -X 176  -Y 141
Px -Name 'ideal gender-f'    -b $ideal -X 268  -Y 890
Write-Host '--- 实际 默认态 ---'
Px -Name 'act like-btn'      -b $act -X 311 -Y 630
Px -Name 'act ring-upper'    -b $act -X 305 -Y 500
Px -Name 'act ring-mid'      -b $act -X 285 -Y 525
Px -Name 'act ring-rim'      -b $act -X 305 -Y 489
Px -Name 'act underline'     -b $act -X 50  -Y 144
Px -Name 'act heart-badge'   -b $act -X 75  -Y 90
Px -Name 'act gender-bg'     -b $act -X 168 -Y 380
$ideal.Dispose(); $act.Dispose()
