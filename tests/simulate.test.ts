import { describe, it, expect } from 'vitest';
import {
  compare,
  evalRules,
  runTest,
  type LevelActions,
} from '../src/game/puzzles/simulate';
import { LEVELS } from '../src/data/levels';
import type { ActionDef, Program } from '../src/game/types';

type RuleProgram = Extract<Program, { kind: 'rule' }>;
type SeqProgram = Extract<Program, { kind: 'sequence' }>;

/** The pseudo-action offered in "any other case" branches. */
const KEEP: ActionDef = {
  id: 'keep',
  label: { es: 'conservar', en: 'keep' },
  effect: {},
};

function actionsOf(levelId: keyof typeof LEVELS): LevelActions {
  const p = LEVELS[levelId].program;
  const defs =
    p.kind === 'rule' ? p.slots.actions : [...p.slots.steps, ...p.slots.safety.actions];
  const map = new Map(defs.map((a) => [a.id, a]));
  map.set(KEEP.id, KEEP);
  return map;
}

function runAll(program: Program, levelId: keyof typeof LEVELS) {
  const level = LEVELS[levelId];
  const actions = actionsOf(levelId);
  return level.tests.map((t) => ({ id: t.id, ...runTest(program, t, actions) }));
}

describe('compare', () => {
  it('evaluates numeric operators', () => {
    expect(compare(9, '>=', 6)).toBe(true);
    expect(compare(3, '<=', 3)).toBe(true);
    expect(compare(4, '<', 3)).toBe(false);
    expect(compare(4, '>', 3)).toBe(true);
    expect(compare(4, '=', 4)).toBe(true);
    expect(compare(4, '!=', 4)).toBe(false);
  });

  it('evaluates boolean operators', () => {
    expect(compare(true, '=', true)).toBe(true);
    expect(compare(false, '!=', true)).toBe(true);
    expect(compare(true, '<', 3)).toBe(false);
  });
});

describe('tutorial program', () => {
  const program: RuleProgram = {
    kind: 'rule',
    rules: [{ id: 'r1', cond: { sensor: 'button', op: '=', value: true }, action: 'led_on' }],
    defaultAction: 'led_off',
  };

  it('passes both test cases', () => {
    for (const r of runAll(program, 'tutorial')) expect(r.pass, r.id).toBe(true);
  });

  it('fails when the default branch is missing', () => {
    const broken: Program = { ...program, defaultAction: null } as Program;
    const results = runAll(broken, 'tutorial');
    expect(results.find((r) => r.id === 't1')!.pass).toBe(true);
    expect(results.find((r) => r.id === 't2')!.pass).toBe(false);
  });
});

describe('refrigerator hysteresis', () => {
  const correct: RuleProgram = {
    kind: 'rule',
    rules: [
      { id: 'r1', cond: { sensor: 'temp', op: '>=', value: 6 }, action: 'cool_on' },
      { id: 'r2', cond: { sensor: 'temp', op: '<=', value: 3 }, action: 'cool_off' },
    ],
    defaultAction: 'keep',
  };

  it('passes hot, cold, middle and boundary tests', () => {
    for (const r of runAll(correct, 'fridge')) expect(r.pass, r.id).toBe(true);
  });

  it('fails the middle test when the default switches cooling off', () => {
    const wrong: Program = { ...correct, defaultAction: 'cool_off' };
    const mid = runAll(wrong, 'fridge').find((r) => r.id === 'mid')!;
    expect(mid.pass).toBe(false);
    expect(mid.mismatches[0]).toMatchObject({ key: 'cooling', expected: 'on', actual: 'off' });
  });

  it('fails the boundary test when the upper limit is too high', () => {
    const wrong: Program = {
      ...correct,
      rules: [
        { id: 'r1', cond: { sensor: 'temp', op: '>=', value: 8 }, action: 'cool_on' },
        { id: 'r2', cond: { sensor: 'temp', op: '<=', value: 3 }, action: 'cool_off' },
      ],
    };
    expect(runAll(wrong, 'fridge').find((r) => r.id === 'edge')!.pass).toBe(false);
  });
});

describe('robot threshold', () => {
  const correct: RuleProgram = {
    kind: 'rule',
    rules: [{ id: 'r1', cond: { sensor: 'dist', op: '<', value: 20 }, action: 'motors_stop' }],
    defaultAction: 'motors_run',
  };

  it('stops only below the threshold', () => {
    for (const r of runAll(correct, 'robot')) expect(r.pass, r.id).toBe(true);
  });

  it('fails when the comparison is not strict', () => {
    const wrong: Program = {
      ...correct,
      rules: [{ id: 'r1', cond: { sensor: 'dist', op: '<=', value: 20 }, action: 'motors_stop' }],
    };
    expect(runAll(wrong, 'robot').find((r) => r.id === 'limit')!.pass).toBe(false);
  });

  it('reports the fired rule', () => {
    const ev = evalRules(correct, { dist: 12 });
    expect(ev.matched).toBe(true);
    expect(ev.fired).toBe(0);
    expect(ev.action).toBe('motors_stop');
  });
});

describe('washing machine program', () => {
  const program: SeqProgram = {
    kind: 'sequence',
    steps: ['check_door', 'fill', 'wash', 'drain', 'spin', 'done'],
    fill: { cond: { sensor: 'water', op: '<', value: 100 } },
    safety: { cond: { sensor: 'door', op: '!=', value: true }, action: 'safety_stop' },
  };

  it('passes order, fill and safety tests', () => {
    for (const r of runAll(program, 'washer')) expect(r.pass, r.id).toBe(true);
  });

  it('fails the cycle order when steps are shuffled', () => {
    const wrong: Program = { ...program, steps: ['fill', 'check_door', 'wash', 'drain', 'spin', 'done'] };
    const order = runAll(wrong, 'washer').find((r) => r.id === 'order')!;
    expect(order.pass).toBe(false);
    expect(order.detail).toBe('check_door');
  });

  it('fails fill when the target is too low', () => {
    const wrong: Program = {
      ...program,
      fill: { cond: { sensor: 'water', op: '<', value: 60 } },
    };
    const results = runAll(wrong, 'washer');
    expect(results.find((r) => r.id === 'fill_high')!.pass).toBe(false);
    expect(results.find((r) => r.id === 'fill_done')!.pass).toBe(true);
  });

  it('fails fill when the comparison never reaches the target', () => {
    const wrong: Program = {
      ...program,
      fill: { cond: { sensor: 'water', op: '<=', value: 100 } },
    };
    expect(runAll(wrong, 'washer').find((r) => r.id === 'fill_done')!.pass).toBe(false);
  });

  it('fails safety when the rule is missing or inverted', () => {
    const noSafety: Program = { ...program, safety: null };
    expect(runAll(noSafety, 'washer').find((r) => r.id === 'door_open')!.pass).toBe(false);

    const inverted: Program = {
      ...program,
      safety: { cond: { sensor: 'door', op: '=', value: true }, action: 'safety_stop' },
    };
    const results = runAll(inverted, 'washer');
    expect(results.find((r) => r.id === 'door_open')!.pass).toBe(false);
    expect(results.find((r) => r.id === 'door_closed')!.pass).toBe(false);
  });
});

describe('final fan challenge', () => {
  const correct: RuleProgram = {
    kind: 'rule',
    rules: [{ id: 'r1', cond: { sensor: 'temp', op: '>=', value: 30 }, action: 'fan_on' }],
    defaultAction: 'fan_off',
  };

  it('passes both temperature tests', () => {
    for (const r of runAll(correct, 'fan')) expect(r.pass, r.id).toBe(true);
  });

  it('fails when the fan never switches off', () => {
    const wrong: Program = { ...correct, defaultAction: null } as Program;
    expect(runAll(wrong, 'fan').find((r) => r.id === 'cool')!.pass).toBe(false);
  });
});

describe('missing program', () => {
  it('fails every test instead of passing by default', () => {
    const actions = actionsOf('robot');
    const outcome = runTest(null, LEVELS.robot.tests[0], actions);
    expect(outcome.pass).toBe(false);
    expect(outcome.eval_).toBeNull();
  });
});
