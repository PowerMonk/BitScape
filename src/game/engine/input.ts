export type PointerSample = {
  x: number;
  y: number;
  down: boolean;
  justDown: boolean;
  justUp: boolean;
  /** true when the pointer moved more than a few px since press (drag detection) */
  dragged: boolean;
};

type Mapper = (clientX: number, clientY: number) => { x: number; y: number };

/**
 * Keyboard + pointer input sampled in virtual canvas coordinates.
 * Edges (justDown/justUp/justPressed) are valid for one frame and
 * cleared by endFrame().
 */
export class Input {
  held = new Set<string>();
  pressed = new Set<string>();
  pointer: PointerSample = { x: 0, y: 0, down: false, justDown: false, justUp: false, dragged: false };
  /** click events queued since last endFrame (tap-to-move, hotspot clicks) */
  clicks: { x: number; y: number }[] = [];

  private map: Mapper = (x, y) => ({ x, y });
  private pressX = 0;
  private pressY = 0;
  private moved = false;

  setMapper(fn: Mapper) {
    this.map = fn;
  }

  /**
   * True while focus sits in a text field. Checked at event time (not kept
   * in sync via focus events) so it stays correct even when a screen
   * re-renders and remounts the input. While typing, the game must not
   * touch the keyboard at all: preventDefault on KeyA/KeyE/KeyW/... used to
   * swallow characters like "a" and "e" in the name field, and Space/Tab
   * as well.
   */
  private isTyping(): boolean {
    const el = document.activeElement;
    return (
      !!el &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable === true)
    );
  }

  attach(target: HTMLElement) {
    const onKeyDown = (e: KeyboardEvent) => {
      if (this.isTyping()) return;
      if (isGameKey(e.code)) e.preventDefault();
      if (!this.held.has(e.code)) this.pressed.add(e.code);
      this.held.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.held.delete(e.code);
    };
    const onBlur = () => {
      this.held.clear();
      this.pressed.clear();
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const toVirtual = (e: { clientX: number; clientY: number }) => this.map(e.clientX, e.clientY);

    const onDown = (e: PointerEvent) => {
      const p = toVirtual(e);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.down = true;
      this.pointer.justDown = true;
      this.pointer.dragged = false;
      this.pressX = p.x;
      this.pressY = p.y;
      this.moved = false;
    };
    const onMove = (e: PointerEvent) => {
      const p = toVirtual(e);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      if (this.pointer.down) {
        const d = Math.hypot(p.x - this.pressX, p.y - this.pressY);
        if (d > 8) {
          this.moved = true;
          this.pointer.dragged = true;
        }
      }
    };
    const onUp = (e: PointerEvent) => {
      const p = toVirtual(e);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      const wasDown = this.pointer.down;
      this.pointer.down = false;
      this.pointer.justUp = true;
      if (wasDown && !this.moved) this.clicks.push({ x: p.x, y: p.y });
    };

    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isHeld(...codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  wasPressed(...codes: string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  endFrame() {
    this.pressed.clear();
    this.pointer.justDown = false;
    this.pointer.justUp = false;
    this.pointer.dragged = false;
    this.clicks.length = 0;
  }
}

function isGameKey(code: string): boolean {
  return (
    code.startsWith('Arrow') ||
    code === 'Space' ||
    code === 'Tab' ||
    code === 'KeyW' ||
    code === 'KeyA' ||
    code === 'KeyS' ||
    code === 'KeyD' ||
    code === 'KeyE' ||
    code === 'KeyP'
  );
}
