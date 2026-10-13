[CmdletBinding()]
param(
  [Parameter(Mandatory)][int]$BrowserProcessId,
  [Parameter(Mandatory)][int]$ReaderProcessId,
  [Parameter(Mandatory)][string]$CaseId,
  [Parameter(Mandatory)][string]$OutputFile,
  [Parameter(Mandatory)][string]$FrozenCaptureScriptPath,
  [ValidateSet('CaptureOnly','Beginning','Graphic','SayLine','ElementInfo','DetailedElementInfo','Escape','SayAllChunk','Table','EnterCell','FirstCell','CellDown','CellRight')]
  [string]$NativeAction = 'CaptureOnly',
  [ValidateRange(0,12)][int]$WaitSeconds = 1,
  [switch]$AllowReaderWindow
)

# Extension only: no reader/browser start, settings change, installation or TTS
# injection. The authorised witness supplies both already-existing process IDs.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Windows required.' }
# pwsh can pass its module path to the Windows PowerShell 5.1 child. Resolve
# the installed Utility module from this process instead of inheriting it.
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop
if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'Run with powershell.exe -STA.' }
Add-Type -AssemblyName System.Windows.Forms
$parseTokens = $null
$parseErrors = $null
$frozenAst = [Management.Automation.Language.Parser]::ParseFile($FrozenCaptureScriptPath, [ref]$parseTokens, [ref]$parseErrors)
if (@($parseErrors).Count -gt 0) { throw 'Frozen native helper failed parsing.' }
$definitions = @($frozenAst.FindAll({ param($node)
  $node -is [Management.Automation.Language.StringConstantExpressionAst] -and $node.Value.Contains('public static class JawsHistoryNative')
}, $true))
if ($definitions.Count -ne 1) { throw 'Exactly one frozen native input definition is required.' }
if (-not ('JawsHistoryNative' -as [type])) { Add-Type -TypeDefinition $definitions[0].Value }
$frozenHash = (Get-FileHash -LiteralPath $FrozenCaptureScriptPath -Algorithm SHA256).Hash.ToLowerInvariant()

function Invoke-Chord([System.UInt16[]]$Modifiers, [System.UInt16]$Key, [bool]$Extended = $false) {
  try {
    foreach ($modifier in $Modifiers) { [JawsHistoryNative]::Key($modifier, $false, $modifier -eq 0x2D) }
    [JawsHistoryNative]::Key($Key, $false, $Extended)
    [JawsHistoryNative]::Key($Key, $true, $Extended)
  } finally {
    for ($index = $Modifiers.Length - 1; $index -ge 0; $index--) {
      [JawsHistoryNative]::Key($Modifiers[$index], $true, $Modifiers[$index] -eq 0x2D)
    }
  }
}
function Assert-Window {
  $foreground = [JawsHistoryNative]::ForegroundProcess()
  if ($foreground -ne $BrowserProcessId -and -not ($AllowReaderWindow -and $foreground -eq $ReaderProcessId)) {
    throw 'Expected browser or explicitly authorised reader information window is not foreground.'
  }
}
function Copy-NativeHistory {
  Assert-Window
  $window = [JawsHistoryNative]::GetForegroundWindow()
  [Windows.Forms.Clipboard]::Clear()
  $sequence = [JawsHistoryNative]::GetClipboardSequenceNumber()
  Invoke-Chord -Modifiers @(0x2D) -Key 0x20
  Start-Sleep -Milliseconds 180
  Invoke-Chord -Modifiers @(0x11) -Key 0x48
  $deadline = [DateTime]::UtcNow.AddSeconds(4)
  do { Start-Sleep -Milliseconds 80 }
  while ([JawsHistoryNative]::GetClipboardSequenceNumber() -eq $sequence -and [DateTime]::UtcNow -lt $deadline)
  Assert-Window
  if ($window -ne [JawsHistoryNative]::GetForegroundWindow()) { throw 'History copy changed foreground window.' }
  $changed = [JawsHistoryNative]::GetClipboardSequenceNumber() -ne $sequence
  $text = if ([Windows.Forms.Clipboard]::ContainsText()) { [Windows.Forms.Clipboard]::GetText() } else { '' }
  [ordered]@{
    rawSpeechHistory = $text; clipboardChanged = $changed
    foregroundPid = [JawsHistoryNative]::ForegroundProcess()
    capturedUtc = [DateTime]::UtcNow.ToString('o')
    nativeHistoryEntryCount = $null
    # Newlines are not the documented count of the 500 native history strings.
    newlineCountHeuristicOnly = @($text -split '\r?\n').Count
  }
}
function Save-Record($Record) {
  $outputPath = [IO.Path]::GetFullPath($OutputFile)
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($outputPath)) | Out-Null
  [IO.File]::AppendAllText($outputPath, ($Record | ConvertTo-Json -Depth 10 -Compress) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}

$readers = @(Get-Process -Name jfw -ErrorAction SilentlyContinue)
if ($readers.Count -ne 1 -or $readers[0].Id -ne $ReaderProcessId) { throw 'The original single JAWS instance is required.' }
if (@(Get-Process -Name nvda -ErrorAction SilentlyContinue).Count -gt 0) { throw 'Another reader is active.' }
$reader = $readers[0]
$version = $reader.MainModule.FileVersionInfo.ProductVersion
if ($version -notmatch '^2025[.]') { throw 'JAWS 2025 required.' }
if ($reader.SessionId -eq 0 -or $reader.SessionId -ne (Get-Process -Id $PID).SessionId) { throw 'An interactive shared desktop is required.' }
$age = ([DateTime]::Now - $reader.StartTime).TotalMinutes
# Reserve at least one minute for cleanup in the parent job, under its 35 min cap.
if ($age + ($WaitSeconds + 20) / 60 -ge 34) { throw 'Native content budget exhausted; preserve partial results and stop.' }
foreach ($key in @(0x10,0x11,0x12,0x5B,0x5C)) {
  if (([JawsHistoryNative]::GetAsyncKeyState($key) -band 0x8000) -ne 0) { throw 'A modifier key is already held.' }
}
Assert-Window
$previousClipboard = [Windows.Forms.Clipboard]::GetDataObject()
$record = [ordered]@{
  case = $CaseId; action = $NativeAction; startedUtc = [DateTime]::UtcNow.ToString('o')
  reader = 'JAWS'; version = $version; readerPid = $ReaderProcessId; browserPid = $BrowserProcessId
  readerAgeMinutes = [Math]::Round($age,3); frozenHelperSha256 = $frozenHash
  source = 'Native JAWS Speech History: INSERT+SPACE, CTRL+H'
  historyCapacityStrings = 500; beforeClear = $null; afterClear = $null; afterAction = $null
  status = 'partial'; rawSpeechHistory = ''; newlyCapturedNativeText = $null
  resetObserved = $false; actionHistorySeparated = $false
  audioRecording = $false; speechInjected = $false; domAsSpeech = $false; rgaaVerdict = $null
}
try {
  # Archive the current buffer before the documented history-clear command.
  $record.beforeClear = Copy-NativeHistory
  Invoke-Chord -Modifiers @(0x2D) -Key 0x20
  Start-Sleep -Milliseconds 180
  Invoke-Chord -Modifiers @(0x10) -Key 0x48
  Start-Sleep -Milliseconds 180
  $record.afterClear = Copy-NativeHistory
  $record.resetObserved = $record.afterClear.clipboardChanged -and
    ($record.afterClear.rawSpeechHistory.Length -lt $record.beforeClear.rawSpeechHistory.Length -or
     [string]::IsNullOrWhiteSpace($record.afterClear.rawSpeechHistory))
  switch ($NativeAction) {
    'Beginning' { Invoke-Chord -Modifiers @(0x11) -Key 0x24 -Extended $true }
    'Graphic' { Invoke-Chord -Modifiers @() -Key 0x47 }
    'SayLine' { Invoke-Chord -Modifiers @(0x2D) -Key 0x26 -Extended $true }
    'ElementInfo' { Invoke-Chord -Modifiers @(0x10,0x2D) -Key 0x70 }
    'DetailedElementInfo' { Invoke-Chord -Modifiers @(0x11,0x10,0x2D) -Key 0x70 }
    'Escape' { Invoke-Chord -Modifiers @() -Key 0x1B }
    'SayAllChunk' { Invoke-Chord -Modifiers @(0x2D) -Key 0x28 -Extended $true }
    'Table' { Invoke-Chord -Modifiers @() -Key 0x54 }
    'EnterCell' { Invoke-Chord -Modifiers @() -Key 0x28 -Extended $true }
    'FirstCell' {
      # Official table layer; CTRL+HOME means first cell only inside that layer.
      Invoke-Chord -Modifiers @(0x2D) -Key 0x20
      Start-Sleep -Milliseconds 180
      Invoke-Chord -Modifiers @() -Key 0x54
      Start-Sleep -Milliseconds 180
      Invoke-Chord -Modifiers @(0x11) -Key 0x24 -Extended $true
      Start-Sleep -Milliseconds 180
      Invoke-Chord -Modifiers @() -Key 0x1B
    }
    'CellDown' { Invoke-Chord -Modifiers @(0x11,0x12) -Key 0x28 -Extended $true }
    'CellRight' { Invoke-Chord -Modifiers @(0x11,0x12) -Key 0x27 -Extended $true }
  }
  Start-Sleep -Seconds $WaitSeconds
  $record.afterAction = Copy-NativeHistory
  $record.rawSpeechHistory = $record.afterAction.rawSpeechHistory
  $baseline = $record.afterClear.rawSpeechHistory.Replace("`r`n","`n")
  $current = $record.rawSpeechHistory.Replace("`r`n","`n")
  if ($record.afterAction.clipboardChanged -and $current.StartsWith($baseline,[StringComparison]::Ordinal)) {
    $record.newlyCapturedNativeText = $current.Substring($baseline.Length)
    $record.actionHistorySeparated = $true
    $record.status = 'native-history-captured-pending-review'
  }
  $record.capacityObservation = 'Buffer archived and cleared before short action; 500-string count is not exposed by this API. Do not infer entry count from newlines.'
} catch {
  $record.error = $_.Exception.Message
  throw
} finally {
  $record.finishedUtc = [DateTime]::UtcNow.ToString('o')
  Save-Record $record
  if ($null -eq $previousClipboard) { [Windows.Forms.Clipboard]::Clear() }
  else { [Windows.Forms.Clipboard]::SetDataObject($previousClipboard,$true) }
}
