import { el, mount } from './dom';
import type { Bi } from '../../i18n/dict';
import { bi, t } from '../../i18n/i18n';

/**
 * BIT speech bubble with a typewriter effect.
 * Clicking (or pressing E) finishes the line, then advances.
 */
export class DialogBox {
  private root: HTMLElement;
  private textEl: HTMLElement;
  private queue: Bi[] = [];
  private current: Bi | null = null;
  private shown = 0;
  private onDone: (() => void) | null = null;
  reducedMotion = false;
  /** lines waiting for the current modal to close */
  private pending: { lines: Bi[]; onDone?: () => void }[] = [];

  constructor(container: HTMLElement) {
    const face = el('div', { class: 'bit-face' }, [
      el('span', { class: 'bit-antenna' }),
      el('span', { class: 'bit-eye' }),
      el('span', { class: 'bit-eye' }),
    ]);
    this.textEl = el('div', { class: 'dialog-text' });
    this.root = el('div', { class: 'dialog', hidden: true }, [
      face,
      el('div', { class: 'dialog-bubble' }, [
        el('div', { class: 'dialog-name', text: 'BIT' }),
        this.textEl,
        el('div', { class: 'dialog-hint', text: `E · ${t('common.next')} ▾` }),
      ]),
    ]);
    container.appendChild(this.root);
    this.root.addEventListener('click', () => this.advance());
  }

  isOpen(): boolean {
    return this.current !== null;
  }

  /** Queue lines; they play when no modal is open. */
  say(lines: Bi[], onDone?: () => void) {
    if (lines.length === 0) {
      onDone?.();
      return;
    }
    this.pending.push({ lines, onDone });
  }

  /** Called every frame; starts queued dialogue when it is visible. */
  tryFlush(modalOpen: boolean) {
    if (modalOpen || this.isOpen() || this.pending.length === 0) return;
    const next = this.pending.shift()!;
    this.queue = [...next.lines];
    this.onDone = next.onDone ?? null;
    this.nextLine();
  }

  private nextLine() {
    const line = this.queue.shift();
    if (!line) {
      this.current = null;
      this.root.hidden = true;
      const cb = this.onDone;
      this.onDone = null;
      cb?.();
      return;
    }
    this.current = line;
    this.shown = 0;
    this.root.hidden = false;
    this.render();
  }

  private full(): string {
    return this.current ? bi(this.current) : '';
  }

  private render() {
    const full = this.full();
    this.textEl.textContent = full.slice(0, Math.floor(this.shown));
    this.root.classList.toggle('is-done', this.shown >= full.length);
  }

  update(dt: number) {
    if (!this.current) return;
    const len = this.full().length;
    const speed = this.reducedMotion ? 400 : 55;
    if (this.shown < len) {
      this.shown = Math.min(len, this.shown + dt * speed);
      this.render();
    }
  }

  /** Complete the current line or advance to the next one. */
  advance() {
    if (!this.current) return;
    const len = this.full().length;
    if (this.shown < len) {
      this.shown = len;
      this.render();
    } else {
      this.nextLine();
    }
  }

  /** Language switch: rebuild the visible line in the new language. */
  rerender() {
    if (this.current) this.render();
    const hint = this.root.querySelector('.dialog-hint');
    if (hint) hint.textContent = `E · ${t('common.next')} ▾`;
  }

  clear() {
    this.queue = [];
    this.pending = [];
    this.current = null;
    this.onDone = null;
    this.root.hidden = true;
  }
}

/** Lightweight toast for hints and transient messages (works over modals). */
export class Toast {
  private el: HTMLElement;
  private timer = 0;

  constructor(container: HTMLElement) {
    this.el = el('div', { class: 'toast', hidden: true });
    container.appendChild(this.el);
  }

  show(text: string, ms = 3400) {
    this.el.textContent = text;
    this.el.hidden = false;
    this.el.classList.add('is-on');
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.el.classList.remove('is-on');
      this.el.hidden = true;
    }, ms);
  }
}

export { mount };
