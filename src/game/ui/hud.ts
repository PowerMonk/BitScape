import { el, mount } from './dom';
import { t, getLang } from '../../i18n/i18n';

export type StageChip = { label: string; state: 'done' | 'active' | 'todo' };

export type HudState = {
  title: string;
  objective: string;
  chips: StageChip[];
  hintLabel: string;
  hintDisabled: boolean;
  onPause: () => void;
  onHint: () => void;
  onLang: () => void;
};

/** Top bar: context title, stage chips, objective, hint / language / pause. */
export function renderHud(root: HTMLElement, s: HudState): void {
  const chips = el(
    'div',
    { class: 'chips', role: 'list', 'aria-label': t('hud.progress') },
    s.chips.map((c) =>
      el(
        'div',
        { class: `chip chip-${c.state}`, role: 'listitem', title: c.label },
        [el('span', { class: 'chip-dot' }), el('span', { class: 'chip-label', text: c.label })],
      ),
    ),
  );

  mount(root, [
    el('div', { class: 'hud-left' }, [el('div', { class: 'hud-title', text: s.title }), chips]),
    el('div', { class: 'hud-mid' }, [
      el('span', { class: 'hud-obj-label', text: `${t('hud.objective')}:` }),
      el('span', { class: 'hud-obj', text: s.objective }),
    ]),
    el('div', { class: 'hud-right' }, [
      el('button', {
        class: 'hud-btn hud-hint',
        disabled: s.hintDisabled,
        text: `${t('common.hint')} (${s.hintLabel})`,
        title: t('hint.tip'),
        onClick: s.onHint,
      }),
      el('button', {
        class: 'hud-btn',
        'aria-label': t('menu.language'),
        text: getLang() === 'es' ? 'EN' : 'ES',
        title: t('lang.tip'),
        onClick: s.onLang,
      }),
      el('button', {
        class: 'hud-btn',
        'aria-label': t('common.pause'),
        text: '⏸',
        title: t('pause.tip'),
        onClick: s.onPause,
      }),
    ]),
  ]);
}

/** Chips for a device room: one per stage of the pipeline. */
export function stageChips(
  stages: string[],
  labels: Record<string, string>,
  current: string,
): StageChip[] {
  const idx = stages.indexOf(current);
  return stages.map((s, i) => ({
    label: labels[s] ?? s,
    state: (current === s ? 'active' : i < idx ? 'done' : 'todo') as StageChip['state'],
  }));
}
