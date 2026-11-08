# Code guide

A tour of the source tree. Read alongside [architecture.md](architecture.md).

## Entry points

| File | Responsibility |
| --- | --- |
| `src/pages/index.astro` | The only page: HTML shell, CSS import, `<script>` that pulls in the game. |
| `src/game/main.ts` | `boot()`: locates the DOM roots, constructs `Game`, starts it, exposes `window.__bitscape` (QA hook used by the E2E suites). |
| `src/game/game.ts` | **The orchestrator** (~900 lines). Owns the loop, screens, stage flow, panel routing, hints, scoring, language switching, touch controls and the render pass. |

Key methods in `Game`:

- `showTitle / enterLab / enterLevel` — screen transitions (each closes all modals).
- `update(dt)` / `render(dt)` — see architecture §2.
- `interact(hotspot)` — stage + role dispatch to the right panel (or an inspection card).
- `openPanel(spec)` / `createPanel(spec)` — the single place panels are created, so the
  current panel can be rebuilt on a language switch.
- `advance(stage)` — stage change + hint reset + HUD re-render + BIT objective line.
- `onEntryDone → onWiringDone → onProgramSaved → onRunTests → onTestsPassed → onPathDone
  → finishLevel` — the pipeline in gameplay.md.
- `finishLevel()` — folds `LevelRuntime` into the save (score, badges, encyclopedia,
  next unlock), fires confetti, opens the results screen.

## Engine (`src/game/engine/`)

| File | Contents |
| --- | --- |
| `loop.ts` | `createLoop(update, render)` — rAF with a clamped delta. |
| `renderer.ts` | Fixed **960×540** virtual canvas, letterboxing, DPR ≤ 2, `toVirtual()` mapping, `begin()/end()` transform helpers. |
| `input.ts` | `Input` class: held/pressed key sets (by `KeyboardEvent.code`), pointer sample in virtual coords, queued clicks, click-vs-drag detection, `typing` guard for form fields, `endFrame()` edge clearing. |
| `draw.ts` | Flat-cartoon primitives: `rr` (rounded rect path), `box` (fill + thick ink outline + drop shadow), `text`, `wrapText`, `shadowEllipse`, `withGlow`, `dot`, and `icon()` — small canvas glyphs (thermometer, motor, chip…). `FONT_STACK` is a system font (no webfont download). |
| `particles.ts` | `burst()/update()/draw()` — dust puffs, connection sparks, result confetti; fully disabled by reduced motion. |
| `tween.ts` | `clamp/lerp`, easing curves, `approach()` (frame-rate-independent smoothing), `sleep()` (used by the test runner choreography). |

## World (`src/game/world/`)

| File | Contents |
| --- | --- |
| `room.ts` | Room model (`RoomDef`, `Hotspot`, `PropDef`, `ZoneDef`, `ExteriorState`), `buildBackground()` (seeded procedural PCB floor, zone platforms, window frame — cached offscreen), `drawProp()` (9 prop kinds), `drawExterior()` (the live "outside view": board/fridge/washer/robot/fan), `drawHotspot()` (pulsing pad + label + `E` hint), `drawPrompt()`. Also `setCanvasLang()` for static canvas labels. |
| `rooms.ts` | `makeLevelRoom()` — the shared three-zone layout every device uses; `makeLabRoom()` — hub with four device cabinets (state: locked/active/repaired) and the encyclopedia terminal. |
| `player.ts` | Top-down avatar: acceleration movement, click-to-move target, axis-separated circle-vs-AABB collision with wall sliding, walk cycle/bob, procedural character drawing. |

## Puzzles (`src/game/puzzles/` + `src/game/ui/panels/`)

| File | Contents |
| --- | --- |
| `puzzles/simulate.ts` | The judge. `compare`, `evalCond`, `evalRules` (first matching rule wins, else the default branch), `applyAction`, `runTest` (dispatches `rule` / `sequence` / `fill` / `safety` test kinds) and `diff` producing `expected vs actual` mismatches. **Pure functions — unit tested.** |
| `ui/panels/common.ts` | Shared widgets: palette chips (type-tagged via `data-kind`), slots, section titles, error line, footer buttons, `L()` bilingual label resolver. |
| `ui/panels/choice.ts` | Card picker for entry rounds; wrong answers render the level's `wrong` copy. |
| `ui/panels/wiring.ts` | Port-to-port wiring with topology rules, level `reject` messages, SVG bezier edges with animated data dots, undo, auto-complete banner. |
| `ui/panels/blocks.ts` | Both program builders (rule mode and sequence mode) plus `KEEP_ACTION`; select-then-place slots, type-filtered palettes, validation, save → "run tests". |
| `ui/panels/order.ts` | The ordering puzzle, reused for cycle order and the signal-path recap. |
| `ui/panels/tests.ts` | Test runner UI: builds the action/sensor maps from the level, walks every case through Lectura → Decisión → Salida with delays, patches the exterior view, renders verdicts and per-case feedback. |

## UI shell (`src/game/ui/`)

| File | Contents |
| --- | --- |
| `dom.ts` | `el()/mount()/clear()` — the tiny hyperscript everything is built from (so a language switch = rebuild). |
| `modal.ts` | `openModal()` — focus trap, `Esc` close, open-count bookkeeping (`modalCount()`, `closeAllModals()`). Variants: `wide`, `narrow`, `side` (side keeps the exterior window visible during tests). |
| `hud.ts` | Top bar: title, stage chips, objective, hint/language/pause buttons. |
| `dialog.ts` | `DialogBox` (BIT bubble, typewriter, queued lines that wait for modals to close) and `Toast`. |
| `menus.ts` | Title screen, pause, how-to, encyclopedia, level select, results, confirm, inspection card. |

## Data & i18n

| File | Contents |
| --- | --- |
| `src/game/types.ts` | The whole domain model: `LevelDef`, `Program`, `Rule`, `Cond`, `TestDef`, `ProgramBuilder`, `SaveData`, `SUITS`. |
| `src/data/levels.ts` | All five `LevelDef`s (bilingual copy, hotspots, wiring graphs, program palettes, test cases with expected outputs, path puzzles), `LEVEL_ORDER`, `nextLevel()`, `SCORE`. |
| `src/game/runtime.ts` | `LevelRuntime` (per-playthrough state), `createRuntime`, `requiredDone`, `totalScore`. |
| `src/game/progress.ts` | `localStorage` load/save/erase, unlock and completion helpers. |
| `src/i18n/dict.ts` | Every UI string, `key: { es, en }`, plus `translate()` and `fill()` (placeholder substitution). |
| `src/i18n/i18n.ts` | Module-level language state: `setLang/getLang/t()/bi()`. |

## Styles & build

- `src/styles/global.css` — the flat-cartoon design system: tokens, buttons, HUD, modals,
  every puzzle widget, title/results screens, touch controls, animations, reduced-motion.
- `astro.config.mjs` — static output, `base: './'`, ES2020 target.
- `scripts/postbuild.mjs` — inlines the CSS and JS into `dist/index.html`, removes
  `_astro/`, asserts no external references remain (this is what makes `file://` work).
- `serve.mjs` — zero-dependency static server (`npm run serve`, port 4173).
