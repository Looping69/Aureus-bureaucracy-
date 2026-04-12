import {
  GameInteractionState,
  GameOfficeState,
  GameProgressionState,
  GameResourceState,
  GameWorldState,
} from '../types';
import { getBuildingAccessPosition } from '../utils/buildingAccess';

type ExhaustionState =
  Pick<GameResourceState, 'money' | 'energy' | 'maxEnergy'> &
  Pick<GameProgressionState, 'activeMineId'> &
  Pick<GameInteractionState, 'currentScene' | 'activeNPCId' | 'activePermitId' | 'activeBuildingId' | 'activeMiniGame'> &
  Pick<GameOfficeState, 'explorationActive'> &
  Pick<GameWorldState, 'buildings' | 'playerPos' | 'targetPos' | 'path' | 'day' | 'time'>;

export const EXHAUSTION_FINE = 200;

export const applyExhaustionCollapse = (
  state: ExhaustionState,
  fine: number = EXHAUSTION_FINE
): { nextState: ExhaustionState; notification: { title: string; msg: string } } => {
  const homeBuilding = state.buildings.player_home;
  const homePos = homeBuilding
    ? getBuildingAccessPosition(homeBuilding)
    : state.playerPos;

  return {
    nextState: {
      ...state,
      money: Math.max(0, state.money - fine),
      energy: state.maxEnergy,
      playerPos: homePos,
      targetPos: null,
      path: [],
      currentScene: 'WORLD',
      activeMineId: null,
      activeNPCId: null,
      activePermitId: null,
      activeBuildingId: null,
      activeMiniGame: null,
      explorationActive: false,
      day: state.day + 1,
      time: 6,
    },
    notification: {
      title: 'Collapse',
      msg: `You collapsed from exhaustion. The Bureau dragged you home, fined you $${fine}, and reset you for the next day.`,
    },
  };
};
