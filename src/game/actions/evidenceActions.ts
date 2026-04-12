import { OFFICE_ITEMS } from '../../data';
import {
  DirtItem,
  DirtType,
  GameInteractionState,
  GameMeterState,
  GameOfficeState,
  GameProgressionState,
  GameResourceState,
  GameWorldState,
} from '../../types';
import { GameNotification } from './mineActions';
import { applyExhaustionCollapse } from '../exhaustion';

type EvidenceActionState =
  Pick<GameResourceState, 'money' | 'energy' | 'maxEnergy' | 'dirtItems'> &
  Pick<GameMeterState, 'meters'> &
  Pick<GameInteractionState, 'currentScene' | 'activeNPCId' | 'activePermitId' | 'activeBuildingId' | 'activeMiniGame'> &
  Pick<GameOfficeState, 'foundOfficeItemIds' | 'explorationActive'> &
  Pick<GameProgressionState, 'activeMineId'> &
  Pick<GameWorldState, 'buildings' | 'playerPos' | 'targetPos' | 'path' | 'day' | 'time'>;

export const applyTakePhoto = (
  prev: EvidenceActionState,
  itemId: string
): { nextState: EvidenceActionState; notifications: GameNotification[] } => {
  const item = OFFICE_ITEMS[itemId];
  if (!item) return { nextState: prev, notifications: [] };

  if (prev.dirtItems.some(d => d.id === `photo-${itemId}`)) {
    return { nextState: prev, notifications: [] };
  }

  if (prev.energy < 2) {
    return {
      nextState: prev,
      notifications: [{ title: 'Too Tired', msg: 'You need 2 energy to focus the camera.' }]
    };
  }

  const building = prev.activeBuildingId ? prev.buildings[prev.activeBuildingId] : null;
  const targetNpcId = (building?.npcId && building.npcId !== 'none') ? building.npcId : 'licensing';

  let dirtType: DirtType = 'PERMIT_VIOLATION';
  if (item.type === 'DIRT') dirtType = 'BACKROOM_DEAL';
  else if (item.type === 'EVENT') dirtType = 'PERSONAL_SECRET';

  const newDirt: DirtItem = {
    id: `photo-${itemId}`,
    type: dirtType,
    description: `Photo: ${item.name}`,
    targetNpcId,
    value: 15
  };

  const exhaustedResult = applyExhaustionCollapse({
    ...prev,
    energy: prev.energy - 2,
    dirtItems: [...prev.dirtItems, newDirt],
    meters: { ...prev.meters, exposure: Math.min(100, prev.meters.exposure + 2) }
  });

  return prev.energy - 2 <= 0 ? {
    nextState: exhaustedResult.nextState,
    notifications: [
      { title: 'Evidence Secured', msg: 'Photo added to leverage.' },
      exhaustedResult.notification
    ]
  } : {
    nextState: {
      ...prev,
      energy: prev.energy - 2,
      dirtItems: [...prev.dirtItems, newDirt],
      meters: { ...prev.meters, exposure: Math.min(100, prev.meters.exposure + 2) }
    },
    notifications: [{ title: 'Evidence Secured', msg: 'Photo added to leverage.' }]
  };
};

export const applyFoundItem = (
  prev: EvidenceActionState,
  itemId: string
): { nextState: EvidenceActionState; notifications: GameNotification[] } => {
  const item = OFFICE_ITEMS[itemId];
  if (!item) return { nextState: prev, notifications: [] };
  if (prev.foundOfficeItemIds.includes(itemId)) return { nextState: prev, notifications: [] };

  let nextState: EvidenceActionState = {
    ...prev,
    foundOfficeItemIds: [...prev.foundOfficeItemIds, itemId]
  };
  const notifications: GameNotification[] = [];

  if (item.type === 'DIRT') {
    const dirtId = `dirt-${itemId}-${Date.now()}`;
    nextState = {
      ...nextState,
      dirtItems: [...nextState.dirtItems, {
        id: dirtId,
        type: 'PERMIT_VIOLATION',
        description: item.description,
        targetNpcId: prev.activeNPCId || 'licensing',
        value: 15
      }]
    };
    notifications.push({ title: 'Evidence Collected', msg: `You found dirt: ${item.name}` });
  } else if (item.type === 'CLUE') {
    notifications.push({ title: 'Clue Discovered', msg: item.name });
  }

  return { nextState, notifications };
};
