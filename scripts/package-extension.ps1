param(
  [string]$OutputDirectory = "dist"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $root $OutputDirectory
$manifest = Get-Content (Join-Path $root "manifest.json") | ConvertFrom-Json
$version = $manifest.version
$zipPath = Join-Path $outputRoot "universal-product-board-$version.zip"
$timestamp = [DateTimeOffset]::Parse("2026-03-25T00:00:00Z")

$includePaths = @(
  "manifest.json",
  "privacy-policy.html",
  "assets/icons/icon16.png",
  "assets/icons/icon48.png",
  "assets/icons/icon128.png",
  "background",
  "content",
  "options",
  "popup",
  "shared",
  "sidebar"
)

if (-not (Test-Path $outputRoot)) {
  New-Item -ItemType Directory -Path $outputRoot | Out-Null
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$files = foreach ($relativePath in $includePaths) {
  $fullPath = Join-Path $root $relativePath

  if (Test-Path $fullPath -PathType Leaf) {
    Get-Item $fullPath
    continue
  }

  Get-ChildItem -Path $fullPath -Recurse -File
}

$sortedFiles = $files | Sort-Object {
  $_.FullName.Substring($root.Length).TrimStart('\').Replace('\', '/')
}

$archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $sortedFiles) {
    $entryName = $file.FullName.Substring($root.Length).TrimStart('\').Replace('\', '/')
    $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entry.LastWriteTime = $timestamp

    $entryStream = $entry.Open()
    $fileStream = [System.IO.File]::OpenRead($file.FullName)
    try {
      $fileStream.CopyTo($entryStream)
    } finally {
      $fileStream.Dispose()
      $entryStream.Dispose()
    }
  }
} finally {
  $archive.Dispose()
}

Write-Host "Created package: $zipPath"
