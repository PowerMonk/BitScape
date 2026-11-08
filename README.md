# BitScape

**A 2D educational adventure about embedded systems — repair everyday devices from the inside.**

You shrink into a digital representation of broken devices, walk through their three zones
(**Input → Processing → Output**), restore the wiring, program the controller and put the
system to the test. Every puzzle is judged by a real simulator: the game evaluates the
program you built, never the order in which you clicked.

- **5 devices**: a training board, a refrigerator, a washing machine, a mobile robot and a final free-assembly fan.
- **Spanish + English** (toggle any time, progress is kept).
- **No lives, no timers** — wrong answers explain *why* and let you try again.
- **Zero external assets**: all art is drawn procedurally on a canvas, all copy is inline.
  The whole game is a single ~147 kB HTML file that runs offline.

## Play it

Any of these works:

| Option | How |
| --- | --- |
| **Double-click** | Open `dist/index.html` in any modern browser (Chrome, Edge, Firefox, Safari). |
| **Local server** | `npm run serve` → <http://localhost:4173> |
| **Development** | `npm install` then `npm run dev` → <http://localhost:4321> |

Progress (unlocked devices, badges, language, name/suit) is saved in `localStorage`.

## Controls

| Action | Control |
| --- | --- |
| Move | `WASD` / arrow keys, or click the floor |
| Interact | `E` (or click a component) |
| Hints (3 tiers, optional) | `P` or the HUD button |
| Pause | `Esc` |
| Touch devices | On-screen D-pad + `E` button |

## Project layout

```
src/
  pages/index.astro      single-page shell
  styles/global.css      flat-cartoon UI kit
  i18n/                  ES/EN dictionary (type-safe keys)
  data/levels.ts         declarative level data (copy, puzzles, test cases)
  game/
    engine/              loop, input, renderer, drawing, particles, easing
    world/               rooms, procedural props, player movement
    puzzles/             simulator (rules, sequence, fill, safety)
    ui/                  HUD, BIT dialogue, menus, puzzle panels
    game.ts              orchestrator: screens, stages, scoring, save
tests/
  *.test.ts              unit tests (simulator, level data, i18n)
  e2e/*.ps1              headless-browser end-to-end suites
```

## Commands

```bash
npm run dev      # dev server with hot reload
npm run build    # production build → dist/index.html (CSS + JS inlined)
npm run serve    # serve the built game
npm run check    # TypeScript / Astro diagnostics
npm run test     # unit tests (vitest)
```

## Tests

- **Unit** (`npm test`): simulator behaviour for every device (including the wrong-program
  cases that must fail), level-data integrity, bilingual copy completeness.
- **End-to-end** (`tests/e2e/*.ps1`): drive a headless Edge/Chrome over the DevTools
  protocol and play the real game — menus, every puzzle type, room movement, scoring,
  persistence, language switching and `file://` boot. Each script is standalone:

  ```bash
  npm run serve   # in one terminal
  powershell -File tests/e2e/bitscape_smoke.ps1
  ```

## Design notes

- Fixed 960×540 virtual canvas, letterboxed and DPR-aware; room backgrounds are
  pre-rendered once and blitted per frame.
- DOM is used for everything textual (HUD, dialogs, puzzle panels) so text stays crisp
  and accessible; the canvas is only for the world and the avatar.
- Levels are pure data — one engine, five rooms, no duplicated logic.
- No school or institutional data is embedded anywhere in the game.
