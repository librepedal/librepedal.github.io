# Recorta la imagen de Gemini desde una captura de la pestaña (la imagen abierta sola, =s1024)
# y la guarda en gemini/<nombre>.png y galeria-img/<nombre-galeria>.jpg (900 px de ancho, como las demás).
# Uso: .\recortar.ps1 -Captura <jpg> -Nombre pudu-cria-empuje -Galeria pudu-empuje [-X 128 -Y 7 -W 1024 -H 572]
param([string]$Captura,[string]$Nombre,[string]$Galeria,[int]$X=128,[int]$Y=7,[int]$W=1024,[int]$H=572)
Add-Type -AssemblyName System.Drawing
$base = Split-Path $PSScriptRoot -Parent
$src = [System.Drawing.Image]::FromFile($Captura)
$rec = New-Object System.Drawing.Bitmap $W,$H
$g = [System.Drawing.Graphics]::FromImage($rec)
$g.DrawImage($src,(New-Object System.Drawing.Rectangle 0,0,$W,$H),(New-Object System.Drawing.Rectangle $X,$Y,$W,$H),[System.Drawing.GraphicsUnit]::Pixel)
$rec.Save((Join-Path $base "gemini\$Nombre.png"),[System.Drawing.Imaging.ImageFormat]::Png)
$h2 = [int]($H*900/$W)
$gal = New-Object System.Drawing.Bitmap 900,$h2
$g2 = [System.Drawing.Graphics]::FromImage($gal)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($rec,0,0,900,$h2)
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$p = New-Object System.Drawing.Imaging.EncoderParameters 1
$p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]90)
$gal.Save((Join-Path $base "galeria-img\$Galeria.jpg"),$enc,$p)
$g.Dispose();$g2.Dispose();$src.Dispose();$rec.Dispose();$gal.Dispose()
"ok $Nombre"
