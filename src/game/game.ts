import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { createLoop, type Loop } from './engine/loop';
import { Particles } from './engine/particles';
import { THEME } from './theme';
import { Player } from './world/player';
import {
  buildBackground,
  drawExterior,
  drawHotspot,
  drawProp,
  drawPrompt,
  setCanvasLang,
  type ExteriorState,
  type Hotspot,
  type RoomDef,
} from './world/room';
import { makeLabRoom, makeLevelRoom } from './world/rooms';
import { LEVELS, LEVEL_ORDER, SCORE, nextLevel } from '../data/levels';
import { completeLevel, eraseSave, loadSave, persistSave, unlockLevel } from './progress';
import { createRuntime, totalScore, type LevelRuntime } from './runtime';
import { getLang, setLang, t, bi, type Bi, type DictKey } from '../i18n/i18n';
import { renderHud, stageChips } from './ui/hud';
import { modalCount, closeAllModals as closeAllModalsFromUi } from './ui/modal';
import { DialogBox, Toast } from './ui/dialog';
import { el, mount } from './ui/dom';
import * as menus from './ui/menus';
import { openChoicePanel } from './ui/panels/choice';
import { openWiringPanel } from './ui/panels/wiring';
import { openProgramPanel } from './ui/panels/blocks';
import { openOrderPanel } from './ui/panels/order';
import { openTestPanel } from './ui/panels/tests';
import { SUITS, type LevelId, type SaveData, type Stage } from './types';

type PanelSpec =
  | { kind: 'entry' | 'wiring' | 'program' | 'test' | 'path' | 'encyclopedia' | 'howto' | 'levelselect' | 'pause' }
  | { kind: 'inspect'; id: string };

type Handle = { close: () => void };

const STAGE_LABEL: Record<string, DictKey> = {
  entry: 'hud.stage.entry',
  wiring: 'hud.stage.wiring',
  program: 'hud.stage.program',
  test: 'hud.stage.test',
  path: 'hud.stage.path',
};

const EXTERIOR_DEFAULTS: Record<string, Record<string, number | boolean>> = {
  board: { pressed: false, led: false },
  fridge: { temp: 9, cooling: false },
  washer: { door: false, water: 0, step: 0, motor: false },
  robot: { dist: 60, moving: false, x: 0.04 },
  fan: { temp: 40, speed: 0 },
};

export class Game {
  private renderer: Renderer;
  private input = new Input();
  private particles = new Particles();
  private loop: Loop;
  private dialog: DialogBox;
  private toast: Toast;
  private hudRoot: HTMLElement;
  private screenRoot: HTMLElement;

  private save: SaveData;
  private screen: 'title' | 'lab' | 'level' = 'title';
  private rt: LevelRuntime | null = null;
  private levelRooms = new Map<LevelId, RoomDef>();
  private labRoom: RoomDef | null = null;
  private room: RoomDef | null = null;
  private bgCache = new Map<string, HTMLCanvasElement>();

  private player = new Player(480, 440);
  private exterior: ExteriorState = { kind: 'board', active: false, values: {} };
  private time = 0;
  private activeHotspot: Hotspot | null = null;

  private activeModal: Handle | null = null;
  private currentPanel: PanelSpec | null = null;
  private hintTier = 0;

  constructor(
    canvas: HTMLCanvasElement,
    hudRoot: HTMLElement,
    dialogRoot: HTMLElement,
    screenRoot: HTMLElement,
    toastRoot: HTMLElement,
    touchRoot: HTMLElement,
  ) {
    this.renderer = new Renderer(canvas);
    this.input.setMapper((x, y) => this.renderer.toVirtual(x, y));
    this.input.attach(canvas);
    this.dialog = new DialogBox(dialogRoot);
    this.toast = new Toast(toastRoot);
    this.hudRoot = hudRoot;
    this.screenRoot = screenRoot;

    this.save = loadSave();
    setLang(this.save.lang);
    setCanvasLang(this.save.lang);
    this.player.color = SUITS[this.save.suit % SUITS.length];
    this.particles.reducedMotion = this.save.reducedMotion;
    this.dialog.reducedMotion = this.save.reducedMotion;

    this.buildTouch(touchRoot);
    document.body.classList.toggle('reduced-motion', this.save.reducedMotion);
    this.loop = createLoop((dt) => this.update(dt), (dt) => this.render(dt));
  }

  start() {
    this.showTitle();
    this.loop.start();
  }

  /* ---------------------------------------------------------------- */
  /* Screens                                                           */
  /* ---------------------------------------------------------------- */

  private showTitle() {
    this.screen = 'title';
    this.room = null;
    this.rt = null;
    this.dialog.clear();
    this.closeAllModals();
    this.hudRoot.hidden = true;
    this.renderTitle();
  }

  private renderTitle() {
    menus.renderTitle(this.screenRoot, {
      save: this.save,
      onPlay: () => this.enterLab(),
      onNewGame: () => {
        menus.openConfirm({
          title: t('menu.newGame'),
          message: t('title.newConfirm'),
          yes: t('menu.newGame'),
          no: t('common.close'),
          onYes: () => {
            this.save = eraseSave(this.save.lang);
            this.applyLang(this.save.lang, false);
            this.renderTitle();
          },
        });
      },
      onLevelSelect: () => this.openPanel({ kind: 'levelselect' }),
      onEncyclopedia: () => this.openPanel({ kind: 'encyclopedia' }),
      onHowTo: () => this.openPanel({ kind: 'howto' }),
      onLang: () => this.toggleLang(),
      onNameChange: (name) => {
        this.save.name = name;
        this.player.name = name;
        persistSave(this.save);
      },
      onSuitChange: (suit) => {
        this.save.suit = suit;
        this.player.color = SUITS[suit % SUITS.length];
        persistSave(this.save);
        this.renderTitle();
      },
      onErase: () => {
        menus.openConfirm({
          title: t('menu.erase'),
          message: t('menu.eraseConfirm'),
          yes: t('menu.eraseYes'),
          no: t('common.close'),
          onYes: () => {
            this.save = eraseSave(this.save.lang);
            this.applyLang(this.save.lang, false);
            this.renderTitle();
          },
        });
      },
    });
  }

  /**
   * Unmount whatever full-screen view is living in #screen-root.
   * The title screen is the only thing that ever renders there, and it must
   * be removed the moment we leave it — otherwise it stays stacked over the
   * canvas, hiding the world and swallowing every pointer click.
   */
  private clearScreens() {
    mount(this.screenRoot, []);
  }

  private enterLab() {
    this.closeAllModals();
    this.clearScreens();
    this.screen = 'lab';
    this.rt = null;
    this.rebuildLabRoom();
    const room = this.labRoom!;
    this.room = room;
    this.player.teleport(room.spawn.x, room.spawn.y);
    this.hudRoot.hidden = false;
    this.renderHudNow();
    if (!this.save.introSeen) {
      this.save.introSeen = true;
      persistSave(this.save);
      this.dialog.say([
        { es: 'Exposición escolar. Mañana. Tres prototipos muertos.', en: 'School expo. Tomorrow. Three dead prototypes.' },
        { es: 'El Microportal te encoge y te introduce en su representación digital.', en: 'The Microportal shrinks you into their digital representation.' },
        { es: 'BIT te espera dentro: entrada, procesamiento, salida.', en: 'BIT waits inside: input, processing, output.' },
      ]);
    } else {
      this.dialog.say([
        this.save.results.fan
          ? { es: 'Todos los aparatos funcionan. ¿Repasamos alguno?', en: 'Every device works. Shall we review one?' }
          : { es: 'Elige un aparato averiado y entra en su interior.', en: 'Pick a broken device and step inside it.' },
      ]);
    }
  }

  private enterLevel(id: LevelId) {
    if (!this.save.unlocked.includes(id)) {
      this.toast.show(t('level.locked'));
      return;
    }
    this.closeAllModals();
    this.clearScreens();
    const level = LEVELS[id];
    this.screen = 'level';
    this.rt = createRuntime(level);
    this.hintTier = 0;
    const room = this.getLevelRoom(id);
    this.room = room;
    this.exterior = {
      kind: level.windowKind,
      active: false,
      values: { ...EXTERIOR_DEFAULTS[level.windowKind] },
    };
    this.player.teleport(room.spawn.x, room.spawn.y);
    this.hudRoot.hidden = false;
    this.renderHudNow();
    const lines = [];
    if (level.intro) lines.push(level.intro);
    lines.push(this.stageObjective());
    this.dialog.say(lines);
  }

  private getLevelRoom(id: LevelId): RoomDef {
    let room = this.levelRooms.get(id);
    if (!room) {
      const level = LEVELS[id];
      room = makeLevelRoom(`level-${id}`, level.palette, level.hotspot, level.windowKind);
      this.levelRooms.set(id, room);
    }
    return room;
  }

  private rebuildLabRoom() {
    this.labRoom = makeLabRoom(this.save.unlocked, this.save.results);
    this.bgCache.delete(`lab|${getLang()}`);
  }

  /* ---------------------------------------------------------------- */
  /* HUD / feedback                                                    */
  /* ---------------------------------------------------------------- */

  private stageObjective() {
    const rt = this.rt;
    if (!rt) return { es: '', en: '' };
    if (rt.stage === 'done') return rt.level.flow;
    return rt.level.stageObjectives[rt.stage] ?? rt.level.objective;
  }

  private renderHudNow() {
    if (this.screen === 'title') return;
    if (this.screen === 'lab') {
      const done = LEVEL_ORDER.filter((id) => this.save.results[id]).length;
      renderHud(this.hudRoot, {
        title: t('hud.hub'),
        objective: t('hud.labProgress', { a: done, b: LEVEL_ORDER.length }),
        chips: LEVEL_ORDER.map((id) => ({
          label: bi(LEVELS[id].device),
          state: (this.save.results[id]
            ? 'done'
            : this.save.unlocked.includes(id)
              ? 'active'
              : 'todo') as 'done' | 'active' | 'todo',
        })),
        hintLabel: '—',
        hintDisabled: true,
        onPause: () => this.openPause(),
        onHint: () => {},
        onLang: () => this.toggleLang(),
      });
      return;
    }
    const rt = this.rt!;
    const stageLabels: Record<string, string> = {};
    for (const [k, v] of Object.entries(STAGE_LABEL)) stageLabels[k] = t(v);
    const tier = this.hintTier;
    renderHud(this.hudRoot, {
      title: `${bi(rt.level.device)} · ${bi(rt.level.name)}`,
      objective: bi(this.stageObjective()),
      chips: stageChips(rt.level.stages, stageLabels, rt.stage),
      hintLabel: `${Math.min(tier, 3)}/3`,
      hintDisabled: tier >= 3,
      onPause: () => this.openPause(),
      onHint: () => this.hint(),
      onLang: () => this.toggleLang(),
    });
  }

  private hint() {
    if (this.screen === 'lab' || this.screen === 'title') {
      this.toast.show(t('howto.flowBody'));
      return;
    }
    const rt = this.rt!;
    const set = rt.level.hints[rt.stage];
    if (!set || this.hintTier >= 3) {
      this.toast.show(t('hint.none'));
      return;
    }
    const line = set[this.hintTier];
    this.hintTier++;
    this.renderHudNow();
    const text = t('hint.concept', { text: bi(line) });
    if (modalCount() > 0) this.toast.show(text, 4200);
    else this.dialog.say([line]);
  }

  private say(lines: Bi[]) {
    if (modalCount() > 0) this.toast.show(bi(lines[0]));
    else this.dialog.say(lines);
  }

  /* ---------------------------------------------------------------- */
  /* Stage flow                                                        */
  /* ---------------------------------------------------------------- */

  private advance(stage: Stage, silent = false) {
    const rt = this.rt!;
    rt.stage = stage;
    this.hintTier = 0;
    this.renderHudNow();
    if (!silent) this.say([this.stageObjective()]);
  }

  private onEntryDone() {
    const rt = this.rt!;
    rt.scores.entry = SCORE.entry;
    this.advance('wiring');
  }

  private onWiringDone() {
    const rt = this.rt!;
    rt.scores.wiring = SCORE.output;
    // Levels without a guided entry stage (the final challenge) identify
    // their input while wiring, so they still award the entry points.
    if (!rt.level.entry) rt.scores.entry = SCORE.entry;
    this.advance('program');
  }

  private onProgramSaved() {
    const rt = this.rt!;
    rt.scores.program = SCORE.program;
    if (rt.stage === 'program') this.advance('test');
  }

  private onRunTests() {
    this.openPanel({ kind: 'test' });
  }

  private onTestsPassed() {
    const rt = this.rt!;
    rt.scores.tests = SCORE.tests;
    rt.stage = 'path';
    this.hintTier = 0;
    this.renderHudNow();
    this.openPanel({ kind: 'path' });
  }

  private onPathDone() {
    const rt = this.rt!;
    rt.scores.path = SCORE.path;
    this.finishLevel();
  }

  private finishLevel() {
    const rt = this.rt!;
    const level = rt.level;
    const score = totalScore(rt);
    const passed = level.tests.filter((x) => rt.testsPassed[x.id]).length;
    const hadBadge = new Set(this.save.badges);
    completeLevel(this.save, level.id, score, passed, level.tests.length, level.badges, level.encyclopedia);
    const next = nextLevel(level.id);
    if (next) unlockLevel(this.save, next);
    persistSave(this.save);
    rt.completed = true;
    this.exterior.active = true;
    this.particles.burst(480, 260, {
      count: 60,
      speed: 260,
      life: 1.2,
      size: 8,
      shape: 'square',
      gravity: 140,
      color: [THEME.cyan, THEME.pink, THEME.amber, THEME.violet, THEME.green],
    });
    this.renderHudNow();
    const newBadges = level.badges.filter((b) => !hadBadge.has(b));
    this.currentPanel = null;
    this.activeModal = menus.openResults({
      levelId: level.id,
      score,
      testsPassed: passed,
      testsTotal: level.tests.length,
      badges: newBadges.length > 0 ? newBadges : level.badges,
      hasNext: !!next,
      onContinue: () => next && this.enterLevel(next),
      onHub: () => this.enterLab(),
      onRepeat: () => this.enterLevel(level.id),
    });
  }

  /* ---------------------------------------------------------------- */
  /* Panels                                                            */
  /* ---------------------------------------------------------------- */

  private openPanel(spec: PanelSpec) {
    this.activeModal?.close();
    this.activeModal = null;
    this.currentPanel = spec;
    this.activeModal = this.createPanel(spec);
    if (spec.kind !== 'pause') this.dialog.clear();
  }

  private closeAllModals() {
    closeAllModalsFromUi();
    this.activeModal = null;
    this.currentPanel = null;
  }

  private createPanel(spec: PanelSpec): Handle {
    const rt = this.rt;
    switch (spec.kind) {
      case 'entry': {
        const level = rt!.level;
        const rounds = level.entry!.rounds;
        const round = rounds[Math.min(rt!.entryRound, rounds.length - 1)];
        return openChoicePanel({
          title: t('puzzle.chooseInput'),
          prompt: round.prompt,
          options: round.options,
          onHint: () => this.hint(),
          onCorrect: () => {
            if (rt!.entryRound < rounds.length - 1) {
              rt!.entryRound++;
              this.openPanel({ kind: 'entry' });
            } else {
              this.onEntryDone();
            }
          },
        });
      }
      case 'wiring':
        return openWiringPanel({
          runtime: rt!,
          onHint: () => this.hint(),
          onDone: () => this.onWiringDone(),
        });
      case 'program':
        return openProgramPanel({
          runtime: rt!,
          onHint: () => this.hint(),
          onSaved: () => this.onProgramSaved(),
          onRunTests: () => this.onRunTests(),
        });
      case 'test':
        return openTestPanel({
          runtime: rt!,
          reducedMotion: this.save.reducedMotion,
          onHint: () => this.hint(),
          setExterior: (patch) => this.setExterior(patch),
          onAllPassed: () => this.onTestsPassed(),
          onRetry: () => this.openPanel({ kind: 'program' }),
        });
      case 'path':
        return openOrderPanel({
          title: t('puzzle.path.title'),
          subtitle: t('puzzle.path.sub'),
          options: rt!.level.path.options,
          correctOrder: rt!.level.path.correctOrder,
          mode: 'path',
          onHint: () => this.hint(),
          onDone: () => this.onPathDone(),
        });
      case 'inspect':
        return this.openInspect(spec.id);
      case 'encyclopedia':
        return menus.openEncyclopedia(this.save);
      case 'howto':
        return menus.openHowTo();
      case 'levelselect':
        return menus.openLevelSelect({
          save: this.save,
          onPick: (id) => this.enterLevel(id),
          onClose: () => {},
        });
      case 'pause':
        return this.buildPause();
      default:
        throw new Error('unknown panel');
    }
  }

  private openPause(): void {
    this.openPanel({ kind: 'pause' });
  }

  private buildPause(): Handle {
    return menus.openPause({
      onResume: () => this.activeModal?.close(),
      onHowTo: () => this.openPanel({ kind: 'howto' }),
      onEncyclopedia: () => this.openPanel({ kind: 'encyclopedia' }),
      onToggleMotion: (v) => {
        this.save.reducedMotion = v;
        this.particles.reducedMotion = v;
        this.dialog.reducedMotion = v;
        document.body.classList.toggle('reduced-motion', v);
        persistSave(this.save);
      },
      onLang: () => this.toggleLang(),
      onTitle: () => {
        persistSave(this.save);
        this.showTitle();
      },
      reducedMotion: this.save.reducedMotion,
    });
  }

  private openInspect(id: string): Handle {
    const hs = this.room?.hotspots.find((h) => h.id === id);
    const roleKey: Record<string, DictKey> = {
      sensor: 'enc.sensor.text',
      mcu: 'enc.mcu.text',
      actuator: 'enc.actuator.text',
      monitor: 'inspect.monitor',
    };
    const key = hs ? roleKey[hs.role] : undefined;
    return menus.openInspectCard({
      title: hs ? bi(hs.label) : '—',
      body: key ? t(key) : '',
      reading: this.readingLine(hs ?? null),
    });
  }

  private readingLine(hs: Hotspot | null): string | null {
    if (!hs) return null;
    const v = this.exterior.values;
    if (hs.role === 'sensor') {
      const first = Object.entries(v).find(([k]) => !['led', 'cooling', 'motor', 'motors', 'fan', 'speed', 'moving', 'x', 'step', 'warn'].includes(k));
      if (!first) return null;
      const [k, val] = first;
      const unit = k === 'temp' || k === 'dist' ? (k === 'temp' ? ' °C' : ' cm') : k === 'water' ? ' %' : '';
      return t('inspect.reading', { v: `${k}: ${String(val)}${unit}` });
    }
    return null;
  }

  /* ---------------------------------------------------------------- */
  /* Interaction                                                       */
  /* ---------------------------------------------------------------- */

  private nearestHotspot(x: number, y: number, pad = 0): Hotspot | null {
    const room = this.room;
    if (!room) return null;
    let best: Hotspot | null = null;
    let bestD = Infinity;
    for (const hs of room.hotspots) {
      const d = Math.hypot(hs.x - x, hs.y - y);
      if (d <= hs.r + pad && d < bestD) {
        best = hs;
        bestD = d;
      }
    }
    return best;
  }

  private isActiveHotspot(hs: Hotspot): boolean {
    if (this.screen === 'lab') return true;
    const rt = this.rt;
    if (!rt) return false;
    switch (rt.stage) {
      case 'entry':
        return hs.role === 'sensor';
      case 'wiring':
        return hs.role === 'mcu';
      case 'program':
        return hs.role === 'mcu' || (hs.role === 'monitor' && rt.programSaved);
      case 'test':
        return hs.role === 'monitor' || (hs.role === 'mcu' && rt.programSaved);
      case 'path':
        return hs.role === 'monitor' || hs.role === 'actuator';
      default:
        return false;
    }
  }

  private interact(hs: Hotspot) {
    if (this.screen === 'lab') {
      if (hs.kind === 'device' && hs.device) {
        if (!this.save.unlocked.includes(hs.device)) {
          this.toast.show(t('level.locked'));
          return;
        }
        this.enterLevel(hs.device);
        return;
      }
      if (hs.kind === 'info') {
        this.openPanel({ kind: 'encyclopedia' });
        return;
      }
      return;
    }

    const rt = this.rt;
    if (!rt) return;
    if (rt.completed) {
      this.openPanel({ kind: 'inspect', id: hs.id });
      return;
    }
    if (rt.stage === 'entry' && hs.role === 'sensor' && rt.level.entry) {
      this.openPanel({ kind: 'entry' });
      return;
    }
    if (rt.stage === 'wiring' && hs.role === 'mcu') {
      this.openPanel({ kind: 'wiring' });
      return;
    }
    if (rt.stage === 'program' && hs.role === 'mcu') {
      this.openPanel({ kind: 'program' });
      return;
    }
    if (rt.stage === 'program' && hs.role === 'monitor' && rt.programSaved) {
      this.openPanel({ kind: 'test' });
      return;
    }
    if (rt.stage === 'test' && hs.role === 'monitor') {
      this.openPanel({ kind: 'test' });
      return;
    }
    if (rt.stage === 'test' && hs.role === 'mcu' && rt.programSaved) {
      this.openPanel({ kind: 'program' });
      return;
    }
    if (rt.stage === 'path' && (hs.role === 'monitor' || hs.role === 'actuator')) {
      this.openPanel({ kind: 'path' });
      return;
    }
    this.openPanel({ kind: 'inspect', id: hs.id });
  }

  private setExterior(patch: Record<string, number | boolean>) {
    const v = this.exterior.values;
    Object.assign(v, patch);
    if (this.exterior.kind === 'robot' && patch.moving === true) {
      const x = typeof v.x === 'number' ? v.x : 0.04;
      v.x = Math.min(0.92, x + 0.16);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Language                                                          */
  /* ---------------------------------------------------------------- */

  private toggleLang() {
    this.applyLang(getLang() === 'es' ? 'en' : 'es', true);
  }

  private applyLang(lang: 'es' | 'en', persist: boolean) {
    setLang(lang);
    setCanvasLang(lang);
    this.save.lang = lang;
    if (persist) persistSave(this.save);
    this.bgCache.clear();
    if (this.screen === 'title') this.renderTitle();
    else {
      if (this.screen === 'lab') {
        this.rebuildLabRoom();
        if (this.room?.id === 'lab') this.room = this.labRoom;
      }
      this.renderHudNow();
      this.dialog.rerender();
      if (this.currentPanel) this.openPanel(this.currentPanel);
    }
    if (this.screen === 'title' && this.currentPanel) this.openPanel(this.currentPanel);
  }

  /* ---------------------------------------------------------------- */
  /* Frame                                                             */
  /* ---------------------------------------------------------------- */

  private update(dt: number) {
    this.time += dt;
    this.particles.update(dt);
    this.dialog.update(dt);

    const modalOpen = modalCount() > 0;
    if (this.currentPanel && modalCount() === 0) {
      this.currentPanel = null;
      this.activeModal = null;
    }
    this.dialog.tryFlush(modalOpen);

    if (this.input.wasPressed('Escape') && !modalOpen && this.screen !== 'title') {
      this.openPause();
    }
    if (this.input.wasPressed('KeyP') && !modalOpen && this.screen !== 'title') {
      this.hint();
    }

    if (!modalOpen && this.screen !== 'title' && this.room) {
      const keys = {
        up: this.input.isHeld('ArrowUp', 'KeyW'),
        down: this.input.isHeld('ArrowDown', 'KeyS'),
        left: this.input.isHeld('ArrowLeft', 'KeyA'),
        right: this.input.isHeld('ArrowRight', 'KeyD'),
      };
      this.player.update(dt, keys, this.room.bounds, this.room.solids, (x, y) => {
        if (!this.save.reducedMotion) {
          this.particles.burst(x, y, { count: 2, speed: 24, life: 0.4, size: 4, color: 'rgba(38,52,74,0.35)', gravity: 20 });
        }
      });

      // pointer clicks: hotspot first, then click-to-move
      for (const c of this.input.clicks) {
        const hs = this.nearestHotspot(c.x, c.y, 10);
        if (hs) {
          this.interact(hs);
          break;
        }
        const b = this.room.bounds;
        if (c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h) {
          this.player.target = { x: c.x, y: c.y };
        }
      }

      // interact key
      const near = this.nearestHotspot(this.player.x, this.player.y, 6);
      this.activeHotspot = near;
      if (this.input.wasPressed('KeyE', 'Enter', 'Space')) {
        if (this.dialog.isOpen()) this.dialog.advance();
        else if (near) this.interact(near);
      }
    } else {
      this.activeHotspot = null;
    }

    this.input.endFrame();
  }

  private getBg(room: RoomDef): HTMLCanvasElement {
    const key = `${room.id}|${getLang()}`;
    let bg = this.bgCache.get(key);
    if (!bg) {
      bg = buildBackground(room);
      this.bgCache.set(key, bg);
    }
    return bg;
  }

  private render(dt: number) {
    const ctx = this.renderer.ctx;
    this.renderer.begin();
    if (this.screen === 'title') {
      this.drawTitleBackdrop(ctx);
    } else if (this.room) {
      this.drawRoomScene(ctx);
    }
    this.renderer.end();
    void dt;
  }

  private drawTitleBackdrop(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0E1626';
    ctx.fillRect(0, 0, 960, 540);
    const t0 = this.time;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const y = 40 + i * 58;
      const drift = Math.sin(t0 * 0.4 + i) * 8;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(62,198,194,0.28)' : 'rgba(126,194,232,0.16)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-20, y + drift);
      ctx.lineTo(240 + i * 30, y + drift);
      ctx.lineTo(280 + i * 30, y + drift + 24);
      ctx.lineTo(700, y + drift + 24);
      ctx.lineTo(740, y + drift);
      ctx.lineTo(980, y + drift);
      ctx.stroke();
      const p = ((t0 * (40 + i * 7) + i * 200) % 1100) - 60;
      ctx.fillStyle = i % 2 ? THEME.pink : THEME.cyan;
      ctx.beginPath();
      ctx.arc(p, y + drift + (p > 240 + i * 30 && p < 700 ? 24 : 0), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    const g = ctx.createRadialGradient(480, 300, 60, 480, 300, 520);
    g.addColorStop(0, 'rgba(139,123,232,0.20)');
    g.addColorStop(1, 'rgba(14,22,38,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 540);
  }

  private drawRoomScene(ctx: CanvasRenderingContext2D) {
    const room = this.room!;
    ctx.drawImage(this.getBg(room), 0, 0, 960, 540);

    for (const p of room.props) drawProp(ctx, p, this.time, room.palette, this.exterior);

    if (room.window && this.screen === 'level') {
      drawExterior(ctx, room.window, this.exterior, this.time);
    }

    const modalOpen = modalCount() > 0;
    for (const hs of room.hotspots) {
      const active = !modalOpen && this.isActiveHotspot(hs);
      const near = this.activeHotspot === hs;
      drawHotspot(ctx, hs, this.time, active, near);
    }

    if (this.save.name && this.screen === 'lab') {
      ctx.save();
      ctx.font = `800 12px 'Segoe UI', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = THEME.ink;
      ctx.fillText(this.save.name, this.player.x, this.player.y - 44);
      ctx.restore();
    }

    this.player.draw(ctx, this.time);
    this.particles.draw(ctx);

    if (!modalOpen && this.activeHotspot && !this.dialog.isOpen()) {
      const label =
        this.screen === 'lab'
          ? this.activeHotspot.kind === 'device'
            ? this.save.unlocked.includes(this.activeHotspot.device!)
              ? t('hud.enter')
              : t('common.locked')
            : t('menu.encyclopedia')
          : this.activeHotspotLabel();
      drawPrompt(ctx, this.activeHotspot.x, this.activeHotspot.y - 40, label, this.time);
    }
  }

  private activeHotspotLabel(): string {
    const rt = this.rt;
    const hs = this.activeHotspot;
    if (!rt || !hs) return bi(hs?.label ?? { es: '', en: '' });
    if (rt.stage === 'test' && hs.role === 'monitor') return t('puzzle.test.title');
    if (rt.stage === 'path' && (hs.role === 'monitor' || hs.role === 'actuator')) return t('puzzle.path.title');
    if (rt.stage === 'program' && hs.role === 'monitor' && rt.programSaved) return t('puzzle.test.title');
    if (rt.stage === 'test' && hs.role === 'mcu' && rt.programSaved) return t('puzzle.program.title');
    return bi(hs.label);
  }

  /* ---------------------------------------------------------------- */
  /* Touch controls                                                    */
  /* ---------------------------------------------------------------- */

  private buildTouch(root: HTMLElement) {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (!coarse) {
      root.hidden = true;
      return;
    }
    root.hidden = false;
    const hold = (code: string) => ({
      onpointerdown: (e: PointerEvent) => {
        e.preventDefault();
        this.input.held.add(code);
      },
      onpointerup: () => this.input.held.delete(code),
      onpointerleave: () => this.input.held.delete(code),
      onpointercancel: () => this.input.held.delete(code),
    });
    mount(root, [
      el('div', { class: 'dpad' }, [
        el('button', { class: 'dpad-btn dpad-up', text: '▲', ...hold('ArrowUp') }),
        el('button', { class: 'dpad-btn dpad-left', text: '◀', ...hold('ArrowLeft') }),
        el('button', { class: 'dpad-btn dpad-right', text: '▶', ...hold('ArrowRight') }),
        el('button', { class: 'dpad-btn dpad-down', text: '▼', ...hold('ArrowDown') }),
      ]),
      el('button', {
        class: 'act-btn',
        text: 'E',
        onpointerdown: (e: PointerEvent) => {
          e.preventDefault();
          this.input.pressed.add('KeyE');
        },
      }),
    ]);
  }
}
