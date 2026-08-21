Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\luish\.gemini\antigravity-ide\brain\be6a8df4-9eb7-4153-9951-91357a4ce41a\.user_uploaded\media_1787287079942.jpg"
$destDir = "c:\Users\luish\OneDrive\Documentos\GitHub\tcc_recover_aplicativo\mobile"

$srcImg = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source Width: $($srcImg.Width), Height: $($srcImg.Height)"

# 1. Save direct full copy
$srcImg.Save("$destDir\src\assets\logo_wefind_full.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 2. Create square icon centering the symbol and text
# Let's create a 1024x1024 canvas with pure white background
$iconBmp = New-Object System.Drawing.Bitmap(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($iconBmp)
$g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Calculate bounding box to fit the logo nicely into 1024x1024 with margin
$scale = 1024.0 / [Math]::Max($srcImg.Width, $srcImg.Height) * 0.92
$newW = [int]($srcImg.Width * $scale)
$newH = [int]($srcImg.Height * $scale)
$posX = [int]((1024 - $newW) / 2)
$posY = [int]((1024 - $newH) / 2)

$destRect = New-Object System.Drawing.Rectangle($posX, $posY, $newW, $newH)
$srcRect = New-Object System.Drawing.Rectangle(0, 0, $srcImg.Width, $srcImg.Height)
$g.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$iconBmp.Save("$destDir\src\assets\logo_wefind.png", [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Save("$destDir\src\assets\logo_wefind_icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Save("$destDir\src\assets\logo_perdiz.png", [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Save("$destDir\src\assets\logo_recover.png", [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Save("$destDir\assets\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Save("$destDir\assets\adaptive-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Save("$destDir\assets\splash-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Save("$destDir\assets\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$iconBmp.Dispose()
$srcImg.Dispose()

Write-Host "All assets generated and saved successfully!"
