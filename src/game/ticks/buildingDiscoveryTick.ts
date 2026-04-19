import { completeObjective, isObjectiveComplete, upsertObjective } from '../objectives';
import { BUREAU_BUILDING_ID, getLegacyTutorialStepForFtuePhase } from '../ftue';
import { GameState } from '../../types';
import { GameTickNotification } from './types';

export const advanceBuildingDiscoveryTick = (
  state: GameState,
): { nextState: GameState; notifications: GameTickNotification[] } => {
  let changed = false;
  const notifications: GameTickNotification[] = [];
  const newKnownNpcIds = [...state.knownNpcIds];
  let newObjectives = [...state.objectives];
  let newTutorialStep = state.tutorialStep;
  let newFtuePhase = state.ftuePhase;

  const newBuildings = { ...state.buildings };
  Object.values(newBuildings).forEach((building) => {
    if (building.isDiscovered) return;

    const dist = Math.sqrt(
      Math.pow(state.playerPos.x - building.pos.x, 2) +
      Math.pow(state.playerPos.y - building.pos.y, 2),
    );
    if (dist >= 4) return;

    newBuildings[building.id] = { ...building, isDiscovered: true };
    changed = true;

    if (building.npcId !== 'none' && !newKnownNpcIds.includes(building.npcId)) {
      newKnownNpcIds.push(building.npcId);
      notifications.push({
        title: 'New Contact',
        msg: `You discovered the location of ${state.npcs[building.npcId].name}.`,
      });

      if (
        building.id === BUREAU_BUILDING_ID &&
        (state.ftuePhase === 'reach_bureau' || state.ftuePhase === 'intro')
      ) {
        newFtuePhase = 'enter_bureau';
        newTutorialStep = getLegacyTutorialStepForFtuePhase('enter_bureau');
        if (!isObjectiveComplete(newObjectives, 'start')) {
          newObjectives = completeObjective(newObjectives, 'start');
        }
        newObjectives = upsertObjective(newObjectives, {
          id: 'enter-bureau',
          text: 'Get inside the Bureau of Extraction now.',
          isCompleted: false,
          type: 'DISCOVER',
          targetId: BUREAU_BUILDING_ID,
        });
        notifications.push({
          title: 'Bureau Found',
          msg: 'Good. No wandering now. Get inside the Bureau.',
        });
      }
    }
  });

  if (!changed) {
    return { nextState: state, notifications: [] };
  }

  return {
    nextState: {
      ...state,
      buildings: newBuildings,
      knownNpcIds: newKnownNpcIds,
      objectives: newObjectives,
      ftuePhase: newFtuePhase,
      tutorialStep: newTutorialStep,
    },
    notifications,
  };
};
