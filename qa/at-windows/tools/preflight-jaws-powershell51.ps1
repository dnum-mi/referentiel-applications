[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$EvidenceDirectory
)

# Run before installation in the approved disposable Windows job. All native
# calls below read state only. No reader, installer, keyboard or clipboard is used.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $env:GITHUB_ACTIONS -ne 'true' -or $env:JAWS_ALLOW_APPROVED_USE -ne '1') { throw 'Approved disposable Windows runner required.' }
$EvidenceDirectory = [IO.Path]::GetFullPath($EvidenceDirectory)
[IO.Directory]::CreateDirectory($EvidenceDirectory) | Out-Null
$output = Join-Path $EvidenceDirectory 'powershell51-preflight.json'
$record = [ordered]@{
  startedUtc = [DateTime]::UtcNow.ToString('o'); status = 'partial'
  version = $PSVersionTable.PSVersion.ToString(); edition = $PSVersionTable.PSEdition
  apartment = [Threading.Thread]::CurrentThread.ApartmentState.ToString()
  processSession = $null; parsedScripts = @(); compiledClasses = @(); resolvedTypeNames = @()
  functionParameterTypes = @(); nativeParameterBindings = @(); syntaxMarkers = @(); commands = @(); readonlyWin32 = $null
  readerLaunched = $false; installerLaunched = $false; keyboardInputSent = $false
  clipboardReadOrWritten = $false; policyOrLicenceChanged = $false; nativeSpeech = $false; rgaaVerdict = $null
}
try {
  if ($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) { throw 'The real Windows PowerShell 5.1 runtime is required for this preflight.' }
  if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'Run powershell.exe -NoProfile -STA -File before installation.' }
  foreach ($module in @('Microsoft.PowerShell.Utility', 'Microsoft.PowerShell.Management', 'CimCmdlets')) {
    Import-Module (Join-Path $PSHOME ('Modules/' + $module + '/' + $module + '.psd1')) -ErrorAction Stop
  }
  foreach ($commandName in @('Add-Type', 'Get-Process', 'Get-CimInstance', 'Get-FileHash', 'ConvertTo-Json', 'Get-Command', 'Test-Path', 'Start-Sleep')) {
    $command = Get-Command $commandName -ErrorAction Stop
    $record.commands += [ordered]@{ name = $command.Name; module = $command.ModuleName; version = $command.Version.ToString() }
  }
  $record.processSession = (Get-Process -Id $PID).SessionId
  if ($record.processSession -eq 0 -or -not [Environment]::UserInteractive) { throw 'A non-service interactive desktop is required before installation.' }
  if (@(Get-Process -Name jfw,nvda -ErrorAction SilentlyContinue).Count -gt 0) { throw 'Preflight must run before a reader starts; existing readers are not changed.' }
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  $asts = @{}
  $scriptNames = @('focus-browser-window.ps1', 'prepare-jaws-demo.ps1', 'capture-jaws-history.ps1', 'jaws-content-action.ps1', 'acquire-jaws-installer.ps1', 'inspect-jaws-setup.ps1', 'install-jaws-approved.ps1', 'preflight-jaws-powershell51.ps1')
  foreach ($name in $scriptNames) {
    $file = Join-Path $PSScriptRoot $name
    $tokens = $null; $errors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile($file, [ref]$tokens, [ref]$errors)
    if (@($errors).Count -gt 0) { throw ('Windows PowerShell 5.1 parse failed: ' + $name + ': ' + ($errors | Out-String)) }
    $asts[$name] = $ast
    $record.parsedScripts += [ordered]@{ file = $name; sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant(); parse = 'PASS' }
  }
  foreach ($name in @('focus-browser-window.ps1', 'prepare-jaws-demo.ps1', 'capture-jaws-history.ps1')) {
    $definitions = @($asts[$name].FindAll({ param($node)
      $node -is [Management.Automation.Language.StringConstantExpressionAst] -and $node.Value.StartsWith('using System;')
    }, $true))
    if ($definitions.Count -ne 1) { throw ('One exact interop definition required: ' + $name) }
    Add-Type -TypeDefinition $definitions[0].Value
    $record.compiledClasses += [ordered]@{ source = $name; status = 'PASS'; runtime = 'Windows PowerShell 5.1 Add-Type' }
  }
  $marshalSize = [Runtime.InteropServices.Marshal].GetMethod('SizeOf', [type[]]@([type]))
  foreach ($type in @([type][JawsBrowserFocus+Input], [type][JawsHistoryNative+Input])) {
    $size = $marshalSize.Invoke($null, [object[]]@($type))
    if ($size -ne 40) { throw ('Unexpected INPUT structure size: ' + $type.FullName + ' = ' + $size) }
  }
  $guiType = [JawsDemoNative].GetNestedType('GuiThreadInfo', [Reflection.BindingFlags]::NonPublic)
  $guiSize = $marshalSize.Invoke($null, [object[]]@($guiType))
  if ($guiSize -ne 72) { throw ('Unexpected 64-bit GUI structure size: ' + $guiSize) }
  $record.keyboardScanMappings = @()
  $controlledKeys = @(0x09,0x0D,0x10,0x11,0x12,0x1B,0x20,0x24,0x26,0x27,0x28,0x2D,0x47,0x48,0x54,0x70)
  $criticalMappings = @{ 0x2D = 82; 0x20 = 57; 0x11 = 29; 0x48 = 35 }
  foreach ($key in $controlledKeys) {
    $scan = [JawsHistoryNative]::ScanCodeFor([System.UInt16]$key)
    if ($criticalMappings.ContainsKey($key) -and $scan -ne $criticalMappings[$key]) { throw 'Critical scan mapping differs from the reviewed native SDK.' }
    $packet = [JawsHistoryNative]::BuildInput([System.UInt16]$key, $scan, $false, $false)
    if ($packet.type -ne 1 -or $packet.data.keyboard.key -ne $key -or $packet.data.keyboard.scan -ne $scan -or $packet.data.keyboard.flags -ne 0) { throw 'Controlled input packet does not preserve the virtual key and flags.' }
    $record.keyboardScanMappings += [ordered]@{ virtualKey = $key; scanCode = $scan; mapping = 'MapVirtualKey MAPVK_VK_TO_VSC'; packetBuiltOnly = $true; inputSent = $false }
  }
  if (@([JawsHistoryNative]::InputRecords()).Count -ne 0) { throw 'Preflight must not send or record native key input.' }
  foreach ($name in @('focus-browser-window.ps1', 'prepare-jaws-demo.ps1', 'capture-jaws-history.ps1', 'jaws-content-action.ps1')) {
    $types = @($asts[$name].FindAll({ param($node)
      $node -is [Management.Automation.Language.TypeConstraintAst] -or $node -is [Management.Automation.Language.TypeExpressionAst]
    }, $true))
    foreach ($constraint in $types) {
      # [ordered] is valid only on a hash literal; it is not a CLR type lookup.
      # Keep all actual type expressions and parameter declarations strict.
      if ($constraint.TypeName.FullName -eq 'ordered' -and
          $constraint.Parent -is [Management.Automation.Language.ConvertExpressionAst] -and
          $constraint.Parent.Child -is [Management.Automation.Language.HashtableAst]) {
        $record.syntaxMarkers += [ordered]@{ source = $name; marker = 'ordered'; context = 'hash literal'; resolvedAsType = $false }
        continue
      }
      $resolved = [type]$constraint.TypeName.FullName
      if ($null -eq $resolved) { throw ('Unresolved real PowerShell 5.1 type: ' + $constraint.TypeName.FullName) }
      $record.resolvedTypeNames += [ordered]@{ source = $name; declared = $constraint.TypeName.FullName; resolved = $resolved.FullName }
    }
    $functions = @($asts[$name].FindAll({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] }, $true))
    foreach ($function in $functions) {
      # Define only the exact function body. Its native action is never invoked.
      . ([ScriptBlock]::Create($function.Extent.Text))
      $metadata = Get-Command $function.Name -CommandType Function -ErrorAction Stop
      foreach ($parameter in $metadata.Parameters.Values) {
        $record.functionParameterTypes += [ordered]@{ source = $name; function = $function.Name; parameter = $parameter.Name; type = $parameter.ParameterType.FullName }
      }
      if ($function.Name -in @('Press-NativeKey', 'Invoke-NativeChord', 'Invoke-Chord')) {
        # Exercise the original parameter declarations in a read-only proxy;
        # the source function's SendInput body remains entirely unexecuted.
        $parameterText = (@($function.Parameters | ForEach-Object { $_.Extent.Text }) -join ', ')
        $bindingBody = 'param(' + $parameterText + ') [ordered]@{ key = $Key; keyType = $Key.GetType().FullName }'
        if ($function.Name -ne 'Press-NativeKey') {
          $bindingBody = 'param(' + $parameterText + ') [ordered]@{ key = $Key; keyType = $Key.GetType().FullName; modifierType = $Modifiers.GetType().FullName; modifierCount = $Modifiers.Length; extendedType = $Extended.GetType().FullName }'
        }
        $binding = [ScriptBlock]::Create($bindingBody)
        $arguments = @{ Key = 9 }
        if ($function.Name -ne 'Press-NativeKey') { $arguments.Modifiers = @(45); $arguments.Extended = $false }
        $value = & $binding @arguments
        if ($value.keyType -ne 'System.UInt16' -or $value.key -ne 9) { throw ('Native key parameter binding failed: ' + $function.Name) }
        if ($function.Name -ne 'Press-NativeKey' -and ($value.modifierType -ne 'System.UInt16[]' -or $value.modifierCount -ne 1 -or $value.extendedType -ne 'System.Boolean')) { throw ('Native modifier parameter binding failed: ' + $function.Name) }
        $record.nativeParameterBindings += [ordered]@{ source = $name; function = $function.Name; originalParameterText = $parameterText; result = $value; sourceBodyExecuted = $false }
      }
    }
  }
  $foreground = [JawsBrowserFocus]::GetForegroundWindow()
  $windows = @([JawsBrowserFocus]::Windows())
  $focusedControl = [JawsDemoNative]::FocusedControl()
  $process = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $PID)
  if ($process.SessionId -ne $record.processSession) { throw 'CIM and process session disagree.' }
  $record.readonlyWin32 = [ordered]@{
    foreground = [JawsBrowserFocus]::Info($foreground); windowCount = $windows.Count
    focusedControl = $focusedControl; foregroundChildControlCount = @([JawsDemoNative]::Controls($foreground)).Count
    historyClassForegroundPid = [JawsHistoryNative]::ForegroundProcess()
    clipboardSequenceOnly = [JawsHistoryNative]::GetClipboardSequenceNumber()
    modifierStateOnly = [JawsBrowserFocus]::GetAsyncKeyState(0x10)
    cimProcessId = $process.ProcessId; sessionId = $process.SessionId
    inputSizeBytes = 40; guiThreadInfoSizeBytes = $guiSize; noInputApiCalled = $true
  }
  $record.status = 'PASS: real Windows PowerShell 5.1 preflight only'
} catch {
  $record.status = 'FAIL: no installation or native test authorised by this preflight'
  $record.error = $_.Exception.Message
  throw
} finally {
  $record.completedUtc = [DateTime]::UtcNow.ToString('o')
  [IO.File]::WriteAllText($output, ($record | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
}
$record | ConvertTo-Json -Depth 10 -Compress
