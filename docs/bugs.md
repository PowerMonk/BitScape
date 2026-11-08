# Bug log & postmortems

Real bugs found after the first build: what the player saw, what actually caused it, why
the tests missed it, and the guard added so it cannot come back.

---

## #1 — The title screen never disappeared

**Reported symptom.**
Starting the game did not remove the home screen. It stayed stacked over everything,
hiding the world and making the game look broken. It was worse than cosmetic: the overlay
sits above the canvas and accepts pointer events, so it also swallowed every click on the
play area — with a mouse, the game was effectively unplayable.

**Reproduction.**

```
title screen present after enterLab: True      ← should be False
screen-root child count           : 1
element at viewport centre        : title-custom   ← not the canvas
real click sets a move target     : False          ← click never reaches the game
```

**Root cause.**
`#screen-root` is a full-screen overlay container with exactly one writer:
`renderTitle()`. The transitions that *leave* the title screen — `enterLab()` and
`enterLevel()` — updated the screen state (`this.screen = 'lab'`), rebuilt the room and
showed the HUD, but never emptied that container:

```ts
private enterLab() {
  this.closeAllModals();
  this.screen = 'lab';          // state says "lab" …
  …                             // … but #screen-root still holds
                                //     <div class="screen title-screen">
}
```

Because `.screen` is `position: absolute; inset: 0; pointer-events: auto` and sits above
the canvas in DOM order, the stale view kept painting over the game and intercepting
pointer events indefinitely.

`enterLevel()` had the same hole, and it was reachable directly from the title screen
(*Elegir dispositivo* → level select → pick a device), so both transitions needed the fix.

**Why the automated tests missed it.**

1. **Unit tests never touch the DOM** — they cover the simulator, level data and i18n.
2. **The E2E suites asserted state, not visuals.** They checked `hud.hidden`, chip counts,
   `rt.stage`, scores and panel contents — every one of which was *correct* while the
   overlay covered the screen.
3. **Input was injected with `element.dispatchEvent(...)`, which bypasses browser
   hit-testing.** The event is delivered to its target no matter what is drawn on top, so
   click-to-move "passed" in tests while being blocked for a real user. Nothing in the
   suites asked *what is the topmost element at this point*.

**Fix.** One explicit teardown, called by both transitions:

```ts
/** Unmount whatever full-screen view lives in #screen-root. */
private clearScreens() {
  mount(this.screenRoot, []);
}

private enterLab() {
  this.closeAllModals();
  this.clearScreens();   // ← added
  this.screen = 'lab';
  …
}
```

`showTitle()` still renders into the container, so returning to the menu from pause works
exactly as before.

**Regression guards** (added to `tests/e2e/bitscape_smoke.ps1`, section *title overlay*):

| Assertion | What it protects |
| --- | --- |
| `.title-screen === null` after `enterLab` **and** after `enterLevel` | the overlay is actually unmounted |
| `#screen-root.childElementCount === 0` | nothing else lingers in the container |
| `document.elementFromPoint(centre) === canvas` | nothing covers the play area |
| a **real** click via CDP `Input.dispatchMouseEvent` moves the avatar | input reaches the game through genuine browser hit-testing |

The last two are the important ones: they test the *player's* experience rather than the
state object.

**Lesson.**
Assert what the player sees and what real input does — *what is on top*
(`elementFromPoint`) and *does a genuine input event land* — not only what the state
machine reports. Synthetic `dispatchEvent` is fine for driving logic, but it can never
prove that the UI is clickable; at least one test must go through the browser's own
hit-testing path.

---

## #2 — E2E suite reported a failure that was not in the game

**Symptom.**
`bitscape_smoke3.ps1` failed on *"only tutorial unlocked"* even though the game code had
not changed: the level-select dialog showed every device unlocked.

**Root cause (test infrastructure, not the game).**
Each suite launches its own headless Edge on a fixed debug port (9333-9338) with a fresh
`--user-data-dir`. Two problems stacked:

1. **Orphaned browsers.** Cleanup only did `Stop-Process -Id $proc.Id` — the PID returned
   by `Start-Process msedge.exe` is the *launcher*; Edge spawns child processes that
   outlive it. Surviving instances kept their debug ports listening.
2. **Port reuse.** The next run then found its "fixed" port busy, so its own Edge bound a
   different port — while the script still connected to `127.0.0.1:<fixed port>` and was
   therefore talking to the **previous run's browser**, whose profile already contained
   `unlocked = all five` (written earlier by a suite that mutates save state to skip
   ahead and then persists it on a language toggle).

So the assertion was correct; it was evaluating another run's leftover state.

**Fix (all four suites).**

- **Free-port fallback**: if the requested port is already listening, bind a loopback
  socket to port 0 and use whatever the OS hands out.
- **Kill by profile, not by launcher PID**: in `finally`, stop every `msedge.exe` whose
  command line contains this run's `--user-data-dir`.
- **Deterministic state**: right after navigating to the game, `localStorage.clear()` +
  `Page.reload()`, so a reused profile can never leak save data into a run.

Verified: 4/4 suites pass and **zero** BitScape browser processes remain afterwards.

**Lesson.**
When a test fails, check whether the *harness* is observing what it thinks it is.
Assertions about persistent state (unlocks, saves) must be paired with an explicit
guarantee that the state starts clean, and process cleanup must target the whole process
tree, not the PID you happened to spawn.

---

## Found and fixed during development (pre-release)

Not reported by players, but worth recording:

| Bug | Cause | Fix |
| --- | --- | --- |
| Wiring panel did nothing when clicking ports | Click listeners were attached with `layer.querySelectorAll(...)` **before** the columns were appended to `layer`, so zero listeners were ever registered | Query the three column elements directly when building them |
| Pause menu could soft-lock input | The HUD/`Esc` pause called the modal *builder* directly instead of `openPanel()`, so `activeModal`/`modalCount` bookkeeping was bypassed and the open-count could never return to 0 | Route pause through `openPanel({ kind: 'pause' })`; `closeAllModals()` now closes every tracked modal |
| Final challenge could never score 100 | It has no guided *entry* stage, so the 20 entry points were unreachable | Award the entry points when wiring completes on levels without an entry puzzle |
| Step cards reported `data-kind="action"` | Reused the action-chip helper without the kind override, which also made palette indexes ambiguous for the washer's safety action | `actionChip(..., kind)` accepts `'action' \| 'step'` |
