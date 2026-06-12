import { Building, GameState, GameWorldState } from '../types';
import { CompiledAuthoringWorld } from '../editor/types';
import { getBuildingAccessPosition } from '../utils/buildingAccess';
import { canEnterMineScene, normalizeSceneState } from './machines/sceneMachine';

const OFFICE_INTERACTION_TYPES = new Set<Building['type']>(['OFFICE', 'HOME', 'PUB', 'HOTLINE']);

const normalize = (state: GameState) => normalizeSceneState(state, true);

export const enterOfficeDirectory = (state: GameState): GameState => normalize({
  ...state,
  currentScene: 'OFFICE',
  activeBuildingId: null,
  explorationActive: false,
});

export const enterOfficeNpc = (
  state: GameState,
  npcId: string,
): GameState => normalize({
  ...state,
  activeNPCId: npcId,
  activeBuildingId: null,
  explorationActive: false,
  currentScene: 'OFFICE',
});

export const enterOfficeBuilding = (
  state: GameState,
  buildingId: string,
): GameState => {
  const building = state.buildings[buildingId];
  if (!building || !OFFICE_INTERACTION_TYPES.has(building.type)) {
    return state;
  }

  return normalize({
    ...state,
    activeNPCId: null,
    activeBuildingId: buildingId,
    currentScene: 'OFFICE',
    playerPos: getBuildingAccessPosition(building),
    explorationActive: !!building.explorationItems?.length,
  });
};

export const openOfficeExploration = (state: GameState): GameState => ({
  ...state,
  explorationActive: true,
});

export const closeOfficeExploration = (state: GameState): GameState => ({
  ...state,
  explorationActive: false,
});

export const returnOfficeToDirectory = (
  state: GameState,
): GameState => ({
  ...state,
  activeBuildingId: null,
  explorationActive: false,
});

export const enterMineScene = (
  state: GameState,
  mineId: string,
): GameState => {
  if (!canEnterMineScene(state, mineId)) return state;

  return normalize({
    ...state,
    activeMineId: mineId,
    currentScene: 'MINE',
  });
};

export const enterMineWorldScene = (
  state: GameState,
  buildingId: string,
): GameState => normalize({
  ...state,
  activeBuildingId: buildingId,
  currentScene: 'MINE_WORLD',
});

export const returnToWorldScene = (
  state: GameState,
): GameState => normalize({
  ...state,
  currentScene: 'WORLD',
  playerPos: state.activeBuildingId && state.buildings[state.activeBuildingId]
    ? getBuildingAccessPosition(state.buildings[state.activeBuildingId])
    : state.playerPos,
});

export const applyPlannerWorld = (
  state: GameState,
  world: CompiledAuthoringWorld,
): GameState => normalize({
  ...state,
  buildings: world.buildings,
  navigationZones: world.navigationZones,
  npcs: world.npcs,
  currentScene: 'WORLD',
});
