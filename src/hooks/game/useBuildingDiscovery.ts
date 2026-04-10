import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { completeObjective, isObjectiveComplete, upsertObjective } from '../../game/objectives';

interface UseBuildingDiscoveryArgs {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  enabled?: boolean;
}

export const useBuildingDiscovery = ({ state, setState, setNotification, enabled = true }: UseBuildingDiscoveryArgs) => {
  useEffect(() => {
    if (!enabled) return;
    setState(prev => {
      let changed = false;
      let autoEnterBureau = false;
      const newKnownNpcIds = [...prev.knownNpcIds];
      let newObjectives = [...prev.objectives];
      let newTutorialStep = prev.tutorialStep;

      const newBuildings = { ...prev.buildings };
      Object.values(newBuildings).forEach(b => {
        if (!b.isDiscovered) {
          const dist = Math.sqrt(Math.pow(prev.playerPos.x - b.pos.x, 2) + Math.pow(prev.playerPos.y - b.pos.y, 2));
          if (dist < 4) {
            newBuildings[b.id] = { ...b, isDiscovered: true };
            changed = true;
            if (b.npcId !== 'none' && !newKnownNpcIds.includes(b.npcId)) {
              newKnownNpcIds.push(b.npcId);
              setNotification({ title: 'New Contact', msg: `You discovered the location of ${prev.npcs[b.npcId].name}.` });

              if (b.id === 'licensing_office' && prev.tutorialStep === 0) {
                // Auto-enter the Bureau immediately on discovery — no prompt,
                // no hesitation window.  Collapses the first interaction into
                // a single seamless moment: approach → enter.
                newTutorialStep = 1;
                if (!isObjectiveComplete(newObjectives, 'start')) {
                  newObjectives = completeObjective(newObjectives, 'start');
                }
                newObjectives = upsertObjective(newObjectives, {
                  id: 'enter-bureau',
                  text: 'Enter the Bureau of Extraction.',
                  isCompleted: true,
                  type: 'DISCOVER',
                  targetId: 'licensing_office'
                });
                // Signal auto-entry – the rest of the state update below
                // will transition the player directly into the office scene.
                autoEnterBureau = true;
              }
            }
          }
        }
      });

      if (!changed) return prev;

      const nextState: GameState = {
        ...prev,
        buildings: newBuildings,
        knownNpcIds: newKnownNpcIds,
        objectives: newObjectives,
        tutorialStep: newTutorialStep,
      };

      // Auto-enter the Bureau: transition directly into the OFFICE scene so
      // the player never sees a prompt or has a chance to wander.
      if (autoEnterBureau) {
        const bureau = newBuildings['licensing_office'];
        return {
          ...nextState,
          activeBuildingId: 'licensing_office',
          currentScene: 'OFFICE' as const,
          explorationActive: !!(bureau.explorationItems && bureau.explorationItems.length > 0),
        };
      }

      return nextState;
    });
  }, [enabled, state.playerPos, state.activeNPCId, state.permits, state.buildings, setNotification, setState]);
};
