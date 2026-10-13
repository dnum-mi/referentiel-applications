[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$InstallerPath,
  [Parameter(Mandatory)][string]$OutputDirectory,
  [switch]$ApprovedJawsTerms
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $ApprovedJawsTerms) { throw 'Explicit approval of JAWS terms is missing.' }
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Windows inspection only.' }
$expectedHash = '8597f6bca6f68f4631e855338c8ca7a6b12d6d8c3fc4617fb335d03c69bfccd9'
if ((Get-FileHash -LiteralPath $InstallerPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
  throw 'Installer hash mismatch before settings inspection.'
}
$signature = Get-AuthenticodeSignature -LiteralPath $InstallerPath
if ($signature.Status -ne 'Valid') { throw 'Authenticode trust must be Valid before inspection.' }
[IO.Directory]::CreateDirectory([IO.Path]::GetFullPath($OutputDirectory)) | Out-Null
$settingsPath = Join-Path ([IO.Path]::GetFullPath($OutputDirectory)) 'official-installer-settings.ini'
if (Test-Path -LiteralPath $settingsPath) { throw 'Existing settings evidence must not be overwritten.' }
$licenseUrl = 'https://vispero.com/jaws-end-user-license-agreement/'
$licenseResponse = Invoke-WebRequest -UseBasicParsing -Uri $licenseUrl -TimeoutSec 30
$licenseContent = $licenseResponse.Content
$licenseHtml = if ($licenseContent -is [byte[]]) { [Text.Encoding]::UTF8.GetString($licenseContent) } else { [string]$licenseContent }
$licenseText = [Net.WebUtility]::HtmlDecode([regex]::Replace($licenseHtml, '<[^>]+>', ' '))
$licenseText = [regex]::Replace($licenseText, '\s+', ' ')
if ($licenseText -notmatch 'Last Updated:\s*July 27, 2026') {
  throw 'Published JAWS terms changed or cannot be verified. Stop for review; do not accept unknown terms.'
}
$process = Start-Process -FilePath $InstallerPath -ArgumentList @('/ExtractSettings', ('"{0}"' -f $settingsPath)) -PassThru
if (-not $process.WaitForExit(50000)) {
  $process.Kill()
  throw 'Official settings extraction timed out; no installation attempted.'
}
if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $settingsPath)) {
  throw "Settings extraction failed, exit code $($process.ExitCode)."
}
$settings = [IO.File]::ReadAllText($settingsPath)
$termLines = @($settings -split '\r?\n' | Where-Object { $_ -match '(?i)eula|licen[cs]e' })
$termUrls = @($termLines | ForEach-Object {
  foreach ($match in [regex]::Matches($_, 'https?://[^\s"<>]+')) { $match.Value.TrimEnd(')', ';') }
})
$unknownUrls = @($termUrls | Where-Object {
  $uri = [uri]$_
  $uri.Host -notmatch '(^|\.)(freedomscientific\.com|vispero\.com)$'
})
$report = [ordered]@{
  checkedUtc = [DateTime]::UtcNow.ToString('o'); operation = 'official ExtractSettings; no installation'
  installerInvoked = $true; installerInstalled = $false; exitCode = $process.ExitCode
  installerSha256 = $expectedHash; settingsSha256 = (Get-FileHash -LiteralPath $settingsPath -Algorithm SHA256).Hash.ToLowerInvariant()
  settingsSize = (Get-Item -LiteralPath $settingsPath).Length
  publishedEulaUrl = $licenseUrl; approvedPublishedEulaDate = '2026-07-27'; publishedDateVerified = $true
  packageSpecificTermsEquatedToPublishedTerms = $false
  extractedTermReferences = $termLines; extractedTermUrls = $termUrls
  unexpectedTermUrls = $unknownUrls; noUndocumentedRestartOptionSelected = $true
}
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'official-settings-inspection.json') -Encoding UTF8
if ($unknownUrls.Count -gt 0) { throw 'Unexpected package licensing reference; stop before installation for review.' }
