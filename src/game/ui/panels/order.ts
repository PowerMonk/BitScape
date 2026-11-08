import { openModal } from '../modal';
import { el, mount } from '../dom';
import { t } from '../../../i18n/i18n';
import type { Bi } from '../../../i18n/dict';
import { errorLine, footerBtn, L, setError } from './common';

export type OrderOpts = {
  title: Bi | string;
  subtitle: Bi | string;
  options: { id: string; label: Bi }[];
  correctOrder: string[];
  /** 'cycle' = washer cycle feedback, 'path' = signal path feedback */
  mode: 'cycle' | 'path';
  variant?: 'wide' | 'side';
  onHint?: () => void;
  onDone: () => void;
};

/**
 * Ordering puzzle: used for the washer cycle and for the
 * "rebuild the signal path" recap that ends every device.
 */
export function openOrderPanel(opts: OrderOpts): { close: () => void } {
  const feedback = errorLine();
  const order: string[] = [];
  let solved = false;

  const byId = (id: string) => opts.options.find((o) => o.id === id)!;

  function render(m: { body: HTMLElement; setFooter: (k: Node[]) => void }) {
    const pool = opts.options.filter((o) => !order.includes(o.id));
    const slots = el(
      'div',
      { class: 'order-slots' },
      opts.correctOrder.map((_, i) => {
        const id = order[i];
        const def = id ? byId(id) : null;
        return el(
          'button',
          { class: `order-slot${def ? ' is-filled' : ''}`, onClick: () => { if (solved) return; if (id) { order.splice(i, 1); render(m); } } },
          [
            el('span', { class: 'order-num', text: String(i + 1) }),
            el('span', { class: 'order-text', text: def ? L(def.label) : '—' }),
          ],
        );
      }),
    );

    const poolRow = el(
      'div',
      { class: 'order-pool' },
      pool.map((o) =>
        el(
          'button',
          {
            class: 'order-card',
            disabled: solved,
            onClick: () => {
              if (order.length >= opts.correctOrder.length) return;
              order.push(o.id);
              setError(feedback, null);
              render(m);
            },
          },
          [el('span', { text: L(o.label) })],
        ),
      ),
    );

    mount(m.body, [
      el('div', { class: 'order-board' }, [
        el('div', { class: 'section-title', text: t('puzzle.program.slots') }),
        slots,
        el('div', { class: 'section-title', text: t('puzzle.program.palette') }),
        poolRow,
      ]),
      feedback,
    ]);
  }

  function check(m: { body: HTMLElement; setFooter: (k: Node[]) => void }) {
    if (order.length < opts.correctOrder.length) {
      setError(feedback, t('puzzle.program.empty'));
      return;
    }
    const i = opts.correctOrder.findIndex((id, idx) => order[idx] !== id);
    if (i === -1) {
      solved = true;
      setError(
        feedback,
        opts.mode === 'cycle' ? t('puzzle.order.correct') : t('puzzle.path.correct'),
      );
      feedback.classList.remove('is-bad');
      feedback.classList.add('is-good');
      render(m);
      m.setFooter([
        footerBtn(t('common.hint'), { onClick: () => opts.onHint?.(), disabled: !opts.onHint }),
        footerBtn(t('common.continue'), {
          primary: true,
          onClick: () => {
            modal.close();
            opts.onDone();
          },
        }),
      ]);
      return;
    }
    const first = byId(opts.correctOrder[i]);
    setError(
      feedback,
      opts.mode === 'cycle'
        ? t('puzzle.order.firstWrong', { step: L(first.label) })
        : t('puzzle.path.wrong'),
    );
    feedback.classList.add('shake');
  }

  const modal = openModal({
    title: opts.title,
    subtitle: opts.subtitle,
    variant: opts.variant ?? 'wide',
    build: (m) => {
      render(m);
      m.setFooter([
        footerBtn(t('common.hint'), { onClick: () => opts.onHint?.(), disabled: !opts.onHint }),
        footerBtn(opts.mode === 'cycle' ? t('puzzle.order.check') : t('puzzle.path.check'), {
          primary: true,
          onClick: () => check(m),
        }),
        footerBtn(t('common.close'), { onClick: () => modal.close() }),
      ]);
    },
  });

  return { close: () => modal.close() };
}
