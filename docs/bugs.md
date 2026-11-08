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

## #3 — Two E presses were needed to open a component

**Reported symptom.**
Arriving at the MCU (or any mission-critical pad) and pressing `E` once did nothing
obvious; a second press opened the panel. It felt like the game wanted a "select, then
enter" step that did not exist.

**Root cause.**
Every stage transition queues a BIT line with the new objective, and the `E` handler gave
the dialogue absolute priority:

```ts
if (dialog.isOpen()) dialog.advance();   // first press only finishes the text
else if (near) interact(near);           // second press actually opens the panel
```

So whenever the objective bubble was on screen — which it always is right after a stage
change — arriving at the pad cost one extra press. Nothing was *selected* by that first
press; it only dismissed text, which is why it felt broken.

**Fix.**
Interaction now wins when standing on the pad the current stage needs:

```ts
if (near && this.isActiveHotspot(near)) this.interact(near); // one press
else if (dialog.isOpen()) this.dialog.advance();
else if (near) this.interact(near);
```

No information is lost: the objective stays in the HUD and is repeated as the panel's
subtitle, the bubble is still clickable, and `E` still advances dialogue anywhere else.
As a companion change, `say()` now **queues** dialogue instead of demoting it to a toast
while a panel is open — so the next objective is already waiting the moment the player
closes a panel.

**Regression guard:** `bitscape_smoke5.ps1` — with the dialogue open, a single `E` at the
sensor opens the entry puzzle, and a single `E` at the MCU opens the wiring panel.

---

## #4 — The wiring panel shouted "pick a source first" in red while you were doing it right

**Reported symptom.**
Clicking the first port — a perfectly normal half-step — produced a red error under the
panel ("Elige primero un origen"). Doing it step by step always looked like a mistake.

**Root cause.**
Two problems stacked:

1. **The base `.line-error` style *is* the error style** (red border, red text) and only
   `is-good` existed as a variant. Every message, including progress notes, rendered red.
2. **The message was wrong for the state.** After clicking a source the player does not
   need to be told to pick a source — they need to be told what comes next.

**Fix.**
Feedback became three-toned through `setError(node, msg, kind)`:

| Moment | Tone | Message |
| --- | --- | --- |
| first port clicked | neutral blue (`is-info`) | "Origen listo: ahora elige el destino." (or "Destino elegido: ahora elige el origen." if they started from a destination) |
| valid connection | green (`is-good`) | "Conexión correcta." |
| rejected edge | red + shake | the level's causal explanation (unchanged) |

The panel subtitle now also spells out the two steps and what a green port means.

**Regression guard:** `bitscape_smoke5.ps1` — no feedback before clicking, `is-info`
after the first click, `is-good` after a valid one.

---

## #5 — The amber "press E" highlight stayed on the MCU after saving

**Reported symptom.**
Save the configuration and the stage advances to *test*, but the yellow ring is still on
the MCU even though the game now needs the exterior window ("the third element").

**Root cause.**
`isActiveHotspot()` listed **every pad valid for the stage** instead of the one the player
should go to next. During `test` it returned true for both `monitor` (correct) and
`mcu && programSaved` (a convenience shortcut back to the editor). Both drew the amber
"go here" treatment, so the guidance never visibly moved when the stage changed.

**Fix.**
Exactly one **primary pad** per stage (`primaryHotspot()`): `entry → sensor`,
`wiring`/`program → mcu`, `test`/`path → monitor`. Only it gets the amber highlight; all
other pads stay fully interactive (pressing `E` at the MCU during the test phase still
opens the editor) but no longer compete for attention.

**Regression guard:** `bitscape_smoke5.ps1` — after saving,
`isActiveHotspot(mcu) === false` while `isActiveHotspot(monitor) === true`.

---

## #6 — A failed test wiped the configuration

**Reported symptom (marked as a must-fix).**
Build a program, run the tests, fail — come back and the panel is blank and dead: the
whole configuration had to be rebuilt from scratch.

**Root cause.**
Two bugs in `openProgramPanel`:

1. **No hydration.** The form state (`rows`, `elseAction`, `placed`, `fill`, `safety`) was
   always initialised empty — it never read back `rt.program`, which *was* stored the
   moment you pressed save.
2. **A permanent lock.** `let saved = rt.programSaved` guarded every interaction
   (`select`, `place`, the else branch, `save`), so after the first save the panel was
   both empty **and** inert.

**Fix.**

- **`hydrate()`** rebuilds the entire form from `rt.program` every time the panel opens.
- The edit lock is now `locked = allTestsPassed || completed`: you can edit and re-save
  as many times as you like until the tests actually pass. The footer gains
  **Guardar cambios** next to **Probar sistema**.
- **Wrong parts in red:** on open, the panel re-runs the level's tests against the saved
  program and marks what was involved in a failure —
  - a rule fired and produced the wrong output → that rule's row;
  - no branch matched → the branch that *should* have fired, otherwise the default row;
  - washer: the broken cycle slot, or the fill row, or the safety row.

  A neutral note explains it: *"En rojo: los elementos que intervinieron en una prueba
  fallida. Corrígelos y guarda de nuevo."* The marks clear as soon as you save again.

**Regression guard:** `bitscape_smoke5.ps1` — deliberately fail a test, reopen the panel:
previous rule still filled, failed branch marked red with the explanatory note, panel
still editable, correction saved, marks cleared, and the corrected program then passes
both tests.

---

## Found and fixed during development (pre-release)

Not reported by players, but worth recording:

| Bug | Cause | Fix |
| --- | --- | --- |
| Wiring panel did nothing when clicking ports | Click listeners were attached with `layer.querySelectorAll(...)` **before** the columns were appended to `layer`, so zero listeners were ever registered | Query the three column elements directly when building them |
| Pause menu could soft-lock input | The HUD/`Esc` pause called the modal *builder* directly instead of `openPanel()`, so `activeModal`/`modalCount` bookkeeping was bypassed and the open-count could never return to 0 | Route pause through `openPanel({ kind: 'pause' })`; `closeAllModals()` now closes every tracked modal |
| Final challenge could never score 100 | It has no guided *entry* stage, so the 20 entry points were unreachable | Award the entry points when wiring completes on levels without an entry puzzle |
| Step cards reported `data-kind="action"` | Reused the action-chip helper without the kind override, which also made palette indexes ambiguous for the washer's safety action | `actionChip(..., kind)` accepts `'action' \| 'step'` |
