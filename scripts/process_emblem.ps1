Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\luish\.gemini\antigravity-ide\brain\be6a8df4-9eb7-4153-9951-91357a4ce41a\.user_uploaded\media_1787288053094.jpg"
$destPath = "c:\Users\luish\OneDrive\Documentos\GitHub\tcc_recover_aplicativo\mobile\src\assets\logo_wefind_emblem.png"

$srcImg = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Emblem Source Width: $($srcImg.Width), Height: $($srcImg.Height)"

# Find bounding box of the non-white pixels
$bmp = New-Object System.Drawing.Bitmap($srcImg)
$minX = $bmp.Width
$maxX = 0
$minY = $bmp.Height
$maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $c = $bmp.GetPixel($x, $y)
        # Check if pixel is not near-white
        if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Bounding Box: minX=$minX, maxX=$maxX, minY=$minY, maxY=$maxY"
$contentW = $maxX - $minX + 1
$contentH = $maxY - $minY + 1
Write-Host "Content Size: ${contentW}x${contentH}"

# Create a clean square image 512x512 with the emblem centered
$outBmp = New-Object System.Drawing.Bitmap(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($outBmp)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$maxDim = [Math]::Max($contentW, $contentH)
$scale = 470.0 / $maxDim
$destW = [int]($contentW * $scale)
$destH = [int]($contentH * $scale)
$destX = [int]((512 - $destW) / 2)
$destY = [int]((512 - $destH) / 2)

$srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $contentW, $contentH)
$destRect = New-Object System.Drawing.Rectangle($destX, $destY, $destW, $destH)

$g.DrawImage($bmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$outBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$outBmp.Dispose()
$bmp.Dispose()
$srcImg.Dispose()

Write-Host "Emblem saved successfully to: $destPath"
