$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$def = New-Object System.Drawing.Bitmap('D:\6\恋爱小程序\reports\screenshots\round-1-tour\B\pages_discover_index__默认.png')
$pop = New-Object System.Drawing.Bitmap('D:\6\恋爱小程序\reports\screenshots\round-1-tour\B\pages_discover_index__弹层态.png')

function Px {
    param([string]$Name, [System.Drawing.Bitmap]$b, [int]$X, [int]$Y)
    $p = $b.GetPixel($X, $Y)
    Write-Host ("{0} @({1},{2}) RGB=({3},{4},{5})" -f $Name, $X, $Y, $p.R, $p.G, $p.B)
}

# 页头空白背景（标题右侧空白处，两图同坐标）
Px -Name 'DEF header-bg' -b $def -X 150 -Y 80
Px -Name 'POP header-bg' -b $pop -X 150 -Y 80
Px -Name 'DEF header-bg2' -b $def -X 60 -Y 95
Px -Name 'POP header-bg2' -b $pop -X 60 -Y 95
# 分段行右侧空白
Px -Name 'DEF tabs-bg' -b $def -X 300 -Y 125
Px -Name 'POP tabs-bg' -b $pop -X 300 -Y 125
# 卡片区域（被遮罩压暗的对照点，弹层态应显著变暗）
Px -Name 'DEF card-area' -b $def -X 186 -Y 300
Px -Name 'POP card-area' -b $pop -X 186 -Y 300
# 遮罩区域（卡片区下缘灰色带）
Px -Name 'POP mask-band' -b $pop -X 186 -Y 165
Px -Name 'DEF same-band' -b $def -X 186 -Y 165
$def.Dispose(); $pop.Dispose()
