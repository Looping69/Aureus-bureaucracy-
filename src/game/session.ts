import { BUILDINGS, INITIAL_MINES, INITIAL_NPCS, INITIAL_PERMITS } from '../data';
import { EMPTY_WORLD_EFFECTS } from './dialogue/worldEffects';
import { deriveFtuePhaseFromTutorialStep, getLegacyTutorialStepForFtuePhase } from './ftue';
import { getBuildingAccessPosition } from '../utils/buildingAccess';
import { GameState, GameWorldState, WorldPosition } from '../types';
import { createInitialStreetPickups } from './streetPickups';

const cloneSerializable = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const buildHydratedBuildings = (
  savedBuildings?: GameWorldState['buildings'],
): GameWorldState['buildings'] => {
  if (savedBuildings && Object.keys(savedBuildings).length > 0) {
    return savedBuildings;
  }

  return Object.fromEntries(
    Object.entries(BUILDINGS).map(([id, building]) => [
      id,
      {
        ...building,
        isDiscovered: building.isDiscovered,
      },
    ]),
  ) as GameWorldState['buildings'];
};

export const buildInitialGameState = (): GameState => {
  const homePos = getBuildingAccessPosition(BUILDINGS.player_home);
  const buildings = buildHydratedBuildings();

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
    knownNpcIds: ['journalist'],
    objectives: [
      {
        id: 'start',
        text: 'Get to the Bureau of Extraction. No permit means no mine.',
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
    buildings,
    navigationZones: [],
    day: 1,
    time: 8,
    playerPos: homePos,
    targetPos: null,
    path: [],
    streetPickups: createInitialStreetPickups(buildings, [homePos]),
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
  };
};

type HydrateSavedStateParams = {
  saved: GameState;
  homePos: WorldPosition;
  plannerEnabled: boolean;
  hydrateBuildings: (savedBuildings?: GameWorldState['buildings']) => GameWorldState['buildings'];
};

export const hydrateSavedState = ({
  saved,
  homePos,
  plannerEnabled,
  hydrateBuildings,
}: HydrateSavedStateParams): GameState => {
  const baseState = buildInitialGameState();
  const saveUsesLegacyLayout =
    saved.buildings?.player_home?.pos.x !== BUILDINGS.player_home.pos.x ||
    saved.buildings?.player_home?.pos.y !== BUILDINGS.player_home.pos.y ||
    Object.keys(saved.buildings ?? {}).some((id) => !(id in BUILDINGS));
  const shouldResetWorldSpawn = saveUsesLegacyLayout || saved.currentScene === 'WORLD';
  const nextFtuePhase = saved.ftuePhase ?? deriveFtuePhaseFromTutorialStep(saved.tutorialStep);

  return {
    ...baseState,
    ...saved,
    currentScene: saved.currentScene === 'CITY_PLANNER' && !plannerEnabled ? 'WORLD' : saved.currentScene,
    ftuePhase: nextFtuePhase,
    buildings: hydrateBuildings(saved.buildings),
    navigationZones: saved.navigationZones ?? baseState.navigationZones,
    playerPos: shouldResetWorldSpawn ? homePos : (saved.playerPos ?? baseState.playerPos),
    targetPos: shouldResetWorldSpawn ? null : (saved.targetPos ?? baseState.targetPos),
    path: shouldResetWorldSpawn ? [] : (saved.path ?? baseState.path),
    streetPickups: saved.streetPickups ?? baseState.streetPickups,
    meters: { ...baseState.meters, ...(saved.meters ?? {}) },
    dialogueCooldowns: saved.dialogueCooldowns ?? {},
    worldEffects: { ...EMPTY_WORLD_EFFECTS, ...(saved.worldEffects ?? {}) },
    storyFlags: saved.storyFlags ?? [],
    lastCityEventHour: saved.lastCityEventHour ?? -1,
    unlockedEndings: saved.unlockedEndings ?? [],
    activeEndingId: saved.activeEndingId ?? null,
    tutorialStep:
      saved.tutorialStep === 99
        ? 99
        : (saved.tutorialStep ??
          getLegacyTutorialStepForFtuePhase(nextFtuePhase)),
  };
};
