import type { SaveData, LevelId, BadgeId, EncId } from './types';

const KEY = 'bitscape.save.v1';

export const defaultSave = (lang: 'es' | 'en' = 'es'): SaveData => ({
  version: 1,
  lang,
  name: '',
  suit: 0,
  unlocked: ['tutorial'],
  results: {},
  badges: [],
  encyclopedia: [],
  introSeen: false,
  reducedMotion: false,
});

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave(detectLang());
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1 || !Array.isArray(data.unlocked)) throw new Error('bad shape');
    return { ...defaultSave(detectLang()), ...data };
  } catch {
    return defaultSave(detectLang());
  }
}

export function persistSave(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage may be disabled; the game still runs in-memory */
  }
}

export function eraseSave(lang: 'es' | 'en'): SaveData {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return defaultSave(lang);
}

function detectLang(): 'es' | 'en' {
  try {
    const nav = navigator.language || 'es';
    return nav.toLowerCase().startsWith('en') ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

export function unlockLevel(save: SaveData, id: LevelId): void {
  if (!save.unlocked.includes(id)) save.unlocked.push(id);
}

export function completeLevel(
  save: SaveData,
  id: LevelId,
  score: number,
  tests: number,
  total: number,
  badges: BadgeId[],
  enc: EncId[],
): void {
  save.results[id] = { score, tests, total };
  for (const b of badges) if (!save.badges.includes(b)) save.badges.push(b);
  for (const e of enc) if (!save.encyclopedia.includes(e)) save.encyclopedia.push(e);
}
