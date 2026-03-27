import { GameState } from '../types';

const SAVE_KEY = 'aureus-save-v1';

export const loadSavedGameState = (): GameState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveGameState = (state: GameState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Best effort save; ignore quota/serialization failures.
  }
};

export const hasSavedGameState = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SAVE_KEY) !== null;
};

export const clearSavedGameState = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SAVE_KEY);
};
