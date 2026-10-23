# Boncuk Çarkı ikonlarını ve açılış ekranını üretir.
# Kullanım (proje klasöründe):  powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$bg = [System.Drawing.ColorTranslator]::FromHtml('#0f1b2e')
$bg2 = [System.Drawing.ColorTranslator]::FromHtml('#1d3a66')
$colors = '#e04b3c', '#20b2aa', '#f2b632', '#5aa83c', '#8e5bc9', '#f07c2a', '#e86aa6' |
  ForEach-Object { [System.Drawing.ColorTranslator]::FromHtml($_) }

function New-Canvas($size, [bool]$transparent) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  if (-not $transparent) { $g.Clear($bg) } else { $g.Clear([System.Drawing.Color]::Transparent) }
  return $bmp, $g
}

function Fill-Circle($g, $color, $x, $y, $r) {
  $b = New-Object System.Drawing.SolidBrush $color
  $g.FillEllipse($b, [float]($x - $r), [float]($y - $r), [float](2 * $r), [float](2 * $r))
  $b.Dispose()
}

function Draw-Bead($g, $color, $x, $y, $r) {
  Fill-Circle $g $color $x $y $r
  $hl = [System.Drawing.Color]::FromArgb(110, 255, 255, 255)
  Fill-Circle $g $hl ($x - $r * 0.3) ($y - $r * 0.3) ($r * 0.35)
  Fill-Circle $g ([System.Drawing.Color]::FromArgb(90, 0, 0, 0)) $x $y ($r * 0.16)
}

function Draw-Star($g, $color, $x, $y, $r) {
  $pts = for ($i = 0; $i -lt 16; $i++) {
    $a = $i * [Math]::PI / 8 - [Math]::PI / 2
    $rr = if ($i % 2) { $r * 0.55 } else { $r }
    New-Object System.Drawing.PointF ([float]($x + [Math]::Cos($a) * $rr)), ([float]($y + [Math]::Sin($a) * $rr))
  }
  $b = New-Object System.Drawing.SolidBrush $color
  $g.FillPolygon($b, [System.Drawing.PointF[]]$pts)
  $b.Dispose()
}

# çark: 3 halka, 8 ışın; her ışında bir renk hizalı
function Draw-Wheel($g, $cx, $cy, $R) {
  $hub = $R * 0.26
  $w = ($R - $hub) / 3
  for ($r = 2; $r -ge 0; $r--) {
    $alpha = if ($r % 2) { 22 } else { 38 }
    Fill-Circle $g ([System.Drawing.Color]::FromArgb($alpha, 255, 255, 255)) $cx $cy ($hub + ($r + 1) * $w)
  }
  Fill-Circle $g $bg2 $cx $cy $hub
  Draw-Star $g $colors[1] $cx $cy ($hub * 0.85)
  Draw-Star $g ([System.Drawing.ColorTranslator]::FromHtml('#f4ead5')) $cx $cy ($hub * 0.45)
  $beadR = $w * 0.36
  for ($s = 0; $s -lt 8; $s++) {
    $a = $s * [Math]::PI / 4 - [Math]::PI / 2
    for ($r = 0; $r -lt 3; $r++) {
      $c = $colors[($s + ($(if ($s % 2) { $r } else { 0 }))) % 5]
      $rad = $hub + ($r + 0.5) * $w
      Draw-Bead $g $c ($cx + [Math]::Cos($a) * $rad) ($cy + [Math]::Sin($a) * $rad) $beadR
    }
  }
}

function Save($bmp, $path) {
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "yazildi: $path"
}

# web ikonları (tam dolu arka plan); maskable için çark güvenli bölgede (%80)
foreach ($spec in @(@{ n = 'icon-512.png'; s = 512; k = 0.46 }, @{ n = 'icon-192.png'; s = 192; k = 0.46 },
                    @{ n = 'apple-touch-icon.png'; s = 180; k = 0.44 }, @{ n = 'maskable-512.png'; s = 512; k = 0.38 })) {
  $bmp, $g = New-Canvas $spec.s $false
  Draw-Wheel $g ($spec.s / 2) ($spec.s / 2) ($spec.s * $spec.k)
  $g.Dispose()
  Save $bmp (Join-Path $root "www\icons\$($spec.n)")
}

# Capacitor kaynakları (@capacitor/assets bunlardan Android/iOS boyutlarını üretir)
$bmp, $g = New-Canvas 1024 $false; Draw-Wheel $g 512 512 470; $g.Dispose(); Save $bmp (Join-Path $root 'assets\icon-only.png')
$bmp, $g = New-Canvas 1024 $true;  Draw-Wheel $g 512 512 330; $g.Dispose(); Save $bmp (Join-Path $root 'assets\icon-foreground.png')
$bmp, $g = New-Canvas 1024 $false; $g.Dispose(); Save $bmp (Join-Path $root 'assets\icon-background.png')
foreach ($n in 'splash.png', 'splash-dark.png') {
  $bmp, $g = New-Canvas 2732 $false; Draw-Wheel $g 1366 1366 420; $g.Dispose(); Save $bmp (Join-Path $root "assets\$n")
}
