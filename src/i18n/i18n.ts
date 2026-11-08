import { DICT, translate, fill, type DictKey, type Lang, type Bi } from './dict';

export type { Lang, Bi, DictKey };
export { translate, fill, DICT };

let current: Lang = 'es';

export function setLang(l: Lang) {
  current = l;
}

export function getLang(): Lang {
  return current;
}

/** Translate a dictionary key in the active language. */
export function t(key: DictKey, vars?: Record<string, string | number>): string {
  const s = translate(key, current);
  return vars ? fill(s, vars) : s;
}

/** Resolve a bilingual pair in the active language. */
export function bi(v: Bi): string {
  return v[current];
}

/** Every dictionary key — used by tests to verify completeness. */
export const ALL_KEYS = Object.keys(DICT) as DictKey[];
