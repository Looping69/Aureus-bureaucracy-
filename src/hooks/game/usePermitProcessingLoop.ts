import { useEffect } from 'react';
import React from 'react';
import { GameState, Permit } from '../../types';
import { REJECTION_REASONS } from '../../data';
import { applyPermitApproval } from '../../game/permitProgression';
import { isWorldEffectActive } from '../../game/dialogue/worldEffects';
import { hasStoryFlag } from '../../game/dialogue/storyFlags';

interface UsePermitProcessingLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  enabled?: boolean;
}

export const usePermitProcessingLoop = ({ setState, setNotification, enabled = true }: UsePermitProcessingLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setState(prev => {
        const newPermits = { ...prev.permits };
        let newMines = prev.mines;
        let changed = false;

        Object.values(newPermits).forEach((p: Permit) => {
          const quietRouteBonus = hasStoryFlag(prev, 'vane_backchannel') || hasStoryFlag(prev, 'vox_embargo') ? 0.12 : 0;
          const reformRouteBonus = hasStoryFlag(prev, 'reform_alliance') || hasStoryFlag(prev, 'inspector_deputized') ? 0.14 : 0;
          const blacklistPenalty = hasStoryFlag(prev, 'inspector_blacklist') ? 0.2 : 0;
          const publicPenalty = hasStoryFlag(prev, 'vox_exclusive') ? 0.1 : 0;
          const permitTempoGate = 0.9
            - (isWorldEffectActive(prev, 'bureauPull') ? 0.18 : 0)
            - quietRouteBonus
            - reformRouteBonus
            + blacklistPenalty
            + publicPenalty;

          if (p.status === 'PENDING' && Math.random() > Math.min(0.97, Math.max(0.45, permitTempoGate))) {
            const baseChance = 0.6
              + (isWorldEffectActive(prev, 'bureauPull') ? 0.18 : 0)
              - (isWorldEffectActive(prev, 'mediaHeat') ? 0.12 : 0)
              + (isWorldEffectActive(prev, 'communityBacking') ? 0.05 : 0)
              + quietRouteBonus
              + reformRouteBonus
              - blacklistPenalty
              - publicPenalty;
            const accuracyBonus = (p.accuracy || 0.5) * 0.4;
            const approved = Math.random() < (baseChance + accuracyBonus);

            newPermits[p.id] = {
              ...p,
              status: approved ? 'APPROVED' : 'REJECTED',
              rejectionReason: approved ? undefined : REJECTION_REASONS[Math.floor(Math.random() * REJECTION_REASONS.length)]
            };
            changed = true;

            if (approved) {
              const progression = applyPermitApproval(p.id, newPermits, newMines);
              Object.assign(newPermits, progression.permits);
              newMines = progression.mines;
              if (progression.notifications.length > 0) {
                setNotification({ title: 'New Location Discovered', msg: progression.notifications[0] });
              }
            }
          }
        });

        if (changed) return { ...prev, permits: newPermits, mines: newMines };
        return prev;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [enabled, setNotification, setState]);
};
