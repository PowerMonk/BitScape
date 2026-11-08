# BitScape smoke test #3: file:// portability, menus, two-round entry,
# and language switching while a puzzle panel is open.
param(
  [string]$HttpUrl = 'http://localhost:4173/',
  [string]$FileUrl = '',
  [int]$Port = 9337
)

if (-not $FileUrl) {
  $dist = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'dist\index.html'
  $FileUrl = ([Uri]$dist).AbsoluteUri
}

$ErrorActionPreference = 'Stop'
$edge = @(
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Edge/Chrome not found' }

$profile = Join-Path $env:TEMP ("bitscape_cdp3_" + [guid]::NewGuid().ToString('N'))
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

  $null = Invoke-Cdp 'Runtime.enable' @{}
  $null = Invoke-Cdp 'Page.enable' @{}

  Write-Output '== file:// portability =='
  $null = Invoke-Cdp 'Page.navigate' @{ url = $FileUrl }
  Start-Sleep -Seconds 3
  Assert ((Eval "!!document.querySelector('.title-screen')") -eq $true) 'title screen renders from file://'
  Assert ((Eval "typeof window.__bitscape") -eq 'object') 'game boots from file://'
  Assert ((Eval "document.querySelector('.title-logo').textContent") -eq 'BitScape') 'logo correct on file://'

  Write-Output '== back to http =='
  $null = Invoke-Cdp 'Page.navigate' @{ url = $HttpUrl }
  Start-Sleep -Seconds 2

  Write-Output '== menus =='
  Eval 'window.__bitscape.openPanel({kind:"encyclopedia"})' | Out-Null
  Start-Sleep -Milliseconds 500
  Assert ((Eval "document.querySelectorAll('.enc-card').length") -eq 5) 'encyclopedia has five entries'
  Assert ((Eval "document.querySelectorAll('.enc-card.is-locked').length") -eq 5) 'all locked on a fresh profile'
  Eval 'document.querySelector(".modal .icon-btn").click()' | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval "document.querySelectorAll('.modal').length") -eq 0) 'encyclopedia closes'

  Eval 'window.__bitscape.openPanel({kind:"levelselect"})' | Out-Null
  Start-Sleep -Milliseconds 500
  Assert ((Eval "document.querySelectorAll('.level-card').length") -eq 5) 'level select lists five devices'
  Assert ((Eval "document.querySelectorAll('.level-card.is-locked').length") -eq 4) 'only tutorial unlocked'
  Eval 'document.querySelector(".modal .icon-btn").click()' | Out-Null
  Start-Sleep -Milliseconds 400

  Eval 'window.__bitscape.openPanel({kind:"howto"})' | Out-Null
  Start-Sleep -Milliseconds 500
  Assert ((Eval "document.querySelectorAll('.howto-box').length") -eq 2) 'how-to shows controls and flow'
  Eval 'document.querySelector(".modal .icon-btn").click()' | Out-Null
  Start-Sleep -Milliseconds 400

  Write-Output '== robot: two-round entry =='
  Eval 'window.__bitscape.save.unlocked = ["tutorial","fridge","washer","robot","fan"]' | Out-Null
  Eval "window.__bitscape.enterLevel('robot')" | Out-Null
  Start-Sleep -Milliseconds 700
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'entry') 'robot starts at entry'
  1..6 | ForEach-Object { Eval 'window.__bitscape.dialog.advance()' | Out-Null; Start-Sleep -Milliseconds 50 }

  Eval 'window.__bitscape.openPanel({kind:"entry"})' | Out-Null
  Start-Sleep -Milliseconds 400
  # round 1: pick the temperature sensor (wrong)
  Eval "document.querySelectorAll('.choice-card')[0].click()" | Out-Null
  Start-Sleep -Milliseconds 300
  Assert ((Eval "window.__bitscape.rt.entryRound") -eq 0) 'stays on round 1 after a mistake'
  Eval "document.querySelectorAll('.choice-card')[0].click()" | Out-Null  # distance = correct (index 0 of the three)
  Start-Sleep -Milliseconds 900
  Assert ((Eval "window.__bitscape.rt.entryRound") -eq 1) 'advances to round 2'
  Assert ((Eval "document.querySelectorAll('.choice-card').length") -eq 3) 'round 2 shows three readings'
  # round 2: 60 cm is not the closest
  Eval "document.querySelectorAll('.choice-card')[0].click()" | Out-Null
  Start-Sleep -Milliseconds 300
  Assert ((Eval "window.__bitscape.rt.entryRound") -eq 1) 'wrong reading keeps round 2'
  Eval "document.querySelectorAll('.choice-card')[2].click()" | Out-Null  # 12 cm
  Start-Sleep -Milliseconds 900
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'wiring') 'robot entry complete'
  Assert ((Eval "window.__bitscape.rt.scores.entry") -eq 20) 'entry points awarded after both rounds'

  Write-Output '== language switch with a panel open =='
  Eval 'window.__bitscape.openPanel({kind:"wiring"})' | Out-Null
  Start-Sleep -Milliseconds 500
  $langBefore = Eval 'window.__bitscape.save.lang'
  Eval 'window.__bitscape.toggleLang()' | Out-Null
  Start-Sleep -Milliseconds 700
  $langAfter = Eval 'window.__bitscape.save.lang'
  Assert ($langBefore -ne $langAfter) 'language flips'
  Assert ((Eval "document.querySelectorAll('.wire-node').length") -eq 4) 'wiring panel rebuilt in the new language'
  Assert ((Eval "document.querySelectorAll('.modal').length") -eq 1) 'exactly one panel after rebuild'
  Assert ((Eval "window.__bitscape.rt.stage") -eq 'wiring') 'progress preserved across language switch'

  Write-Output '== HUD hint button =='
  $tierBefore = Eval 'window.__bitscape.hintTier'
  Eval "document.querySelector('.hud-hint').click()" | Out-Null
  Start-Sleep -Milliseconds 400
  Assert ((Eval 'window.__bitscape.hintTier') -eq ([int]$tierBefore + 1)) 'HUD hint button works over a panel'

  if ($script:errors.Count -gt 0) {
    Write-Output '== console/page errors =='
    $script:errors | ForEach-Object { Write-Output "  ERR $_" }
    throw "$($script:errors.Count) page errors captured"
  }

  Write-Output ''
  Write-Output 'SMOKE TEST 3 PASSED'
}
finally {
  if ($ws) { try { $ws.Dispose() } catch {} }
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 300
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
}
