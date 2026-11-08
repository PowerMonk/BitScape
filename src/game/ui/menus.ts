import { el, mount } from './dom';
import { t, getLang, setLang, bi, type DictKey } from '../../i18n/i18n';
import type { SaveData, LevelId, BadgeId } from '../types';
import { SUITS } from '../types';
import { LEVELS, LEVEL_ORDER } from '../../data/levels';
import { openModal } from './modal';

export type TitleOpts = {
  save: SaveData;
  onPlay: () => void;
  onNewGame: () => void;
  onLevelSelect: () => void;
  onEncyclopedia: () => void;
  onHowTo: () => void;
  onLang: () => void;
  onNameChange: (name: string) => void;
  onSuitChange: (suit: number) => void;
  onErase: () => void;
};

const hasProgress = (save: SaveData) => save.unlocked.length > 1 || Object.keys(save.results).length > 0;

/** Main title screen with protagonist customisation. */
export function renderTitle(root: HTMLElement, o: TitleOpts): void {
  const input = el('input', {
    class: 'name-input',
    type: 'text',
    maxlength: '16',
    placeholder: t('menu.enterName'),
    value: o.save.name,
    'aria-label': t('menu.name'),
  }) as HTMLInputElement;
  input.addEventListener('input', () => o.onNameChange(input.value.trim()));

  const swatches = el(
    'div',
    { class: 'swatches', role: 'radiogroup', 'aria-label': t('menu.suit') },
    SUITS.map((c, i) =>
      el('button', {
        class: `swatch${o.save.suit === i ? ' is-on' : ''}`,
        style: `--c:${c}`,
        role: 'radio',
        'aria-checked': String(o.save.suit === i),
        'aria-label': `${t('menu.suit')} ${i + 1}`,
        onClick: () => o.onSuitChange(i),
      }),
    ),
  );

  const menu = el('div', { class: 'title-menu' }, [
    el('button', { class: 'btn btn-primary btn-big', text: hasProgress(o.save) ? t('menu.continue') : t('menu.play'), onClick: o.onPlay }),
    hasProgress(o.save)
      ? el('button', { class: 'btn btn-ghost', text: t('menu.newGame'), onClick: o.onNewGame })
      : null,
    el('button', { class: 'btn btn-ghost', text: t('menu.selectLevel'), onClick: o.onLevelSelect }),
    el('button', { class: 'btn btn-ghost', text: t('menu.encyclopedia'), onClick: o.onEncyclopedia }),
    el('button', { class: 'btn btn-ghost', text: t('menu.howTo'), onClick: o.onHowTo }),
  ]);

  mount(root, [
    el('div', { class: 'screen title-screen' }, [
      el('div', { class: 'title-badge', text: '2D · EMBEBIDOS' }),
      el('h1', { class: 'title-logo', text: 'BitScape' }),
      el('div', { class: 'title-sub', text: t('app.subtitle') }),
      el('p', { class: 'title-tag', text: t('app.tagline') }),
      el('div', { class: 'title-custom' }, [
        el('label', { class: 'field-label', text: t('menu.name') }, [input]),
        el('div', { class: 'field-label', text: t('menu.suit') }, [swatches]),
      ]),
      menu,
      el('div', { class: 'title-foot' }, [
        el('button', {
          class: 'hud-btn',
          text: getLang() === 'es' ? 'English' : 'Español',
          onClick: o.onLang,
        }),
        hasProgress(o.save)
          ? el('button', { class: 'hud-btn hud-danger', text: t('menu.erase'), onClick: o.onErase })
          : null,
        el('span', { class: 'title-ver', text: 'v1.0' }),
      ]),
    ]),
  ]);
}

export type PauseOpts = {
  onResume: () => void;
  onHowTo: () => void;
  onEncyclopedia: () => void;
  onToggleMotion: (v: boolean) => void;
  onLang: () => void;
  onTitle: () => void;
  reducedMotion: boolean;
};

export function openPause(o: PauseOpts) {
  return openModal({
    title: t('pause.title'),
    variant: 'narrow',
    build: (m) => {
      const motion = el('label', { class: 'toggle-row' }, [
        el('input', {
          type: 'checkbox',
          ...(o.reducedMotion ? { checked: true } : {}),
          onChange: (e: Event) => o.onToggleMotion((e.target as HTMLInputElement).checked),
        }),
        el('span', { text: t('settings.reducedMotion') }),
      ]);
      mount(m.body, [
        el('div', { class: 'stack' }, [
          el('button', { class: 'btn btn-primary btn-big', text: t('common.resume'), onClick: o.onResume }),
          el('button', { class: 'btn btn-ghost', text: t('pause.howTo'), onClick: o.onHowTo }),
          el('button', { class: 'btn btn-ghost', text: t('pause.enc'), onClick: o.onEncyclopedia }),
          el('button', { class: 'btn btn-ghost', text: t('menu.language') + ': ' + (getLang() === 'es' ? 'ES' : 'EN'), onClick: o.onLang }),
          motion,
          el('button', { class: 'btn btn-danger', text: t('pause.toTitle'), onClick: o.onTitle }),
        ]),
      ]);
      m.setFooter([]);
    },
  });
}

export function openHowTo(onClose?: () => void) {
  return openModal({
    title: t('howto.title'),
    variant: 'wide',
    onClose,
    build: (m) => {
      mount(m.body, [
        el('div', { class: 'howto' }, [
          el('p', { class: 'howto-lead', text: t('howto.goal') }),
          el('div', { class: 'howto-grid' }, [
            el('div', { class: 'howto-box' }, [
              el('h3', { text: t('howto.controls') }),
              el('ul', { class: 'howto-list' }, [
                el('li', { text: t('howto.move') }),
                el('li', { text: t('howto.act') }),
                el('li', { text: t('howto.hints') }),
                el('li', { text: t('howto.pause') }),
              ]),
            ]),
            el('div', { class: 'howto-box' }, [
              el('h3', { text: t('howto.flow') }),
              el('p', { text: t('howto.flowBody') }),
              el('p', { class: 'howto-note', text: t('howto.noPenalty') }),
            ]),
          ]),
        ]),
      ]);
      m.setFooter([el('button', { class: 'btn btn-primary', text: t('common.close'), onClick: () => m.close() })]);
    },
  });
}

export function openEncyclopedia(save: SaveData) {
  const ids = ['embedded', 'mcu', 'sensor', 'actuator', 'program'] as const;
  return openModal({
    title: t('enc.title'),
    subtitle: t('enc.sub'),
    variant: 'wide',
    build: (m) => {
      mount(m.body, [
        el(
          'div',
          { class: 'enc-grid' },
          ids.map((id) => {
            const unlocked = save.encyclopedia.includes(id);
            return el('div', { class: `enc-card${unlocked ? '' : ' is-locked'}` }, [
              el('div', { class: 'enc-head' }, [
                el('span', { class: 'enc-num', text: unlocked ? '✓' : '•' }),
                el('h3', { text: unlocked ? t(`enc.${id}.title` as DictKey) : '???' }),
              ]),
              el('p', {
                text: unlocked ? t(`enc.${id}.text` as DictKey) : t('enc.locked'),
              }),
            ]);
          }),
        ),
      ]);
      m.setFooter([]);
    },
  });
}

export type LevelSelectOpts = {
  save: SaveData;
  onPick: (id: LevelId) => void;
  onClose: () => void;
};

export function openLevelSelect(o: LevelSelectOpts) {
  return openModal({
    title: t('menu.selectLevel'),
    variant: 'wide',
    build: (m) => {
      mount(m.body, [
        el(
          'div',
          { class: 'level-grid' },
          LEVEL_ORDER.map((id) => {
            const def = LEVELS[id];
            const locked = !o.save.unlocked.includes(id);
            const res = o.save.results[id];
            return el(
              'button',
              { class: `level-card${locked ? ' is-locked' : ''}${res ? ' is-done' : ''}`, onClick: () => { if (!locked) { m.close(); o.onPick(id); } } },
              [
                el('div', { class: 'level-status', text: locked ? t('common.locked') : res ? t('level.done', { score: res.score }) : t('common.broken') }),
                el('h3', { text: bi(def.device) }),
                el('p', { text: bi(def.name) }),
                el('div', { class: 'level-flow', text: bi(def.flow) }),
              ],
            );
          }),
        ),
      ]);
      m.setFooter([]);
    },
  });
}

export type ResultsOpts = {
  levelId: LevelId;
  score: number;
  testsPassed: number;
  testsTotal: number;
  badges: BadgeId[];
  hasNext: boolean;
  onContinue: () => void;
  onHub: () => void;
  onRepeat: () => void;
};

export function openResults(o: ResultsOpts) {
  const def = LEVELS[o.levelId];
  const rows: [string, number][] = [
    [t('results.entry'), o.score >= 20 ? 20 : 0],
    [t('results.program'), o.score >= 50 ? 30 : 0],
    [t('results.output'), o.score >= 70 ? 20 : 0],
    [t('results.tests'), o.testsPassed === o.testsTotal ? 20 : 0],
    [t('results.path'), o.score === 100 ? 10 : 0],
  ];
  return openModal({
    title: t('results.title'),
    subtitle: bi(def.device),
    variant: 'wide',
    closable: false,
    build: (m) => {
      mount(m.body, [
        el('div', { class: 'results' }, [
          el('div', { class: 'score-ring' }, [
            el('span', { class: 'score-num', text: String(o.score) }),
            el('span', { class: 'score-max', text: '/100' }),
          ]),
          el('div', { class: 'result-rows' },
            rows.map(([label, v]) =>
              el('div', { class: `result-row${v > 0 ? ' is-ok' : ''}` }, [
                el('span', { text: label }),
                el('span', { class: 'result-mark', text: v > 0 ? `+${v}` : '—' }),
              ]),
            ),
          ),
          el('div', { class: 'result-tests', text: `${t('results.tests')}: ${o.testsPassed} ${t('common.of')} ${o.testsTotal}` }),
          el('div', { class: 'result-flow' }, [
            el('span', { class: 'result-flow-label', text: t('results.explain') }),
            el('span', { class: 'result-flow-text', text: bi(def.flow) }),
          ]),
          o.badges.length > 0
            ? el('div', { class: 'badge-row' },
                o.badges.map((b) => el('div', { class: 'badge' }, [
                  el('span', { class: 'badge-icon', text: '★' }),
                  el('span', { text: t(`badge.${b}` as DictKey) }),
                ])),
              )
            : null,
        ]),
      ]);
      m.setFooter([
        el('button', { class: 'btn btn-ghost', text: t('results.tryAgain'), onClick: () => { m.close(); o.onRepeat(); } }),
        el('button', { class: 'btn btn-ghost', text: t('results.hub'), onClick: () => { m.close(); o.onHub(); } }),
        o.hasNext
          ? el('button', { class: 'btn btn-primary', text: t('results.next'), onClick: () => { m.close(); o.onContinue(); } })
          : el('button', { class: 'btn btn-primary', text: t('common.done'), onClick: () => { m.close(); o.onHub(); } }),
      ]);
    },
  });
}

export function openConfirm(opts: { title: string; message: string; yes: string; no: string; onYes: () => void }) {
  return openModal({
    title: opts.title,
    variant: 'narrow',
    build: (m) => {
      mount(m.body, [el('p', { class: 'confirm-msg', text: opts.message })]);
      m.setFooter([
        el('button', { class: 'btn btn-ghost', text: opts.no, onClick: () => m.close() }),
        el('button', { class: 'btn btn-danger', text: opts.yes, onClick: () => { m.close(); opts.onYes(); } }),
      ]);
    },
  });
}

/** Component inspection card shown when interacting with a prop. */
export function openInspectCard(opts: { title: string; body: string; reading: string | null }) {
  return openModal({
    title: opts.title,
    variant: 'narrow',
    build: (m) => {
      mount(m.body, [
        el('div', { class: 'inspect' }, [
          opts.reading ? el('div', { class: 'inspect-reading', text: opts.reading }) : null,
          el('p', { class: 'inspect-body', text: opts.body }),
        ]),
      ]);
      m.setFooter([
        el('button', { class: 'btn btn-primary', text: t('common.close'), onClick: () => m.close() }),
      ]);
    },
  });
}

export function showLangButton(label: string, onClick: () => void): HTMLElement {
  return el('button', { class: 'hud-btn', text: label, onClick });
}

export { setLang };
