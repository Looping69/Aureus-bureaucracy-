import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { completeObjective, isObjectiveComplete, upsertObjective } from '../../game/objectives';
import { BUREAU_BUILDING_ID, getLegacyTutorialStepForFtuePhase } from '../../game/ftue';

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
      const newKnownNpcIds = [...prev.knownNpcIds];
      let newObjectives = [...prev.objectives];
      let newTutorialStep = prev.tutorialStep;
      let newFtuePhase = prev.ftuePhase;

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

              if (b.id === BUREAU_BUILDING_ID && (prev.ftuePhase === 'reach_bureau' || prev.ftuePhase === 'intro')) {
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
                  targetId: BUREAU_BUILDING_ID
                });
                setNotification({ title: 'Bureau Found', msg: 'Good. No wandering now. Get inside the Bureau.' });
              }
            }
          }
        }
      });

      if (!changed) return prev;
      return {
        ...prev,
        buildings: newBuildings,
        knownNpcIds: newKnownNpcIds,
        objectives: newObjectives,
        ftuePhase: newFtuePhase,
        tutorialStep: newTutorialStep
      };
    });
  }, [enabled, state.playerPos, state.activeNPCId, state.permits, state.buildings, setNotification, setState]);
};
