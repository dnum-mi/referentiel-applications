[CmdletBinding()]
param(
  [int]$ReaderProcessId = 0,
  [ValidateRange(1, 30)][int]$WaitForPromptSeconds = 12,
  [switch]$ContinueDemo,
  [switch]$AllowDeferInitialRestart
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $env:GITHUB_ACTIONS -ne 'true' -or $env:JAWS_ALLOW_APPROVED_USE -ne '1') { throw 'Approved disposable Windows runner required.' }
if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'Run with powershell.exe -STA.' }
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$evidenceDirectory = $env:JAWS_EVIDENCE_DIR
if ([string]::IsNullOrWhiteSpace($evidenceDirectory)) { throw 'JAWS_EVIDENCE_DIR is required.' }
$DiagnosticFile = Join-Path $evidenceDirectory 'jaws-demo-preparation.jsonl'
$BrowserProcessId = 0
$ExpectedTitle = ''
$browserIdentity = $null
$actions = [Collections.Generic.List[object]]::new()
$tokens = $null
$parseErrors = $null
$focusFile = Join-Path $PSScriptRoot 'focus-browser-window.ps1'
$ast = [Management.Automation.Language.Parser]::ParseFile($focusFile, [ref]$tokens, [ref]$parseErrors)
if (@($parseErrors).Count -gt 0) { throw 'The frozen focus helper cannot be parsed.' }
$definition = @($ast.FindAll({ param($node)
  $node -is [Management.Automation.Language.StringConstantExpressionAst] -and $node.Value.Contains('public static class JawsBrowserFocus')
}, $true))
if ($definition.Count -ne 1) { throw 'Exactly one native Win32 input definition required.' }
if (-not ('JawsBrowserFocus' -as [type])) { Add-Type -TypeDefinition $definition[0].Value }
$helpers = @($ast.FindAll({ param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in @('Append-Diagnostic', 'Read-UiaWindow', 'Write-Diagnostic')
}, $true))
if ($helpers.Count -ne 3) { throw 'Exactly three frozen diagnostic helpers required.' }
foreach ($helper in $helpers) { . ([ScriptBlock]::Create($helper.Extent.Text)) }
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class JawsDemoNative {
  [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] private struct GuiThreadInfo {
    public uint Size, Flags; public IntPtr Active, Focus, Capture, MenuOwner, MoveSize, Caret; public Rect CaretRect;
  }
  public sealed class ControlInfo { public long Handle; public int Id; public string Caption; public string ClassName; public bool Visible, Enabled; }
  private delegate bool EnumProc(IntPtr window, IntPtr parameter);
  [DllImport("user32.dll")] private static extern bool EnumChildWindows(IntPtr parent, EnumProc callback, IntPtr parameter);
  [DllImport("user32.dll")] private static extern int GetDlgCtrlID(IntPtr window);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetClassName(IntPtr window, StringBuilder text, int count);
  [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] private static extern bool IsWindowEnabled(IntPtr window);
  [DllImport("user32.dll", SetLastError=true)] private static extern bool GetGUIThreadInfo(uint thread, ref GuiThreadInfo info);
  public static ControlInfo[] Controls(IntPtr parent) {
    List<ControlInfo> controls = new List<ControlInfo>();
    EnumChildWindows(parent, delegate(IntPtr window, IntPtr parameter) {
      StringBuilder text = new StringBuilder(2048), className = new StringBuilder(256);
      GetWindowText(window, text, text.Capacity); GetClassName(window, className, className.Capacity);
      controls.Add(new ControlInfo { Handle = window.ToInt64(), Id = GetDlgCtrlID(window), Caption = text.ToString(),
        ClassName = className.ToString(), Visible = IsWindowVisible(window), Enabled = IsWindowEnabled(window) });
      return true;
    }, IntPtr.Zero);
    return controls.ToArray();
  }
  public static long FocusedControl() {
    GuiThreadInfo info = new GuiThreadInfo(); info.Size = (uint)Marshal.SizeOf(typeof(GuiThreadInfo));
    if (!GetGUIThreadInfo(0, ref info)) { throw new Win32Exception(Marshal.GetLastWin32Error(), "GUI focus not observable"); }
    return info.Focus.ToInt64();
  }
}
'@

function Assert-SameReader {
  $current = @(Get-Process -Name jfw -ErrorAction SilentlyContinue)
  if ($current.Count -ne 1 -or $current[0].Id -ne $reader.Id -or $current[0].StartTime -ne $readerStarted) { throw 'The original JAWS instance changed.' }
  if (([DateTime]::Now - $readerStarted).TotalMinutes + $WaitForPromptSeconds / 60 -ge 34) { throw 'Conservative native reader budget reached.' }
}
function Read-ReaderDialogs {
  $dialogs = @([JawsBrowserFocus]::Windows() | Where-Object { $_.ProcessId -eq $reader.Id -and $_.Visible -and $_.ClassName -eq '#32770' })
  return @($dialogs | ForEach-Object {
    $handle = [IntPtr]::new($_.Handle)
    $nodes = @()
    $uiaError = $null
    try { $nodes = @(Read-UiaWindow $handle) } catch { $uiaError = $_.Exception.Message }
    [pscustomobject]@{ window = $_; nativeControls = @([JawsDemoNative]::Controls($handle)); uia = $nodes; uiaError = $uiaError }
  })
}
function Press-NativeKey([System.UInt16]$Key) {
  try { [JawsBrowserFocus]::Key($Key, $false) } finally { [JawsBrowserFocus]::Key($Key, $true) }
}
function Get-InitialQuitCancelCommand([object]$Dialog) {
  if ($Dialog.window.ProcessId -ne $reader.Id -or $Dialog.window.Title -cne 'Quit JAWS' -or
      $Dialog.window.ClassName -cne '#32770' -or -not $Dialog.window.Visible -or -not $Dialog.window.Enabled) {
    throw 'The initial quit confirmation is not the exact owned JAWS dialog.'
  }
  $message = @($Dialog.nativeControls | Where-Object {
    $_.Id -eq 65535 -and $_.ClassName -ceq 'Static' -and $_.Visible -and $_.Enabled -and
    $_.Caption -ceq "Are you sure you want to quit JAWS?  Press Enter to quit now, or Escape to cancel.`n"
  })
  $cancel = @($Dialog.nativeControls | Where-Object {
    $_.Id -eq 2 -and $_.ClassName -ceq 'Button' -and $_.Visible -and $_.Enabled -and $_.Caption -ceq 'Cancel'
  })
  if ($message.Count -ne 1 -or $cancel.Count -ne 1) { throw 'The observed quit message and explicit Cancel command are not unique.' }
  return $cancel[0]
}
function Invoke-ExactDialogCommand([object]$Dialog, [object]$Control) {
  Assert-SameReader
  $handle = [IntPtr]::new($Dialog.window.Handle)
  [JawsBrowserFocus]::SetForegroundWindow($handle) | Out-Null
  Start-Sleep -Milliseconds 150
  for ($attempt = 0; $attempt -lt 8 -and [JawsBrowserFocus]::GetForegroundWindow() -ne $handle; $attempt++) {
    try { [JawsBrowserFocus]::Key(0x12, $false); Press-NativeKey 0x1B }
    finally { [JawsBrowserFocus]::Key(0x12, $true) }
    Start-Sleep -Milliseconds 150
  }
  if ([JawsBrowserFocus]::GetForegroundWindow() -ne $handle -or [JawsBrowserFocus]::ForegroundProcess() -ne $reader.Id) { throw 'Exact owned JAWS dialog not foreground.' }
  for ($attempt = 0; $attempt -lt 10 -and [JawsDemoNative]::FocusedControl() -ne $Control.Handle; $attempt++) {
    Press-NativeKey 0x09
    Start-Sleep -Milliseconds 120
    if ([JawsBrowserFocus]::GetForegroundWindow() -ne $handle) { throw 'Native Tab left the owned JAWS dialog.' }
  }
  if ([JawsDemoNative]::FocusedControl() -ne $Control.Handle) { throw 'Exact allowed JAWS command not reached by native Tab.' }
  $stillPresent = @([JawsDemoNative]::Controls($handle) | Where-Object {
    $_.Handle -eq $Control.Handle -and $_.Id -eq $Control.Id -and $_.Caption -eq $Control.Caption -and $_.Enabled -and $_.Visible
  })
  if ($stillPresent.Count -ne 1) { throw 'The verified native dialog command changed before Enter.' }
  if ([JawsBrowserFocus]::GetForegroundWindow() -ne $handle -or [JawsBrowserFocus]::ForegroundProcess() -ne $reader.Id -or [JawsDemoNative]::FocusedControl() -ne $Control.Handle) { throw 'The exact allowed JAWS command lost native focus before Enter.' }
  $actions.Add(@{ action = 'native Tab then Enter on exact owned dialog command'; dialog = $Dialog.window.Title; hwnd = $Dialog.window.Handle; control = $Control })
  Append-Diagnostic ([ordered]@{ at = [DateTime]::UtcNow.ToString('o'); phase = 'before-explicit-native-dialog-command'; readerPid = $reader.Id; actions = $actions.ToArray(); isNativeSpeech = $false })
  Press-NativeKey 0x0D
  Start-Sleep -Milliseconds 250
  Assert-SameReader
}
$reader = $null
$readerStarted = $null
try {
  $readers = @(Get-Process -Name jfw -ErrorAction SilentlyContinue)
  if ($readers.Count -ne 1 -or ($ReaderProcessId -ne 0 -and $readers[0].Id -ne $ReaderProcessId)) { throw 'Exactly one original JAWS process required.' }
  if (@(Get-Process -Name nvda -ErrorAction SilentlyContinue).Count -gt 0) { throw 'Another reader is active.' }
  $reader = $readers[0]
  $readerStarted = $reader.StartTime
  $version = $reader.MainModule.FileVersionInfo.ProductVersion
  if ($version -notmatch '^2025[.]2508[.]120[.]' -or $reader.SessionId -eq 0 -or $reader.SessionId -ne (Get-Process -Id $PID).SessionId) { throw 'Pinned JAWS 2025 and same interactive session required.' }
  foreach ($key in @(0x10,0x11,0x12,0x5B,0x5C)) {
    if (([JawsBrowserFocus]::GetAsyncKeyState($key) -band 0x8000) -ne 0) { throw 'Modifier already held.' }
  }
  Write-Diagnostic 'jaws-demo-before'
  $deadline = [DateTime]::UtcNow.AddSeconds($WaitForPromptSeconds)
  do {
    Assert-SameReader
    $dialogs = @(Read-ReaderDialogs)
    if (@($dialogs | Where-Object { $_.window.Title -eq 'JAWS Activation' -or $_.window.Title -eq 'System Restart Requested' }).Count -gt 0) { break }
    Start-Sleep -Milliseconds 200
  } while ([DateTime]::UtcNow -lt $deadline)
  Append-Diagnostic ([ordered]@{
    at = [DateTime]::UtcNow.ToString('o'); phase = 'exact-reader-dialogs'; readerPid = $reader.Id; readerVersion = $version
    readerStartedUtc = $readerStarted.ToUniversalTime().ToString('o'); dialogs = $dialogs
    isNativeSpeech = $false; noLicenceSettingChanged = $true; noDemoReset = $true; rgaaVerdict = $null
  })
  $restart = @($dialogs | Where-Object { $_.window.Title -eq 'System Restart Requested' })
  if ($restart.Count -gt 1) { throw 'Ambiguous initial restart dialog.' }
  if ($restart.Count -eq 1) {
    if (-not $AllowDeferInitialRestart) { throw 'Initial installation restart dialog retained: inspect exact recorded message/buttons before choosing a supported route.' }
    $later = @($restart[0].nativeControls | Where-Object {
      $_.ClassName -eq 'Button' -and $_.Visible -and $_.Enabled -and
      $_.Caption.Replace('&','').Trim() -in @('No','Non','Restart Later','Redémarrer plus tard','Plus tard')
    })
    if ($later.Count -ne 1) { throw 'No unique publisher-exposed No/later command; no reboot or dismissal attempted.' }
    Invoke-ExactDialogCommand $restart[0] $later[0]
    Append-Diagnostic ([ordered]@{ at = [DateTime]::UtcNow.ToString('o'); phase = 'initial-restart-deferred-by-explicit-authorised-command'; command = $later[0]; restartRequirementResolved = $false; isNativeSpeech = $false; rgaaVerdict = $null })
    $dialogs = @(Read-ReaderDialogs)
    if (@($dialogs | Where-Object { $_.window.Title -eq 'System Restart Requested' }).Count -gt 0) { throw 'Initial restart dialog remains after the explicit later command.' }
    # The publisher may ask to quit after No. Cancel only this observed
    # confirmation once, then retain any subsequent prompt for diagnosis.
    $quit = @($dialogs | Where-Object { $_.window.Title -ceq 'Quit JAWS' })
    if ($quit.Count -gt 0) {
      if ($quit.Count -ne 1 -or $dialogs.Count -ne 1) { throw 'Ambiguous initial quit confirmation; no Cancel attempted.' }
      $cancel = Get-InitialQuitCancelCommand $quit[0]
      Invoke-ExactDialogCommand $quit[0] $cancel
      Start-Sleep -Milliseconds 750
      Assert-SameReader
      $dialogs = @(Read-ReaderDialogs)
      Append-Diagnostic ([ordered]@{
        at = [DateTime]::UtcNow.ToString('o'); phase = 'initial-quit-cancelled-once-by-explicit-authorised-command'
        readerPid = $reader.Id; command = $cancel; dialogsAfterCancel = $dialogs
        restartRequirementResolved = $false; isNativeSpeech = $false; rgaaVerdict = $null
      })
      if ($dialogs.Count -gt 0) { throw 'A new or remaining reader prompt follows initial quit cancellation; no restart, activation, expiry dismissal or second cancellation attempted.' }
    }
  }
  $activation = @($dialogs | Where-Object { $_.window.Title -eq 'JAWS Activation' })
  if ($activation.Count -gt 1) { throw 'Ambiguous activation dialog.' }
  if ($activation.Count -eq 1) {
    if (-not $ContinueDemo) { throw 'Approved demo continuation not requested; dialog preserved for inspection.' }
    $continuation = @($activation[0].nativeControls | Where-Object {
      $_.Id -eq 2 -and $_.ClassName -eq 'Button' -and $_.Visible -and $_.Enabled -and
      $_.Caption.Replace('&','').Trim() -eq 'Continue to Run in 40 Minute Mode'
    })
    if ($continuation.Count -ne 1) { throw 'Exact publisher-exposed 40-minute command unavailable; paid activation is never selected.' }
    Invoke-ExactDialogCommand $activation[0] $continuation[0]
  }
  Write-Diagnostic 'jaws-demo-after'
  $remaining = @(Read-ReaderDialogs)
  # Observe late startup prompts before handing control to Firefox. Any prompt
  # that remains is retained for diagnosis rather than dismissed generically.
  if ($remaining.Count -eq 0) {
    Start-Sleep -Milliseconds 750
    Assert-SameReader
    $remaining = @(Read-ReaderDialogs)
  }
  Append-Diagnostic ([ordered]@{ at = [DateTime]::UtcNow.ToString('o'); phase = 'remaining-reader-dialogs'; readerPid = $reader.Id; dialogs = $remaining; isNativeSpeech = $false })
  if ($remaining.Count -gt 0) { throw 'A reader dialog remains; preserve it for inspection rather than changing startup preferences.' }
  Assert-SameReader
  [ordered]@{ readyForNativeWitness = $true; readerPid = $reader.Id; readerVersion = $version; readerStartedUtc = $readerStarted.ToUniversalTime().ToString('o'); actions = $actions.ToArray(); nativeSpeechVerified = $false; rgaaVerdict = $null } | ConvertTo-Json -Depth 8 -Compress
} catch {
  $failure = $_
  try { Write-Diagnostic 'jaws-demo-error' $failure.Exception.Message } catch { Write-Warning "Error snapshot failed: $($_.Exception.Message)" }
  throw $failure
}
