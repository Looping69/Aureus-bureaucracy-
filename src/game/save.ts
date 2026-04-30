import { GameState } from '../types';
import saveMetadata from './saveMetadata.json';
import { isValidGameStateCandidate } from './saveValidation';

export const SAVE_KEY = saveMetadata.saveKey;
export const LEGACY_SAVE_KEYS = saveMetadata.legacySaveKeys;
export const SAVE_VERSION = saveMetadata.saveVersion;
export const SAVE_SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

type SaveEnvelope = {
  version: number;
  savedAt: string;
  state: GameState;
};

type SaveCollection = {
  version: number;
  slots: Partial<Record<SaveSlotId, SaveEnvelope>>;
};

export type SaveSlotSummary = {
  slotId: SaveSlotId;
  label: string;
  savedAt: string | null;
  state: GameState | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSaveEnvelope = (value: unknown): value is SaveEnvelope => {
  if (!isRecord(value)) return false;

  return (
    typeof value.version === 'number' &&
    typeof value.savedAt === 'string' &&
    isValidGameStateCandidate(value.state)
  );
};

const isSaveCollection = (value: unknown): value is SaveCollection => {
  if (!isRecord(value) || !isRecord(value.slots)) return false;

  return SAVE_SLOT_IDS.every((slotId) => {
    const slotValue = value.slots[slotId];
    return slotValue === undefined || isSaveEnvelope(slotValue);
  });
};

const getSaveSlotLabel = (slotId: SaveSlotId): string => `File ${SAVE_SLOT_IDS.indexOf(slotId) + 1}`;

const createSaveEnvelope = (state: GameState, savedAt = new Date().toISOString()): SaveEnvelope => ({
  version: SAVE_VERSION,
  savedAt,
  state,
});

const persistSaveCollection = (slots: Partial<Record<SaveSlotId, SaveEnvelope>>) => {
  const payload: SaveCollection = {
    version: SAVE_VERSION,
    slots,
  };

  window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  LEGACY_SAVE_KEYS.forEach((key) => window.localStorage.removeItem(key));
};

const readLatestRawSave = (): { key: string; raw: string } | null => {
  const keys = [SAVE_KEY, ...LEGACY_SAVE_KEYS];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (raw) return { key, raw };
  }

  return null;
};

const migrateLegacySave = (value: unknown): SaveEnvelope | null => {
  if (isSaveEnvelope(value)) {
    return createSaveEnvelope(value.state, value.savedAt);
  }

  if (isValidGameStateCandidate(value)) {
    return createSaveEnvelope(value);
  }

  return null;
};

const readSaveCollection = (): Partial<Record<SaveSlotId, SaveEnvelope>> => {
  if (typeof window === 'undefined') return {};

  try {
    const latest = readLatestRawSave();
    if (!latest) return {};

    const parsed = JSON.parse(latest.raw) as unknown;

    if (latest.key === SAVE_KEY && isSaveCollection(parsed)) {
      return parsed.slots;
    }

    const migrated = migrateLegacySave(parsed);
    return migrated ? { 'slot-1': migrated } : {};
  } catch {
    return {};
  }
};

const buildSaveSlotSummary = (
  slotId: SaveSlotId,
  slots: Partial<Record<SaveSlotId, SaveEnvelope>>,
): SaveSlotSummary => {
  const slot = slots[slotId];

  return {
    slotId,
    label: getSaveSlotLabel(slotId),
    savedAt: slot?.savedAt ?? null,
    state: slot?.state ?? null,
  };
};

const getMostRecentSaveSlot = (
  slots: Partial<Record<SaveSlotId, SaveEnvelope>>,
): SaveSlotId | null => {
  const occupiedSlots = SAVE_SLOT_IDS.filter((slotId) => slots[slotId]);
  if (occupiedSlots.length === 0) return null;

  return occupiedSlots
    .sort((left, right) => {
      const leftSavedAt = Date.parse(slots[left]?.savedAt ?? '');
      const rightSavedAt = Date.parse(slots[right]?.savedAt ?? '');
      return rightSavedAt - leftSavedAt;
    })[0] ?? null;
};

export const listSavedGameStates = (): SaveSlotSummary[] => {
  if (typeof window === 'undefined') {
    return SAVE_SLOT_IDS.map((slotId) => buildSaveSlotSummary(slotId, {}));
  }

  const slots = readSaveCollection();
  return SAVE_SLOT_IDS.map((slotId) => buildSaveSlotSummary(slotId, slots));
};

export const loadSavedGameState = (slotId?: SaveSlotId | null): GameState | null => {
  if (typeof window === 'undefined') return null;

  const slots = readSaveCollection();
  const resolvedSlotId = slotId ?? getMostRecentSaveSlot(slots);
  if (!resolvedSlotId) return null;

  return slots[resolvedSlotId]?.state ?? null;
};

export const saveGameState = (state: GameState, slotId: SaveSlotId) => {
  if (typeof window === 'undefined') return;

  try {
    const slots = readSaveCollection();
    persistSaveCollection({
      ...slots,
      [slotId]: createSaveEnvelope(state),
    });
  } catch {
    // Best effort save; ignore quota/serialization failures.
  }
};

export const hasSavedGameState = (): boolean => {
  if (typeof window === 'undefined') return false;

  return listSavedGameStates().some((slot) => slot.state !== null);
};

export const getNextSaveSlotId = (saveSlots = listSavedGameStates()): SaveSlotId => {
  const emptySlot = saveSlots.find((slot) => slot.state === null);
  if (emptySlot) return emptySlot.slotId;

  const oldestSlot = [...saveSlots]
    .filter((slot): slot is SaveSlotSummary & { savedAt: string; state: GameState } => slot.savedAt !== null && slot.state !== null)
    .sort((left, right) => Date.parse(left.savedAt) - Date.parse(right.savedAt))[0];

  return oldestSlot?.slotId ?? 'slot-1';
};

export const clearSavedGameState = (slotId?: SaveSlotId) => {
  if (typeof window === 'undefined') return;

  if (!slotId) {
    [SAVE_KEY, ...LEGACY_SAVE_KEYS].forEach((key) => {
      window.localStorage.removeItem(key);
    });
    return;
  }

  const slots = readSaveCollection();
  const nextSlots = { ...slots };
  delete nextSlots[slotId];
  persistSaveCollection(nextSlots);
};
