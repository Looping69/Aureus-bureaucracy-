import { GameState } from '../types';

const SAVE_KEY = 'aureus-save-v2';
const LEGACY_SAVE_KEYS = ['aureus-save-v1'];
const SAVE_VERSION = 2;

type SaveEnvelope = {
  version: number;
  savedAt: string;
  state: GameState;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLikelyGameState = (value: unknown): value is GameState => {
  if (!isRecord(value)) return false;

  return (
    typeof value.money === 'number' &&
    typeof value.ore === 'number' &&
    typeof value.energy === 'number' &&
    typeof value.day === 'number' &&
    typeof value.time === 'number' &&
    Array.isArray(value.mines) &&
    Array.isArray(value.objectives) &&
    Array.isArray(value.storyFlags) &&
    isRecord(value.permits) &&
    isRecord(value.npcs) &&
    isRecord(value.buildings)
  );
};

const isSaveEnvelope = (value: unknown): value is SaveEnvelope => {
  if (!isRecord(value)) return false;

  return (
    typeof value.version === 'number' &&
    typeof value.savedAt === 'string' &&
    isLikelyGameState(value.state)
  );
};

const readRawSave = (): string | null => {
  const keys = [SAVE_KEY, ...LEGACY_SAVE_KEYS];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (raw) return raw;
  }

  return null;
};

const migrateLegacySave = (value: unknown): GameState | null => {
  if (isSaveEnvelope(value)) {
    return value.state;
  }

  if (isLikelyGameState(value)) {
    return value;
  }

  return null;
};

export const loadSavedGameState = (): GameState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = readRawSave();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return migrateLegacySave(parsed);
  } catch {
    return null;
  }
};

export const saveGameState = (state: GameState) => {
  if (typeof window === 'undefined') return;

  try {
    const payload: SaveEnvelope = {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };

    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Best effort save; ignore quota/serialization failures.
  }
};

export const hasSavedGameState = (): boolean => {
  if (typeof window === 'undefined') return false;

  return [SAVE_KEY, ...LEGACY_SAVE_KEYS].some((key) => window.localStorage.getItem(key) !== null);
};

export const clearSavedGameState = () => {
  if (typeof window === 'undefined') return;

  [SAVE_KEY, ...LEGACY_SAVE_KEYS].forEach((key) => {
    window.localStorage.removeItem(key);
  });
};
