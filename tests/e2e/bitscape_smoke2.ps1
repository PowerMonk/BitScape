# BitScape smoke test #2: washing machine (sequence + fill + safety)
# and the final fan challenge (free assembly with wrong-input rejection).
param(
  [string]$Url = 'http://localhost:4173/',
  [int]$Port = 9336
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

$profile = Join-Path $env:TEMP ("bitscape_cdp2_" + [guid]::NewGuid().ToString('N'))
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
  function Invoke-Cdp([string]$method, [hashtable]$params, [int]$timeoutMs = 20000) {
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

  $null = Invoke-Cdp 'Runtime.enable' @{}
  $null = Invoke-Cdp 'Page.enable' @{}
  $null = Invoke-Cdp 'Page.navigate' @{ url = $Url }
  Start-Sleep -Seconds 2
  # Deterministic state: wipe any save left behind by a reused profile.
  $null = Eval 'localStorage.clear()'
  $null = Invoke-Cdp 'Page.reload' @{}
  Start-Sleep -Seconds 2

  Write-Output '== jump to washing machine =='
  # unlock everything through the QA hook so we can test any device
  Eval 'window.__bitscape.save.unlocked = ["tutorial","fridge","washer","robot","fan"]' | Out-Null
  Eval 'window.__bitscape.enterLab()' | Out-Null
  Start-Sleep -Milliseconds 400
  Eval "window.__bitscape.enterLevel('washer')" | Out-Null
  Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'entry') 'washer starts at entry'
  1..6 | ForEach-Object { Eval 'window.__bitscape.dialog.advance()' | Out-Null; Start-Sleep -Milliseconds 60 }

  Write-Output '== door decision (entry) =='
  Eval 'window.__bitscape.openPanel({kind:"entry"})' | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelectorAll('.choice-card').length") -eq 3) 'three decisions'
  Eval "document.querySelectorAll('.choice-card')[0].click()" | Out-Null   # start spinning = wrong
  Start-Sleep -Milliseconds 300
  Assert ((Eval "document.querySelector('.line-error.is-visible') !== null") -eq $true) 'dangerous answer rejected'
  Eval "document.querySelectorAll('.choice-card')[1].click()" | Out-Null   # keep stopped = correct
  Start-Sleep -Milliseconds 900
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'wiring') 'advances to wiring'

  Write-Output '== door wiring =='
  Eval 'window.__bitscape.openPanel({kind:"wiring"})' | Out-Null
  Start-Sleep -Milliseconds 500
  Assert ((Eval "document.querySelectorAll('.wire-node').length") -eq 4) 'four ports'
  Eval "document.querySelector('.wire-node[data-id=door]').click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelector('.wire-node[data-id=mcuIn]').click()" | Out-Null; Start-Sleep -Milliseconds 300
  Eval "document.querySelector('.wire-node[data-id=mcuOut]').click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelector('.wire-node[data-id=motor]').click()" | Out-Null; Start-Sleep -Milliseconds 400
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 2) 'both edges connected'
  ClickPrimary
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'program') 'advances to program'

  Write-Output '== sequence + fill + safety program =='
  Eval 'window.__bitscape.openPanel({kind:"program"})' | Out-Null
  Start-Sleep -Milliseconds 600
  Assert ((Eval "document.querySelectorAll('.order-slots .slot').length") -eq 6) 'six cycle slots'
  Assert ((Eval "document.querySelectorAll('.rule-row').length") -eq 2) 'fill and safety rows'
  Assert ((Eval "document.querySelectorAll('.chip-pal[data-kind=step]').length") -eq 6) 'six step cards'

  for ($i = 0; $i -lt 6; $i++) {
    Eval "document.querySelectorAll('.chip-pal[data-kind=step]')[$i].click()" | Out-Null
    Start-Sleep -Milliseconds 140
    Eval "document.querySelectorAll('.order-slots .slot')[$i].click()" | Out-Null
    Start-Sleep -Milliseconds 140
  }
  Assert ((Eval "document.querySelectorAll('.order-slots .slot.is-filled').length") -eq 6) 'cycle fully ordered'

  # fill condition: MIENTRAS agua < objetivo(100)
  Eval "document.querySelectorAll('.chip-pal[data-kind=sensor]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.chip-pal[data-kind=op]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[1].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.chip-pal[data-kind=value]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[2].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Assert ((Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot.is-filled').length") -eq 3) 'fill condition complete'

  # safety: SI puerta = abierta ENTONCES detener motor y mostrar aviso
  Eval "document.querySelectorAll('.chip-pal[data-kind=sensor]')[1].click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.chip-pal[data-kind=op]')[4].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot')[1].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.chip-pal[data-kind=value]')[4].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot')[2].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.chip-pal[data-kind=action]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot')[3].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Assert ((Eval "document.querySelectorAll('.rule-row')[1].querySelectorAll('.slot.is-filled').length") -eq 4) 'safety condition complete'

  ClickPrimary
  Assert ((Eval "window.__bitscape.rt.program !== null") -eq $true) 'program saved'
  Assert ((Eval "window.__bitscape.rt.program.kind") -eq 'sequence') 'sequence program stored'
  Assert ((Eval "window.__bitscape.rt.program.steps.length") -eq 6) 'six steps stored'
  Assert ((Eval "!!window.__bitscape.rt.program.fill && !!window.__bitscape.rt.program.safety") -eq $true) 'fill + safety stored'

  Write-Output '== washer tests (6) =='
  ClickPrimary  # run the tests
  Start-Sleep -Milliseconds 500
  Assert ((Eval "document.querySelectorAll('.test-card').length") -eq 6) 'six test cards'
  ClickPrimary  # ejecutar prueba
  Start-Sleep -Milliseconds 17000
  Assert ((Eval "document.querySelectorAll('.test-card[data-state=pass]').length") -eq 6) 'all six tests pass'
  Assert ((Eval "document.querySelector('.test-verdict.is-good') !== null") -eq $true) 'verdict shown'
  ClickPrimary  # continue -> path
  Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'path') 'advances to path'

  Write-Output '== path recap =='
  1..3 | ForEach-Object { Eval "document.querySelector('.order-card').click()" | Out-Null; Start-Sleep -Milliseconds 180 }
  ClickPrimary  # check
  Assert ((Eval "document.querySelector('.line-error.is-good') !== null") -eq $true) 'path confirmed'
  ClickPrimary  # continue -> results
  Start-Sleep -Milliseconds 800
  Assert ((Eval "document.querySelector('.score-num').textContent") -eq '100') 'washer score 100'
  Assert ((Eval "window.__bitscape.save.results.washer.score") -eq 100) 'washer persisted'
  Assert ((Eval "window.__bitscape.save.badges.indexOf('program') >= 0") -eq $true) 'program badge earned'
  Assert ((Eval "window.__bitscape.save.encyclopedia.indexOf('program') >= 0") -eq $true) 'program encyclopedia entry'

  Write-Output '== final fan challenge =='
  Eval 'window.__bitscape.enterLab()' | Out-Null; Start-Sleep -Milliseconds 400
  Eval "window.__bitscape.enterLevel('fan')" | Out-Null; Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'wiring') 'fan starts at wiring (no guided entry)'
  1..6 | ForEach-Object { Eval 'window.__bitscape.dialog.advance()' | Out-Null; Start-Sleep -Milliseconds 60 }

  Eval 'window.__bitscape.openPanel({kind:"wiring"})' | Out-Null
  Start-Sleep -Milliseconds 500
  Assert ((Eval "document.querySelectorAll('.wire-node').length") -eq 6) 'two sensors and two outputs available'
  # wrong input: distance sensor
  Eval "document.querySelector('.wire-node[data-id=dist]').click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelector('.wire-node[data-id=mcuIn]').click()" | Out-Null; Start-Sleep -Milliseconds 350
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 0) 'distance input rejected'
  Assert ((Eval "document.querySelector('.line-error.is-visible') !== null") -eq $true) 'rejection explained'
  # wrong output: indicator
  Eval "document.querySelector('.wire-node[data-id=temp]').click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelector('.wire-node[data-id=mcuIn]').click()" | Out-Null; Start-Sleep -Milliseconds 350
  Eval "document.querySelector('.wire-node[data-id=mcuOut]').click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelector('.wire-node[data-id=led]').click()" | Out-Null; Start-Sleep -Milliseconds 350
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 1) 'indicator output rejected, temperature kept'
  Eval "document.querySelector('.wire-node[data-id=mcuOut]').click()" | Out-Null; Start-Sleep -Milliseconds 200
  Eval "document.querySelector('.wire-node[data-id=fan]').click()" | Out-Null; Start-Sleep -Milliseconds 400
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 2) 'fan output accepted'
  ClickPrimary
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'program') 'advances to program'

  Write-Output '== fan program =='
  Eval 'window.__bitscape.openPanel({kind:"program"})' | Out-Null
  Start-Sleep -Milliseconds 500
  Assert ((Eval "document.querySelectorAll('.rule-row').length") -eq 2) 'rule + else row'
  # SI temp >= 30 ENTONCES encender ventilador ; otro caso apagar
  Eval "document.querySelectorAll('.chip-pal[data-kind=sensor]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.chip-pal[data-kind=op]')[3].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[1].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.chip-pal[data-kind=value]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[2].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.chip-pal[data-kind=action]')[0].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.rule-row')[0].querySelectorAll('.slot')[3].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelectorAll('.chip-pal[data-kind=action]')[1].click()" | Out-Null; Start-Sleep -Milliseconds 150
  Eval "document.querySelector('.rule-else .slot').click()" | Out-Null; Start-Sleep -Milliseconds 150
  ClickPrimary
  Assert ((Eval "window.__bitscape.rt.program !== null") -eq $true) 'fan program saved'

  Write-Output '== fan tests =='
  ClickPrimary
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelectorAll('.test-card').length") -eq 2) 'two fan tests'
  ClickPrimary
  Start-Sleep -Milliseconds 7000
  Assert ((Eval "document.querySelectorAll('.test-card[data-state=pass]').length") -eq 2) 'both fan tests pass'
  ClickPrimary
  Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'path') 'advances to path'
  1..3 | ForEach-Object { Eval "document.querySelector('.order-card').click()" | Out-Null; Start-Sleep -Milliseconds 180 }
  ClickPrimary
  ClickPrimary
  Start-Sleep -Milliseconds 800
  Assert ((Eval "document.querySelector('.score-num').textContent") -eq '100') 'fan score 100'
  Assert ((Eval "window.__bitscape.save.results.fan.score") -eq 100) 'fan persisted'
  Assert ((Eval "window.__bitscape.save.badges.indexOf('final') >= 0") -eq $true) 'final badge earned'
  Assert ((Eval "window.__bitscape.save.encyclopedia.indexOf('mcu') >= 0") -eq $true) 'microcontroller entry unlocked'

  Write-Output '== pause + hints =='
  Eval 'window.__bitscape.enterLab()' | Out-Null; Start-Sleep -Milliseconds 400
  Eval "window.__bitscape.enterLevel('robot')" | Out-Null; Start-Sleep -Milliseconds 600
  Eval 'window.__bitscape.openPause()' | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelector('.modal') !== null") -eq $true) 'pause modal opens'
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn, .modal .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelectorAll('.modal').length") -eq 0) 'resume closes pause'
  $tier0 = Eval 'window.__bitscape.hintTier'
  Eval 'window.__bitscape.hint()' | Out-Null
  Start-Sleep -Milliseconds 300
  $tier1 = Eval 'window.__bitscape.hintTier'
  Assert ($tier1 -eq ([int]$tier0 + 1)) 'hint advances the tier'
  Eval 'window.__bitscape.hint()' | Out-Null; Eval 'window.__bitscape.hint()' | Out-Null; Eval 'window.__bitscape.hint()' | Out-Null
  Start-Sleep -Milliseconds 300
  Assert ((Eval 'window.__bitscape.hintTier') -eq 3) 'hints capped at three'

  if ($script:errors.Count -gt 0) {
    Write-Output '== console/page errors =='
    $script:errors | ForEach-Object { Write-Output "  ERR $_" }
    throw "$($script:errors.Count) page errors captured"
  }

  Write-Output ''
  Write-Output 'SMOKE TEST 2 PASSED'
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
