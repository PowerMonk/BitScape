# Architecture

## 1. Boot sequence

```
index.astro  ── static HTML shell + <script> ──►  src/game/main.ts
   │                                                  │
   ├─ #game        <canvas>                           ├─ boot() on DOMContentLoaded
   ├─ #hud         top bar (DOM)                      ├─ new Game(...)
   ├─ #screen-root title screen / full screens        └─ game.start()  → loop.start()
   ├─ #dialog-root BIT speech bubble
   ├─ #toast-root  transient hints
   ├─ #touch-root  on-screen dpad (touch devices only)
   └─ #modal-root  every puzzle/menu modal
```

`Game`'s constructor wires everything: renderer, input (with a client→virtual coordinate
mapper), particles, the BIT dialog, the toast, the persisted save
(`localStorage` key `bitscape.save.v1`), the active language, and the rAF loop.

## 2. The frame loop

`src/game/engine/loop.ts` runs `update(dt)` then `render(dt)` every animation frame, with
`dt` clamped to 50 ms so a backgrounded tab never teleports the player.

**`update(dt)`** (in `game.ts`), in order:

1. advance clock, update particles and the dialogue typewriter;
2. reconcile panels: if a panel is recorded but `modalCount() === 0`, the player closed it →
   drop the reference;
3. `dialog.tryFlush(modalOpen)` — start queued dialogue only when no modal is in the way;
4. hotkeys: `Esc` → pause, `P` → hint (both only when no modal is open);
5. if no modal and we are in a room: read movement keys, step the player against room
   solids, drain queued pointer clicks (hotspot first, otherwise click-to-move), resolve the
   nearest hotspot, handle `E`;
6. `input.endFrame()` — clears per-frame edges (pressed keys, clicks).

**`render(dt)`** draws either the animated title backdrop or the room scene:

```
blit cached background  →  props  →  exterior window content  →  hotspot pads
→  player name  →  avatar  →  particles  →  interaction prompt
```

## 3. Screens and state

Three top-level screens, stored in `Game.screen`:

| Screen | Rendered by | Notes |
| --- | --- | --- |
| `title` | DOM (`menus.renderTitle`) over an animated canvas backdrop | name/suit customisation, menus |
| `lab` | canvas room + HUD | four device cabinets + encyclopedia terminal; cabinets light up when repaired |
| `level` | canvas room + HUD + panels | one room per device, driven by `LevelRuntime` |

Transitions: `showTitle()` → `enterLab()` → `enterLevel(id)` → (results) → `enterLab()`.
Each transition calls `closeAllModals()`, rebuilds the room and re-renders the HUD.

### LevelRuntime — the source of truth for a playthrough

```ts
{ level, stage, entryRound, edges[], program, programSaved,
  testsPassed{}, allTestsPassed, pathOrder[], pathDone,
  hintsUsed{}, scores{entry,wiring,program,tests,path}, completed }
```

Panels mutate this object and nothing else. The HUD reads it to derive stage chips and the
objective line; `finishLevel()` folds it into the persistent save.

## 4. Stage pipeline

```
entry ──► wiring ──► program ──► test ──► path ──► done
  │          │          │          │        │
choice    click-to-   block      runs     order
cards     port        builder    every    three
          wiring      + save     case     cards
```

`Game.interact(hotspot)` dispatches on `rt.stage` + hotspot role, so the *same* room pad
opens a different panel depending on progress (and falls back to an inspection card, which
is always available). `advance(stage)` resets the hint tier, re-renders the HUD and queues
the new objective as a BIT line.

## 5. Canvas vs DOM split

| Canvas (game.ts + world/) | DOM (ui/) |
| --- | --- |
| world, avatar, props, exterior view, hotspot pads, particles, title backdrop | HUD, dialogue, all puzzle panels, menus, results, modals, touch controls |

Rationale: canvas gives full control of the "cool" factor and stays fast (one cached
background blit per frame), while DOM gives crisp scalable text, real buttons/focus/ARIA,
CSS animation, and trivial re-render on language change.

The coordinate bridge is `Renderer.toVirtual()`: the canvas is letterboxed to a fixed
**960×540** virtual space, and `Input` maps every pointer event through it, so game logic
always works in virtual pixels regardless of window size or DPR.

## 6. Rendering performance

- Room backgrounds (`buildBackground`) are drawn **once** into an offscreen canvas, keyed by
  `roomId|language`, then blitted. Grid, solder traces and zone platforms cost nothing per
  frame.
- Only ~10 live objects are drawn per frame (props, 4 hotspots, avatar, particles).
- No images to load, no fonts to fetch: first paint is the CSS title screen; the game boots
  in well under a second even from `file://`.
- The production build inlines CSS + JS into a single ~147 kB `dist/index.html`
  (`scripts/postbuild.mjs`), which is also what makes double-click play work.

## 7. Error/feedback philosophy

There are no lives, timers or score penalties. Every failure path produces a *causal*
message: a rejected wire explains why that port is wrong, a failed test shows
`expected` vs `actual` plus a level-authored hint, a wrong ordering names the first stage
that cannot run. Hints are three optional tiers per stage (concept → applied → guided) and
never block progress.
