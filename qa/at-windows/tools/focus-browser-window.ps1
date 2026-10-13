[CmdletBinding()]
param([Parameter(Mandatory)][int]$BrowserProcessId)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class JawsBrowserFocus {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
  public static uint ForegroundProcess() {
    uint process;
    GetWindowThreadProcessId(GetForegroundWindow(), out process);
    return process;
  }
}
'@
$process = Get-Process -Id $BrowserProcessId
$deadline = [DateTime]::UtcNow.AddSeconds(15)
do {
  $process.Refresh()
  if ($process.MainWindowHandle -ne [IntPtr]::Zero) {
    [JawsBrowserFocus]::ShowWindow($process.MainWindowHandle, 9) | Out-Null
    [JawsBrowserFocus]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
  }
  Start-Sleep -Milliseconds 200
} while ([JawsBrowserFocus]::ForegroundProcess() -ne $BrowserProcessId -and [DateTime]::UtcNow -lt $deadline)
if ([JawsBrowserFocus]::ForegroundProcess() -ne $BrowserProcessId) { throw 'Firefox foreground not confirmed.' }
