import { describe, it, expect } from 'vitest';
import { DICT } from '../src/i18n/dict';

const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(',');

describe('i18n dictionary', () => {
  const keys = Object.keys(DICT);

  it('has keys', () => {
    expect(keys.length).toBeGreaterThan(80);
  });

  it('has non-empty text in both languages for every key', () => {
    const empty: string[] = [];
    for (const [k, v] of Object.entries(DICT)) {
      if (!v.es.trim()) empty.push(`${k}:es`);
      if (!v.en.trim()) empty.push(`${k}:en`);
    }
    expect(empty).toEqual([]);
  });

  it('uses the same {placeholders} in both languages', () => {
    const mismatched: string[] = [];
    for (const [k, v] of Object.entries(DICT)) {
      if (placeholders(v.es) !== placeholders(v.en)) mismatched.push(k);
    }
    expect(mismatched).toEqual([]);
  });

  it('keeps Spanish and English distinct (no untranslated copy)', () => {
    const identical = keys.filter((k) => DICT[k as keyof typeof DICT].es === DICT[k as keyof typeof DICT].en);
    // A few keys are legitimately identical (e.g. unit-like text) — keep the list short.
    expect(identical.length).toBeLessThanOrEqual(3);
  });
});
