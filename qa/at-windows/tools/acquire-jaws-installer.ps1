[CmdletBinding()]
param(
  [string]$OutputDirectory = './evidence/jaws-acquisition',
  [string]$BinaryDirectory = ''
)

# Static acquisition only: no installer invocation, registration, installation,
# activation, JAWS launch, EULA interaction or restart. No dependencies to install.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or -not [Environment]::Is64BitOperatingSystem) {
  throw 'Windows x64 requis pour la vérification Authenticode native.'
}
$sourceApi = 'https://support.freedomscientific.com/Downloads/Jaws/GetReleasesByMajorVersion?majorVersion=26&lang=enu&productId=0'
$downloadUrl = 'https://software.vfo.digital/JAWS/2025/2025.2508.120.400/56B705E6-BE2D-4DB8-A7A3-B9B7A42B9361/J2025.2508.120.400-any.exe'
$expectedSha256 = '8597f6bca6f68f4631e855338c8ca7a6b12d6d8c3fc4617fb335d03c69bfccd9'
$expectedVersion = '2025.2508.120.400'
$expectedSignerName = 'Freedom Scientific Inc.'
$expectedBytes = 15204576
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($outputPath) | Out-Null
if ([string]::IsNullOrWhiteSpace($BinaryDirectory)) {
  $binaryRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [IO.Path]::GetTempPath() }
  $BinaryDirectory = Join-Path $binaryRoot ('jaws-static-' + [Guid]::NewGuid().ToString('N'))
}
[IO.Directory]::CreateDirectory($BinaryDirectory) | Out-Null
$installerPath = Join-Path $BinaryDirectory 'J2025.2508.120.400-any.exe'
if (Test-Path -LiteralPath $installerPath) { throw 'Ne pas écraser une acquisition existante.' }

$report = [ordered]@{
  checkedUtc = [DateTime]::UtcNow.ToString('o')
  driverHead = $env:GITHUB_SHA; target = 'Windows Server 2022 x64'
  os = [ordered]@{ version = [Environment]::OSVersion.Version.ToString(); process64Bit = [Environment]::Is64BitProcess }
  status = 'acquisition-started'; installerInvoked = $false; installed = $false
  readerStarted = $false; eulaAccepted = $false; rebootRequested = $false; rgaaVerdict = $null
  officialSourceApi = $sourceApi; downloadUrl = $downloadUrl
  expectedSha256 = $expectedSha256; expectedBytes = $expectedBytes
  expectedVersion = $expectedVersion; expectedSignerName = $expectedSignerName
  selectedPackageLanguage = 'Multilingual'; futureRequestedLanguage = 'fra'; frenchReaderObserved = $false
  noRebootGuarantee = 'not-established'; checks = @()
}
try {
  # This is the actual endpoint and parameter mapping used by the official site.
  # Version selector value 26 denotes JAWS 2025; enu denotes its multilingual setup.
  $apiResponse = Invoke-WebRequest -Uri $sourceApi -UserAgent 'RefApp-accessibility-source-review' -TimeoutSec 30
  # The actual endpoint uses Content-Type "PreviousVersions; charset=utf-8".
  # PowerShell can consequently expose Content as byte[]. A pipeline would
  # enumerate those bytes and parse individual numbers instead of the JSON body.
  $apiContent = $apiResponse.Content
  if ($apiContent -is [byte[]]) {
    $apiText = [Text.Encoding]::UTF8.GetString($apiContent)
  } elseif ($apiContent -is [string]) {
    $apiText = $apiContent
  } else {
    throw 'Le corps API doit etre du texte ou un tableau d octets UTF-8.'
  }
  $apiText = $apiText.TrimStart([char]0xFEFF)
  $report.apiResponse = [ordered]@{
    contentType = $apiResponse.Headers['Content-Type']; contentRuntimeType = $apiContent.GetType().FullName
    decodedTextLength = $apiText.Length
  }
  $releaseData = ConvertFrom-Json -InputObject $apiText
  if ($releaseData -is [string]) { $releaseData = ConvertFrom-Json -InputObject $releaseData }
  $report.apiResponse.decodedEntryCount = @($releaseData).Count
  $report.apiResponse.entryRuntimeTypes = @($releaseData | ForEach-Object {
    if ($null -eq $_) { 'null' } else { $_.GetType().FullName }
  })
  $selected = @($releaseData | Where-Object {
    if ($null -eq $_) { return $false }
    $properties = $_.PSObject.Properties
    $urlProperty = $properties['InstallerLocationHTTP']
    $majorProperty = $properties['ProductMajor']
    $typeProperty = $properties['ReleaseType']
    $null -ne $urlProperty -and $null -ne $majorProperty -and $null -ne $typeProperty -and
      $urlProperty.Value -eq $downloadUrl -and $majorProperty.Value -eq 2025 -and $typeProperty.Value -eq 1
  })
  $officialMatch = $selected.Count -eq 1
  $report.checks += [ordered]@{ name = 'exact package linked by official JAWS 2025 release API'; passed = $officialMatch }
  if (-not $officialMatch) { throw 'Le paquet fixé ne figure plus dans la source officielle ; réviser la provenance avant acquisition.' }
  $report.selectedOfficialRelease = [ordered]@{
    fileName = $selected[0].FileName; language = $selected[0].Language; releaseDate = $selected[0].ReleaseDate
    productMajor = $selected[0].ProductMajor; releaseType = $selected[0].ReleaseType
  }

  Invoke-WebRequest -Uri $downloadUrl -UserAgent 'RefApp-accessibility-source-review' -OutFile $installerPath -TimeoutSec 120
  $file = Get-Item -LiteralPath $installerPath
  $sha256 = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $version = [Diagnostics.FileVersionInfo]::GetVersionInfo($installerPath)
  $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
  $signerName = if ($null -ne $signature.SignerCertificate) {
    $signature.SignerCertificate.GetNameInfo([Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false)
  } else { '' }
  $report.actual = [ordered]@{
    bytes = $file.Length; sha256 = $sha256
    productName = $version.ProductName; productVersion = $version.ProductVersion
    fileVersion = $version.FileVersion; companyName = $version.CompanyName
    signatureStatus = [string]$signature.Status; signatureStatusMessage = $signature.StatusMessage
    signerName = $signerName
    signerSubject = if ($null -ne $signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
    signerThumbprint = if ($null -ne $signature.SignerCertificate) { $signature.SignerCertificate.Thumbprint } else { $null }
    signerNotBefore = if ($null -ne $signature.SignerCertificate) { $signature.SignerCertificate.NotBefore.ToUniversalTime().ToString('o') } else { $null }
    signerNotAfter = if ($null -ne $signature.SignerCertificate) { $signature.SignerCertificate.NotAfter.ToUniversalTime().ToString('o') } else { $null }
    timestampSignerSubject = if ($null -ne $signature.TimeStamperCertificate) { $signature.TimeStamperCertificate.Subject } else { $null }
  }
  $report.checks += @(
    [ordered]@{ name = 'download size matches independent acquisition'; passed = $file.Length -eq $expectedBytes },
    [ordered]@{ name = 'SHA256 matches independent acquisition'; passed = $sha256 -eq $expectedSha256 },
    [ordered]@{ name = 'product version is exactly pinned'; passed = $version.ProductVersion -eq $expectedVersion },
    [ordered]@{ name = 'file version is exactly pinned'; passed = $version.FileVersion -eq $expectedVersion },
    [ordered]@{ name = 'product identifies real JAWS 2025'; passed = $version.ProductName -eq 'Freedom Scientific JAWS 2025' },
    [ordered]@{ name = 'Windows Authenticode trust status Valid'; passed = $signature.Status -eq 'Valid' },
    [ordered]@{ name = 'signer is pinned Freedom Scientific publisher'; passed = $signerName -eq $expectedSignerName }
  )
  $failed = @($report.checks | Where-Object { -not $_.passed })
  if ($failed.Count -gt 0) { throw ('Vérifications statiques échouées : ' + (($failed | ForEach-Object { $_.name }) -join '; ')) }
  $report.status = 'official-installer-acquired-and-statically-verified'
} catch {
  $report.status = 'static-acquisition-or-verification-failed'
  $report.error = $_.Exception.Message
  throw
} finally {
  # The executable remains in runner temp only. Publish metadata, never the binary.
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $outputPath 'installer-static-verification.json') -Encoding UTF8
}
