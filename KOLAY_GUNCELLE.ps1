$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $root 'Eklenti'
if (-not (Test-Path (Join-Path $target 'manifest.json'))) {
  throw "Bu dosyayi eklentinin Eklenti klasoruyle ayni dizinde calistirin."
}
$temp = Join-Path $env:TEMP ("pdf-ocr-update-" + [guid]::NewGuid().ToString('N'))
try {
  New-Item -Path $temp -ItemType Directory | Out-Null
  Write-Host "GitHub son surum sorgulaniyor..."
  $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/numandegirmenci/vivaldi-turkce-pdf-ocr/releases/latest' -Headers @{ 'User-Agent' = 'Turkce-PDF-OCR-Updater' }
  $asset = $release.assets | Where-Object { $_.name -match '^Turkce-PDF-OCR-Chromium-v[0-9.]+\.zip$' } | Select-Object -First 1
  if (-not $asset) { throw "Beklenen GitHub kurulum paketi bulunamadi." }
  $zip = Join-Path $temp 'release.zip'
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing
  $extract = Join-Path $temp 'extract'
  Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
  $source = Join-Path $extract 'Eklenti'
  if (-not (Test-Path (Join-Path $source 'manifest.json'))) { throw "Gecersiz surum paketi." }
  $newManifest = Get-Content (Join-Path $source 'manifest.json') -Raw | ConvertFrom-Json
  if ($newManifest.version -ne $release.tag_name.TrimStart('v')) { throw "Surum numarasi uyusmuyor." }
  $backup = Join-Path $root ('Eklenti_Yedek_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
  Write-Host "Mevcut surum yedekleniyor: $backup"
  New-Item -ItemType Directory -Path $backup | Out-Null
  & robocopy.exe $target $backup /E /R:2 /W:1 /NFL /NDL /NJH /NJS
  if ($LASTEXITCODE -ge 8) { throw "Yedekleme tamamlanamadi." }
  Write-Host "Yeni surum yukleniyor..."
  & robocopy.exe $source $target /E /R:2 /W:1 /NFL /NDL /NJH /NJS
  if ($LASTEXITCODE -ge 8) { throw "Kopyalama hatasi. Yedek klasoru: $backup" }
  Write-Host "Basarili! Surum: $($newManifest.version)"
  Write-Host "Vivaldi > vivaldi://extensions > eklenti karti > Yeniden yukle'ye basin."
  try { Start-Process 'vivaldi://extensions' } catch { }
} catch {
  Write-Host "HATA: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
} finally {
  Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}
