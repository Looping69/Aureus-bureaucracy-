import {
  Building,
  GameFtueState,
  GameOfficeState,
  GameProgressionState,
  GameInteractionState,
  GameWorldState,
  Permit,
} from '../types';
import { shouldHighlightForm17B, shouldHighlightVane, shouldLockBureauDirectory } from './ftue';

export type OfficeSceneMode = 'DIRECTORY' | 'BUILDING' | 'EXPLORATION';

export interface OfficeViewModel {
  mode: OfficeSceneMode;
  building: Building | null;
  discoveredBuildings: Building[];
  activePermits: Permit[];
  buildingPermits: Permit[];
  lockDirectory: boolean;
  highlightVane: boolean;
  highlightForm17B: boolean;
  canInspectBuilding: boolean;
}

type OfficeSceneState =
  GameOfficeState &
  GameFtueState &
  Pick<GameProgressionState, 'permits'> &
  Pick<GameInteractionState, 'activeBuildingId'> &
  Pick<GameWorldState, 'buildings'>;

const isDirectoryVisibleBuilding = (building: Building) =>
  building.isDiscovered &&
  (
    building.npcId !== 'none' ||
    (building.explorationItems?.length ?? 0) > 0 ||
    building.type === 'MINE_ENTRANCE' ||
    building.type === 'HOME' ||
    building.id === 'central_park'
  );

export const deriveOfficeViewModel = (state: OfficeSceneState): OfficeViewModel => {
  const building = state.activeBuildingId ? state.buildings[state.activeBuildingId] ?? null : null;
  const activePermits = Object.values(state.permits).filter(
    (permit) => permit.status !== 'LOCKED' && permit.status !== 'REJECTED'
  );
  const buildingPermits = building?.id === 'licensing_office'
    ? Object.values(state.permits).filter((permit) => permit.status !== 'LOCKED')
    : [];

  return {
    mode: state.explorationActive && building
      ? 'EXPLORATION'
      : building
        ? 'BUILDING'
        : 'DIRECTORY',
    building,
    discoveredBuildings: Object.values(state.buildings).filter(isDirectoryVisibleBuilding),
    activePermits,
    buildingPermits,
    lockDirectory: shouldLockBureauDirectory(state) && state.activeBuildingId === 'licensing_office',
    highlightVane: shouldHighlightVane(state),
    highlightForm17B: shouldHighlightForm17B(state),
    canInspectBuilding: !!building?.explorationItems?.length,
  };
};
