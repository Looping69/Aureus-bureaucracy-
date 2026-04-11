/**
 * @module GameStore
 * Central store utilities: initial-state builders and save-state hydration.
 *
 * These functions are used by {@link GameProvider} to initialise game state
 * on new-game start and on save-file load.  Splitting them here keeps
 * GameProvider free of data-construction logic.
 */
import { GameState } from '../../types';
import { INITIAL_NPCS, INITIAL_PERMITS, INITIAL_MINES, BUILDINGS } from '../../data';
import { getBuildingAccessPosition } from '../../utils/buildingAccess';
import { DAY_NIGHT, ticksToHours } from '../../utils/dayNightCycle';
import { EMPTY_WORLD_EFFECTS } from '../dialogue/worldEffects';

const cloneSerializable = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

// ── Building hydration ───────────────────────────────────────────────────────

/**
 * Build the canonical buildings map.
 *
 * When `savedBuildings` is provided and non-empty the saved layout wins,
 * preserving any city-planner changes made by the player.  Otherwise the
 * base BUILDINGS constant is used as the source of truth.
 */
export const buildHydratedBuildings = (
  savedBuildings?: GameState['buildings'],
): GameState['buildings'] => {
  if (savedBuildings && Object.keys(savedBuildings).length > 0) {
    return savedBuildings;
  }
  return Object.fromEntries(
    Object.entries(BUILDINGS).map(([id, building]) => [id, { ...building }]),
  ) as GameState['buildings'];
};

// ── Initial state ────────────────────────────────────────────────────────────

/** Construct a fresh {@link GameState} for a new game session. */
export const buildInitialGameState = (): GameState => {
  const homePos = getBuildingAccessPosition(BUILDINGS.player_home);

  return {
    money: 1000,
    ore: 0,
    evidence: 0,
    energy: 100,
    maxEnergy: 100,
    movementSpeed: 1,
    upgrades: [],
    dirtItems: [],
    leverage: [],
    foundOfficeItemIds: [],
    explorationActive: false,
    meters: {
      trust: 50,
      influence: 10,
      exposure: 0,
    },
    permits: cloneSerializable(INITIAL_PERMITS),
    npcs: cloneSerializable(INITIAL_NPCS),
    knownNpcIds: [],
    objectives: [
      {
        id: 'start',
        text: 'Find the Bureau of Extraction (East).',
        isCompleted: false,
        type: 'DISCOVER',
        targetId: 'licensing_office',
      },
    ],
    mines: cloneSerializable(INITIAL_MINES),
    activeMineId: null,
    currentScene: 'WORLD',
    activeNPCId: null,
    activePermitId: null,
    activeBuildingId: null,
    activeMiniGame: null,
    pendingPermitAction: null,
    buildings: buildHydratedBuildings(),
    day: 1,
    time: ticksToHours(DAY_NIGHT.INITIAL_TIME_OF_DAY),
    playerPos: homePos,
    targetPos: null,
    path: [],
    feedbacks: [],
    dialogueCooldowns: {},
    worldEffects: EMPTY_WORLD_EFFECTS,
    storyFlags: [],
    lastCityEventHour: -1,
    unlockedEndings: [],
    activeEndingId: null,
    ftuePhase: 'intro',
    tutorialStep: 0,
    tutorialMinimized: false,
    camera: { x: 0, y: 0, zoom: 1 },
  };
};

// ── Save hydration ────────────────────────────────────────────────────────────

/**
 * Merge a raw save file into a valid {@link GameState}.
 *
 * Handles legacy world layouts by resetting the player's world spawn
 * position when the saved building map no longer matches the compiled
 * BUILDINGS constant.
 */
export const hydrateSavedState = (saved: GameState): GameState => {
  const baseState = buildInitialGameState();
  const homePos = getBuildingAccessPosition(BUILDINGS.player_home);

  const saveUsesLegacyLayout =
    saved.buildings?.player_home?.pos.x !== BUILDINGS.player_home.pos.x ||
    saved.buildings?.player_home?.pos.y !== BUILDINGS.player_home.pos.y ||
    Object.keys(saved.buildings ?? {}).some((id) => !(id in BUILDINGS));
  const shouldResetWorldSpawn = saveUsesLegacyLayout || saved.currentScene === 'WORLD';

  return {
    ...baseState,
    ...saved,
    buildings: buildHydratedBuildings(saved.buildings),
    playerPos: shouldResetWorldSpawn ? homePos : (saved.playerPos ?? baseState.playerPos),
    targetPos: shouldResetWorldSpawn ? null : (saved.targetPos ?? baseState.targetPos),
    path: shouldResetWorldSpawn ? [] : (saved.path ?? baseState.path),
    meters: { ...baseState.meters, ...(saved.meters ?? {}) },
    camera: { ...baseState.camera, ...(saved.camera ?? {}) },
    dialogueCooldowns: saved.dialogueCooldowns ?? {},
    worldEffects: { ...EMPTY_WORLD_EFFECTS, ...(saved.worldEffects ?? {}) },
    storyFlags: saved.storyFlags ?? [],
    lastCityEventHour: saved.lastCityEventHour ?? -1,
    unlockedEndings: saved.unlockedEndings ?? [],
    activeEndingId: saved.activeEndingId ?? null,
  };
};
