[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$InstallerPath,
  [Parameter(Mandatory)][string]$OutputDirectory,
  [switch]$ApprovedJawsInstallAndUse
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $ApprovedJawsInstallAndUse -or $env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows') {
  throw 'Installation/use is restricted to the explicitly approved disposable GitHub Windows runner.'
}
if (@(Get-Process -Name jfw,nvda -ErrorAction SilentlyContinue).Count -ne 0) { throw 'An existing reader is active.' }
$expectedHash = '8597f6bca6f68f4631e855338c8ca7a6b12d6d8c3fc4617fb335d03c69bfccd9'
if ((Get-FileHash -LiteralPath $InstallerPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'Installer hash mismatch.' }
if ((Get-AuthenticodeSignature -LiteralPath $InstallerPath).Status -ne 'Valid') { throw 'Installer signature must be Valid.' }
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($outputPath) | Out-Null
$inspectionPath = Join-Path $outputPath 'official-settings-inspection.json'
$inspection = Get-Content -LiteralPath $inspectionPath -Raw | ConvertFrom-Json
if ($inspection.installerSha256 -ne $expectedHash -or -not $inspection.publishedDateVerified -or $inspection.unexpectedTermUrls.Count -gt 0) {
  throw 'Licensing/settings inspection is not qualified for this exact package.'
}
$logPath = Join-Path $outputPath 'official-silent-setup.log'
$arguments = @('/Type', 'Silent', '/Language', 'fra', '/InstallerUILanguage', 'fra', '/DisableExternalServices', '/Log', ('"{0}"' -f $logPath))
$record = [ordered]@{
  startedUtc = [DateTime]::UtcNow.ToString('o'); operation = 'approved official Silent French installation on disposable runner'
  approvedTerms = 'https://vispero.com/jaws-end-user-license-agreement/'; approvedTermsDate = '2026-07-27'
  approvalConfirmed = $true; installerSha256 = $expectedHash; arguments = $arguments
  status = 'installation-about-to-start'; installerInvoked = $false; exitCode = $null
  noUndocumentedRestartSwitch = $true; rebootMayLimitJob = $true
  readerStarted = $false; readerPid = $null; rgaaVerdict = $null
}
$recordPath = Join-Path $outputPath 'approved-installation.json'
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding UTF8
$ownedReaders = @()
try {
  $process = Start-Process -FilePath $InstallerPath -ArgumentList $arguments -PassThru
  $record.installerInvoked = $true
  $record.status = 'installer-running'
  $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding UTF8
  $deadline = [DateTime]::UtcNow.AddMinutes(10)
  while (-not $process.WaitForExit(1000)) {
    if ([DateTime]::UtcNow -ge $deadline) { $process.Kill(); throw 'Installer timed out; no reader qualification.' }
  }
  $record.exitCode = $process.ExitCode
  if ($process.ExitCode -in @(3010,1641)) { throw 'Setup reports a restart requirement/initiation; do not claim an operational reader.' }
  if ($process.ExitCode -ne 0) { throw "Setup exit code $($process.ExitCode); no reader qualification." }
  $readerPath = Join-Path ${env:ProgramFiles} 'Freedom Scientific\JAWS\2025\jfw.exe'
  if (-not (Test-Path -LiteralPath $readerPath)) { throw 'Expected JAWS executable not found after setup.' }
  $readerVersion = [Diagnostics.FileVersionInfo]::GetVersionInfo($readerPath).ProductVersion
  if ($readerVersion -notmatch '^2025[.]2508[.]120([.]|$)') { throw "Unexpected installed reader version: $readerVersion" }
  if (-not [Environment]::UserInteractive -or (Get-Process -Id $PID).SessionId -eq 0) { throw 'Interactive runner desktop required.' }
  $readersAfterSetup = @(Get-Process -Name jfw -ErrorAction SilentlyContinue)
  if ($readersAfterSetup.Count -eq 0) {
    $launch = Start-Process -FilePath $readerPath -PassThru
    $ownedReaders = @($launch)
    Start-Sleep -Seconds 5
  }
  $actualReaders = @(Get-Process -Name jfw -ErrorAction SilentlyContinue)
  $ownedReaders = $actualReaders
  if ($actualReaders.Count -ne 1) { throw 'A single real JAWS process is required; no second launch or demo reset.' }
  $record.readerStarted = $true
  $record.readerPid = $actualReaders[0].Id
  $record.readerVersion = $readerVersion
  $record.status = 'reader-started-smoke-required'
  $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding UTF8
  $env:JAWS_ALLOW_APPROVED_USE = '1'
  $env:JAWS_EVIDENCE_DIR = $outputPath
  & node (Join-Path $PSScriptRoot 'jaws-smoke.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Native French witness or content capture incomplete; evidence retained, no global RGAA conformity verdict.' }
  $record.status = 'native-french-witness-and-content-capture-completed-review-required'
} catch {
  $record.status = 'limited-or-failed-no-reader-qualification'
  $record.error = $_.Exception.Message
  throw
} finally {
  foreach ($ownedReader in $ownedReaders) {
    if (-not $ownedReader.HasExited) {
      $ownedReader.CloseMainWindow() | Out-Null
      if (-not $ownedReader.WaitForExit(5000)) { $ownedReader.Kill() }
    }
  }
  $record.completedUtc = [DateTime]::UtcNow.ToString('o')
  $record.remainingReaders = @(Get-Process -Name jfw -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,SessionId)
  $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding UTF8
}
