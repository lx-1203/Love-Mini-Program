param([string]$Spec)
Add-Type -AssemblyName System.Drawing
$items = $Spec -split ';'
foreach ($item in $items) {
  $p = $item -split '\|'
  $src = $p[0]; $out = $p[1]
  $x = [int]$p[2]; $y = [int]$p[3]; $w = [int]$p[4]; $h = [int]$p[5]; $scale = [int]$p[6]
  $img = [System.Drawing.Image]::FromFile($src)
  $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
  $bmp = New-Object System.Drawing.Bitmap(($w*$scale), ($h*$scale))
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0,0,($w*$scale),($h*$scale))), $rect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose(); $img.Dispose()
  Write-Output "saved $out"
}
