import { Building, GameState, GameWorldState } from '../types';
import { CompiledAuthoringWorld } from '../editor/types';
import { getBuildingAccessPosition } from '../utils/buildingAccess';

const OFFICE_INTERACTION_TYPES = new Set<Building['type']>(['OFFICE', 'HOME', 'PUB', 'HOTLINE']);

export const enterOfficeDirectory = (state: GameState): GameState => ({
  ...state,
  currentScene: 'OFFICE',
  activeBuildingId: null,
  explorationActive: false,
});

export const enterOfficeNpc = (
  state: GameState,
  npcId: string,
): GameState => ({
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

  return {
    ...state,
    activeNPCId: null,
    activeBuildingId: buildingId,
    currentScene: 'OFFICE',
    playerPos: getBuildingAccessPosition(building),
    explorationActive: !!building.explorationItems?.length,
  };
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

export const enterMineWorldScene = (
  state: GameState,
  buildingId: string,
): GameState => ({
  ...state,
  activeBuildingId: buildingId,
  currentScene: 'MINE_WORLD',
});

export const returnToWorldScene = (
  state: GameState,
): GameState => ({
  ...state,
  currentScene: 'WORLD',
  playerPos: state.activeBuildingId && state.buildings[state.activeBuildingId]
    ? getBuildingAccessPosition(state.buildings[state.activeBuildingId])
    : state.playerPos,
});

export const applyPlannerWorld = (
  state: GameState,
  world: CompiledAuthoringWorld,
): GameState => ({
  ...state,
  buildings: world.buildings,
  navigationZones: world.navigationZones,
  npcs: world.npcs,
  currentScene: 'WORLD',
});
