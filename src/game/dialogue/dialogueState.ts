import {
  GameInteractionState,
  GameMeterState,
  GameProgressionState,
  GameResourceState,
  NPC,
} from '../../types';

type DialogueNpcState = Pick<GameProgressionState, 'npcs'>;
type DialogueMeterState = Pick<GameMeterState, 'meters'>;
type DialoguePermitState = Pick<GameProgressionState, 'permits'>;
type DialogueMiniGameState =
  Pick<GameResourceState, 'money'> &
  Pick<GameInteractionState, 'activeMiniGame' | 'activePermitId' | 'pendingPermitAction' | 'activeNPCId'>;

export const patchNpc = (
  state: DialogueNpcState,
  npcId: string,
  patch: Partial<NPC>,
): DialogueNpcState['npcs'] => ({
  ...state.npcs,
  [npcId]: {
    ...state.npcs[npcId],
    ...patch,
  },
});

export const adjustNpcTrust = (
  state: DialogueNpcState,
  npcId: string,
  delta: number,
): DialogueNpcState['npcs'] => ({
  ...state.npcs,
  [npcId]: {
    ...state.npcs[npcId],
    trustLevel: Math.max(0, Math.min(100, state.npcs[npcId].trustLevel + delta)),
  },
});

export const adjustNpcLeverage = (
  state: DialogueNpcState,
  npcId: string,
  delta: number,
): DialogueNpcState['npcs'] => ({
  ...state.npcs,
  [npcId]: {
    ...state.npcs[npcId],
    leverage: Math.max(0, Math.min(100, state.npcs[npcId].leverage + delta)),
  },
});

export const adjustMeters = (
  state: DialogueMeterState,
  patch: Partial<DialogueMeterState['meters']>,
): DialogueMeterState['meters'] => ({
  ...state.meters,
  ...patch,
});

export const unlockPermit = (
  state: DialoguePermitState,
  permitId: string,
): DialoguePermitState['permits'] => ({
  ...state.permits,
  [permitId]: {
    ...state.permits[permitId],
    status: 'AVAILABLE',
  },
});

export const beginDialoguePermitMiniGame = (
  state: DialogueMiniGameState,
  permitId: string,
  cost: number,
): Partial<DialogueMiniGameState> => ({
  money: state.money - cost,
  activeMiniGame: 'FORM_PROCESSING',
  activePermitId: permitId,
  pendingPermitAction: 'DIALOGUE',
  activeNPCId: null,
});
