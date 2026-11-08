import { describe, it, expect } from 'vitest';
import { LEVELS, LEVEL_ORDER, SCORE } from '../src/data/levels';
import type { LevelDef, Stage } from '../src/game/types';
import type { Bi } from '../src/i18n/dict';

const VALID_STAGES: Stage[] = ['entry', 'wiring', 'program', 'test', 'path'];
const VALID_BADGES = new Set(['entry', 'program', 'output', 'final']);
const VALID_ENC = new Set(['embedded', 'mcu', 'sensor', 'actuator', 'program']);

function collectBi(node: unknown, path: string, out: [string, Bi][]): void {
  if (node === null || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (typeof obj.es === 'string' && typeof obj.en === 'string' && Object.keys(obj).length === 2) {
    out.push([path, node as Bi]);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectBi(v, `${path}[${i}]`, out));
    return;
  }
  for (const [k, v] of Object.entries(obj)) collectBi(v, `${path}.${k}`, out);
}

describe('level data', () => {
  it('exposes every level in the play order', () => {
    expect([...LEVEL_ORDER].sort()).toEqual(Object.keys(LEVELS).sort());
    expect(LEVEL_ORDER[0]).toBe('tutorial');
    expect(LEVEL_ORDER[LEVEL_ORDER.length - 1]).toBe('fan');
  });

  it('scores add up to 100', () => {
    expect(SCORE.entry + SCORE.program + SCORE.output + SCORE.tests + SCORE.path).toBe(100);
  });

  for (const id of LEVEL_ORDER) {
    const level: LevelDef = LEVELS[id];

    describe(level.id, () => {
      it('has valid stages in pipeline order', () => {
        expect(level.stages.length).toBeGreaterThanOrEqual(4);
        for (const s of level.stages) expect(VALID_STAGES).toContain(s);
        expect(level.stages.indexOf('wiring')).toBeLessThan(level.stages.indexOf('test'));
        expect(level.stages[level.stages.length - 1]).toBe('path');
      });

      it('opens with the entry stage only when it has an entry puzzle', () => {
        if (level.entry) expect(level.stages[0]).toBe('entry');
        else expect(level.stages[0]).not.toBe('entry');
      });

      it('has an objective and hints for every stage', () => {
        for (const s of level.stages) {
          const obj = level.stageObjectives[s];
          expect(obj, `objective for ${s}`).toBeTruthy();
          expect(obj!.es.trim()).not.toBe('');
          expect(obj!.en.trim()).not.toBe('');

          const hints = level.hints[s];
          expect(hints, `hints for ${s}`).toBeTruthy();
          expect(hints).toHaveLength(3);
          for (const h of hints) {
            expect(h.es.trim()).not.toBe('');
            expect(h.en.trim()).not.toBe('');
          }
        }
      });

      it('has bilingual copy everywhere', () => {
        const found: [string, Bi][] = [];
        collectBi(level, level.id, found);
        expect(found.length).toBeGreaterThan(10);
        const empty = found.filter(([, v]) => !v.es.trim() || !v.en.trim());
        expect(empty.map(([p]) => p)).toEqual([]);
      });

      it('has a consistent entry puzzle', () => {
        if (!level.entry) return;
        expect(level.entry.rounds.length).toBeGreaterThan(0);
        for (const round of level.entry.rounds) {
          expect(round.options.length).toBeGreaterThanOrEqual(2);
          const correct = round.options.filter((o) => o.correct);
          expect(correct).toHaveLength(1);
          expect(correct[0].id).toBe(round.correctId);
          for (const o of round.options) {
            if (!o.correct) {
              expect(o.wrong, `wrong feedback for ${o.id}`).toBeTruthy();
              expect(o.wrong!.es.trim()).not.toBe('');
              expect(o.wrong!.en.trim()).not.toBe('');
            }
          }
        }
      });

      it('wires valid ports', () => {
        const byId = new Map(level.wiring.nodes.map((n) => [n.id, n]));
        expect(byId.size).toBe(level.wiring.nodes.length);
        for (const [from, to] of level.wiring.required) {
          const a = byId.get(from);
          const b = byId.get(to);
          expect(a, `node ${from}`).toBeTruthy();
          expect(b, `node ${to}`).toBeTruthy();
          expect(['source', 'mcuOut']).toContain(a!.kind);
          expect(['mcuIn', 'sink']).toContain(b!.kind);
        }
        for (const key of Object.keys(level.wiring.reject)) {
          const [from, to] = key.split('>');
          expect(byId.has(from), `reject ${key} from`).toBe(true);
          expect(byId.has(to), `reject ${key} to`).toBe(true);
        }
      });

      it('defines tests with reachable expectations', () => {
        expect(level.tests.length).toBeGreaterThanOrEqual(2);
        const p = level.program;
        const effectKeys = new Set<string>(['keep']);
        if (p.kind === 'rule') {
          for (const a of p.slots.actions) for (const k of Object.keys(a.effect)) effectKeys.add(k);
        } else {
          for (const a of p.slots.steps) for (const k of Object.keys(a.effect)) effectKeys.add(k);
          for (const a of p.slots.safety.actions) for (const k of Object.keys(a.effect)) effectKeys.add(k);
        }
        effectKeys.add('keep');

        for (const test of level.tests) {
          for (const k of Object.keys(test.expected ?? {})) expect(effectKeys.has(k), `${test.id} expects ${k}`).toBe(true);
          if (test.kind === 'sequence') {
            expect(p.kind).toBe('sequence');
            if (p.kind === 'sequence') expect(test.canonical).toEqual(p.slots.steps.map((s) => s.id));
          }
        }
      });

      it('orders the signal path correctly', () => {
        const ids = level.path.options.map((o) => o.id).sort();
        expect(level.path.correctOrder.slice().sort()).toEqual(ids);
        expect(level.path.correctOrder).toHaveLength(level.path.options.length);
      });

      it('grants known badges and encyclopedia entries', () => {
        for (const b of level.badges) expect(VALID_BADGES.has(b), `badge ${b}`).toBe(true);
        for (const e of level.encyclopedia) expect(VALID_ENC.has(e), `enc ${e}`).toBe(true);
      });
    });
  }
});
