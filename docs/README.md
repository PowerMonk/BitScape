# BitScape — Documentation

How the game and the codebase work, from the big picture down to individual modules.

| Doc | Read it when |
| --- | --- |
| [architecture.md](architecture.md) | You want the big picture: boot sequence, frame loop, screen/state model, canvas vs DOM split. |
| [gameplay.md](gameplay.md) | You want the design: the stage pipeline, the five devices, the puzzles, scoring, save data. |
| [code-guide.md](code-guide.md) | You want a file-by-file tour: what each module owns and the key functions inside it. |
| [development.md](development.md) | You want to run, test, build or extend the project (add a device, add a language…). |
| [bugs.md](bugs.md) | You want a postmortem: what broke, why the tests missed it, and the guard that was added. |

## One-paragraph overview

BitScape is a single-page Astro site whose entire game is one hand-written Canvas2D engine
plus DOM overlays for anything textual. `src/pages/index.astro` provides the shell, a
`<script>` pulls in `src/game/main.ts`, which constructs one `Game` object
(`src/game/game.ts`). The `Game` owns a `requestAnimationFrame` loop; each frame it updates
the player/particles/dialog, then draws the current room (a pre-rendered background blit +
live props, the exterior window, hotspots and the avatar). Everything the player *reads* —
HUD, BIT dialogue, puzzle panels, menus — is DOM built by small view functions, so switching
language or rebuilding a panel is just re-rendering. Levels are pure data
(`src/data/levels.ts`) interpreted by one set of puzzle panels and one simulator
(`src/game/puzzles/simulate.ts`).

## Conventions used in this codebase

- **Type-safe i18n**: every user-facing string lives in `src/i18n/dict.ts` as
  `key: { es, en }`. `t('some.key')` resolves it; missing keys are a compile error.
- **Bilingual data**: anything authored outside the dictionary (level copy) uses
  `Bi = { es, en }` and is resolved with `bi(value)` at render time.
- **Panels are views, state is data**: puzzle panels never hold gameplay state — they read
  and write `LevelRuntime` (`src/game/runtime.ts`), which is why closing and reopening a
  panel (including on a language switch) loses nothing.
- **No external assets**: no images, fonts, audio or network calls at runtime. Every visual
  is drawn in code; the build inlines CSS and JS into a single HTML file.
