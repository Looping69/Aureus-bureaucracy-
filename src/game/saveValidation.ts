import { GameScene, GameState } from '../types';

export type SaveValidationResult =
  | { valid: true; state: GameState; reasons: [] }
  | { valid: false; reasons: string[] };

const GAME_SCENES = new Set<GameScene>(['MINE', 'MINE_WORLD', 'OFFICE', 'WORLD', 'CITY_PLANNER']);
const MINI_GAMES = new Set(['FORM_PROCESSING']);
const PENDING_PERMIT_ACTIONS = new Set(['SUBMIT', 'FAST_TRACK', 'DIALOGUE']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const isBoolean = (value: unknown) => typeof value === 'boolean';
const isString = (value: unknown) => typeof value === 'string';
const isNullableString = (value: unknown) => value === null || isString(value);
const isArray = (value: unknown) => Array.isArray(value);

const isWorldPosition = (value: unknown) =>
  isRecord(value) && isNumber(value.x) && isNumber(value.y);

const requireNumber = (state: Record<string, unknown>, key: string, reasons: string[]) => {
  if (!isNumber(state[key])) reasons.push(`${key} must be a finite number`);
};

const requireArray = (state: Record<string, unknown>, key: string, reasons: string[]) => {
  if (!isArray(state[key])) reasons.push(`${key} must be an array`);
};

const requireRecord = (state: Record<string, unknown>, key: string, reasons: string[]) => {
  if (!isRecord(state[key])) reasons.push(`${key} must be an object`);
};

const validateCoreResources = (state: Record<string, unknown>, reasons: string[]) => {
  ['money', 'ore', 'evidence', 'energy', 'maxEnergy', 'movementSpeed'].forEach((key) =>
    requireNumber(state, key, reasons),
  );
  ['upgrades', 'dirtItems', 'leverage'].forEach((key) => requireArray(state, key, reasons));
};

const validateCoreProgression = (state: Record<string, unknown>, reasons: string[]) => {
  ['permits', 'npcs', 'buildings', 'meters'].forEach((key) => requireRecord(state, key, reasons));
  ['knownNpcIds', 'objectives', 'mines'].forEach((key) => requireArray(state, key, reasons));

  if (!isNullableString(state.activeMineId)) reasons.push('activeMineId must be null or a string');

  const meters = state.meters;
  if (isRecord(meters)) {
    ['trust', 'influence', 'exposure'].forEach((key) => requireNumber(meters, key, reasons));
  }
};

const validateInteraction = (state: Record<string, unknown>, reasons: string[]) => {
  if (!isString(state.currentScene) || !GAME_SCENES.has(state.currentScene as GameScene)) {
    reasons.push('currentScene must be a known game scene');
  }

  ['activeNPCId', 'activePermitId', 'activeBuildingId', 'activeEndingId'].forEach((key) => {
    if (!isNullableString(state[key])) reasons.push(`${key} must be null or a string`);
  });

  if (state.activeMiniGame !== null && !MINI_GAMES.has(String(state.activeMiniGame))) {
    reasons.push('activeMiniGame must be null or a known mini-game');
  }

  if (state.pendingPermitAction !== null && !PENDING_PERMIT_ACTIONS.has(String(state.pendingPermitAction))) {
    reasons.push('pendingPermitAction must be null or a known permit action');
  }
};

const validateWorld = (state: Record<string, unknown>, reasons: string[]) => {
  requireNumber(state, 'day', reasons);
  requireNumber(state, 'time', reasons);
  requireRecord(state, 'weather', reasons);

  if (!isWorldPosition(state.playerPos)) reasons.push('playerPos must contain numeric x and y');
  if (state.targetPos !== null && state.targetPos !== undefined && !isWorldPosition(state.targetPos)) {
    reasons.push('targetPos must be null or a world position');
  }

  requireArray(state, 'path', reasons);

  if (state.streetPickups !== undefined && !isArray(state.streetPickups)) {
    reasons.push('streetPickups must be an array when present');
  }
};

const validateOptionalMigrationFields = (state: Record<string, unknown>, reasons: string[]) => {
  if (state.foundOfficeItemIds !== undefined && !isArray(state.foundOfficeItemIds)) {
    reasons.push('foundOfficeItemIds must be an array when present');
  }
  if (state.explorationActive !== undefined && !isBoolean(state.explorationActive)) {
    reasons.push('explorationActive must be a boolean when present');
  }
  if (state.feedbacks !== undefined && !isArray(state.feedbacks)) reasons.push('feedbacks must be an array when present');
  if (state.playerFeedbacks !== undefined && !isArray(state.playerFeedbacks)) {
    reasons.push('playerFeedbacks must be an array when present');
  }
  if (state.dialogueCooldowns !== undefined && !isRecord(state.dialogueCooldowns)) {
    reasons.push('dialogueCooldowns must be an object when present');
  }
  if (state.worldEffects !== undefined && !isRecord(state.worldEffects)) {
    reasons.push('worldEffects must be an object when present');
  }
  if (state.storyFlags !== undefined && !isArray(state.storyFlags)) {
    reasons.push('storyFlags must be an array when present');
  }
  if (state.lastCityEventHour !== undefined && !isNumber(state.lastCityEventHour)) {
    reasons.push('lastCityEventHour must be a finite number when present');
  }
  if (state.activeCityIncident !== undefined && state.activeCityIncident !== null && !isRecord(state.activeCityIncident)) {
    reasons.push('activeCityIncident must be null or an object when present');
  }
  if (state.unlockedEndings !== undefined && !isArray(state.unlockedEndings)) {
    reasons.push('unlockedEndings must be an array when present');
  }
  if (state.tutorialStep !== undefined && !isNumber(state.tutorialStep)) {
    reasons.push('tutorialStep must be a finite number when present');
  }
  if (state.tutorialMinimized !== undefined && !isBoolean(state.tutorialMinimized)) {
    reasons.push('tutorialMinimized must be a boolean when present');
  }
};

export const validateGameStateCandidate = (value: unknown): SaveValidationResult => {
  if (!isRecord(value)) {
    return { valid: false, reasons: ['save state must be an object'] };
  }

  const reasons: string[] = [];
  validateCoreResources(value, reasons);
  validateCoreProgression(value, reasons);
  validateInteraction(value, reasons);
  validateWorld(value, reasons);
  validateOptionalMigrationFields(value, reasons);

  if (reasons.length > 0) {
    return { valid: false, reasons };
  }

  return { valid: true, state: value as unknown as GameState, reasons: [] };
};

export const isValidGameStateCandidate = (value: unknown): value is GameState =>
  validateGameStateCandidate(value).valid;
