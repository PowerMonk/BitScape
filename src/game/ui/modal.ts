import { el, append, clear, type Child } from './dom';
import { t, bi, type Bi } from '../../i18n/i18n';

export type ModalHandle = {
  root: HTMLElement;
  body: HTMLElement;
  footer: HTMLElement;
  setFooter: (kids: Child[]) => void;
  close: () => void;
};

let openCount = 0;
const openModals = new Set<ModalHandle>();

export function modalCount(): number {
  return openCount;
}

/** Close every open modal (used on screen transitions). */
export function closeAllModals(): void {
  for (const m of [...openModals]) m.close();
}

export type ModalOpts = {
  title: Bi | string;
  subtitle?: Bi | string;
  /** wide = centred large card; side = anchored left so the room's exterior window stays visible */
  variant?: 'wide' | 'side' | 'narrow';
  closable?: boolean;
  onClose?: () => void;
  build?: (m: ModalHandle) => void;
};

/** Shared puzzle/menu modal: flat cartoon card, focus trap, Esc close. */
export function openModal(opts: ModalOpts): ModalHandle {
  const body = el('div', { class: 'modal-body' });
  const footer = el('footer', { class: 'modal-foot' });
  const titleEl = el('div', { class: 'modal-title', text: typeof opts.title === 'string' ? opts.title : bi(opts.title) });
  const subEl =
    opts.subtitle !== undefined
      ? el('div', {
          class: 'modal-sub',
          text: typeof opts.subtitle === 'string' ? opts.subtitle : bi(opts.subtitle),
        })
      : null;

  const head = el('header', { class: 'modal-head' }, [
    el('div', { class: 'modal-head-text' }, [titleEl, subEl]),
  ]);

  const modal = el('div', { class: `modal modal-${opts.variant ?? 'wide'}` }, [head, body, footer]);
  const root = el('div', { class: 'modal-backdrop', role: 'dialog', 'aria-modal': 'true' }, [modal]);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    openCount = Math.max(0, openCount - 1);
    openModals.delete(handle);
    window.removeEventListener('keydown', onKey, true);
    root.remove();
    opts.onClose?.();
  };

  const handle: ModalHandle = {
    root,
    body,
    footer,
    setFooter: (kids) => {
      clear(footer);
      append(footer, kids);
    },
    close,
  };

  if (opts.closable !== false) {
    const btn = el('button', {
      class: 'icon-btn',
      'aria-label': t('common.close'),
      text: '✕',
      onClick: () => close(),
    });
    head.appendChild(btn);
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && opts.closable !== false) {
      e.stopPropagation();
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  window.addEventListener('keydown', onKey, true);

  document.getElementById('modal-root')?.appendChild(root);
  openCount++;
  openModals.add(handle);
  opts.build?.(handle);
  const focusable = modal.querySelector<HTMLElement>('button, [tabindex]');
  focusable?.focus();
  return handle;
}
