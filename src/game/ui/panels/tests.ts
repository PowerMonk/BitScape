import { openModal } from '../modal';
import { el, mount } from '../dom';
import { t } from '../../../i18n/i18n';
import { sleep } from '../../engine/tween';
import { runTest, type LevelActions, type RuleEval } from '../../puzzles/simulate';
import type { LevelRuntime } from '../../runtime';
import type { ActionDef, Cond, SensorDef, TestDef, ValueOpt } from '../../types';
import { KEEP_ACTION } from './blocks';
import { footerBtn, L } from './common';

export type TestOpts = {
  runtime: LevelRuntime;
  reducedMotion: boolean;
  onHint?: () => void;
  setExterior: (patch: Record<string, number | boolean>) => void;
  onAllPassed: () => void;
  onRetry: () => void;
};

function collectSensors(rt: LevelRuntime): SensorDef[] {
  const p = rt.level.program;
  if (p.kind === 'rule') return p.slots.sensors;
  return [...p.slots.fill.sensors, ...(p.slots.safety?.sensors ?? [])];
}

function collectValues(rt: LevelRuntime): ValueOpt[] {
  const p = rt.level.program;
  if (p.kind === 'rule') return p.slots.values;
  return [...p.slots.fill.values, ...(p.slots.safety?.values ?? [])];
}

function collectActions(rt: LevelRuntime): ActionDef[] {
  const p = rt.level.program;
  if (p.kind === 'rule') {
    return p.slots.allowKeep ? [...p.slots.actions, KEEP_ACTION] : p.slots.actions;
  }
  return [...p.slots.steps, ...(p.slots.safety?.actions ?? [])];
}

function actionsMap(rt: LevelRuntime): LevelActions {
  return new Map(collectActions(rt).map((a) => [a.id, a]));
}

/**
 * Test runner: executes every test case against the built program and
 * walks the player through Lectura → Decisión → Salida with live
 * feedback on the room's exterior view.
 */
export function openTestPanel(opts: TestOpts): { close: () => void } {
  const rt = opts.runtime;
  const level = rt.level;
  const sensors = collectSensors(rt);
  const values = collectValues(rt);
  const map = actionsMap(rt);
  const cards = new Map<string, HTMLElement>();
  let token = 0;
  let running = false;

  const sensorLabel = (id: string) => sensors.find((s) => s.id === id)?.label ?? { es: id, en: id };
  const sensorUnit = (id: string) => sensors.find((s) => s.id === id)?.unit ?? '';

  function valueText(sensorId: string, v: number | boolean): string {
    if (typeof v === 'boolean') {
      const hit = values.find((x) => x.v === v && typeof x.v === 'boolean');
      return hit ? L(hit.label) : String(v);
    }
    const hit = values.find((x) => x.v === v);
    if (hit) return L(hit.label);
    return `${v}${sensorUnit(sensorId) ? ` ${sensorUnit(sensorId)}` : ''}`;
  }

  function condText(cond: Cond): string {
    return `${L(sensorLabel(cond.sensor))} ${cond.op} ${valueText(cond.sensor, cond.value)}`;
  }

  function actionText(id: string | null): string {
    if (!id) return '—';
    const a = collectActions(rt).find((x) => x.id === id);
    return a ? L(a.label) : id;
  }

  function inputText(test: TestDef): string {
    const entries = Object.entries(test.input ?? {});
    if (entries.length === 0) return '—';
    return entries
      .map(([k, v]) => `${L(sensorLabel(k))}: ${valueText(k, v)}`)
      .join('  ·  ');
  }

  function stateText(state: Record<string, string | number | boolean>): string {
    const keys = Object.keys(state);
    if (keys.length === 0) return '—';
    return keys.map((k) => `${k}: ${String(state[k])}`).join(', ');
  }

  function decisionText(test: TestDef, ev: RuleEval | null, outcomeDetail?: string): string {
    const p = rt.program;
    if (p && p.kind === 'rule' && ev) {
      if (ev.fired >= 0) {
        const rule = p.rules[ev.fired];
        return `${t('puzzle.program.if')} ${condText(rule.cond!)}  →  ${actionText(rule.action)}`;
      }
      if (p.defaultAction) return `${t('puzzle.program.other')}: ${actionText(p.defaultAction)}`;
      return t('fb.testNoRule');
    }
    if (p && p.kind === 'sequence') {
      if (test.kind === 'sequence') {
        const wrong = outcomeDetail;
        const labels = p.steps.map((s) => actionText(s));
        return wrong ? `… ${actionText(wrong)} ?` : labels.join(' → ');
      }
      if (test.kind === 'fill' && p.fill) {
        return `${t('puzzle.program.while')} ${condText(p.fill.cond)}  →  ${outcomeDetail}`;
      }
      if (test.kind === 'safety' && p.safety) {
        return `${t('puzzle.program.if')} ${condText(p.safety.cond)}  →  ${outcomeDetail}`;
      }
    }
    return '—';
  }

  function exteriorPatch(test: TestDef, phase: 'input' | 'output', outcomeActual?: Record<string, string | number | boolean>): Record<string, number | boolean> {
    const raw: Record<string, string | number | boolean> = {
      ...(test.prior ?? {}),
      ...(phase === 'input' ? (test.input ?? {}) : {}),
    };
    if (phase === 'output' && outcomeActual) Object.assign(raw, outcomeActual);
    const out: Record<string, number | boolean> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    }
    if ('motors' in raw) out.moving = raw.motors === 'run';
    else if ('motor' in raw) out.moving = raw.motor === true;
    if (test.kind === 'safety' && 'door' in raw) out.doorClosed = raw.door === true;
    return out;
  }

  function cardFor(test: TestDef): HTMLElement {
    // Restore the previous outcome when the panel reopens: green for a pass,
    // red + explanation for a failure, grey for never run.
    const passed = rt.testsPassed[test.id];
    const state = passed === true ? 'pass' : passed === false ? 'fail' : 'idle';
    const fb = el('div', { class: 'test-fb' });
    if (state === 'fail' && test.feedback) {
      fb.textContent = L(test.feedback);
      fb.classList.add('is-visible');
    }
    const card = el(
      'div',
      { class: 'test-card', dataset: { state, id: test.id } },
      [
        el('div', { class: 'test-head' }, [
          el('span', { class: 'test-name', text: L(test.name) }),
          el('span', {
            class: 'test-badge',
            text:
              state === 'pass'
                ? t('puzzle.test.pass')
                : state === 'fail'
                  ? t('puzzle.test.fail')
                  : '',
          }),
        ]),
        el('div', { class: 'test-steps' }, [
          stepRow('1', t('puzzle.test.step1'), ''),
          stepRow('2', t('puzzle.test.step2'), ''),
          stepRow('3', t('puzzle.test.step3'), ''),
        ]),
        fb,
      ],
    );
    cards.set(test.id, card);
    return card;
  }

  function stepRow(n: string, title: string, value: string): HTMLElement {
    return el('div', { class: 't-step', dataset: { k: n } }, [
      el('span', { class: 't-k', text: n }),
      el('span', { class: 't-title', text: title }),
      el('span', { class: 't-value', text: value }),
    ]);
  }

  function setStep(card: HTMLElement, n: number, value: string) {
    const row = card.querySelector<HTMLElement>(`.t-step[data-k="${n}"]`);
    if (!row) return;
    row.querySelector('.t-value')!.textContent = value;
    card.querySelectorAll('.t-step').forEach((r) => r.classList.remove('is-active'));
    row.classList.add('is-active', 'is-done');
  }

  async function runAll(onlyPending = false) {
    if (running) return;
    running = true;
    const my = ++token;
    const sig = JSON.stringify(rt.program ?? null);
    const list = onlyPending
      ? level.tests.filter((t) => rt.testsPassed[t.id] !== true)
      : level.tests;

    for (const test of list) {
      if (my !== token) return;
      const card = cards.get(test.id)!;
      card.dataset.state = 'running';
      card.querySelector('.test-fb')!.textContent = '';
      card.querySelectorAll('.t-step').forEach((r) => r.classList.remove('is-active', 'is-done'));
      card.querySelectorAll('.t-value').forEach((v) => (v.textContent = ''));

      const outcome = runTest(rt.program, test, map);

      setStep(card, 1, inputText(test));
      opts.setExterior(exteriorPatch(test, 'input'));
      await sleep(480, opts.reducedMotion);
      if (my !== token) return;

      if (test.kind === 'sequence' && rt.program?.kind === 'sequence') {
        for (let i = 0; i < rt.program.steps.length; i++) {
          if (my !== token) return;
          setStep(card, 2, decisionText(test, null, undefined));
          opts.setExterior({ step: i });
          await sleep(140, opts.reducedMotion);
        }
        opts.setExterior({ step: 5 });
      } else {
        setStep(card, 2, decisionText(test, outcome.eval_, outcome.detail));
      }
      await sleep(520, opts.reducedMotion);
      if (my !== token) return;

      setStep(card, 3, `${actionText(outcome.action)}  ·  ${stateText(outcome.actual)}`);
      opts.setExterior(exteriorPatch(test, 'output', outcome.actual));
      await sleep(460, opts.reducedMotion);
      if (my !== token) return;

      card.dataset.state = outcome.pass ? 'pass' : 'fail';
      card.querySelector('.test-badge')!.textContent = outcome.pass
        ? t('puzzle.test.pass')
        : t('puzzle.test.fail');
      rt.testsPassed[test.id] = outcome.pass;

      if (!outcome.pass) {
        const fb = card.querySelector<HTMLElement>('.test-fb')!;
        if (test.feedback) {
          fb.textContent = L(test.feedback);
        } else if (outcome.mismatches.length > 0) {
          const m = outcome.mismatches[0];
          fb.textContent = t('fb.testMismatch', {
            input: inputText(test),
            expected: `${m.key}: ${m.expected}`,
            actual: `${m.key}: ${m.actual}`,
          });
        } else {
          fb.textContent = t('fb.testNoRule');
        }
        fb.classList.add('is-visible');
      }
      await sleep(300, opts.reducedMotion);
    }

    if (my !== token) return;

    // Stamp every pass produced here with the program it ran against.
    for (const test of list) {
      if (rt.testsPassed[test.id] === true) testSig[test.id] = sig;
    }

    // Soundness net: passes earned under an *older* program are re-checked
    // without the animation (fast, one short beat each), so "run pending"
    // can never grant a false green board after an edit.
    const stale = level.tests.filter((t) => rt.testsPassed[t.id] === true && testSig[t.id] !== sig);
    if (onlyPending && allPassed() && stale.length > 0) {
      verdict.textContent = t('puzzle.test.recheck');
      verdict.classList.add('is-visible');
      verdict.classList.remove('is-good', 'is-bad');
      for (const test of stale) {
        if (my !== token) return;
        const outcome = runTest(rt.program, test, map);
        const card = cards.get(test.id)!;
        rt.testsPassed[test.id] = outcome.pass;
        card.dataset.state = outcome.pass ? 'pass' : 'fail';
        card.querySelector('.test-badge')!.textContent = outcome.pass
          ? t('puzzle.test.pass')
          : t('puzzle.test.fail');
        if (outcome.pass) {
          testSig[test.id] = sig;
          card.querySelector<HTMLElement>('.test-fb')!.classList.remove('is-visible');
        } else {
          const fb = card.querySelector<HTMLElement>('.test-fb')!;
          fb.textContent = test.feedback ? L(test.feedback) : t('fb.testNoRule');
          fb.classList.add('is-visible');
        }
        await sleep(140, opts.reducedMotion);
      }
      if (my !== token) return;
    }

    running = false;
    const all = allPassed();
    rt.allTestsPassed = all;
    verdictAll = all;
    verdict.textContent = all ? t('puzzle.test.allPass') : t('puzzle.test.fail');
    verdict.classList.add('is-visible', all ? 'is-good' : 'is-bad');
    verdict.classList.remove(all ? 'is-bad' : 'is-good');
  }

  /** Program signature per passing test (which program earned each green). */
  const testSig: Record<string, string> = {};
  const pendingCount = () => level.tests.filter((t) => rt.testsPassed[t.id] !== true).length;
  const somePassed = () => level.tests.some((t) => rt.testsPassed[t.id] === true);
  const allPassed = () => level.tests.every((t) => rt.testsPassed[t.id] === true);

  let started = false;
  let verdictAll = false;
  const verdict = el('div', { class: 'test-verdict' });
  let ref: { setFooter: (k: Node[]) => void } | null = null;

  function startRun(pendingOnly: boolean) {
    started = true;
    verdict.classList.remove('is-visible', 'is-good', 'is-bad');
    verdict.textContent = '';
    const p = runAll(pendingOnly);
    ref?.setFooter(footerRow());
    void p.finally(() => ref?.setFooter(footerRow()));
  }

  function footerRow(): Node[] {
    const hint = footerBtn(t('common.hint'), { onClick: () => opts.onHint?.(), disabled: !opts.onHint });
    const close = footerBtn(t('common.close'), { onClick: () => modal.close() });

    if (running) {
      return [hint, footerBtn(t('puzzle.test.run'), { primary: true, disabled: true, onClick: () => {} }), close];
    }
    if (verdictAll) {
      return [
        hint,
        footerBtn(t('common.continue'), {
          primary: true,
          onClick: () => {
            modal.close();
            opts.onAllPassed();
          },
        }),
        close,
      ];
    }
    if (started) {
      // This session produced failures: only editing the program can help.
      return [
        hint,
        footerBtn(t('common.retry'), {
          primary: true,
          onClick: () => {
            modal.close();
            opts.onRetry();
          },
        }),
        close,
      ];
    }
    const pending = pendingCount();
    if (pending > 0 && somePassed()) {
      // Reopened after a fix: run only what is left, or the full suite.
      return [
        hint,
        footerBtn(t('puzzle.test.runPending', { n: pending }), {
          primary: true,
          onClick: () => startRun(true),
        }),
        footerBtn(t('puzzle.test.runAll'), { onClick: () => startRun(false) }),
        close,
      ];
    }
    return [hint, footerBtn(t('puzzle.test.run'), { primary: true, onClick: () => startRun(false) }), close];
  }

  const modal = openModal({
    title: t('puzzle.test.title'),
    subtitle: t('puzzle.test.sub'),
    variant: 'side',
    build: (m) => {
      ref = m;
      mount(m.body, [el('div', { class: 'test-list' }, level.tests.map(cardFor)), verdict]);
      m.setFooter(footerRow());
    },
    onClose: () => {
      token++;
      ref = null;
    },
  });

  return { close: () => modal.close() };
}
