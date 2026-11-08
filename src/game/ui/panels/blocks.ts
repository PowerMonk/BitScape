import { openModal, type ModalHandle } from '../modal';
import { el, mount } from '../dom';
import { t } from '../../../i18n/i18n';
import type { LevelRuntime } from '../../runtime';
import type {
  ActionDef,
  Cmp,
  Cond,
  Program,
  SensorDef,
  ValueOpt,
} from '../../types';
import { runTest } from '../../puzzles/simulate';
import {
  actionChip,
  errorLine,
  footerBtn,
  L,
  opChip,
  setError,
  sensorChip,
  sectionTitle,
  slot,
  valueChip,
} from './common';

/** Pseudo-action offered in the "any other case" branch. */
export const KEEP_ACTION: ActionDef = {
  id: 'keep',
  label: { es: 'conservar el estado anterior', en: 'keep the previous state' },
  effect: {},
};

export type ProgramOpts = {
  runtime: LevelRuntime;
  onHint?: () => void;
  onSaved: () => void;
  onRunTests: () => void;
};

type SelKind = 'sensor' | 'op' | 'value' | 'action' | 'step';
type Sel = { kind: SelKind; id: string } | null;

type RuleRow = { sensor: string | null; op: Cmp | null; value: number | boolean | null; action: string | null };

/**
 * Block programming panel. Rule mode builds ordered IF/THEN rules with
 * an optional default branch; sequence mode builds the washer cycle
 * plus its fill condition and door safety rule.
 */
export function openProgramPanel(opts: ProgramOpts): { close: () => void } {
  const rt = opts.runtime;
  const builder = rt.level.program;
  const feedback = errorLine();
  let ref: ModalHandle | null = null;
  let selected: Sel = null;
  /** Editing stays open until the tests are passed — a failed run must never
   *  wipe the player's work. */
  const locked = rt.allTestsPassed || rt.completed;
  /** Parts involved in a failed test, marked red when the panel reopens. */
  const suspects = new Set<string>();

  /* ---------------- state ---------------- */
  const rows: RuleRow[] =
    builder.kind === 'rule'
      ? Array.from({ length: builder.slots.count }, () => ({
          sensor: null,
          op: null,
          value: null,
          action: null,
        }))
      : [];
  let elseAction: string | null = null;

  // sequence mode state
  const placed: (string | null)[] =
    builder.kind === 'sequence' ? Array.from({ length: builder.slots.steps.length }, () => null) : [];
  const fill: { sensor: string | null; op: Cmp | null; value: number | boolean | null } = {
    sensor: null,
    op: null,
    value: null,
  };
  const safety: { sensor: string | null; op: Cmp | null; value: number | boolean | null; action: string | null } = {
    sensor: null,
    op: null,
    value: null,
    action: null,
  };

  /* ---------------- hydration & suspects ---------------- */

  /** Rebuild the whole form from the saved program (never start blank). */
  function hydrate() {
    const p = rt.program;
    if (!p) return;
    if (p.kind === 'rule' && builder.kind === 'rule') {
      p.rules.forEach((r, i) => {
        if (i >= rows.length || !r.cond) return;
        rows[i] = {
          sensor: r.cond.sensor,
          op: r.cond.op,
          value: r.cond.value,
          action: r.action,
        };
      });
      elseAction = p.defaultAction;
    } else if (p.kind === 'sequence' && builder.kind === 'sequence') {
      p.steps.forEach((s, i) => {
        if (i < placed.length) placed[i] = s;
      });
      if (p.fill) {
        fill.sensor = p.fill.cond.sensor;
        fill.op = p.fill.cond.op;
        fill.value = p.fill.cond.value;
      }
      if (p.safety) {
        safety.sensor = p.safety.cond.sensor;
        safety.op = p.safety.cond.op;
        safety.value = p.safety.cond.value;
        safety.action = p.safety.action;
      }
    }
  }

  function levelActions(): Map<string, ActionDef> {
    const map = new Map<string, ActionDef>();
    if (builder.kind === 'rule') {
      for (const a of builder.slots.actions) map.set(a.id, a);
    } else {
      for (const a of builder.slots.steps) map.set(a.id, a);
      for (const a of builder.slots.safety.actions) map.set(a.id, a);
    }
    map.set(KEEP_ACTION.id, KEEP_ACTION);
    return map;
  }

  /**
   * Work out which parts were involved in a failed test so the player can
   * see exactly where to look instead of rebuilding from scratch:
   *  - a rule fired and produced the wrong output → that rule;
   *  - no rule matched → the branch that should have fired, else the default.
   */
  function computeSuspects() {
    suspects.clear();
    const p = rt.program;
    if (!p) return;
    const anyFailed = rt.level.tests.some((x) => rt.testsPassed[x.id] === false);
    if (!anyFailed) return;
    const actions = levelActions();

    if (p.kind === 'rule') {
      for (const test of rt.level.tests) {
        if (rt.testsPassed[test.id] !== false) continue;
        const out = runTest(p, test, actions);
        const fired = out.eval_?.fired ?? -1;
        if (fired >= 0) {
          suspects.add(`row${fired}`);
          continue;
        }
        const expected = test.expected ?? {};
        const prior = test.prior ?? {};
        const unchanged = Object.keys(expected).every((k) => String(prior[k]) === String(expected[k]));
        if (unchanged) {
          // nothing had to change: the default branch is the culprit
          suspects.add('else');
          continue;
        }
        const needed = [...actions.values()].find((a) => {
          const merged: Record<string, unknown> = { ...prior };
          Object.assign(merged, a.effect);
          return Object.keys(expected).every((k) => String(merged[k]) === String(expected[k]));
        });
        const idx = needed ? p.rules.findIndex((r) => r.action === needed.id) : -1;
        suspects.add(idx >= 0 ? `row${idx}` : 'else');
      }
      return;
    }

    for (const test of rt.level.tests) {
      if (rt.testsPassed[test.id] !== false) continue;
      if (test.kind === 'sequence' && test.canonical) {
        const i = p.steps.findIndex((s, idx) => s !== test.canonical![idx]);
        suspects.add(i >= 0 ? `order${i}` : 'order0');
      } else if (test.kind === 'fill') {
        suspects.add('fill');
      } else if (test.kind === 'safety') {
        suspects.add('safety');
      }
    }
  }

  hydrate();
  computeSuspects();

  /* ---------------- helpers ---------------- */

  function sensorTypeOf(sensorId: string | null): 'number' | 'boolean' {
    if (!sensorId || builder.kind !== 'rule') return 'number';
    const s = builder.slots.sensors.find((x) => x.id === sensorId);
    return s?.type ?? 'number';
  }

  function seqSensorType(sensorId: string | null): 'number' | 'boolean' {
    if (!sensorId || builder.kind !== 'sequence') return 'number';
    const all = [...builder.slots.fill.sensors, ...builder.slots.safety!.sensors];
    const s = all.find((x) => x.id === sensorId);
    return s?.type ?? 'number';
  }

  function visibleValues(type: 'number' | 'boolean', pool: ValueOpt[]): ValueOpt[] {
    return pool.filter((v) => typeof v.v === type);
  }

  function visibleOps(type: 'number' | 'boolean', pool: Cmp[]): Cmp[] {
    return type === 'boolean' ? pool.filter((o) => o === '=' || o === '!=') : pool;
  }

  function select(kind: SelKind, id: string) {
    if (locked) return;
    selected = selected && selected.kind === kind && selected.id === id ? null : { kind, id };
    render();
  }

  function place(kind: SelKind, apply: (id: string) => void, current: string | null, clear: () => void) {
    if (locked) return;
    if (selected) {
      if (selected.kind === kind) {
        apply(selected.id);
        selected = null;
      } else {
        setError(feedback, t('puzzle.program.wrongBlock'));
      }
    } else if (current) {
      clear();
    }
    render();
  }

  /* ---------------- rule mode render ---------------- */

  function paletteForRule(): HTMLElement {
    if (builder.kind !== 'rule') return el('div');
    const { sensors, ops, values, actions } = builder.slots;
    const activeSensor = rows.find((r) => r.sensor)?.sensor ?? null;
    const type = activeSensor ? sensorTypeOf(activeSensor) : 'number';

    const sensorGroup = el(
      'div',
      { class: 'pal-group' },
      sensors.map((s: SensorDef) => sensorChip(s, selected?.kind === 'sensor' && selected.id === s.id, () => select('sensor', s.id))),
    );
    const opGroup = el(
      'div',
      { class: 'pal-group' },
      visibleOps(type, ops).map((o) => opChip(o, selected?.kind === 'op' && selected.id === o, () => select('op', o))),
    );
    const valGroup = el(
      'div',
      { class: 'pal-group' },
      visibleValues(type, values).map((v) => valueChip(v, selected?.kind === 'value' && String(selected.id) === String(v.v), () => select('value', String(v.v)))),
    );
    const actGroup = el(
      'div',
      { class: 'pal-group' },
      actions.map((a) => actionChip(a, selected?.kind === 'action' && selected.id === a.id, () => select('action', a.id))),
    );

    return el('div', { class: 'prog-palette' }, [
      sectionTitle(t('puzzle.program.palette')),
      el('div', { class: 'pal-label', text: t('hud.stage.entry') }),
      sensorGroup,
      el('div', { class: 'pal-label', text: t('puzzle.program.if') }),
      opGroup,
      el('div', { class: 'pal-label', text: t('puzzle.program.then') }),
      valGroup,
      actGroup,
    ]);
  }

  function ruleRow(row: RuleRow, i: number): HTMLElement {
    const type = sensorTypeOf(row.sensor);
    const poolValues = builder.kind === 'rule' ? visibleValues(type, builder.slots.values) : [];
    const actions = builder.kind === 'rule' ? builder.slots.actions : [];
    const sensor = builder.kind === 'rule' ? builder.slots.sensors.find((s) => s.id === row.sensor) : undefined;

    const suspect = suspects.has(`row${i}`);
    return el('div', { class: `rule-row${suspect ? ' is-suspect' : ''}` }, [
      el('span', { class: 'kw kw-if', text: t('puzzle.program.if') }),
      slot({
        type: 'sensor',
        label: row.sensor && sensor ? L(sensor.label) : t('puzzle.program.slotFill'),
        filled: !!row.sensor,
        active: selected?.kind === 'sensor',
        index: i,
        onClick: () => place('sensor', (id) => { row.sensor = id; row.op = null; row.value = null; }, row.sensor, () => { row.sensor = null; row.op = null; row.value = null; }),
      }),
      slot({
        type: 'op',
        label: row.op ?? t('puzzle.program.slotFill'),
        filled: !!row.op,
        active: selected?.kind === 'op',
        index: i,
        onClick: () => place('op', (id) => { row.op = id as Cmp; }, row.op, () => { row.op = null; row.value = null; }),
      }),
      slot({
        type: 'value',
        label: row.value !== null && poolValues.some((v) => v.v === row.value)
          ? L(poolValues.find((v) => v.v === row.value)!.label)
          : t('puzzle.program.slotFill'),
        filled: row.value !== null && poolValues.some((v) => v.v === row.value),
        active: selected?.kind === 'value',
        index: i,
        onClick: () => place('value', (id) => { row.value = toVal(id); }, row.value !== null ? String(row.value) : null, () => { row.value = null; }),
      }),
      el('span', { class: 'kw kw-then', text: t('puzzle.program.then') }),
      slot({
        type: 'action',
        label: row.action && actions.some((a) => a.id === row.action)
          ? L(actions.find((a) => a.id === row.action)!.label)
          : t('puzzle.program.slotFill'),
        filled: !!row.action && actions.some((a) => a.id === row.action),
        active: selected?.kind === 'action',
        index: i,
        onClick: () => place('action', (id) => { row.action = id; }, row.action, () => { row.action = null; }),
      }),
      el('span', { class: 'rule-index', text: `#${i + 1}` }),
    ]);
  }

  function elseRow(): HTMLElement | null {
    if (builder.kind !== 'rule' || !builder.slots.allowElse) return null;
    const actions = builder.slots.actions;
    const keepOpt = builder.slots.allowKeep ? KEEP_ACTION : null;
    const known = elseAction && (elseAction === 'keep' ? !!keepOpt : actions.some((a) => a.id === elseAction));
    const label = !elseAction
      ? t('puzzle.program.slotFill')
      : elseAction === 'keep'
        ? L(KEEP_ACTION.label)
        : L(actions.find((a) => a.id === elseAction)!.label);

    return el(
      'div',
      { class: `rule-row rule-else${suspects.has('else') ? ' is-suspect' : ''}` },
      [
        el('span', { class: 'kw kw-if', text: t('puzzle.program.other') }),
      slot({
        type: 'action',
        label,
        filled: !!known,
        active: selected?.kind === 'action',
        onClick: () => {
          if (locked) return;
          if (selected && selected.kind === 'action') {
            elseAction = selected.id;
            selected = null;
          } else if (elseAction) {
            elseAction = null;
          }
          render();
        },
      }),
      keepOpt
        ? actionChip(keepOpt, selected?.kind === 'action' && selected.id === 'keep', () => select('action', 'keep'))
        : null,
    ]);
  }

  /* ---------------- sequence mode render ---------------- */

  function paletteForSequence(): HTMLElement {
    if (builder.kind !== 'sequence') return el('div');
    const { steps, safety: safetySlots, fill: fillDef } = builder.slots;

    const stepGroup = el(
      'div',
      { class: 'pal-group pal-steps' },
      steps.map((s) => {
        const isPlaced = placed.includes(s.id);
        const chip = actionChip(
          s,
          selected?.kind === 'step' && selected.id === s.id,
          () => select('step', s.id),
          'step',
        );
        if (isPlaced) chip.classList.add('is-placed');
        return chip;
      }),
    );
    const sensors = [...fillDef.sensors, ...safetySlots.sensors];
    const type = fill.sensor ? seqSensorType(fill.sensor) : 'number';
    const sType = safety.sensor ? seqSensorType(safety.sensor) : 'number';

    return el('div', { class: 'prog-palette' }, [
      sectionTitle(t('puzzle.program.palette')),
      el('div', { class: 'pal-label', text: t('puzzle.order.title') }),
      stepGroup,
      el('div', { class: 'pal-label', text: t('hud.stage.entry') }),
      el(
        'div',
        { class: 'pal-group' },
        sensors.map((s) => sensorChip(s, selected?.kind === 'sensor' && selected.id === s.id, () => select('sensor', s.id))),
      ),
      el('div', { class: 'pal-label', text: t('puzzle.program.ifWhile') }),
      el(
        'div',
        { class: 'pal-group' },
        visibleOps(type, fillDef.ops).map((o) => opChip(o, selected?.kind === 'op' && selected.id === o, () => select('op', o))),
      ),
      el(
        'div',
        { class: 'pal-group' },
        visibleOps(sType, safetySlots.ops).map((o) => opChip(o, selected?.kind === 'op' && selected.id === o, () => select('op', o))),
      ),
      el('div', { class: 'pal-label', text: t('puzzle.program.then') }),
      el(
        'div',
        { class: 'pal-group' },
        visibleValues(type, fillDef.values).map((v) =>
          valueChip(v, selected?.kind === 'value' && String(selected.id) === String(v.v), () => select('value', String(v.v))),
        ),
      ),
      el(
        'div',
        { class: 'pal-group' },
        visibleValues(sType, safetySlots.values).map((v) =>
          valueChip(v, selected?.kind === 'value' && String(selected.id) === String(v.v), () => select('value', String(v.v))),
        ),
      ),
      el(
        'div',
        { class: 'pal-group' },
        safetySlots.actions.map((a) => actionChip(a, selected?.kind === 'action' && selected.id === a.id, () => select('action', a.id))),
      ),
    ]);
  }

  function seqSlots(): HTMLElement {
    if (builder.kind !== 'sequence') return el('div');
    const { steps, safety: safetySlots, fill: fillDef } = builder.slots;

    const orderSlots = el(
      'div',
      { class: 'order-slots' },
      placed.map((id, i) => {
        const def = steps.find((s) => s.id === id);
        return slot({
          type: 'order',
          index: i,
          label: def ? L(def.label) : `#${i + 1}`,
          filled: !!def,
          active: selected?.kind === 'step',
          suspect: suspects.has(`order${i}`),
          onClick: () => place('step', (sid) => { placed[i] = sid; }, id, () => { placed[i] = null; }),
        });
      }),
    );

    const fillSensor = fillDef.sensors.find((s) => s.id === fill.sensor);
    const fillPoolValues = visibleValues(fill.sensor ? seqSensorType(fill.sensor) : 'number', fillDef.values);
    const fillRow = el(
      'div',
      { class: `rule-row${suspects.has('fill') ? ' is-suspect' : ''}` },
      [
        el('span', { class: 'kw kw-if', text: t('puzzle.program.while') }),
      slot({
        type: 'sensor',
        label: fillSensor ? L(fillSensor.label) : t('puzzle.program.slotFill'),
        filled: !!fillSensor,
        active: selected?.kind === 'sensor',
        onClick: () => place('sensor', (id) => { fill.sensor = id; fill.value = null; }, fill.sensor, () => { fill.sensor = null; fill.op = null; fill.value = null; }),
      }),
      slot({
        type: 'op',
        label: fill.op ?? t('puzzle.program.slotFill'),
        filled: !!fill.op,
        active: selected?.kind === 'op',
        onClick: () => place('op', (id) => { fill.op = id as Cmp; }, fill.op, () => { fill.op = null; }),
      }),
      slot({
        type: 'value',
        label: fill.value !== null && fillPoolValues.some((v) => v.v === fill.value)
          ? L(fillPoolValues.find((v) => v.v === fill.value)!.label)
          : t('puzzle.program.slotFill'),
        filled: fill.value !== null && fillPoolValues.some((v) => v.v === fill.value),
        active: selected?.kind === 'value',
        onClick: () => place('value', (id) => { fill.value = toVal(id); }, fill.value !== null ? String(fill.value) : null, () => { fill.value = null; }),
      }),
    ]);

    const sPoolValues = safetySlots
      ? visibleValues(safety.sensor ? seqSensorType(safety.sensor) : 'number', safetySlots.values)
      : [];
    const sSensorDef = safetySlots?.sensors.find((s) => s.id === safety.sensor);

    const safetyRow = safety
      ? el(
          'div',
          { class: `rule-row${suspects.has('safety') ? ' is-suspect' : ''}` },
          [
            el('span', { class: 'kw kw-if', text: t('puzzle.program.if') }),
          slot({
            type: 'sensor',
            label: sSensorDef ? L(sSensorDef.label) : t('puzzle.program.slotFill'),
            filled: !!sSensorDef,
            active: selected?.kind === 'sensor',
            onClick: () => place('sensor', (id) => { safety.sensor = id; safety.value = null; }, safety.sensor, () => { safety.sensor = null; safety.op = null; safety.value = null; }),
          }),
          slot({
            type: 'op',
            label: safety.op ?? t('puzzle.program.slotFill'),
            filled: !!safety.op,
            active: selected?.kind === 'op',
            onClick: () => place('op', (id) => { safety.op = id as Cmp; }, safety.op, () => { safety.op = null; }),
          }),
          slot({
            type: 'value',
            label: safety.value !== null && sPoolValues.some((v) => v.v === safety.value)
              ? L(sPoolValues.find((v) => v.v === safety.value)!.label)
              : t('puzzle.program.slotFill'),
            filled: safety.value !== null && sPoolValues.some((v) => v.v === safety.value),
            active: selected?.kind === 'value',
            onClick: () => place('value', (id) => { safety.value = toVal(id); }, safety.value !== null ? String(safety.value) : null, () => { safety.value = null; }),
          }),
          el('span', { class: 'kw kw-then', text: t('puzzle.program.then') }),
          slot({
            type: 'action',
            label: safety.action && safetySlots?.actions.some((a) => a.id === safety.action)
              ? L(safetySlots.actions.find((a) => a.id === safety.action)!.label)
              : t('puzzle.program.slotFill'),
            filled: !!safety.action && !!safetySlots?.actions.some((a) => a.id === safety.action),
            active: selected?.kind === 'action',
            onClick: () => place('action', (id) => { safety.action = id; }, safety.action, () => { safety.action = null; }),
          }),
        ])
      : null;

    return el('div', { class: 'prog-slots' }, [
      sectionTitle(t('puzzle.order.title')),
      orderSlots,
      sectionTitle(t('puzzle.program.fill')),
      fillRow,
      sectionTitle(t('puzzle.program.safety')),
      safetyRow,
    ]);
  }

  function toVal(id: string): number | boolean {
    if (id === 'true') return true;
    if (id === 'false') return false;
    return Number(id);
  }

  /* ---------------- save ---------------- */

  function buildProgram(): Program | string {
    if (builder.kind === 'rule') {
      for (const r of rows) {
        if (!r.sensor || !r.op || r.value === null || !r.action) return t('puzzle.program.empty');
      }
      return {
        kind: 'rule',
        rules: rows.map((r, i) => ({
          id: `r${i + 1}`,
          cond: { sensor: r.sensor!, op: r.op!, value: r.value! } as Cond,
          action: r.action!,
        })),
        defaultAction: elseAction,
      };
    }
    if (placed.some((p) => !p)) return t('puzzle.program.empty');
    if (!fill.sensor || !fill.op || fill.value === null) return t('puzzle.program.empty');
    if (!safety.sensor || !safety.op || safety.value === null || !safety.action)
      return t('puzzle.program.empty');
    return {
      kind: 'sequence',
      steps: placed as string[],
      fill: { cond: { sensor: fill.sensor, op: fill.op!, value: fill.value! } as Cond },
      safety: {
        cond: { sensor: safety.sensor, op: safety.op!, value: safety.value! } as Cond,
        action: safety.action!,
      },
    };
  }

  function save() {
    if (locked) return;
    const result = buildProgram();
    if (typeof result === 'string') {
      setError(feedback, result);
      feedback.classList.remove('shake');
      void feedback.offsetWidth;
      feedback.classList.add('shake');
      return;
    }
    rt.program = result;
    rt.programSaved = true;
    suspects.clear();
    setError(feedback, t('puzzle.program.saved'), 'good');
    opts.onSaved();
    ref?.setFooter(footerRow());
    render();
  }

  function footerRow() {
    const hint = footerBtn(t('common.hint'), { onClick: () => opts.onHint?.(), disabled: !opts.onHint });
    const close = footerBtn(t('common.close'), { onClick: () => modal.close() });
    // Once the tests pass the program is final; until then the player can
    // always come back, tweak and save again.
    if (locked) return [hint, close];
    if (rt.programSaved) {
      return [
        hint,
        footerBtn(t('puzzle.program.saveChanges'), { onClick: save }),
        footerBtn(t('puzzle.test.run'), {
          primary: true,
          onClick: () => {
            modal.close();
            opts.onRunTests();
          },
        }),
        close,
      ];
    }
    return [hint, footerBtn(t('puzzle.program.check'), { primary: true, onClick: save }), close];
  }

  /* ---------------- render ---------------- */

  function render() {
    if (!ref) return;
    const slotsArea =
      builder.kind === 'rule'
        ? el('div', { class: 'prog-slots' }, [
            sectionTitle(t('puzzle.program.slots')),
            ...rows.map((r, i) => ruleRow(r, i)),
            elseRow(),
          ])
        : seqSlots();

    mount(ref.body, [
      el('div', { class: 'prog-layout' }, [
        builder.kind === 'rule' ? paletteForRule() : paletteForSequence(),
        slotsArea,
      ]),
      feedback,
    ]);
  }

  const modal = openModal({
    title: t('puzzle.program.title'),
    subtitle: t('puzzle.program.sub'),
    variant: 'wide',
    build: (m) => {
      ref = m;
      render();
      if (suspects.size > 0) {
        setError(feedback, t('puzzle.program.suspectNote'), 'info');
      }
      m.setFooter(footerRow());
    },
    onClose: () => {
      ref = null;
    },
  });

  return { close: () => modal.close() };
}
