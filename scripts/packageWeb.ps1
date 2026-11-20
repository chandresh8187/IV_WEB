param([string]$OutputPath,[string]$DistPath='dist')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$dist = [IO.Path]::GetFullPath((Join-Path $projectRoot $DistPath))
if (-not (Test-Path -LiteralPath (Join-Path $dist 'index.html'))) { throw 'Run npm run build first.' }
if (-not $OutputPath) { $OutputPath = Join-Path $projectRoot 'hostinger-web-deploy.zip' }
$destination = [IO.Path]::GetFullPath($OutputPath)
if ([IO.Path]::GetExtension($destination) -ne '.zip') { throw 'Output must be a ZIP file.' }
if ($destination.StartsWith($dist + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Keep the ZIP outside dist.' }
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
$temporary = $destination + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
$files = @(Get-ChildItem -LiteralPath $dist -Recurse -File -Force | Sort-Object @{Expression={if ($_.FullName -eq (Join-Path $dist 'index.html')) {1} else {0}}},FullName)
$hashes = @{}
try {
 $stream = [IO.File]::Open($temporary,[IO.FileMode]::CreateNew)
 $zip = New-Object IO.Compression.ZipArchive($stream,[IO.Compression.ZipArchiveMode]::Create,$false)
 try {
  foreach ($file in $files) {
   if ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Symbolic links are not deployable.' }
   $relative = $file.FullName.Substring($dist.Length+1).Replace('\','/')
   if ($relative -match '(^|/)(node_modules|\.git|\.env|src)(/|$)|\.map$') { throw "Unexpected deployment file: $relative" }
   $sourceStream = [IO.File]::OpenRead($file.FullName); $sourceSha = [Security.Cryptography.SHA256]::Create()
   try { $hashes[$relative] = [BitConverter]::ToString($sourceSha.ComputeHash($sourceStream)).Replace('-','') } finally { $sourceStream.Dispose(); $sourceSha.Dispose() }
   [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.FullName,$relative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
 } finally { $zip.Dispose(); $stream.Dispose() }
 $check = [IO.Compression.ZipFile]::OpenRead($temporary)
 try {
  if ($check.Entries.Count -ne $files.Count) { throw 'Archive file count mismatch.' }
  foreach ($required in @('index.html','.htaccess','iv-logo.png')) { if ($required -notin @($check.Entries.FullName)) { throw "Missing deployment file: $required" } }
  foreach ($entry in $check.Entries) {
   $inputStream = $entry.Open(); $sha = [Security.Cryptography.SHA256]::Create()
   try { $actual = [BitConverter]::ToString($sha.ComputeHash($inputStream)).Replace('-','') } finally { $inputStream.Dispose(); $sha.Dispose() }
   if ($actual -ne $hashes[$entry.FullName]) { throw "Archive verification failed: $($entry.FullName)" }
  }
 } finally { $check.Dispose() }
 Move-Item -LiteralPath $temporary -Destination $destination -Force
 [PSCustomObject]@{File=$destination;Files=$files.Count;UncompressedBytes=($files | Measure-Object Length -Sum).Sum;ZipBytes=(Get-Item -LiteralPath $destination).Length;Verified=$true} | ConvertTo-Json -Compress
} finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } }
