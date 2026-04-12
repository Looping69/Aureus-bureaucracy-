import {
  GameInteractionState,
  GameNarrativeState,
  GameProgressionState,
  RelationshipFeedback,
} from '../../types';

type DialogueConsequenceState =
  Pick<GameInteractionState, 'activeNPCId'> &
  Pick<GameProgressionState, 'npcs'> &
  Pick<GameNarrativeState, 'feedbacks'>;

const makeFeedback = (
  npcId: string,
  amount: number,
  type: 'TRUST' | 'LEVERAGE'
): RelationshipFeedback | null => {
  if (amount === 0) return null;
  return {
    id: `fb-${Date.now()}-${Math.random()}`,
    npcId,
    amount,
    type,
    timestamp: Date.now()
  };
};

export const queueFeedback = (
  queue: RelationshipFeedback[],
  npcId: string,
  amount: number,
  type: 'TRUST' | 'LEVERAGE'
) => {
  const feedback = makeFeedback(npcId, amount, type);
  if (!feedback) return;
  queue.push(feedback);
};

export const applyDialogueSocialConsequences = (
  oldState: DialogueConsequenceState,
  nextState: DialogueConsequenceState,
  queue: RelationshipFeedback[]
): DialogueConsequenceState => {
  if (!oldState.activeNPCId) return nextState;

  const activeNpcId = oldState.activeNPCId;
  const beforeNpc = oldState.npcs[activeNpcId];
  const afterNpc = nextState.npcs[activeNpcId];
  if (!beforeNpc || !afterNpc) return nextState;

  if (afterNpc.trustLevel <= beforeNpc.trustLevel) return nextState;

  const gain = afterNpc.trustLevel - beforeNpc.trustLevel;
  const updatedNpcs = { ...nextState.npcs };

  for (const rivalId of beforeNpc.rivals) {
    const rival = updatedNpcs[rivalId];
    if (!rival) continue;
    const delta = -gain * 0.5;
    updatedNpcs[rivalId] = {
      ...rival,
      trustLevel: Math.max(0, rival.trustLevel + delta)
    };
    queueFeedback(queue, rivalId, delta, 'TRUST');
  }

  for (const allyId of beforeNpc.allies) {
    const ally = updatedNpcs[allyId];
    if (!ally) continue;
    const delta = gain * 0.3;
    updatedNpcs[allyId] = {
      ...ally,
      trustLevel: Math.min(100, ally.trustLevel + delta)
    };
    queueFeedback(queue, allyId, delta, 'TRUST');
  }

  return {
    ...nextState,
    npcs: updatedNpcs
  };
};
