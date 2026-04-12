import { GameState, Building, Permit } from '../types';
import { shouldHighlightForm17B, shouldHighlightVane, shouldLockBureauDirectory } from './ftue';

export type OfficeSceneMode = 'DIRECTORY' | 'BUILDING' | 'EXPLORATION';

export interface OfficeViewModel {
  mode: OfficeSceneMode;
  building: Building | null;
  discoveredBuildings: Building[];
  activePermits: Permit[];
  buildingPermits: Permit[];
  showMetaPanels: boolean;
  lockDirectory: boolean;
  highlightVane: boolean;
  highlightForm17B: boolean;
  canInspectBuilding: boolean;
}

const isDirectoryVisibleBuilding = (building: Building) =>
  building.isDiscovered &&
  (
    building.npcId !== 'none' ||
    (building.explorationItems?.length ?? 0) > 0 ||
    building.type === 'MINE_ENTRANCE' ||
    building.type === 'HOME' ||
    building.id === 'central_park'
  );

export const deriveOfficeViewModel = (state: GameState): OfficeViewModel => {
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
    showMetaPanels: state.ftuePhase === 'ftue_complete' || state.tutorialStep === 99,
    lockDirectory: shouldLockBureauDirectory(state) && state.activeBuildingId === 'licensing_office',
    highlightVane: shouldHighlightVane(state),
    highlightForm17B: shouldHighlightForm17B(state),
    canInspectBuilding: !!building?.explorationItems?.length,
  };
};
