[CmdletBinding()]
param(
  [Parameter(Mandatory)][int]$BrowserProcessId,
  [string]$ExpectedTitle = '',
  [string]$DiagnosticFile = '',
  [ValidateRange(0, 16)][int]$MaximumSwitches = 10,
  [switch]$SnapshotOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Windows interactive runner required.' }
if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'Launch with powershell.exe -STA.' }
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:JAWS_ALLOW_APPROVED_USE -ne '1') { throw 'Approved disposable GitHub runner required.' }
if ([string]::IsNullOrWhiteSpace($DiagnosticFile)) {
  $evidenceDirectory = $env:JAWS_EVIDENCE_DIR
  if ([string]::IsNullOrWhiteSpace($evidenceDirectory)) { $evidenceDirectory = Join-Path (Get-Location) 'evidence/jaws-approved' }
  $DiagnosticFile = Join-Path $evidenceDirectory 'firefox-focus-attempts.jsonl'
}
$DiagnosticFile = [IO.Path]::GetFullPath($DiagnosticFile)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($DiagnosticFile)) | Out-Null
$actions = [Collections.Generic.List[object]]::new()
if (-not ('JawsBrowserFocus' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class JawsBrowserFocus {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct MouseInput {
    public int dx, dy; public uint mouseData, flags, time; public UIntPtr extraInfo;
  }
  [StructLayout(LayoutKind.Sequential)] public struct KeyboardInput {
    public ushort key, scan; public uint flags, time; public UIntPtr extraInfo;
  }
  [StructLayout(LayoutKind.Explicit)] public struct InputUnion {
    [FieldOffset(0)] public MouseInput mouse;
    [FieldOffset(0)] public KeyboardInput keyboard;
  }
  [StructLayout(LayoutKind.Sequential)] public struct Input { public uint type; public InputUnion data; }
  public sealed class WindowInfo {
    public long Handle; public uint ProcessId; public string Title; public string ClassName;
    public bool Visible, Enabled, Minimized; public Rect Bounds;
  }
  private delegate bool EnumWindowsProc(IntPtr window, IntPtr parameter);
  [DllImport("user32.dll", SetLastError=true)] private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetClassName(IntPtr window, StringBuilder text, int count);
  [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] private static extern bool IsWindowEnabled(IntPtr window);
  [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr window);
  [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll", SetLastError=true)] private static extern uint SendInput(uint count, Input[] inputs, int size);
  public static WindowInfo Info(IntPtr window) {
    uint process; Rect bounds;
    GetWindowThreadProcessId(window, out process); GetWindowRect(window, out bounds);
    StringBuilder title = new StringBuilder(1024), className = new StringBuilder(256);
    GetWindowText(window, title, title.Capacity); GetClassName(window, className, className.Capacity);
    return new WindowInfo { Handle = window.ToInt64(), ProcessId = process, Title = title.ToString(),
      ClassName = className.ToString(), Visible = IsWindowVisible(window), Enabled = IsWindowEnabled(window),
      Minimized = IsIconic(window), Bounds = bounds };
  }
  public static WindowInfo[] Windows() {
    List<WindowInfo> windows = new List<WindowInfo>();
    if (!EnumWindows(delegate(IntPtr window, IntPtr parameter) { windows.Add(Info(window)); return true; }, IntPtr.Zero)) {
      throw new Win32Exception(Marshal.GetLastWin32Error(), "EnumWindows failed");
    }
    return windows.ToArray();
  }
  public static void Key(ushort key, bool up) {
    Input input = new Input(); input.type = 1; input.data.keyboard.key = key;
    input.data.keyboard.flags = up ? 2u : 0u;
    if (SendInput(1, new Input[] { input }, Marshal.SizeOf(typeof(Input))) != 1) {
      throw new Win32Exception(Marshal.GetLastWin32Error(), "Native focus key was not inserted");
    }
  }
  public static uint ForegroundProcess() {
    uint process; GetWindowThreadProcessId(GetForegroundWindow(), out process); return process;
  }
}
'@
}

function Append-Diagnostic([object]$Record) {
  [IO.File]::AppendAllText($DiagnosticFile, ($Record | ConvertTo-Json -Depth 10 -Compress) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}
function Read-UiaWindow([IntPtr]$Handle) {
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  $root = [Windows.Automation.AutomationElement]::FromHandle($Handle)
  if ($null -eq $root) { return @() }
  $queue = [Collections.Generic.Queue[object]]::new()
  $queue.Enqueue(@{ element = $root; depth = 0 })
  $nodes = [Collections.Generic.List[object]]::new()
  while ($queue.Count -gt 0 -and $nodes.Count -lt 40) {
    $item = $queue.Dequeue()
    $current = $item.element.Current
    $nodes.Add([ordered]@{
      depth = $item.depth; name = $(if ($current.IsPassword) { '[password omitted]' } else { $current.Name })
      automationId = $current.AutomationId; className = $current.ClassName; controlType = $current.ControlType.ProgrammaticName
      processId = $current.ProcessId; isOffscreen = $current.IsOffscreen
      isKeyboardFocusable = $current.IsKeyboardFocusable; hasKeyboardFocus = $current.HasKeyboardFocus
    })
    if ($item.depth -lt 2) {
      $children = $item.element.FindAll([Windows.Automation.TreeScope]::Children, [Windows.Automation.Condition]::TrueCondition)
      for ($index = 0; $index -lt [Math]::Min(20, $children.Count); $index++) { $queue.Enqueue(@{ element = $children[$index]; depth = $item.depth + 1 }) }
    }
  }
  return $nodes.ToArray()
}
function Write-Diagnostic([string]$Phase, [string]$Failure = '') {
  $observed = [DateTime]::UtcNow
  $foreground = [JawsBrowserFocus]::GetForegroundWindow()
  $windows = @([JawsBrowserFocus]::Windows())
  # Persist the fast HWND inventory before querying any potentially slow UIA provider.
  Append-Diagnostic ([ordered]@{
    at = $observed.ToString('o'); phase = $Phase; error = $Failure; requestedBrowserPid = $BrowserProcessId
    expectedTitle = $ExpectedTitle; sessionId = (Get-Process -Id $PID).SessionId; interactive = [Environment]::UserInteractive
    foreground = [JawsBrowserFocus]::Info($foreground)
    visibleWindows = @($windows | Where-Object { $_.Visible })
    requestedProcessWindows = @($windows | Where-Object { $_.ProcessId -eq $BrowserProcessId })
    actions = $actions.ToArray(); source = 'Win32 HWND and native keyboard preparation, not reader speech'
    policyChanged = $false; inputThreadsAttached = $false; readerRestarted = $false; rgaaVerdict = $null
  })
  $details = [ordered]@{ at = $observed.ToString('o'); phase = "$Phase-details"; screenshot = $null; uia = @(); captureErrors = @() }
  try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $bounds = [Windows.Forms.SystemInformation]::VirtualScreen
    $bitmap = [Drawing.Bitmap]::new($bounds.Width, $bounds.Height)
    try {
      $graphics = [Drawing.Graphics]::FromImage($bitmap)
      try { $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size) } finally { $graphics.Dispose() }
      $imageFile = Join-Path ([IO.Path]::GetDirectoryName($DiagnosticFile)) ("firefox-desktop-{0}-{1}.png" -f $observed.ToString('yyyyMMdd-HHmmss-fff'), $Phase)
      $bitmap.Save($imageFile, [Drawing.Imaging.ImageFormat]::Png)
      $details.screenshot = [IO.Path]::GetFileName($imageFile)
    } finally { $bitmap.Dispose() }
  } catch { $details.captureErrors += "desktop screenshot: $($_.Exception.Message)" }
  try { if ($foreground -ne [IntPtr]::Zero) { $details.uia = @(Read-UiaWindow $foreground) } }
  catch { $details.captureErrors += "foreground UIA: $($_.Exception.Message)" }
  Append-Diagnostic $details
}

try {
  Write-Diagnostic 'before'
  if ($SnapshotOnly) { return }
  $browserProcess = Get-Process -Id $BrowserProcessId
  if ($browserProcess.ProcessName -ne 'firefox' -or $browserProcess.SessionId -eq 0 -or $browserProcess.SessionId -ne (Get-Process -Id $PID).SessionId) {
    throw 'The exact Firefox process and driver must share one interactive session.'
  }
  foreach ($key in @(0x10, 0x11, 0x12, 0x5B, 0x5C)) {
    if (([JawsBrowserFocus]::GetAsyncKeyState($key) -band 0x8000) -ne 0) { throw 'A modifier key is already held; native focus preparation refused.' }
  }
  $target = $null
  $deadline = [DateTime]::UtcNow.AddSeconds(5)
  do {
    $candidates = @([JawsBrowserFocus]::Windows() | Where-Object {
      $_.ProcessId -eq $BrowserProcessId -and $_.Visible -and $_.Enabled -and $_.ClassName -eq 'MozillaWindowClass' -and
      ([string]::IsNullOrEmpty($ExpectedTitle) -or $_.Title.IndexOf($ExpectedTitle, [StringComparison]::OrdinalIgnoreCase) -ge 0)
    })
    if ($candidates.Count -eq 1) { $target = $candidates[0]; break }
    if ($candidates.Count -gt 1) { throw 'More than one exact Firefox window matches; preparation is ambiguous.' }
    Start-Sleep -Milliseconds 200
  } while ([DateTime]::UtcNow -lt $deadline)
  if ($null -eq $target) { throw 'No visible enabled MozillaWindowClass belongs to the exact requested Firefox PID/title.' }
  $handle = [IntPtr]::new($target.Handle)
  if ($target.Minimized) { [JawsBrowserFocus]::ShowWindow($handle, 9) | Out-Null }
  $setForegroundResult = [JawsBrowserFocus]::SetForegroundWindow($handle)
  Start-Sleep -Milliseconds 200
  $actions.Add(@{ action = 'SetForegroundWindow'; hwnd = $target.Handle; returned = $setForegroundResult; observedForeground = [JawsBrowserFocus]::Info([JawsBrowserFocus]::GetForegroundWindow()) })
  # Respect foreground restrictions: switch windows with native Alt+Escape,
  # then verify the exact HWND/PID. No AttachThreadInput, timeout or policy change.
  for ($attempt = 0; $attempt -lt $MaximumSwitches -and [JawsBrowserFocus]::GetForegroundWindow() -ne $handle; $attempt++) {
    try {
      [JawsBrowserFocus]::Key(0x12, $false)
      [JawsBrowserFocus]::Key(0x1B, $false)
    } finally {
      try { [JawsBrowserFocus]::Key(0x1B, $true) } finally { [JawsBrowserFocus]::Key(0x12, $true) }
    }
    Start-Sleep -Milliseconds 200
    $actions.Add(@{ action = 'native Alt+Escape'; attempt = $attempt + 1; observedForeground = [JawsBrowserFocus]::Info([JawsBrowserFocus]::GetForegroundWindow()) })
  }
  if ([JawsBrowserFocus]::GetForegroundWindow() -ne $handle -or [JawsBrowserFocus]::ForegroundProcess() -ne $BrowserProcessId) {
    throw 'The exact Firefox HWND/PID was not reached by bounded native window switching.'
  }
  Write-Diagnostic 'success'
  [ordered]@{ foregroundVerified = $true; browserPid = $BrowserProcessId; hwnd = $target.Handle; title = $target.Title; diagnosticFile = $DiagnosticFile; keyboardConformanceClaim = $false } | ConvertTo-Json -Compress
} catch {
  $failure = $_
  try { Write-Diagnostic 'error' $failure.Exception.Message } catch { Write-Warning "Unable to complete error snapshot: $($_.Exception.Message)" }
  throw $failure
}
