Add-Type -AssemblyName System.Drawing
$destPath = "c:\Users\luish\OneDrive\Documentos\GitHub\tcc_recover_aplicativo\mobile\src\assets\logo_wefind_emblem.png"
$bmp = New-Object System.Drawing.Bitmap($destPath)

$minHoleX = 512; $maxHoleX = 0; $minHoleY = 512; $maxHoleY = 0

# Sample horizontal line through middle
for ($y = 150; $y -lt 350; $y++) {
    for ($x = 180; $x -lt 340; $x++) {
        $c = $bmp.GetPixel($x, $y)
        # Inside the hole it's transparent or near white
        if ($c.A -lt 30 -or ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240)) {
            if ($x -lt $minHoleX) { $minHoleX = $x }
            if ($x -gt $maxHoleX) { $maxHoleX = $x }
            if ($y -lt $minHoleY) { $minHoleY = $y }
            if ($y -gt $maxHoleY) { $maxHoleY = $y }
        }
    }
}

$bmp.Dispose()
Write-Host "Hole Bounding Box on 512x512: minX=$minHoleX, maxX=$maxHoleX, minY=$minHoleY, maxY=$maxHoleY"
$holeCenterX = ($minHoleX + $maxHoleX) / 2.0
$holeCenterY = ($minHoleY + $maxHoleY) / 2.0
$holeW = $maxHoleX - $minHoleX
$holeH = $maxHoleY - $minHoleY
Write-Host "Hole Center: ($holeCenterX, $holeCenterY), Width: $holeW, Height: $holeH"
Write-Host "Percentage Center X: $([Math]::Round($holeCenterX / 512.0 * 100, 2))%, Center Y: $([Math]::Round($holeCenterY / 512.0 * 100, 2))%"
Write-Host "Hole Size Ratio: $([Math]::Round($holeW / 512.0 * 100, 2))%"
