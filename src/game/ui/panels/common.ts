import { el } from '../dom';
import { t, bi, getLang } from '../../../i18n/i18n';
import type { ActionDef, SensorDef, ValueOpt, Cmp } from '../../types';

/** Bilingual label resolved at render time (language switches re-render). */
export const L = (v: { es: string; en: string }) => bi(v);

const GLYPHS: Record<string, string> = {
  thermo: 'T',
  distance: 'D',
  motion: '~',
  button: 'B',
  motor: 'M',
  led: 'I',
  chip: 'C',
  check: '✓',
  x: '✕',
  lock: 'L',
};

export function iconEl(name: string): HTMLElement {
  return el('span', { class: 'pi', text: GLYPHS[name] ?? '•', 'aria-hidden': 'true' });
}

/** A palette chip the player selects before filling a slot. */
export function chip(
  kind: 'sensor' | 'op' | 'value' | 'action' | 'step',
  id: string,
  label: string,
  opts: { icon?: string; selected?: boolean; onClick: () => void; disabled?: boolean },
): HTMLElement {
  return el(
    'button',
    {
      class: `chip-pal chip-${kind}${opts.selected ? ' is-selected' : ''}`,
      dataset: { kind, id },
      disabled: opts.disabled ?? false,
      onClick: opts.onClick,
    },
    [opts.icon ? iconEl(opts.icon) : null, el('span', { text: label })],
  );
}

export function sensorChip(s: SensorDef, selected: boolean, onClick: () => void): HTMLElement {
  const label = s.unit ? `${L(s.label)} (${s.unit})` : L(s.label);
  return chip('sensor', s.id, label, { icon: s.icon ?? 'chip', selected, onClick });
}

export function actionChip(
  a: ActionDef,
  selected: boolean,
  onClick: () => void,
  kind: 'action' | 'step' = 'action',
): HTMLElement {
  return chip(kind, a.id, L(a.label), { icon: a.icon ?? 'motor', selected, onClick });
}

export function valueChip(v: ValueOpt, selected: boolean, onClick: () => void): HTMLElement {
  return chip('value', String(v.v), L(v.label), { selected, onClick });
}

export function opChip(op: Cmp, selected: boolean, onClick: () => void): HTMLElement {
  return chip('op', op, op, { selected, onClick });
}

/** Empty/filled slot inside a rule row. */
export function slot(opts: {
  type: 'sensor' | 'op' | 'value' | 'action' | 'order';
  label: string;
  filled: boolean;
  active?: boolean;
  onClick: () => void;
  index?: number;
}): HTMLElement {
  return el(
    'button',
    {
      class: `slot slot-${opts.type}${opts.filled ? ' is-filled' : ''}${opts.active ? ' is-active' : ''}`,
      dataset: { type: opts.type, index: String(opts.index ?? -1) },
      onClick: opts.onClick,
    },
    [el('span', { class: 'slot-text', text: opts.label })],
  );
}

export function sectionTitle(text: string): HTMLElement {
  return el('div', { class: 'section-title', text });
}

export function errorLine(): HTMLElement {
  return el('div', { class: 'line-error', role: 'alert' });
}

export function setError(node: HTMLElement, msg: string | null): void {
  node.textContent = msg ?? '';
  node.classList.toggle('is-visible', !!msg);
}

export function footerBtn(
  label: string,
  opts: { primary?: boolean; onClick: () => void; disabled?: boolean } = { onClick: () => {} },
): HTMLElement {
  return el('button', {
    class: `btn ${opts.primary ? 'btn-primary' : 'btn-ghost'}`,
    disabled: opts.disabled ?? false,
    text: label,
    onClick: opts.onClick,
  });
}

export function isEn(): boolean {
  return getLang() === 'en';
}

export { t, bi, getLang };
