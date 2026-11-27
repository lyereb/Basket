import type { CharacterSkinId, SaveData } from './types.ts';

const SAVE_KEY = 'angry_octo_basketball_v1';

const DEFAULT_SAVE: SaveData = {
  unlockedLevel: 1,
  starsByLevel: {},
  bestShotsByLevel: {},
  coins: 1280,
  playerLevel: 3,
  muted: false,
  showGuide: true,
  selectedSkin: 'octo',
  unlockedSkins: ['octo'],
  lastCheckInDate: '',
  checkInStreak: 0,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE, starsByLevel: {}, bestShotsByLevel: {}, unlockedSkins: ['octo'] };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      starsByLevel: { ...(parsed.starsByLevel ?? {}) },
      bestShotsByLevel: { ...(parsed.bestShotsByLevel ?? {}) },
      unlockedSkins: Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0
        ? (parsed.unlockedSkins as CharacterSkinId[])
        : ['octo'],
    };
  } catch {
    return { ...DEFAULT_SAVE, starsByLevel: {}, bestShotsByLevel: {}, unlockedSkins: ['octo'] };
  }
}

export function persistSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
