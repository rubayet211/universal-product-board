param(
  [string]$OutputDirectory = "dist"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$validateScript = Join-Path $PSScriptRoot "validate-release.ps1"
$packageScript = Join-Path $PSScriptRoot "package-extension.ps1"
$manifestPath = Join-Path $root "manifest.json"
$manifest = Get-Content $manifestPath | ConvertFrom-Json
$outputRoot = Join-Path $root $OutputDirectory
$zipPath = Join-Path $outputRoot "universal-product-board-$($manifest.version).zip"

Write-Host "Step 1/2: Validating Chrome Web Store release files..."
& powershell -ExecutionPolicy Bypass -File $validateScript
if ($LASTEXITCODE -ne 0) {
  throw "Release validation failed."
}

Write-Host "Step 2/2: Building Chrome Web Store zip package..."
& powershell -ExecutionPolicy Bypass -File $packageScript -OutputDirectory $OutputDirectory
if ($LASTEXITCODE -ne 0) {
  throw "Package creation failed."
}

if (-not (Test-Path $zipPath)) {
  throw "Expected package was not created: $zipPath"
}

Write-Host "Chrome Web Store package is ready:"
Write-Host $zipPath
