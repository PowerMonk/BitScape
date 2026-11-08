# BitScape smoke test #4: real room interaction (E key + click-to-move)
# and the refrigerator's two-rule hysteresis program.
param(
  [string]$Url = 'http://localhost:4173/',
  [int]$Port = 9338
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

$profile = Join-Path $env:TEMP ("bitscape_cdp4_" + [guid]::NewGuid().ToString('N'))
$proc = Start-Process $edge -PassThru -WindowStyle Hidden -ArgumentList @(
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  "--remote-debugging-port=$Port", "--user-data-dir=$profile", 'about:blank'
)

$ws = $null
$ct = [System.Threading.CancellationToken]::None
$script:seq = 0
$script:errors = New-Object System.Collections.Generic.List[string]

try {
  $targets = $null
  for ($i = 0; $i -lt 40 -and -not $targets; $i++) {
    try { $targets = Invoke-RestMethod "http://127.0.0.1:$Port/json/list" -TimeoutSec 2 } catch { Start-Sleep -Milliseconds 250 }
  }
  $page = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  $ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl, $ct).Wait()

  function Send-Cdp([string]$json) {
    $b = [System.Text.Encoding]::UTF8.GetBytes($json)
    $s = [System.ArraySegment[byte]]::new($b)
    $ws.SendAsync($s, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
  }
  function Receive-Cdp {
    $buf = New-Object byte[] 262144
    $s = [System.ArraySegment[byte]]::new($buf)
    $sb = [System.Text.StringBuilder]::new()
    while ($true) {
      $r = $ws.ReceiveAsync($s, $ct).Result
      [void]$sb.Append([System.Text.Encoding]::UTF8.GetString($buf, 0, $r.Count))
      if ($r.EndOfMessage) { break }
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
        if ($ev.PSObject.Properties['error']) { throw "CDP error: $($ev.error.message)" }
        return $ev.result
      }
      if ($ev.method -eq 'Runtime.exceptionThrown') {
        $d = $ev.params.exceptionDetails
        [void]$script:errors.Add($(if ($d.exception.description) { $d.exception.description } else { $d.text }))
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
  function ClickPrimary {
    Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
    Start-Sleep -Milliseconds 500
  }
  function Press-E {
    Eval "window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}))" | Out-Null
    Start-Sleep -Milliseconds 120
    Eval "window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'}))" | Out-Null
    Start-Sleep -Milliseconds 400
  }

  $null = Invoke-Cdp 'Runtime.enable' @{}
  $null = Invoke-Cdp 'Page.enable' @{}
  $null = Invoke-Cdp 'Page.navigate' @{ url = $Url }
  Start-Sleep -Seconds 2
  # Deterministic state: wipe any save left behind by a reused profile.
  $null = Eval 'localStorage.clear()'
  $null = Invoke-Cdp 'Page.reload' @{}
  Start-Sleep -Seconds 2

  Write-Output '== room interaction (E key) =='
  Eval 'window.__bitscape.save.unlocked = ["tutorial","fridge","washer","robot","fan"]' | Out-Null
  Eval "window.__bitscape.enterLevel('tutorial')" | Out-Null
  Start-Sleep -Milliseconds 700
  Eval 'window.__bitscape.dialog.clear()' | Out-Null

  # stand on the sensor pad and press E
  Eval 'window.__bitscape.player.teleport(129,344)' | Out-Null
  Start-Sleep -Milliseconds 300
  Press-E
  Assert ((Eval "document.querySelectorAll('.choice-card').length") -eq 3) 'E opens the entry puzzle at the sensor'
  Eval 'document.querySelector(".modal .icon-btn").click()' | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelectorAll('.modal').length") -eq 0) 'panel closes'

  # standing at the controller during the entry stage shows the inspect card
  Eval 'window.__bitscape.player.teleport(319,344)' | Out-Null
  Start-Sleep -Milliseconds 300
  Press-E
  Assert ((Eval "document.querySelectorAll('.inspect-body').length") -eq 1) 'E on a component shows its inspection card'
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'entry') 'stage unchanged by inspecting'
  Eval 'document.querySelector(".modal .icon-btn").click()' | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelectorAll('.modal').length") -eq 0) 'inspect card closes'

  # keyboard movement actually moves the avatar
  Eval 'window.__bitscape.player.teleport(319,430)' | Out-Null
  $x0 = Eval 'window.__bitscape.player.x'
  Eval "window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowLeft'}))" | Out-Null
  Start-Sleep -Milliseconds 500
  Eval "window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowLeft'}))" | Out-Null
  Start-Sleep -Milliseconds 200
  $x1 = Eval 'window.__bitscape.player.x'
  Assert ([double]$x1 -lt ([double]$x0 - 20)) "WASD/arrow movement works (x $x0 -> $x1)"

  # click-to-move: click an empty floor point and confirm the avatar walks there
  Eval 'window.__bitscape.player.teleport(319,430)' | Out-Null
  Start-Sleep -Milliseconds 300
  $y0 = Eval 'window.__bitscape.player.y'
  Eval @"
(() => {
  const g = window.__bitscape;
  const c = document.getElementById('game');
  const r = c.getBoundingClientRect();
  const vx = 400, vy = 375;
  const cx = r.left + g.renderer.offsetX + vx * g.renderer.scale;
  const cy = r.top + g.renderer.offsetY + vy * g.renderer.scale;
  c.dispatchEvent(new PointerEvent('pointerdown', {clientX: cx, clientY: cy, bubbles: true}));
  window.dispatchEvent(new PointerEvent('pointerup', {clientX: cx, clientY: cy, bubbles: true}));
})()
"@
  Start-Sleep -Milliseconds 350
  Assert ((Eval "document.querySelectorAll('.modal').length") -eq 0) 'click on empty floor opens no panel'
  $y1 = Eval 'window.__bitscape.player.y'
  Assert ([double]$y1 -lt ([double]$y0 - 15)) "avatar walked towards the clicked point (y $y0 -> $y1)"
  Start-Sleep -Milliseconds 500
  $y2 = Eval 'window.__bitscape.player.y'
  Assert ([double]$y2 -lt ([double]$y0 - 30)) "avatar kept walking (y -> $y2)"

  Write-Output '== refrigerator: two-rule hysteresis =='
  Eval "window.__bitscape.enterLevel('fridge')" | Out-Null
  Start-Sleep -Milliseconds 700
  1..6 | ForEach-Object { Eval 'window.__bitscape.dialog.advance()' | Out-Null; Start-Sleep -Milliseconds 50 }

  Eval 'window.__bitscape.openPanel({kind:"entry"})' | Out-Null
  Start-Sleep -Milliseconds 400
  Eval "document.querySelectorAll('.choice-card')[1].click()" | Out-Null   # distance = wrong
  Start-Sleep -Milliseconds 300
  Assert ((Eval "document.querySelector('.line-error.is-visible') !== null") -eq $true) 'distance rejected with an explanation'
  Eval "document.querySelectorAll('.choice-card')[0].click()" | Out-Null   # temperature
  Start-Sleep -Milliseconds 900
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'wiring') 'advances to wiring'

  Eval 'window.__bitscape.openPanel({kind:"wiring"})' | Out-Null
  Start-Sleep -Milliseconds 500
  # tempting but wrong output: the alarm
  Eval "document.querySelector('.wire-node[data-id=temp]').click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelector('.wire-node[data-id=mcuIn]').click()" | Out-Null; Start-Sleep -Milliseconds 300
  Eval "document.querySelector('.wire-node[data-id=mcuOut]').click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelector('.wire-node[data-id=alarm]').click()" | Out-Null; Start-Sleep -Milliseconds 350
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 1) 'alarm output rejected'
  Eval "document.querySelector('.wire-node[data-id=mcuOut]').click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelector('.wire-node[data-id=cooling]').click()" | Out-Null; Start-Sleep -Milliseconds 400
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 2) 'cooling output accepted'
  ClickPrimary
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'program') 'advances to program'

  Write-Output '== fridge program (2 rules + keep) =='
  Eval 'window.__bitscape.openPanel({kind:"program"})' | Out-Null
  Start-Sleep -Milliseconds 600
  Assert ((Eval "document.querySelectorAll('.rule-row').length") -eq 3) 'two rules plus the default row'

  # rule 1: SI temp >= 6 ENTONCES enfriar
  Eval "document.querySelectorAll('.chip-pal[data-kind=sensor]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[0].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.chip-pal[data-kind=op]')[3].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[1].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.chip-pal[data-kind=value]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[2].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.chip-pal[data-kind=action]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[3].click()" | Out-Null; Start-Sleep -Milliseconds 140

  # rule 2: SI temp <= 3 ENTONCES no enfriar
  Eval "document.querySelectorAll('.chip-pal[data-kind=sensor]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot')[0].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.chip-pal[data-kind=op]')[1].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot')[1].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.chip-pal[data-kind=value]')[1].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot')[2].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.chip-pal[data-kind=action]')[1].click()" | Out-Null; Start-Sleep -Milliseconds 140
  Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot')[3].click()" | Out-Null; Start-Sleep -Milliseconds 140

  # default row: conservar el estado (keep chip lives inside the else row)
  Eval "document.querySelector('.rule-else .chip-pal').click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelector('.rule-else .slot').click()" | Out-Null; Start-Sleep -Milliseconds 150

  Assert ((Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot.is-filled').length") -eq 4) 'rule 1 complete'
  Assert ((Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot.is-filled').length") -eq 4) 'rule 2 complete'
  ClickPrimary
  Assert ((Eval "window.__bitscape.rt.program !== null") -eq $true) 'fridge program saved'
  Assert ((Eval "window.__bitscape.rt.program.rules.length") -eq 2) 'two rules stored'
  Assert ((Eval "window.__bitscape.rt.program.defaultAction") -eq 'keep') 'default branch keeps state'

  Write-Output '== fridge tests (4) =='
  ClickPrimary
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelectorAll('.test-card').length") -eq 4) 'four test cards'
  ClickPrimary
  Start-Sleep -Milliseconds 11000
  Assert ((Eval "document.querySelectorAll('.test-card[data-state=pass]').length") -eq 4) 'all four tests pass'
  ClickPrimary
  Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'path') 'advances to path'
  1..3 | ForEach-Object { Eval "document.querySelector('.order-card').click()" | Out-Null; Start-Sleep -Milliseconds 180 }
  ClickPrimary
  ClickPrimary
  Start-Sleep -Milliseconds 800
  Assert ((Eval "document.querySelector('.score-num').textContent") -eq '100') 'fridge score 100'
  Assert ((Eval "window.__bitscape.save.results.fridge.score") -eq 100) 'fridge persisted'
  Assert ((Eval "window.__bitscape.save.badges.indexOf('entry') >= 0") -eq $true) 'input explorer badge earned'
  Assert ((Eval "window.__bitscape.save.encyclopedia.indexOf('sensor') >= 0") -eq $true) 'sensor entry unlocked'

  if ($script:errors.Count -gt 0) {
    Write-Output '== console/page errors =='
    $script:errors | ForEach-Object { Write-Output "  ERR $_" }
    throw "$($script:errors.Count) page errors captured"
  }

  Write-Output ''
  Write-Output 'SMOKE TEST 4 PASSED'
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
