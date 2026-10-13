[CmdletBinding()]
param(
  [Parameter(Mandatory)][int]$BrowserProcessId,
  [Parameter(Mandatory)][string]$CaseId,
  [Parameter(Mandatory)][string]$OutputFile,
  [ValidateSet('CaptureOnly', 'NextLine', 'NextGraphic', 'NextTable', 'NextControl', 'CurrentControl', 'Activate', 'SayAll', 'Beginning')]
  [string]$NativeAction = 'CaptureOnly',
  [ValidateRange(0, 50)][int]$WaitSeconds = 2,
  [string[]]$RequiredNativeText = @()
)

# Prepared only. Run in an isolated interactive Windows desktop with an already
# authorised JAWS 2025 instance. This script neither installs nor launches JAWS.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  throw 'Windows requis ; aucun résultat AT produit.'
}
if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') {
  throw 'Lancer avec powershell.exe -STA ; aucun résultat AT produit.'
}
Add-Type -AssemblyName System.Windows.Forms
if (-not ('JawsHistoryNative' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class JawsHistoryNative {
  [StructLayout(LayoutKind.Sequential)] public struct MouseInput {
    public int dx, dy;
    public uint mouseData, flags, time;
    public UIntPtr extraInfo;
  }
  [StructLayout(LayoutKind.Sequential)] public struct KeyboardInput {
    public ushort key, scan;
    public uint flags, time;
    public UIntPtr extraInfo;
  }
  [StructLayout(LayoutKind.Explicit)] public struct InputUnion {
    [FieldOffset(0)] public MouseInput mouse;
    [FieldOffset(0)] public KeyboardInput keyboard;
  }
  [StructLayout(LayoutKind.Sequential)] public struct Input {
    public uint type;
    public InputUnion data;
  }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
  [DllImport("user32.dll")] public static extern uint GetClipboardSequenceNumber();
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll", SetLastError=true)] private static extern uint SendInput(uint count, Input[] inputs, int size);
  public static uint ForegroundProcess() {
    uint process;
    GetWindowThreadProcessId(GetForegroundWindow(), out process);
    return process;
  }
  public static void Key(ushort key, bool up, bool extended) {
    Input input = new Input();
    input.type = 1;
    input.data.keyboard.key = key;
    input.data.keyboard.flags = (up ? 2u : 0u) | (extended ? 1u : 0u);
    if (SendInput(1, new Input[] { input }, Marshal.SizeOf(typeof(Input))) != 1) {
      throw new Win32Exception(Marshal.GetLastWin32Error(), "SendInput non exécuté");
    }
  }
}
'@
}

function Invoke-NativeChord([System.UInt16[]]$Modifiers, [System.UInt16]$Key, [bool]$Extended = $false) {
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
function Assert-TargetWindow {
  if ([JawsHistoryNative]::ForegroundProcess() -ne $BrowserProcessId) {
    throw 'La fenêtre navigateur attendue nest pas au premier plan ; capture non qualifiée.'
  }
}

$reader = @(Get-Process -Name jfw -ErrorAction SilentlyContinue)
if ($reader.Count -ne 1) { throw 'Une seule instance JAWS réelle est requise.' }
if (@(Get-Process -Name nvda -ErrorAction SilentlyContinue).Count -ne 0) {
  throw 'NVDA est actif ; la provenance des annonces ne peut pas être attribuée à JAWS seul.'
}
$version = $reader[0].MainModule.FileVersionInfo.ProductVersion
if ($version -notmatch '^2025[.]') { throw "JAWS 2025 requis ; version observée : $version" }
if ($reader[0].SessionId -eq 0 -or $reader[0].SessionId -ne (Get-Process -Id $PID).SessionId) {
  throw 'JAWS et le pilote doivent partager un bureau interactif, hors session de service.'
}
$ageMinutes = ([DateTime]::Now - $reader[0].StartTime).TotalMinutes
if ($ageMinutes -ge 35 -or $ageMinutes + $WaitSeconds / 60 -ge 35) {
  throw 'Budget de cet essai limité à 35 minutes ; ne pas relancer ou réinitialiser la démonstration.'
}
foreach ($key in @(0x10, 0x11, 0x12, 0x5B, 0x5C)) {
  if (([JawsHistoryNative]::GetAsyncKeyState($key) -band 0x8000) -ne 0) {
    throw 'Une touche modificatrice est déjà maintenue ; essai interrompu.'
  }
}
Assert-TargetWindow
$actionStarted = [DateTime]::UtcNow.ToString('o')
switch ($NativeAction) {
  'NextLine' { Invoke-NativeChord -Modifiers @() -Key 0x28 -Extended $true }
  'NextGraphic' { Invoke-NativeChord -Modifiers @() -Key 0x47 }
  'NextTable' { Invoke-NativeChord -Modifiers @() -Key 0x54 }
  'NextControl' { Invoke-NativeChord -Modifiers @() -Key 0x09 }
  'CurrentControl' { Invoke-NativeChord -Modifiers @(0x2D) -Key 0x09 }
  'Activate' { Invoke-NativeChord -Modifiers @() -Key 0x0D }
  'SayAll' { Invoke-NativeChord -Modifiers @(0x2D) -Key 0x28 -Extended $true }
  'Beginning' { Invoke-NativeChord -Modifiers @(0x11) -Key 0x24 -Extended $true }
}
Start-Sleep -Seconds $WaitSeconds
Assert-TargetWindow
$windowBeforeCapture = [JawsHistoryNative]::GetForegroundWindow()
$previousClipboard = [Windows.Forms.Clipboard]::GetDataObject()
try {
  [Windows.Forms.Clipboard]::Clear()
  $sequenceBefore = [JawsHistoryNative]::GetClipboardSequenceNumber()
  # Official native command: INSERT+SPACE, then CTRL+H. No DOM, TTS injection,
  # OCR or artificial reader API contributes to the captured text.
  Invoke-NativeChord -Modifiers @(0x2D) -Key 0x20
  Start-Sleep -Milliseconds 180
  Invoke-NativeChord -Modifiers @(0x11) -Key 0x48
  $deadline = [DateTime]::UtcNow.AddSeconds(5)
  do {
    Start-Sleep -Milliseconds 100
    $sequenceAfter = [JawsHistoryNative]::GetClipboardSequenceNumber()
  } while ($sequenceAfter -eq $sequenceBefore -and [DateTime]::UtcNow -lt $deadline)
  Assert-TargetWindow
  if ($windowBeforeCapture -ne [JawsHistoryNative]::GetForegroundWindow()) {
    throw 'La copie a changé de fenêtre ; sa provenance nest pas qualifiée.'
  }
  if ($sequenceAfter -eq $sequenceBefore -or -not [Windows.Forms.Clipboard]::ContainsText()) {
    throw 'Lhistorique natif na pas été copié ; ne pas substituer un texte DOM.'
  }
  $history = [Windows.Forms.Clipboard]::GetText()
  if ([string]::IsNullOrWhiteSpace($history)) { throw 'Historique vocal vide.' }
  $normalisedHistory = [regex]::Replace($history, '\s+', ' ')
  $witnesses = @($RequiredNativeText | ForEach-Object {
    $needle = [regex]::Replace($_, '\s+', ' ')
    [ordered]@{ expectedFromControlledFixture = $_; present = $normalisedHistory.IndexOf($needle, [StringComparison]::OrdinalIgnoreCase) -ge 0 }
  })
  $hash = [Security.Cryptography.SHA256]::Create()
  try { $historyHash = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($history))).Replace('-', '').ToLowerInvariant() }
  finally { $hash.Dispose() }
  $record = [ordered]@{
    case = $CaseId; action = $NativeAction; actionStartedUtc = $actionStarted
    capturedUtc = [DateTime]::UtcNow.ToString('o'); status = 'native-history-captured-pending-review'
    reader = 'JAWS'; version = $version; readerPid = $reader[0].Id; browserPid = $BrowserProcessId
    readerAgeMinutes = [Math]::Round($ageMinutes, 3); clipboardChanged = $true; windowPreservedByCopy = $true
    source = 'JAWS native Speech History copied by INSERT+SPACE, CTRL+H'
    rawSpeechHistory = $history; rawSpeechHistorySha256 = $historyHash; witnesses = $witnesses
    audioRecording = $false; localeNotInferredFromExecutable = $true; rgaaVerdict = $null
  }
  $outputPath = [IO.Path]::GetFullPath($OutputFile)
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($outputPath)) | Out-Null
  [IO.File]::AppendAllText($outputPath, ($record | ConvertTo-Json -Depth 6 -Compress) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
  if (@($witnesses | Where-Object { -not $_.present }).Count -gt 0) {
    throw 'Témoin attendu absent ; la capture brute est conservée, aucune qualification C/NC nest produite.'
  }
} finally {
  if ($null -eq $previousClipboard) { [Windows.Forms.Clipboard]::Clear() }
  else { [Windows.Forms.Clipboard]::SetDataObject($previousClipboard, $true) }
}
