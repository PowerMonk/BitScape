# Development

## Commands

```bash
npm install        # once
npm run dev        # dev server  → http://localhost:4321 (hot reload)
npm run build      # production  → dist/index.html (single inlined file)
npm run serve      # serve the build → http://localhost:4173
npm run check      # Astro + TypeScript diagnostics (must stay at 0 errors)
npm test           # unit tests (vitest)
npm run test:watch # unit tests in watch mode
```

`npm run build` runs `astro build` and then `scripts/postbuild.mjs`, which inlines the CSS
and the JS bundle into one `dist/index.html` and deletes `_astro/`. The bundle contains no
ESM syntax, so it is emitted as a classic script — that is what lets the game run by
double-clicking the file (`file://`) as well as from any static host.

## Testing

### Unit (`npm test`)

| Suite | What it proves |
| --- | --- |
| `tests/simulate.test.ts` | The simulator accepts the *documented correct* program for every device and rejects plausible wrong ones (missing default branch, non-strict `< 20`, shuffled cycle, low fill target, missing/inverted door safety…). |
| `tests/levels.test.ts` | Structural integrity of `levels.ts`: stage order, objectives and 3-tier hints per stage, entry puzzles have exactly one correct option with feedback for the others, wiring graphs reference real ports, test expectations are reachable from the level's actions, path orderings are permutations, bilingual copy is never empty. |
| `tests/i18n.test.ts` | Every dictionary key has non-empty ES/EN text and identical `{placeholder}` sets. |

### End-to-end (`tests/e2e/*.ps1`)

Four standalone PowerShell suites that drive a **headless Edge/Chrome over the Chrome
DevTools Protocol** and play the real game (they use the `window.__bitscape` QA hook):

| Script | Covers |
| --- | --- |
| `bitscape_smoke.ps1` | Boot → lab → full tutorial playthrough (entry, wiring, program, tests, path, results 100/100) → persistence → language toggle → lab → fridge boot. |
| `bitscape_smoke2.ps1` | Washer (sequence + fill + safety, 6 tests) and the final fan (wrong-input/output rejection, free assembly), badges, pause menu, hint tiers. |
| `bitscape_smoke3.ps1` | **`file://` boot**, menus (encyclopedia / level select / how-to), the robot's two-round entry, language switch while a puzzle panel is open, HUD hint over a modal. |
| `bitscape_smoke4.ps1` | Real room interaction: `E` on hotspots, inspection cards, keyboard movement, click-to-move; plus the fridge's two-rule hysteresis program. |

Run them with the build being served:

```bash
npm run build
npm run serve                     # terminal 1
powershell -File tests/e2e/bitscape_smoke.ps1   # terminal 2 (one per suite)
```

They need Edge or Chrome installed (auto-detected) and print `SMOKE TEST N PASSED` on
success; any page exception or failed assertion aborts with the offending expression.

## Project layout (short version)

```
src/pages/index.astro     shell
src/styles/global.css     design system
src/i18n/                 dictionary + language runtime
src/data/levels.ts        ALL level content (bilingual)
src/game/
  engine/                 loop, input, renderer, drawing, particles, easing
  world/                  rooms, procedural props, player
  puzzles/simulate.ts     the judge (pure, unit-tested)
  ui/                     DOM views: HUD, dialog, menus, puzzle panels
  game.ts                 orchestrator
tests/                    unit + e2e suites
scripts/postbuild.mjs     single-file inlining
serve.mjs                 zero-dep static server
```

## How to extend

### Add a device (level)

1. **Data** — add a `LevelDef` to `src/data/levels.ts` (id, bilingual copy, hotspot labels,
   stage objectives, 3 hints per stage, entry rounds, wiring graph, program builder, tests,
   path puzzle). Add the id to `LevelId` in `src/game/types.ts` and to `LEVEL_ORDER`.
2. **Palette** — add a colour scheme to `PALETTES` in `src/game/theme.ts`.
3. **Exterior view** — if the device needs a new "outside window" animation, add a case to
   `drawExterior()` in `src/game/world/room.ts` (and its default values to
   `EXTERIOR_DEFAULTS` in `game.ts`).
4. **Unlock chain** — nothing else: `nextLevel()` and the lab cabinets derive from
   `LEVEL_ORDER`.

`tests/levels.test.ts` will immediately tell you if an objective, hint, wiring edge or
test expectation is malformed.

### Add a language

1. Add the language to the `Lang` union in `src/i18n/dict.ts` and translate every key
   (the i18n test enforces non-empty text and matching placeholders).
2. Translate the `Bi` pairs in `src/data/levels.ts`.
3. Wire the toggle in `game.ts` (`toggleLang`/`applyLang` already rebuild every view).

### Add a puzzle type

Create `src/game/ui/panels/yourpuzzle.ts` exporting a function that takes options, opens a
modal via `openModal()` and returns `{ close }`; keep **all** gameplay state in
`LevelRuntime`; add a `PanelSpec` case in `game.ts` (`createPanel`) and a stage if needed.
Reuse `ui/panels/common.ts` widgets so the visual language stays consistent.

## Conventions & gotchas

- **Never store gameplay state inside a panel** — panels are disposable views; that is what
  makes language switching and reopening free.
- **Strings**: UI copy goes in `i18n/dict.ts`; level copy stays as `Bi` pairs next to the
  level it belongs to. No hardcoded display text in components.
- **Canvas vs DOM**: world → canvas; anything textual or interactive → DOM.
- **Coordinates**: all game logic uses the 960×540 virtual space; convert only at the
  input boundary (`Renderer.toVirtual`).
- **Rooms**: static art belongs in `buildBackground()` (cached), animated bits in
  `drawProp()`/`drawExterior()` — never rebuild the background per frame.
- **Accessibility**: modals must remain focus-trappable and `Esc`-closable; new animations
  must respect the reduced-motion flag.
- **No external assets** (images/fonts/audio/network) — procedural drawing keeps the game
  offline-capable and the bundle tiny.

## Debugging

- `window.__bitscape` exposes the live `Game` instance in the console:
  `__bitscape.enterLevel('washer')`, `__bitscape.rt.stage`, `__bitscape.openPanel({kind:'program'})`.
- `npm run check` before every commit; `npm test` covers logic, the E2E suites cover flow.
