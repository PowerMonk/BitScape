import type { Bi } from '../i18n/dict';

export type LevelId = 'tutorial' | 'fridge' | 'washer' | 'robot' | 'fan';
export type Stage = 'entry' | 'wiring' | 'program' | 'test' | 'path' | 'done';
export type EncId = 'embedded' | 'mcu' | 'sensor' | 'actuator' | 'program';
export type BadgeId = 'entry' | 'program' | 'output' | 'final';

/* ------------------------------------------------------------------ */
/* Signals, actions, conditions                                        */
/* ------------------------------------------------------------------ */

export type SensorId = string;
export type ActionId = string;
export type Cmp = '>=' | '<=' | '<' | '>' | '=' | '!=';

export type Cond =
  | { sensor: SensorId; op: Cmp; value: number }
  | { sensor: SensorId; op: '=' | '!='; value: boolean };

export type Rule = { id: string; cond: Cond | null; action: ActionId };

export type SafetyRule = { cond: Cond; action: ActionId };

export type Program =
  | { kind: 'rule'; rules: Rule[]; defaultAction: ActionId | null }
  | { kind: 'sequence'; steps: ActionId[]; safety?: SafetyRule | null; fill?: { cond: Cond } | null };

/** Device output state after an action, e.g. { cooling: 'on' } */
export type OutputState = Record<string, string | number | boolean>;

export type ActionDef = { id: ActionId; label: Bi; effect: OutputState; icon?: string };

export type SensorDef = {
  id: SensorId;
  label: Bi;
  unit?: string;
  icon?: string;
  type?: 'number' | 'boolean';
};

export type ValueOpt = { v: number | boolean; label: Bi };

export type TestKind = 'rule' | 'sequence' | 'fill' | 'safety';

export type TestDef = {
  id: string;
  name: Bi;
  kind: TestKind;
  input?: Record<string, number | boolean>;
  prior?: OutputState;
  expected?: OutputState;
  /** for fill/safety tests: the expected boolean of evaluating the condition */
  expectedBool?: boolean;
  /** canonical cycle order for sequence tests */
  canonical?: string[];
  feedback?: Bi;
};

/* ------------------------------------------------------------------ */
/* Program builder description (drives the block panel UI)             */
/* ------------------------------------------------------------------ */

export type RuleSlots = {
  sensors: SensorDef[];
  ops: Cmp[];
  values: ValueOpt[];
  actions: ActionDef[];
  count: number;
  allowKeep: boolean;
  allowElse: boolean;
};

export type SafetySlots = {
  sensors: SensorDef[];
  ops: Cmp[];
  values: ValueOpt[];
  actions: ActionDef[];
};

export type FillSlots = {
  sensors: SensorDef[];
  ops: Cmp[];
  values: ValueOpt[];
};

export type SequenceSlots = {
  steps: ActionDef[];
  safety: SafetySlots;
  fill: FillSlots;
};

export type ProgramBuilder =
  | { kind: 'rule'; slots: RuleSlots }
  | { kind: 'sequence'; slots: SequenceSlots };

/* ------------------------------------------------------------------ */
/* Level definition                                                    */
/* ------------------------------------------------------------------ */

export type ChoiceOption = {
  id: string;
  label: Bi;
  detail?: Bi;
  correct: boolean;
  /** BIT's answer when this wrong option is picked (only for wrong options) */
  wrong?: Bi;
};

export type EntryRound = {
  prompt: Bi;
  options: ChoiceOption[];
  correctId: string;
};

export type PathOption = { id: string; label: Bi };

export type WiringNode = {
  id: string;
  kind: 'source' | 'mcuIn' | 'mcuOut' | 'sink';
  label: Bi;
  icon: string;
};

export type WiringDef = {
  nodes: WiringNode[];
  /** connections that must exist for the system to work */
  required: [string, string][];
  /** feedback for attempted-but-disallowed edges, keyed `${from}>${to}` */
  reject: Record<string, Bi>;
};

export type HintSet = [Bi, Bi, Bi];

export type LevelDef = {
  id: LevelId;
  name: Bi;
  device: Bi;
  objective: Bi;
  /** one-line signal flow shown in results */
  flow: Bi;
  palette: string;
  windowKind: 'board' | 'fridge' | 'washer' | 'robot' | 'fan';
  badges: BadgeId[];
  encyclopedia: EncId[];
  stages: Stage[];
  hints: Record<string, HintSet>;
  hotspot: { sensor: Bi; mcu: Bi; actuator: Bi; monitor: Bi };
  stageObjectives: Partial<Record<Stage, Bi>>;
  entry?: { rounds: EntryRound[] };
  wiring: WiringDef;
  program: ProgramBuilder;
  tests: TestDef[];
  path: { options: PathOption[]; correctOrder: string[] };
  intro?: Bi;
};

/* ------------------------------------------------------------------ */
/* Progress / persistence                                              */
/* ------------------------------------------------------------------ */

export type LevelResult = { score: number; tests: number; total: number };

export type SaveData = {
  version: 1;
  lang: 'es' | 'en';
  name: string;
  suit: number;
  unlocked: LevelId[];
  results: Partial<Record<LevelId, LevelResult>>;
  badges: BadgeId[];
  encyclopedia: EncId[];
  introSeen: boolean;
  reducedMotion: boolean;
};

export const SUITS = ['#3EC6C2', '#FF6FA5', '#FFB23F', '#8B7BE8', '#5BC97F', '#F2645A'] as const;
