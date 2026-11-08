# BitScape smoke test #5: regression suite for the player-review fixes.
# One-E interaction, wiring feedback tone, active-pad guidance, program hydration.
param(
  [string]$Url = 'http://localhost:4173/',
  [int]$Port = 9333
)

$ErrorActionPreference = 'Stop'
# Never reuse a busy port: an orphaned browser from an earlier run would
# answer our DevTools queries with a stale profile and stale save data.
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
  $busyPort = $Port
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $Port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
  $listener.Stop()
  Write-Output "port $busyPort was busy -> using $Port instead"
}

$edge = @(
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Edge/Chrome not found' }

$profile = Join-Path $env:TEMP ("bitscape_cdp_" + [guid]::NewGuid().ToString('N'))
$proc = Start-Process $edge -PassThru -WindowStyle Hidden -ArgumentList @(
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  "--remote-debugging-port=$Port", "--user-data-dir=$profile", 'about:blank'
)

$ws = $null
$ct = [System.Threading.CancellationToken]::None
$script:seq = 0
$script:errors = New-Object System.Collections.Generic.List[string]

try {
  # wait for the devtools endpoint
  $targets = $null
  for ($i = 0; $i -lt 40 -and -not $targets; $i++) {
    try { $targets = Invoke-RestMethod "http://127.0.0.1:$Port/json/list" -TimeoutSec 2 } catch { Start-Sleep -Milliseconds 250 }
  }
  if (-not $targets) { throw 'devtools endpoint did not come up' }
  $page = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1

  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  $ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl, $ct).Wait()

  function Send-Cdp([string]$json) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $seg = [System.ArraySegment[byte]]::new($bytes)
    $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
  }

  function Receive-Cdp {
    $buffer = New-Object byte[] 262144
    $seg = [System.ArraySegment[byte]]::new($buffer)
    $sb = [System.Text.StringBuilder]::new()
    while ($true) {
      $res = $ws.ReceiveAsync($seg, $ct).Result
      [void]$sb.Append([System.Text.Encoding]::UTF8.GetString($buffer, 0, $res.Count))
      if ($res.EndOfMessage) { break }
    }
    return $sb.ToString()
  }

  function Invoke-Cdp([string]$method, [hashtable]$params, [int]$timeoutMs = 15000) {
    $script:seq++
    $myId = $script:seq
    $payload = @{ id = $myId; method = $method }
    if ($params) { $payload.params = $params }
    Send-Cdp ($payload | ConvertTo-Json -Depth 10 -Compress)
    $deadline = (Get-Date).AddMilliseconds($timeoutMs)
    while ((Get-Date) -lt $deadline) {
      $raw = Receive-Cdp
      try { $ev = $raw | ConvertFrom-Json } catch { continue }
      if ($ev.PSObject.Properties['id'] -and $ev.id -eq $myId) {
        if ($ev.PSObject.Properties['error']) { throw "CDP error on ${method}: $($ev.error.message)" }
        return $ev.result
      }
      if ($ev.method -eq 'Runtime.exceptionThrown') {
        $d = $ev.params.exceptionDetails
        $msg = if ($d.exception.description) { $d.exception.description } else { $d.text }
        [void]$script:errors.Add($msg)
      }
      if ($ev.method -eq 'Runtime.consoleAPICalled' -and $ev.params.type -eq 'error') {
        [void]$script:errors.Add(($ev.params.args | ForEach-Object { $_.value }) -join ' ')
      }
    }
    throw "timeout waiting for $method"
  }

  function Eval([string]$expr) {
    $r = Invoke-Cdp 'Runtime.evaluate' @{ expression = $expr; returnByValue = $true; awaitPromise = $true }
    if ($r.exceptionDetails) {
      $d = $r.exceptionDetails
      throw "eval failed: $(if ($d.exception.description) { $d.exception.description } else { $d.text })`nEXPR: $expr"
    }
    return $r.result.value
  }

  function Assert([bool]$cond, [string]$msg) {
    if (-not $cond) { throw "ASSERT FAILED: $msg" }
    Write-Output "  ok  $msg"
  }

  # Real OS-level click: goes through the browser's hit-testing, so it is
  # blocked by whatever element is actually on top (unlike el.click()).
  function RealClick([int]$x, [int]$y) {
    $null = Invoke-Cdp 'Input.dispatchMouseEvent' @{ type = 'mousePressed'; x = $x; y = $y; button = 'left'; clickCount = 1 }
    $null = Invoke-Cdp 'Input.dispatchMouseEvent' @{ type = 'mouseReleased'; x = $x; y = $y; button = 'left'; clickCount = 1 }
    Start-Sleep -Milliseconds 700
  }

  $null = Invoke-Cdp 'Runtime.enable' @{}
  $null = Invoke-Cdp 'Page.enable' @{}
  $null = Invoke-Cdp 'Page.navigate' @{ url = $Url }
  Start-Sleep -Seconds 2
  # Deterministic state: wipe any save left behind by a reused profile.
  $null = Eval 'localStorage.clear()'
  $null = Invoke-Cdp 'Page.reload' @{}
  Start-Sleep -Seconds 2

  Write-Output '== boot =='
  Assert ((Eval "!!document.querySelector('.title-screen')") -eq $true) 'title screen renders'
  Assert ((Eval "typeof window.__bitscape") -eq 'object') 'game instance exposed'

  function PressE {
    Eval "window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}))" | Out-Null
    Start-Sleep -Milliseconds 120
    Eval "window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'}))" | Out-Null
    Start-Sleep -Milliseconds 450
  }

  Write-Output '== fix 1: one E press at the active pad =='
  Eval 'window.__bitscape.enterLab()' | Out-Null
  Start-Sleep -Milliseconds 500
  Eval "window.__bitscape.enterLevel('tutorial')" | Out-Null
  Start-Sleep -Milliseconds 800
  Assert ((Eval "window.__bitscape.dialog.isOpen()") -eq $true) 'dialogue is open on arrival'
  Eval 'window.__bitscape.player.teleport(129,344)' | Out-Null   # sensor pad
  Start-Sleep -Milliseconds 300
  PressE
  Assert ((Eval "document.querySelectorAll('.choice-card').length") -eq 3) 'ONE E opens the entry puzzle while BIT talks'
  Eval "document.querySelectorAll('.choice-card')[0].click()" | Out-Null
  Start-Sleep -Milliseconds 1000
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'wiring') 'stage advanced to wiring'
  Assert ((Eval "window.__bitscape.dialog.isOpen()") -eq $true) 'wiring objective dialogue is showing'
  Eval 'window.__bitscape.player.teleport(319,344)' | Out-Null   # MCU pad
  Start-Sleep -Milliseconds 300
  PressE
  Assert ((Eval "document.querySelectorAll('.wiring-cols').length") -eq 1) 'ONE E at the MCU opens the wiring panel'

  Write-Output '== fix 2: wiring feedback tone =='
  Assert ((Eval "document.querySelector('.line-error.is-visible') === null") -eq $true) 'no feedback before touching a port'
  Eval "document.querySelector('.wire-node[data-id=button]').click()" | Out-Null
  Start-Sleep -Milliseconds 350
  Assert ((Eval "document.querySelector('.line-error').classList.contains('is-info')") -eq $true) 'first click gives neutral info, not a red error'
  Eval "document.querySelector('.wire-node[data-id=mcuIn]').click()" | Out-Null
  Start-Sleep -Milliseconds 350
  Assert ((Eval "document.querySelector('.line-error').classList.contains('is-good')") -eq $true) 'valid connection confirmed in green'
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 1) 'edge recorded'
  Eval "document.querySelector('.wire-node[data-id=mcuOut]').click()" | Out-Null
  Start-Sleep -Milliseconds 250
  Eval "document.querySelector('.wire-node[data-id=led]').click()" | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelector('.wire-banner.is-visible') !== null") -eq $true) 'completion banner shown'
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 800
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'program') 'stage advanced to program'

  Write-Output '== fix 3: highlight moves to the next required pad =='
  Eval 'window.__bitscape.openPanel({kind:"program"})' | Out-Null
  Start-Sleep -Milliseconds 500
  function ClickSlot([int]$row, [int]$col) {
    Eval "document.querySelectorAll('.rule-row')[$row].querySelectorAll('.slot')[$col].click()" | Out-Null
    Start-Sleep -Milliseconds 130
  }
  function ClickChip([string]$kind, [int]$index) {
    Eval "document.querySelectorAll('.chip-pal[data-kind=$kind]')[$index].click()" | Out-Null
    Start-Sleep -Milliseconds 130
  }
  # SI button = pressed ENTONCES led on  (else branch deliberately left empty)
  ClickChip 'sensor' 0; ClickSlot 0 0
  ClickChip 'op' 0;     ClickSlot 0 1
  ClickChip 'value' 0;  ClickSlot 0 2
  ClickChip 'action' 0; ClickSlot 0 3
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.program !== null") -eq $true) 'program saved'
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'test') 'stage advanced to test'
  $hl = Eval @"
(() => {
  const g = window.__bitscape;
  const room = g['room'];
  const mcu = room.hotspots.find(h => h.role === 'mcu');
  const mon = room.hotspots.find(h => h.role === 'monitor');
  return { mcu: g['isActiveHotspot'](mcu), mon: g['isActiveHotspot'](mon) };
})()
"@
  Assert (([bool]$hl.mcu) -eq $false) 'MCU pad is no longer highlighted after saving'
  Assert (([bool]$hl.mon) -eq $true) 'exterior window is highlighted for the test phase'

  Write-Output '== fix 4: config survives a failed test, wrong parts in red =='
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null  # run tests
  Start-Sleep -Milliseconds 700
  Assert ((Eval "document.querySelectorAll('.test-card').length") -eq 2) 'two tests listed'
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null  # ejecutar
  Start-Sleep -Milliseconds 7500
  Assert ((Eval "document.querySelectorAll('.test-card[data-state=fail]').length") -eq 1) 'the missing else branch fails one test'
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null  # corregir
  Start-Sleep -Milliseconds 800
  Assert ((Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot.is-filled').length") -eq 4) 'previous rule is hydrated back into the panel'
  Assert ((Eval "document.querySelectorAll('.rule-else.is-suspect').length") -eq 1) 'failed default branch marked in red'
  Assert ((Eval "document.querySelector('.line-error.is-info.is-visible') !== null") -eq $true) 'note explains the red marks'
  # still editable: fill the else branch with "apagar indicador"
  ClickChip 'action' 1
  Eval "document.querySelector('.rule-else .slot').click()" | Out-Null
  Start-Sleep -Milliseconds 250
  Assert ((Eval "document.querySelectorAll('.rule-else .slot.is-filled').length") -eq 1) 'panel stays editable after a failed test'
  # save changes (footer: hint, save-changes, run-primary, close)
  Eval "document.querySelectorAll('.modal-foot .btn')[1].click()" | Out-Null
  Start-Sleep -Milliseconds 600
  Assert ((Eval "window.__bitscape.rt.program.defaultAction") -eq 'led_off') 'correction stored'
  Assert ((Eval "document.querySelectorAll('.rule-row.is-suspect, .rule-else.is-suspect').length") -eq 0) 'red marks cleared after saving'
  # and the corrected program now passes
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 700
  # reopened with 1 green + 1 red: the panel must offer run-pending AND run-all
  Assert ((Eval "document.querySelectorAll('.test-card[data-state=pass]').length") -eq 1) 'previous pass still shown green after reopening'
  Assert ((Eval "document.querySelectorAll('.test-card[data-state=fail]').length") -eq 1) 'previous failure still shown red after reopening'
  Assert ((Eval "document.querySelectorAll('.modal-foot .btn').length") -eq 4) 'run-pending + run-all buttons offered'
  Assert ((Eval "document.querySelector('.modal-foot .btn-primary').textContent.indexOf('(1)') >= 0") -eq $true) 'pending button counts the one test left'
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 450
  Assert ((Eval "document.querySelector('.test-card[data-id=t1]').dataset.state") -eq 'pass') 'already-passed test is skipped (stays green)'
  Assert ((Eval "document.querySelector('.test-card[data-id=t2]').dataset.state") -eq 'running') 'only the failed test runs'
  Start-Sleep -Milliseconds 7500
  Assert ((Eval "document.querySelectorAll('.test-card[data-state=pass]').length") -eq 2) 'corrected program passes both tests'
  Assert ((Eval "window.__bitscape.rt.allTestsPassed") -eq $true) 'level tests recorded as passed'
  if ($script:errors.Count -gt 0) {
    Write-Output '== console/page errors =='
    $script:errors | ForEach-Object { Write-Output "  ERR $_" }
    throw "$($script:errors.Count) page errors captured"
  }

  Write-Output ''
  Write-Output 'SMOKE TEST PASSED'
}
finally {
  if ($ws) { try { $ws.Dispose() } catch {} }
  # Kill every browser process of THIS run's profile (the launcher PID alone
# is not enough: Edge spawns children that outlive it and keep the port).
Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" |
  Where-Object { $_.CommandLine -like "*$profile*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 300
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
}
