param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root "manifest.json"
$manifest = Get-Content $manifestPath | ConvertFrom-Json

$expectedPermissions = @("activeTab", "storage", "scripting", "sidePanel")
$expectedOptionalPermissions = @("notifications")
$expectedOptionalHostPermissions = @("http://*/*", "https://*/*")
$runtimeFiles = @(
  "shared/constants.js",
  "shared/storage.js",
  "shared/scraper.js",
  "background/service-worker.js",
  "content/content-script.js",
  "popup/popup.js",
  "sidebar/sidebar.js",
  "options/options.js"
)
$iconFiles = @(
  "assets/icons/icon16.png",
  "assets/icons/icon48.png",
  "assets/icons/icon128.png"
)

function Assert-EqualSet {
  param(
    [string[]]$Actual,
    [string[]]$Expected,
    [string]$Label
  )

  $actualSorted = @($Actual | Sort-Object)
  $expectedSorted = @($Expected | Sort-Object)

  if (($actualSorted -join ",") -ne ($expectedSorted -join ",")) {
    throw "$Label mismatch. Expected: $($expectedSorted -join ', ') | Actual: $($actualSorted -join ', ')"
  }
}

Write-Host "Validating manifest policy surface..."
Assert-EqualSet -Actual $manifest.permissions -Expected $expectedPermissions -Label "permissions"
Assert-EqualSet -Actual $manifest.optional_permissions -Expected $expectedOptionalPermissions -Label "optional_permissions"
Assert-EqualSet -Actual $manifest.optional_host_permissions -Expected $expectedOptionalHostPermissions -Label "optional_host_permissions"

if ($manifest.minimum_chrome_version -ne "116") {
  throw "minimum_chrome_version must be 116."
}

if ($manifest.PSObject.Properties.Name -contains "host_permissions") {
  throw "host_permissions must not be present for the 1.3.0 release."
}

if ($manifest.PSObject.Properties.Name -contains "content_scripts") {
  throw "content_scripts must not be present for the 1.3.0 release."
}

Write-Host "Checking required icon files..."
foreach ($icon in $iconFiles) {
  $iconPath = Join-Path $root $icon
  if (-not (Test-Path $iconPath)) {
    throw "Missing icon file: $icon"
  }
}

Write-Host "Running JavaScript syntax checks..."
foreach ($relativePath in $runtimeFiles) {
  $fullPath = Join-Path $root $relativePath
  & node --check $fullPath
  if ($LASTEXITCODE -ne 0) {
    throw "Syntax check failed for $relativePath"
  }
}

Write-Host "Release validation passed."
