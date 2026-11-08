import type { LevelDef, Program, Stage } from './types';

export type LevelRuntime = {
  level: LevelDef;
  stage: Stage;
  /** current round inside the entry panel (levels may have several) */
  entryRound: number;
  edges: [string, string][];
  program: Program | null;
  programSaved: boolean;
  testsPassed: Record<string, boolean>;
  allTestsPassed: boolean;
  pathOrder: string[];
  pathDone: boolean;
  /** current hint tier per stage (0 = none shown yet) */
  hintsUsed: Record<string, number>;
  scores: { entry: number; wiring: number; program: number; tests: number; path: number };
  completed: boolean;
};

export function createRuntime(level: LevelDef): LevelRuntime {
  return {
    level,
    stage: level.stages[0],
    entryRound: 0,
    edges: [],
    program: null,
    programSaved: false,
    testsPassed: {},
    allTestsPassed: false,
    pathOrder: [],
    pathDone: false,
    hintsUsed: {},
    scores: { entry: 0, wiring: 0, program: 0, tests: 0, path: 0 },
    completed: false,
  };
}

export function requiredDone(rt: LevelRuntime): boolean {
  return rt.level.wiring.required.every(([a, b]) =>
    rt.edges.some(([x, y]) => x === a && y === b),
  );
}

export function hasEdge(rt: LevelRuntime, a: string, b: string): boolean {
  return rt.edges.some(([x, y]) => x === a && y === b);
}

export function totalScore(rt: LevelRuntime): number {
  const s = rt.scores;
  return s.entry + s.wiring + s.program + s.tests + s.path;
}

/** Objective text for the current stage (falls back to the level objective). */
export function objectiveFor(rt: LevelRuntime): string {
  const o = rt.level.stageObjectives[rt.stage];
  return o ? o.es : rt.level.objective.es;
}
