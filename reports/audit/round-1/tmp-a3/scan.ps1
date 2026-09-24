$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap('D:\6\恋爱小程序\reports\screenshots\round-1-tour\B\pages_discover_index__弹层态.png')
Write-Host ("size: " + $bmp.Width + "x" + $bmp.Height)

function Scan-Row {
    param([string]$Name, [int]$Y0, [int]$Y1, [string]$Mode)
    $minX = -1; $maxX = -1
    for ($y = $Y0; $y -le $Y1; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            $isTarget = $false
            if ($Mode -eq 'green')  { $isTarget = ($p.G -gt 130 -and $p.R -lt 130 -and $p.B -lt 150) }
            if ($Mode -eq 'pink')   { $isTarget = ($p.R -gt 200 -and $p.B -gt 100 -and $p.G -lt 160) }
            if ($isTarget) {
                if ($minX -lt 0 -or $x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
            }
        }
    }
    Write-Host ("{0}: x[{1}..{2}] (screenW={3})" -f $Name, $minX, $maxX, $bmp.Width)
}

# 身高行 值文本 120-250（绿字）
Scan-Row -Name 'height-value-green' -Y0 268 -Y1 284 -Mode 'green'
# 学历行 值文本（绿字，被裁）
Scan-Row -Name 'edu-value-green'    -Y0 372 -Y1 392 -Mode 'green'
# 感情状态行 值文本（绿字，被裁）
Scan-Row -Name 'rel-value-green'    -Y0 432 -Y1 452 -Mode 'green'
# 上滑块粉色轨道
Scan-Row -Name 'pink-track'         -Y0 316 -Y1 332 -Mode 'pink'
# 限位滑块绿手柄
Scan-Row -Name 'green-handle'       -Y0 298 -Y1 315 -Mode 'green'
$bmp.Dispose()
