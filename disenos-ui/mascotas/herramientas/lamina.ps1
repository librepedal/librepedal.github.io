# Arma la lámina de todas las mascotas: una fila por animal, 5 columnas (cría, joven, adulto, con hambre, descuidado).
# Uso: powershell -File lamina.ps1 [-Poses]  (lee gemini/*.png; escribe gemini/lamina-mascotas.png o lamina-poses.png)
param([switch]$Poses)
Add-Type -AssemblyName System.Drawing
$d = Join-Path $PSScriptRoot "..\gemini"
$filas = @(
  @("Pudú",       @("pudu-cria-v8-ojos-grandes","pudu-joven-v2","pudu-adulto-v1","pudu-cria-hambre","pudu-cria-descuidado")),
  @("Zorro culpeo",@("zorro-cria","zorro-joven","zorro-adulto","zorro-cria-hambre","zorro-cria-descuidado")),
  @("Huillín",    @("huillin-cria","huillin-joven","huillin-adulto","huillin-cria-hambre","huillin-cria-descuidado")),
  @("Ranita de Darwin",@("rana-cria","rana-joven","rana-adulto","rana-cria-hambre","rana-cria-descuidado")),
  @("Güiña",      @("guina-cria","guina-joven","guina-adulto","guina-cria-hambre","guina-cria-descuidado")),
  @("Yorkshire",  @("yorkie-cria","yorkie-joven","yorkie-adulto","yorkie-cria-hambre","yorkie-cria-descuidado"))
)
$cols = @("Cría","Joven","Adulto","Con hambre","Descuidado")
$salida = "lamina-mascotas.png"
if ($Poses) {
  $cols = @("De frente (su sección)","Sentado (canasto)","Corriendo (al lado)")
  $salida = "lamina-poses.png"
  foreach ($f in $filas) { $b = $f[1][0]; $a = $b -replace "-v8-ojos-grandes",""; $f[1] = @($b, "$a-sentado", "$a-corriendo") }
}
$nc = $cols.Count
$cell = 340; $cellH = 200; $lab = 190; $top = 50; $gap = 8
$W = $lab + $nc*($cell+$gap) + 10; $H = $top + $filas.Count*($cellH+$gap) + 10
$out = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($out)
$g.Clear([System.Drawing.Color]::FromArgb(10,15,29)); $g.InterpolationMode = 'HighQualityBicubic'; $g.TextRenderingHint = 'AntiAlias'
$f1 = New-Object System.Drawing.Font("Segoe UI",17,[System.Drawing.FontStyle]::Bold)
$f2 = New-Object System.Drawing.Font("Segoe UI",15,[System.Drawing.FontStyle]::Bold)
$br = [System.Drawing.Brushes]::White
$fx = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(252,106,42))
for ($c=0; $c -lt $nc; $c++) { $cx = [single]($lab + $c*($cell+$gap) + 8); $g.DrawString($cols[$c], $f2, $fx, $cx, [single]14) }
for ($r=0; $r -lt $filas.Count; $r++) {
  $y = $top + $r*($cellH+$gap)
  $ty = [single]($y + $cellH/2 - 30); $g.DrawString($filas[$r][0], $f1, $br, [System.Drawing.RectangleF]::new(8, $ty, $lab-12, 70))
  for ($c=0; $c -lt $nc; $c++) {
    $ip = Join-Path $d ($filas[$r][1][$c] + ".png")
    if (-not (Test-Path $ip)) { continue }
    $im = [System.Drawing.Image]::FromFile($ip)
    # imagen completa (16:9), quitando el borde oscuro de la captura
    $ix = $im.Width*0.035; $iy = $im.Height*0.035
    $src = [System.Drawing.RectangleF]::new($ix, $iy, $im.Width-2*$ix, $im.Height-2*$iy)
    $dst = [System.Drawing.RectangleF]::new($lab + $c*($cell+$gap), $y, $cell, $cellH); $g.DrawImage($im, $dst, $src, [System.Drawing.GraphicsUnit]::Pixel)
    $im.Dispose()
  }
}
$out.Save((Join-Path $d $salida), [System.Drawing.Imaging.ImageFormat]::Png)
"ok $W x $H"
