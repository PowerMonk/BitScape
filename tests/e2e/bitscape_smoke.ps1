# BitScape end-to-end smoke test over the Chrome DevTools Protocol.
# Plays the whole tutorial level headlessly and reports failures.
param(
  [string]$Url = 'http://localhost:4173/',
  [int]$Port = 9333
)

$ErrorActionPreference = 'Stop'
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

  $null = Invoke-Cdp 'Runtime.enable' @{}
  $null = Invoke-Cdp 'Page.enable' @{}
  $null = Invoke-Cdp 'Page.navigate' @{ url = $Url }
  Start-Sleep -Seconds 2

  Write-Output '== boot =='
  Assert ((Eval "!!document.querySelector('.title-screen')") -eq $true) 'title screen renders'
  Assert ((Eval "document.querySelector('.title-logo').textContent") -eq 'BitScape') 'logo reads BitScape'
  Assert ((Eval "typeof window.__bitscape") -eq 'object') 'game instance exposed'

  Write-Output '== lab =='
  Eval 'window.__bitscape.enterLab()' | Out-Null
  Start-Sleep -Milliseconds 600
  Assert ((Eval "document.getElementById('hud').hidden") -eq $false) 'HUD visible in lab'
  Assert ((Eval "document.querySelectorAll('.chip').length") -eq 5) 'lab shows 5 device chips'

  Write-Output '== tutorial level =='
  Eval "window.__bitscape.enterLevel('tutorial')" | Out-Null
  Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'entry') 'starts at entry stage'
  Assert ((Eval "document.querySelectorAll('.chip').length") -eq 5) 'stage chips rendered'
  Assert ((Eval "document.querySelector('#dialog-root .dialog') !== null && !document.querySelector('#dialog-root .dialog').hidden") -eq $true) 'BIT dialogue visible'

  # clear the dialogue so panels are not covered
  1..6 | ForEach-Object { Eval 'window.__bitscape.dialog.advance()' | Out-Null; Start-Sleep -Milliseconds 80 }

  Write-Output '== entry puzzle =='
  Eval 'window.__bitscape.openPanel({kind:"entry"})' | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelectorAll('.choice-card').length") -eq 3) 'three signal cards'
  Eval "document.querySelectorAll('.choice-card')[1].click()" | Out-Null
  Start-Sleep -Milliseconds 300
  Assert ((Eval "document.querySelector('.line-error.is-visible') !== null") -eq $true) 'wrong answer shows feedback'
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'entry') 'still on entry after mistake'
  Eval "document.querySelectorAll('.choice-card')[0].click()" | Out-Null
  Start-Sleep -Milliseconds 900
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'wiring') 'advances to wiring'
  Assert ((Eval "window.__bitscape.rt.scores.entry") -eq 20) 'entry worth 20 points'

  Write-Output '== wiring =='
  Eval 'window.__bitscape.openPanel({kind:"wiring"})' | Out-Null
  Start-Sleep -Milliseconds 500
  Assert ((Eval "document.querySelectorAll('.wire-node').length") -eq 4) 'four ports'
  # wrong edge: source directly to sink is impossible here (button -> led is allowed topology? no: source->sink rejected)
  Eval "document.querySelector('.wire-node[data-id=button]').click()" | Out-Null
  Start-Sleep -Milliseconds 150
  Eval "document.querySelector('.wire-node[data-id=led]').click()" | Out-Null
  Start-Sleep -Milliseconds 300
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 0) 'invalid edge rejected'
  Eval "document.querySelector('.wire-node[data-id=button]').click()" | Out-Null
  Start-Sleep -Milliseconds 150
  Eval "document.querySelector('.wire-node[data-id=mcuIn]').click()" | Out-Null
  Start-Sleep -Milliseconds 300
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 1) 'valid edge accepted'
  Eval "document.querySelector('.wire-node[data-id=mcuOut]').click()" | Out-Null
  Start-Sleep -Milliseconds 150
  Eval "document.querySelector('.wire-node[data-id=led]').click()" | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval "window.__bitscape.rt.edges.length") -eq 2) 'both required edges connected'
  Assert ((Eval "document.querySelector('.wire-banner.is-visible') !== null") -eq $true) 'success banner shown'
  # click the primary footer button (continue)
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'program') 'advances to program'
  Assert ((Eval "window.__bitscape.rt.scores.wiring") -eq 20) 'output worth 20 points'

  Write-Output '== program panel =='
  Eval 'window.__bitscape.openPanel({kind:"program"})' | Out-Null
  Start-Sleep -Milliseconds 500
  Assert ((Eval "document.querySelectorAll('.rule-row').length") -eq 2) 'two rule rows'
  Assert ((Eval "document.querySelectorAll('.slot').length") -ge 5) 'slots rendered'
  # fill rule 1: SI button = true ENTONCES led_on
  function Click-Chip([string]$kind, [int]$index = 0) {
    Eval "document.querySelectorAll('.chip-pal[data-kind=$kind]')[$index].click()" | Out-Null
    Start-Sleep -Milliseconds 120
  }
  function Click-Slot([int]$row, [int]$col) {
    # slots inside a rule row: sensor, op, value, action
    Eval "document.querySelectorAll('.rule-row')[$row].querySelectorAll('.slot')[$col].click()" | Out-Null
    Start-Sleep -Milliseconds 120
  }
  Click-Chip 'sensor' 0; Click-Slot 0 0
  Click-Chip 'op' 0;     Click-Slot 0 1
  Click-Chip 'value' 0;  Click-Slot 0 2
  Click-Chip 'action' 0; Click-Slot 0 3
  Assert ((Eval "window.__bitscape.rt.program === null") -eq $true) 'program not saved yet'
  # else branch: choose led_off
  Eval "document.querySelectorAll('.chip-pal[data-kind=action]')[1].click()" | Out-Null
  Start-Sleep -Milliseconds 120
  Eval "document.querySelector('.rule-else .slot').click()" | Out-Null
  Start-Sleep -Milliseconds 120
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 600
  Assert ((Eval "window.__bitscape.rt.program !== null") -eq $true) 'program saved'
  Assert ((Eval "window.__bitscape.rt.program.kind") -eq 'rule') 'rule program stored'
  Assert ((Eval "window.__bitscape.rt.scores.program") -eq 30) 'program worth 30 points'
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'test') 'advances to test stage'

  Write-Output '== tests =='
  # panel offers "run tests" as primary button
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 700
  Assert ((Eval "document.querySelectorAll('.test-card').length") -eq 2) 'two test cards'
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 6000
  Assert ((Eval "document.querySelectorAll('.test-card[data-state=pass]').length") -eq 2) 'both tests pass'
  Assert ((Eval "document.querySelector('.test-verdict.is-good') !== null") -eq $true) 'verdict shown'
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 800
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'path') 'advances to path'
  Assert ((Eval "window.__bitscape.rt.scores.tests") -eq 20) 'tests worth 20 points'

  Write-Output '== path recap =='
  Assert ((Eval "document.querySelectorAll('.order-card').length") -eq 3) 'three path cards'
  1..3 | ForEach-Object {
    Eval "document.querySelector('.order-card').click()" | Out-Null
    Start-Sleep -Milliseconds 200
  }
  Assert ((Eval "document.querySelectorAll('.order-slot.is-filled').length") -eq 3) 'all slots filled'
  # first click checks the order, the second (now primary) continues to results
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 600
  Assert ((Eval "document.querySelector('.line-error.is-good') !== null") -eq $true) 'path confirmed'
  Eval "Array.from(document.querySelectorAll('.modal-foot .btn')).find(b=>b.classList.contains('btn-primary')).click()" | Out-Null
  Start-Sleep -Milliseconds 900
  Assert ((Eval "document.querySelector('.score-num') !== null") -eq $true) 'results screen shown'
  Assert ((Eval "document.querySelector('.score-num').textContent") -eq '100') 'score is 100'
  Assert ((Eval "window.__bitscape.save.results.tutorial.score") -eq 100) 'progress persisted'
  Assert ((Eval "window.__bitscape.save.unlocked.indexOf('fridge') >= 0") -eq $true) 'next level unlocked'
  Assert ((Eval "window.__bitscape.save.encyclopedia.indexOf('embedded') >= 0") -eq $true) 'encyclopedia entry unlocked'

  Write-Output '== language toggle =='
  Eval 'window.__bitscape.toggleLang()' | Out-Null
  Start-Sleep -Milliseconds 700
  Assert ((Eval "document.querySelector('.score-num') !== null") -eq $true) 'results survive language switch'
  Assert ((Eval "window.__bitscape.save.lang") -in @('es', 'en')) 'language persisted'

  Write-Output '== back to lab =='
  Eval 'window.__bitscape.enterLab()' | Out-Null
  Start-Sleep -Milliseconds 600
  Assert ((Eval "document.getElementById('hud').hidden") -eq $false) 'lab HUD back'
  Assert ((Eval "document.querySelectorAll('.chip-done').length") -ge 1) 'repaired device chip marked done'

  Write-Output '== fridge room renders =='
  Eval "window.__bitscape.enterLevel('fridge')" | Out-Null
  Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'entry') 'fridge starts at entry'
  Assert ((Eval "window.__bitscape.exterior.kind") -eq 'fridge') 'fridge exterior wired up'

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
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 300
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
}
