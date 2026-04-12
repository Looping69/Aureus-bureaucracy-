import { Building, GameInteractionState, GameOfficeState, GameWorldState } from '../types';
import { getBuildingAccessPosition } from '../utils/buildingAccess';

const OFFICE_INTERACTION_TYPES = new Set<Building['type']>(['OFFICE', 'HOME', 'PUB', 'HOTLINE']);

type OfficeDirectoryState = GameInteractionState & GameOfficeState;
type OfficeBuildingState = OfficeDirectoryState & Pick<GameWorldState, 'buildings' | 'playerPos'>;
type MineWorldTransitionState = GameInteractionState & Pick<GameWorldState, 'buildings' | 'playerPos'>;

export const enterOfficeDirectory = (state: OfficeDirectoryState): OfficeDirectoryState => ({
  ...state,
  currentScene: 'OFFICE',
  activeBuildingId: null,
  explorationActive: false,
});

export const enterOfficeNpc = (
  state: OfficeDirectoryState,
  npcId: string,
): OfficeDirectoryState => ({
  ...state,
  activeNPCId: npcId,
  activeBuildingId: null,
  explorationActive: false,
  currentScene: 'OFFICE',
});

export const enterOfficeBuilding = (
  state: OfficeBuildingState,
  buildingId: string,
): OfficeBuildingState => {
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

export const openOfficeExploration = (state: GameOfficeState): GameOfficeState => ({
  ...state,
  explorationActive: true,
});

export const closeOfficeExploration = (state: GameOfficeState): GameOfficeState => ({
  ...state,
  explorationActive: false,
});

export const returnOfficeToDirectory = (
  state: OfficeDirectoryState,
): OfficeDirectoryState => ({
  ...state,
  activeBuildingId: null,
  explorationActive: false,
});

export const enterMineWorldScene = (
  state: MineWorldTransitionState,
  buildingId: string,
): MineWorldTransitionState => ({
  ...state,
  activeBuildingId: buildingId,
  currentScene: 'MINE_WORLD',
});

export const returnToWorldScene = (
  state: MineWorldTransitionState,
): MineWorldTransitionState => ({
  ...state,
  currentScene: 'WORLD',
  playerPos: state.activeBuildingId && state.buildings[state.activeBuildingId]
    ? getBuildingAccessPosition(state.buildings[state.activeBuildingId])
    : state.playerPos,
});

export const applyPlannerBuildings = (
  state: Pick<GameWorldState, 'buildings'> & Pick<GameInteractionState, 'currentScene'>,
  buildings: GameWorldState['buildings'],
): Pick<GameWorldState, 'buildings'> & Pick<GameInteractionState, 'currentScene'> => ({
  ...state,
  buildings,
  currentScene: 'WORLD',
});
