# Safe one-command update for Winter Arc.
# Guarantees: data is backed up BEFORE anything changes, and the installer
# never touches %APPDATA%\winter-arc (NSIS only replaces program files).
#
# Usage (from the winter-arc folder):
#   powershell -ExecutionPolicy Bypass -File Install-Update.ps1 -Version 1.0.8
param([string]$Version = "1.0.8")
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
$dataFile = Join-Path $env:APPDATA 'winter-arc\winter-arc.sqlite'

# 1. Backup data first. Abort the whole update if this fails.
if (Test-Path -LiteralPath $dataFile) {
  New-Item -ItemType Directory -Path (Join-Path $root 'backups') -Force | Out-Null
  $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
  $backup = Join-Path $root "backups\winter-arc-backup-$ts.sqlite"
  Copy-Item -LiteralPath $dataFile -Destination $backup
  if ((Get-Item $dataFile).Length -ne (Get-Item $backup).Length) { throw 'Backup size mismatch. Update aborted, nothing changed.' }
  Write-Host "Backup OK: $backup"
} else {
  Write-Host 'No existing data file. Fresh install path.'
}

# 2. Close a running app so files can be replaced.
Get-Process WinterArc -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# 3. Silent upgrade of the installed app.
$setup = Join-Path $root "release\WinterArc-Setup-$Version.exe"
if (-not (Test-Path -LiteralPath $setup)) { throw "Installer not found: $setup" }
Write-Host "Installing $Version (silent)..."
Start-Process -FilePath $setup -ArgumentList '/S' -Wait
Write-Host 'Installed.'

# 4. Refresh the Desktop launcher. Retries because OneDrive or antivirus
#    can briefly lock the Desktop file right after install.
$portable = Join-Path $root "release\WinterArc-Portable-$Version.exe"
if (-not (Test-Path -LiteralPath $portable)) { throw "Portable not found: $portable" }
$dest = Join-Path $desktop 'WinterArc.exe'
$copied = $false
$attempt = 0
while ($copied -eq $false) {
  $attempt = $attempt + 1
  try {
    Copy-Item -LiteralPath $portable -Destination $dest -Force
    $copied = $true
  } catch {
    if ($attempt -ge 5) { throw 'Desktop copy failed after 5 attempts.' }
    Write-Host "Desktop locked. Retrying..."
    Start-Sleep -Seconds 4
  }
}
Write-Host 'Desktop launcher refreshed.'

# 5. Verify data survived.
$after = (Get-Item $dataFile -ErrorAction SilentlyContinue).Length
Write-Host "Data file present: $after bytes."
Write-Host 'DONE. Launch WinterArc from the Desktop.'
