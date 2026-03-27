import { NPC } from '../../types';

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

export const getDefaultDialogueText = (npc: NPC) => {
  if (npc.id === 'journalist') return '"The public has a right to know. What have you got for me?"';
  if (npc.id === 'fixer') return '"I can turn those scraps into something useful. For a price."';
  return `"Listen, the paperwork for Sector 4 is... complicated. I could make it simpler, but my 'efficiency fee' has gone up since the last audit. What are you offering?"`;
};

