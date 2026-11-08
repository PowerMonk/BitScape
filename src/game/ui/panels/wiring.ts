import { openModal, type ModalHandle } from '../modal';
import { el, mount, clear } from '../dom';
import { t } from '../../../i18n/i18n';
import type { LevelRuntime } from '../../runtime';
import { requiredDone, hasEdge } from '../../runtime';
import type { WiringNode } from '../../types';
import { footerBtn, setError, errorLine, L, iconEl } from './common';

export type WiringOpts = {
  runtime: LevelRuntime;
  onHint?: () => void;
  onDone: () => void;
};

/**
 * Port-to-port rewiring: click a source, click a destination.
 * Only semantically valid edges are accepted; tempting-but-wrong ones
 * get an explanation instead of a generic error.
 */
export function openWiringPanel(opts: WiringOpts): { close: () => void } {
  const rt = opts.runtime;
  const def = rt.level.wiring;
  const feedback = errorLine();
  const banner = el('div', { class: 'wire-banner' });
  let selected: string | null = null;
  let solved = requiredDone(rt);
  let ref: ModalHandle | null = null;
  let resizeHandler: (() => void) | null = null;
  let observer: ResizeObserver | null = null;

  const kindOf = (id: string): WiringNode['kind'] =>
    def.nodes.find((n) => n.id === id)?.kind ?? 'source';

  const layer = el('div', { class: 'wiring-layer' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'wiring-svg');
  layer.appendChild(svg);

  const colSources = el('div', { class: 'wire-col' });
  const colMcu = el('div', { class: 'wire-col' });
  const colSinks = el('div', { class: 'wire-col' });

  function card(n: WiringNode): HTMLElement {
    return el(
      'button',
      { class: `wire-node wire-${n.kind}`, dataset: { id: n.id } },
      [iconEl(n.icon), el('span', { class: 'wire-label', text: L(n.label) })],
    );
  }

  function buildColumns() {
    mount(colSources, [
      el('div', { class: 'wire-col-title', text: t('hud.stage.entry') }),
      ...def.nodes.filter((n) => n.kind === 'source').map(card),
    ]);
    mount(colMcu, [
      el('div', { class: 'wire-col-title', text: t('hud.stage.program') }),
      ...def.nodes.filter((n) => n.kind === 'mcuIn').map(card),
      ...def.nodes.filter((n) => n.kind === 'mcuOut').map(card),
    ]);
    mount(colSinks, [
      el('div', { class: 'wire-col-title', text: t('hud.stage.test') }),
      ...def.nodes.filter((n) => n.kind === 'sink').map(card),
    ]);
    // The columns are not inside `layer` yet at this point, so query them
    // directly — otherwise no listener would ever be attached.
    for (const col of [colSources, colMcu, colSinks]) {
      col.querySelectorAll<HTMLElement>('.wire-node').forEach((n) => {
        n.addEventListener('click', () => onNode(n.dataset.id!));
      });
    }
  }

  function refreshCards() {
    layer.querySelectorAll<HTMLElement>('.wire-node').forEach((n) => {
      const id = n.dataset.id!;
      const connected = rt.edges.some(([a, b]) => a === id || b === id);
      n.classList.toggle('is-connected', connected);
      n.classList.toggle('is-selected', selected === id);
    });
  }

  function anchor(id: string): { x: number; y: number } | null {
    const node = layer.querySelector<HTMLElement>(`.wire-node[data-id="${id}"]`);
    if (!node) return null;
    const nr = node.getBoundingClientRect();
    const lr = layer.getBoundingClientRect();
    const k = kindOf(id);
    const right = k === 'source' || k === 'mcuOut';
    return {
      x: (right ? nr.right : nr.left) - lr.left,
      y: nr.top + nr.height / 2 - lr.top,
    };
  }

  function redraw() {
    clear(svg);
    const lr = layer.getBoundingClientRect();
    if (lr.width === 0) return;
    svg.setAttribute('viewBox', `0 0 ${lr.width} ${lr.height}`);
    svg.setAttribute('width', String(lr.width));
    svg.setAttribute('height', String(lr.height));
    for (const [a, b] of rt.edges) {
      const p1 = anchor(a);
      const p2 = anchor(b);
      if (!p1 || !p2) continue;
      const dx = Math.max(30, Math.abs(p2.x - p1.x) * 0.45);
      const d = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      halo.setAttribute('d', d);
      halo.setAttribute('class', 'wire-halo');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'wire-path');
      const dotEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dotEl.setAttribute('r', '5');
      dotEl.setAttribute('class', 'wire-dot');
      dotEl.setAttribute('cx', String((p1.x + p2.x) / 2));
      dotEl.setAttribute('cy', String((p1.y + p2.y) / 2));
      const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      anim.setAttribute('dur', '1.6s');
      anim.setAttribute('repeatCount', 'indefinite');
      anim.setAttribute('path', d);
      dotEl.appendChild(anim);
      svg.append(halo, path, dotEl);
    }
  }

  function showFeedback(msg: string) {
    setError(feedback, msg);
    feedback.classList.remove('shake');
    void feedback.offsetWidth;
    feedback.classList.add('shake');
  }

  function footerRow() {
    return [
      footerBtn('↩', {
        onClick: () => {
          if (rt.edges.length === 0) return;
          rt.edges.pop();
          solved = false;
          banner.classList.remove('is-visible');
          ref?.setFooter(footerRow());
          setError(feedback, null);
          refreshCards();
          redraw();
        },
      }),
      footerBtn(t('common.hint'), { onClick: () => opts.onHint?.(), disabled: !opts.onHint }),
      solved
        ? footerBtn(t('common.continue'), {
            primary: true,
            onClick: () => {
              modal.close();
              opts.onDone();
            },
          })
        : footerBtn(t('common.close'), { onClick: () => modal.close() }),
    ];
  }

  function connect(a: string, b: string) {
    if (a === b) {
      showFeedback(t('puzzle.wiring.same'));
      return;
    }
    const ka = kindOf(a);
    const kb = kindOf(b);
    let from = a;
    let to = b;
    const forward = (ka === 'source' && kb === 'mcuIn') || (ka === 'mcuOut' && kb === 'sink');
    const backward = (kb === 'source' && ka === 'mcuIn') || (kb === 'mcuOut' && ka === 'sink');
    if (backward) {
      from = b;
      to = a;
    } else if (!forward) {
      const msg = def.reject[`${a}>${b}`] ?? def.reject[`${b}>${a}`];
      showFeedback(msg ? L(msg) : t('puzzle.wiring.invalid'));
      return;
    }

    if (hasEdge(rt, from, to)) {
      rt.edges = rt.edges.filter(([x, y]) => !(x === from && y === to));
      solved = false;
      setError(feedback, null);
      banner.classList.remove('is-visible');
      ref?.setFooter(footerRow());
      refreshCards();
      redraw();
      return;
    }

    const key = `${from}>${to}`;
    const isRequired = def.required.some(([x, y]) => x === from && y === to);
    if (!isRequired) {
      const msg = def.reject[key];
      showFeedback(msg ? L(msg) : t('puzzle.wiring.invalid'));
      return;
    }

    rt.edges.push([from, to]);
    setError(feedback, t('puzzle.wiring.ok'));
    refreshCards();
    redraw();

    if (requiredDone(rt) && !solved) {
      solved = true;
      banner.textContent = t('puzzle.wiring.done');
      banner.classList.add('is-visible', 'is-good');
      ref?.setFooter(footerRow());
    }
  }

  function onNode(id: string) {
    if (solved) return;
    if (!selected) {
      selected = id;
      setError(feedback, t('puzzle.wiring.needSource'));
      refreshCards();
      return;
    }
    if (selected === id) {
      selected = null;
      setError(feedback, null);
      refreshCards();
      return;
    }
    const prev = selected;
    selected = null;
    connect(prev, id);
    refreshCards();
  }

  const modal = openModal({
    title: t('puzzle.wiring.title'),
    subtitle: t('puzzle.wiring.sub'),
    variant: 'wide',
    build: (m) => {
      ref = m;
      buildColumns();
      const grid = el('div', { class: 'wiring-cols' }, [
        el('div', { class: 'wire-col-wrap' }, [colSources]),
        el('div', { class: 'wire-col-wrap wire-mcu' }, [colMcu]),
        el('div', { class: 'wire-col-wrap' }, [colSinks]),
      ]);
      layer.appendChild(grid);
      mount(m.body, [layer, banner, feedback]);
      if (solved) {
        banner.textContent = t('puzzle.wiring.done');
        banner.classList.add('is-visible', 'is-good');
      }
      m.setFooter(footerRow());

      requestAnimationFrame(() => redraw());
      resizeHandler = () => redraw();
      window.addEventListener('resize', resizeHandler);
      observer = new ResizeObserver(() => redraw());
      observer.observe(layer);
    },
    onClose: () => {
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      observer?.disconnect();
      ref = null;
    },
  });

  return { close: () => modal.close() };
}
