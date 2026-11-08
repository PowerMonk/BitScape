import type { Cond, OutputState, Program, TestDef, ActionDef, SensorDef } from '../types';

export type TraceLine = {
  sensor: string;
  op: string;
  value: number | boolean;
  actual: number | boolean;
  ok: boolean;
};

export type RuleEval = {
  action: string | null;
  /** index of the fired rule, -1 when only the default branch ran */
  fired: number;
  trace: TraceLine[];
  matched: boolean;
};

export function compare(actual: number | boolean, op: string, value: number | boolean): boolean {
  if (typeof actual === 'boolean' || typeof value === 'boolean') {
    const a = !!actual;
    const v = !!value;
    if (op === '=') return a === v;
    if (op === '!=') return a !== v;
    return false;
  }
  const a = actual as number;
  const v = value as number;
  switch (op) {
    case '>=':
      return a >= v;
    case '<=':
      return a <= v;
    case '>':
      return a > v;
    case '<':
      return a < v;
    case '=':
      return a === v;
    case '!=':
      return a !== v;
    default:
      return false;
  }
}

export function evalCond(cond: Cond, input: Record<string, number | boolean>): boolean {
  const actual = input[cond.sensor];
  if (actual === undefined) return false;
  return compare(actual, cond.op, cond.value);
}

/**
 * Evaluate an ordered rule program: the first matching rule wins,
 * otherwise the default action runs (null = no action at all).
 */
export function evalRules(
  program: Extract<Program, { kind: 'rule' }>,
  input: Record<string, number | boolean>,
): RuleEval {
  const trace: TraceLine[] = [];
  for (let i = 0; i < program.rules.length; i++) {
    const rule = program.rules[i];
    if (!rule.cond) continue;
    const actual = input[rule.cond.sensor];
    const known = actual !== undefined;
    const ok = known && evalCond(rule.cond, input);
    trace.push({
      sensor: rule.cond.sensor,
      op: rule.cond.op,
      value: rule.cond.value,
      actual: known ? actual : Number.NaN,
      ok,
    });
    if (ok) return { action: rule.action, fired: i, trace, matched: true };
  }
  return {
    action: program.defaultAction,
    fired: -1,
    trace,
    matched: program.defaultAction !== null,
  };
}

/** Merge an action's effect onto the prior output state. */
export function applyAction(prior: OutputState, action: ActionDef | undefined): OutputState {
  const next: OutputState = { ...prior };
  if (action) Object.assign(next, action.effect);
  return next;
}

export type TestOutcome = {
  pass: boolean;
  action: string | null;
  actual: OutputState;
  expected: OutputState;
  mismatches: { key: string; expected: string; actual: string }[];
  eval_: RuleEval | null;
  /** sequence: first wrongly-placed step; fill/safety: evaluated boolean */
  detail?: string;
};

const show = (v: unknown) => (typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));

function diff(actual: OutputState, expected: OutputState): TestOutcome['mismatches'] {
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  const out: TestOutcome['mismatches'] = [];
  for (const k of keys) {
    if (show(actual[k]) !== show(expected[k])) {
      out.push({ key: k, expected: show(expected[k]), actual: show(actual[k]) });
    }
  }
  return out;
}

export type LevelActions = Map<string, ActionDef>;

function noProgram(prior: OutputState, expected: OutputState): TestOutcome {
  return {
    pass: false,
    action: null,
    actual: prior,
    expected,
    mismatches: diff(prior, expected),
    eval_: null,
    detail: 'missing',
  };
}

/**
 * Run one test against the player's program. The simulator judges the
 * program that was built, never the order in which buttons were pressed.
 */
export function runTest(
  program: Program | null,
  test: TestDef,
  actions: LevelActions,
): TestOutcome {
  const prior = test.prior ?? {};
  const expected = test.expected ?? prior;
  if (!program) return noProgram(prior, expected);

  if (program.kind === 'rule') {
    const ev = evalRules(program, test.input ?? {});
    const actual = applyAction(prior, ev.action ? actions.get(ev.action) : undefined);
    const mismatches = diff(actual, expected);
    return { pass: mismatches.length === 0, action: ev.action, actual, expected, mismatches, eval_: ev };
  }

  switch (test.kind) {
    case 'sequence': {
      const canonical = test.canonical ?? [];
      const player = program.steps;
      const ok =
        canonical.length === player.length && canonical.every((c, i) => player[i] === c);
      const firstWrong = canonical.find((c, i) => player[i] !== c);
      return {
        pass: ok,
        action: null,
        actual: prior,
        expected,
        mismatches: ok
          ? []
          : [
              {
                key: 'order',
                expected: canonical.join(' > '),
                actual: player.join(' > '),
              },
            ],
        eval_: null,
        detail: firstWrong,
      };
    }
    case 'fill': {
      const cond = program.fill?.cond;
      if (!cond) return noProgram(prior, expected);
      const value = evalCond(cond, test.input ?? {});
      const pass = value === test.expectedBool;
      return {
        pass,
        action: null,
        actual: prior,
        expected,
        mismatches: pass
          ? []
          : [{ key: 'cond', expected: String(test.expectedBool), actual: String(value) }],
        eval_: null,
        detail: String(value),
      };
    }
    case 'safety': {
      const safety = program.safety;
      if (!safety) return noProgram(prior, expected);
      const value = evalCond(safety.cond, test.input ?? {});
      if (value !== test.expectedBool) {
        return {
          pass: false,
          action: null,
          actual: prior,
          expected,
          mismatches: [{ key: 'safety', expected: String(test.expectedBool), actual: String(value) }],
          eval_: null,
          detail: String(value),
        };
      }
      const actual = value ? applyAction(prior, actions.get(safety.action)) : prior;
      const mismatches = diff(actual, expected);
      return {
        pass: mismatches.length === 0,
        action: value ? safety.action : null,
        actual,
        expected,
        mismatches,
        eval_: null,
      };
    }
    default:
      return noProgram(prior, expected);
  }
}

/** Format a condition for display (Spanish labels come from level data). */
export function formatCond(cond: Cond, sensors: SensorDef[]): string {
  const s = sensors.find((x) => x.id === cond.sensor);
  const name = s ? s.label.es : cond.sensor;
  const val = typeof cond.value === 'boolean' ? (cond.value ? 'true' : 'false') : `${cond.value}`;
  return `${name} ${cond.op} ${val}`;
}
