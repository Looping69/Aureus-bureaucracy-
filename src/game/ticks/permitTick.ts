import { GameState, Permit } from '../../types';
import { REJECTION_REASONS } from '../../data';
import { approvePermit } from '../permitProgression';
import { isWorldEffectActive } from '../dialogue/worldEffects';
import { hasStoryFlag } from '../dialogue/storyFlags';
import { GameTickNotification } from './types';

export interface PermitTickResult {
  nextState: GameState;
  notifications: GameTickNotification[];
}

export const advancePermitProcessingTick = (
  state: GameState,
  random: () => number = Math.random,
): PermitTickResult => {
  const newPermits = { ...state.permits };
  let newMines = state.mines;
  let changed = false;
  const notifications: GameTickNotification[] = [];

  Object.values(newPermits).forEach((permit: Permit) => {
    const quietRouteBonus = hasStoryFlag(state, 'vane_backchannel') || hasStoryFlag(state, 'vox_embargo') ? 0.12 : 0;
    const reformRouteBonus = hasStoryFlag(state, 'reform_alliance') || hasStoryFlag(state, 'inspector_deputized') ? 0.14 : 0;
    const blacklistPenalty = hasStoryFlag(state, 'inspector_blacklist') ? 0.2 : 0;
    const publicPenalty = hasStoryFlag(state, 'vox_exclusive') ? 0.1 : 0;
    const permitTempoGate = 0.9
      - (isWorldEffectActive(state, 'bureauPull') ? 0.18 : 0)
      - quietRouteBonus
      - reformRouteBonus
      + blacklistPenalty
      + publicPenalty;

    if (permit.status === 'PENDING' && random() > Math.min(0.97, Math.max(0.45, permitTempoGate))) {
      const baseChance = 0.6
        + (isWorldEffectActive(state, 'bureauPull') ? 0.18 : 0)
        - (isWorldEffectActive(state, 'mediaHeat') ? 0.12 : 0)
        + (isWorldEffectActive(state, 'communityBacking') ? 0.05 : 0)
        + quietRouteBonus
        + reformRouteBonus
        - blacklistPenalty
        - publicPenalty;
      const accuracyBonus = (permit.accuracy || 0.5) * 0.4;
      const approved = random() < (baseChance + accuracyBonus);

      newPermits[permit.id] = {
        ...permit,
        status: approved ? 'APPROVED' : 'REJECTED',
        rejectionReason: approved ? undefined : REJECTION_REASONS[Math.floor(random() * REJECTION_REASONS.length)],
      };
      changed = true;

      if (approved) {
        const progression = approvePermit(permit.id, newPermits, newMines);
        Object.assign(newPermits, progression.permits);
        newMines = progression.mines;
        progression.notifications.forEach((msg) => {
          notifications.push({ title: 'New Location Discovered', msg });
        });
      }
    }
  });

  if (!changed) {
    return { nextState: state, notifications };
  }

  return {
    nextState: {
      ...state,
      permits: newPermits,
      mines: newMines,
    },
    notifications,
  };
};
