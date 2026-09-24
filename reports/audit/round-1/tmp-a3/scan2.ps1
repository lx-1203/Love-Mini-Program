﻿$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$ideal = New-Object System.Drawing.Bitmap('D:\6\恋爱小程序\素材\理想效果图\寻觅匹配卡片页面.png')
$act = New-Object System.Drawing.Bitmap('D:\6\恋爱小程序\reports\screenshots\round-1-tour\B\pages_discover_index__默认.png')

# 1) 理想图右下区域扫描绿色像素（G 明显大于 R/B）
$minX=99999;$maxX=-1;$minY=99999;$maxY=-1;$sample=$null
for ($y=1000; $y -le 1300; $y++) {
  for ($x=560; $x -le 859; $x++) {
    $p=$ideal.GetPixel($x,$y)
    if ($p.G -gt 140 -and $p.G - $p.R -gt 60 -and $p.G - $p.B -gt 40) {
      if($x -lt $minX){$minX=$x}; if($x -gt $maxX){$maxX=$x}
      if($y -lt $minY){$minY=$y}; if($y -gt $maxY){$maxY=$y}
      if($null -eq $sample){$sample=@($x,$y,$p.R,$p.G,$p.B)}
    }
  }
}
Write-Host ("ideal green bbox: x[$minX..$maxX] y[$minY..$maxY]")
if($sample){Write-Host ("first green @({0},{1}) RGB=({2},{3},{4})" -f $sample[0],$sample[1],$sample[2],$sample[3],$sample[4])}
# 环顶部中点取色
if($maxX -gt 0){ $cx=[int](($minX+$maxX)/2); $p=$ideal.GetPixel($cx,$minY+2); Write-Host ("ideal ring top-center @($cx,$($minY+2)) RGB=($($p.R),$($p.G),$($p.B))") }

# 2) 实际图 CTA 行扫描粉色（喜欢钮中心）
$minX2=99999;$maxX2=-1;$cy=-1
for ($y=595; $y -le 665; $y++) {
  for ($x=260; $x -le 365; $x++) {
    $p=$act.GetPixel($x,$y)
    if ($p.R -gt 230 -and $p.G -lt 150 -and $p.B -gt 90 -and $p.B -lt 200) {
      if($x -lt $minX2){$minX2=$x}; if($x -gt $maxX2){$maxX2=$x}; $cy=$y
    }
  }
}
Write-Host ("act like-btn pink bbox: x[$minX2..$maxX2] yBottom=$cy")
if($maxX2 -gt 0){ $cx2=[int](($minX2+$maxX2)/2); $p2=$act.GetPixel($cx2,628); Write-Host ("act like-btn center @($cx2,628) RGB=($($p2.R),$($p2.G),$($p2.B))") }

# 3) 实际图分段下划线扫描
$minX3=99999;$maxX3=-1;$minY3=99999;$maxY3=-1
for ($y=130; $y -le 160; $y++) {
  for ($x=10; $x -le 120; $x++) {
    $p=$act.GetPixel($x,$y)
    if ($p.R -gt 230 -and $p.G -lt 160 -and $p.B -gt 90 -and $p.B -lt 200) {
      if($x -lt $minX3){$minX3=$x}; if($x -gt $maxX3){$maxX3=$x}
      if($y -lt $minY3){$minY3=$y}; if($y -gt $maxY3){$maxY3=$y}
    }
  }
}
Write-Host ("act underline bbox: x[$minX3..$maxX3] y[$minY3..$maxY3]")
if($maxX3 -gt 0){ $p3=$act.GetPixel([int](($minX3+$maxX3)/2),[int](($minY3+$maxY3)/2)); Write-Host ("act underline RGB=($($p3.R),$($p3.G),$($p3.B))") }

# 4) 理想图分段下划线扫描（推荐下方）
$minX4=99999;$maxX4=-1;$minY4=99999;$maxY4=-1
for ($y=250; $y -le 300; $y++) {
  for ($x=60; $x -le 240; $x++) {
    $p=$ideal.GetPixel($x,$y)
    if ($p.R -gt 230 -and $p.G -lt 160 -and $p.B -gt 90 -and $p.B -lt 200) {
      if($x -lt $minX4){$minX4=$x}; if($x -gt $maxX4){$maxX4=$x}
      if($y -lt $minY4){$minY4=$y}; if($y -gt $maxY4){$maxY4=$y}
    }
  }
}
Write-Host ("ideal underline bbox: x[$minX4..$maxX4] y[$minY4..$maxY4]")
if($maxX4 -gt 0){ $p4=$ideal.GetPixel([int](($minX4+$maxX4)/2),[int](($minY4+$maxY4)/2)); Write-Host ("ideal underline RGB=($($p4.R),$($p4.G),$($p4.B))") }
$ideal.Dispose(); $act.Dispose()
