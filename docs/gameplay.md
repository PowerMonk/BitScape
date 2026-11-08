# Gameplay & design

## The loop

Every device is repaired through the same four-step pipeline, which mirrors how an
embedded system actually works:

```
ENTRADA            PROCESAMIENTO         SALIDA            PRUEBA
what data     →    what the program  →   what action   →   does it respond?
arrives            decides                executes
```

The player walks between three zones of a room, and each zone has an interactive pad:

| Zone | Pad opens | Player must |
| --- | --- | --- |
| Entrada | signal cards | pick the datum the device actually needs |
| Procesamiento | wiring panel → block panel | connect ports, then write the program |
| Salida / exterior window | test panel | prove it with several different inputs |
| (after tests) | path recap | order the three signal cards |

Finishing all five stages awards **100 points** and a badge.

## The five devices

| # | Device | Teaches | Unique twist |
| --- | --- | --- | --- |
| 0 | Training board (tutorial) | controls + input/output basics | button → indicator, IF/ELSE |
| 1 | Refrigerator | thresholds and *state* | two limits (≥6 °C on, ≤3 °C off) + "keep previous state" in between |
| 2 | Washing machine | sequences, loops, safety | order 6 cycle steps, build a fill condition and a door-safety rule |
| 3 | Mobile robot | sensor → decision → actuator | choose the sensor, read magnitudes, strict `< 20 cm` threshold |
| 4 | Automatic fan (final) | transfer of learning | **no guided entry**: free wiring with wrong-input/output rejection |

Each level is a `LevelDef` in `src/data/levels.ts` — copy, hotspots, puzzles and test cases
are all data; the engine is shared.

## Puzzle types

### 1. Choice (`ui/panels/choice.ts`)
Card selection used for "identify the input" and for the washer's door decision. Wrong
answers never say "incorrect": the card shakes and BIT explains *why* that datum or action
doesn't fit. Levels may stack several rounds (the robot asks for the sensor first, then for
the closest reading).

### 2. Wiring (`ui/panels/wiring.ts`)
Click a source port, click a destination. Valid topology is `source → controller input`
and `controller output → sink`; everything else is rejected with level-authored feedback
("the alarm warns, but it doesn't lower the temperature"). Connections are drawn as SVG
beziers with a travelling data dot. The stage completes automatically when every *required*
edge exists; an ↩ button undoes the last one.

### 3. Blocks (`ui/panels/blocks.ts`)
Select-then-place (works with mouse and touch):

- **Rule mode** — `SI <sensor> <op> <value> ENTONCES <action>` rows plus an optional
  "any other case" branch (`conservar el estado anterior` counts as an action).
- **Sequence mode** (washer) — three sections in one panel: order the 6 cycle steps,
  build `MIENTRAS nivel_agua < objetivo`, and build `SI puerta … ENTONCES detener`.

Chips are type-filtered by what is already placed (boolean sensors only offer `=`/`!=`
and boolean values), so the palette shrinks to what makes sense.

### 4. Test runner (`ui/panels/tests.ts`)
Runs **every** test case of the level in sequence, animating three steps per case:

```
1 Lectura → 2 Decisión → 3 Salida
```

while the room's exterior window (thermometer, drum, robot track, fan) reacts live. Each
case is judged by `runTest()` against the program the player built — never against click
order. Failures show `expected` vs `actual` plus a level-authored explanation, and the
player can correct the program without losing any progress.

### 5. Path recap (`ui/panels/order.ts`)
The closing puzzle of every device: order three cards (e.g. *temperature reading →
control condition → fan action*). Same component is reused for the washer's cycle order.

## Scoring

| Criterion | Points |
| --- | ---: |
| Identify the input | 20 |
| Configure the program | 30 |
| Connect the output | 20 |
| Pass all tests | 20 |
| Rebuild the signal path | 10 |
| **Total** | **100** |

Points are awarded on completion of each stage and are never deducted for experimenting —
a level always ends at 100 once understood (the final challenge has no guided entry stage,
so its input points are granted when the wiring is done). Results also report `n of m`
tests passed, the earned badge and the one-line signal flow.

## Rewards

- **Badges** (`entry`, `program`, `output`, `final`) unlock encyclopedia entries.
- **Encyclopedia**: five cards — embedded system, microcontroller, sensor, actuator,
  program — unlocked as you progress, each tied to the device you just repaired.
- **Save data** (`src/game/progress.ts`, `localStorage`): language, name, suit colour,
  unlocked devices, per-device scores, badges, encyclopedia, intro-seen, reduced motion.

## Difficulty & hints

No timers, no game over. Each stage has three optional hints (conceptual → applied →
guided); the HUD shows `n/3` and disables itself at three. Hints work from the HUD *and*
from inside a modal (as a toast when dialogue would be covered).

## Accessibility & input

- `WASD`/arrows, click-to-move, `E`/click to interact, `P` hint, `Esc` pause.
- Touch devices get an on-screen D-pad + `E` button (auto-detected via `pointer: coarse`).
- Modals trap focus, close on `Esc`, expose ARIA roles; BIT dialogue is announced through
  the DOM.
- Reduced-motion setting (and OS preference) disables particles, shake and transitions.
- Language can be switched at any moment — even mid-puzzle — because panels rebuild from
  `LevelRuntime` and lose no state.

## Language

`src/i18n/dict.ts` holds every UI string as `key: { es, en }`; level copy carries `Bi`
pairs inline. The active language is module state (`setLang`/`t`/`bi`), also mirrored on
`<html lang>` and on the canvas label renderer (`setCanvasLang`), which is why room
backgrounds are cached per language.
