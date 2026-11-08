import { openModal } from '../modal';
import { el, mount } from '../dom';
import { t } from '../../../i18n/i18n';
import type { Bi } from '../../../i18n/dict';
import type { ChoiceOption } from '../../types';
import { footerBtn, setError, errorLine, L } from './common';

export type ChoiceOpts = {
  title: Bi | string;
  prompt: Bi | string;
  options: ChoiceOption[];
  canClose?: boolean;
  onHint?: () => void;
  onCorrect: () => void;
};

/**
 * Card picker used for the "identify the input" stage and for the
 * washer's door decision. Wrong answers get a causal explanation,
 * never a bare "incorrect".
 */
export function openChoicePanel(opts: ChoiceOpts): { close: () => void } {
  const feedback = errorLine();
  let solved = false;

  const modal = openModal({
    title: opts.title,
    subtitle: opts.prompt,
    variant: 'wide',
    closable: opts.canClose !== false,
    build: (m) => {
      const grid = el('div', { class: 'choice-grid' });
      opts.options.forEach((o, i) => {
        const card = el(
          'button',
          { class: 'choice-card', style: `--d:${i}` },
          [
            el('div', { class: 'choice-label', text: L(o.label) }),
            o.detail ? el('div', { class: 'choice-detail', text: L(o.detail) }) : null,
          ],
        );
        card.addEventListener('click', () => {
          if (solved) return;
          if (o.correct) {
            solved = true;
            card.classList.add('is-correct');
            setError(feedback, null);
            grid.querySelectorAll<HTMLButtonElement>('.choice-card').forEach((c) => {
              c.disabled = true;
            });
            window.setTimeout(() => {
              modal.close();
              opts.onCorrect();
            }, 520);
          } else {
            card.classList.add('is-wrong');
            window.setTimeout(() => card.classList.remove('is-wrong'), 420);
            setError(feedback, o.wrong ? L(o.wrong) : t('puzzle.wiring.invalid'));
          }
        });
        grid.appendChild(card);
      });
      mount(m.body, [grid, feedback]);
      m.setFooter([
        footerBtn(t('common.hint'), { onClick: () => opts.onHint?.(), disabled: !opts.onHint }),
        footerBtn(t('common.close'), { onClick: () => modal.close(), disabled: opts.canClose === false }),
      ]);
    },
  });

  return { close: () => modal.close() };
}
