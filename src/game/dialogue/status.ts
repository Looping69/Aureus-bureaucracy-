import { GameState, NPC } from '../../types';
import { getRelationshipReactiveText } from './relationshipState';

export const isNpcAvailableAtTime = (npc: NPC, time: number) => {
  const { start, end } = npc.workHours;
  if (start < end) {
    return time >= start && time < end;
  }
  return time >= start || time < end;
};

export const getNpcMoodInfluence = (npc: NPC, time: number) => {
  const { end } = npc.workHours;
  let hoursToClosing = end - time;
  if (hoursToClosing < 0) hoursToClosing += 24;

  if (hoursToClosing <= 2) {
    if (npc.moodShiftType === 'GRUMPY') return -0.5;
    if (npc.moodShiftType === 'HAPPY') return 0.5;
  }
  return 0;
};

/**
 * Get the NPC's default greeting text.
 * If the player's alignment triggers a reactive response, that text
 * overrides the generic greeting (micro-conflict loop, Step 4).
 */
export const getDefaultDialogueText = (npc: NPC, state?: GameState) => {
  // Check for relationship-reactive text first (micro-conflict loops)
  if (state) {
    const reactiveText = getRelationshipReactiveText(npc, state);
    if (reactiveText) return reactiveText;
  }

  if (npc.id === 'journalist') return '"Information is power. The only question is who holds it. What have you got?"';
  if (npc.id === 'fixer') return '"Everything is a transaction. The question is whether you\'re paying now or later."';
  if (npc.id === 'chief') return '"People matter more than systems, stranger. Remember that."';
  if (npc.id === 'inspector') return '"Every operation exists because I allow it. Don\'t forget that."';
  if (npc.id === 'licensing') return '"You can do this properly… or you can do it quickly. I process both."';
  return `"The paperwork is complicated. I could make it simpler, but my 'efficiency fee' has gone up since the last audit."`;
};

