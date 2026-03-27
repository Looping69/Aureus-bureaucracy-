import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { completeObjective, isObjectiveComplete, upsertObjective } from '../../game/objectives';

export const useTutorialProgression = (
  state: GameState,
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;
    setState(prev => {
      let changed = false;
      let nextTutorialStep = prev.tutorialStep;
      let nextObjectives = prev.objectives;

      if (prev.tutorialStep === 1 && prev.currentScene === 'OFFICE') {
        nextTutorialStep = 2;
        nextObjectives = completeObjective(nextObjectives, 'enter-bureau');
        nextObjectives = upsertObjective(nextObjectives, {
          id: 'talk-vane',
          text: 'Talk to Officer Vane.',
          isCompleted: false,
          type: 'TALK',
          targetId: 'licensing'
        });
        changed = true;
      }

      if (prev.tutorialStep === 2 && prev.activeNPCId === 'licensing' && !isObjectiveComplete(nextObjectives, 'talk-vane')) {
        nextObjectives = completeObjective(nextObjectives, 'talk-vane');
        changed = true;
      }

      if (prev.tutorialStep === 3) {
        const withPermitObjective = upsertObjective(nextObjectives, {
          id: 'file-17b',
          text: 'Submit Extraction Intent (Form 17-B).',
          isCompleted: false,
          type: 'PERMIT',
          targetId: 'extraction-intent'
        });
        if (withPermitObjective !== nextObjectives) {
          nextObjectives = withPermitObjective;
          changed = true;
        }
      }

      if (prev.tutorialStep === 3 && prev.activePermitId === 'extraction-intent') {
        nextTutorialStep = 4;
        changed = true;
      }

      if (prev.tutorialStep === 4 && prev.pendingPermitAction === 'SUBMIT') {
        nextTutorialStep = 5;
        if (!isObjectiveComplete(nextObjectives, 'file-17b')) {
          nextObjectives = completeObjective(nextObjectives, 'file-17b');
        }
        changed = true;
      }

      if (!changed) return prev;

      return {
        ...prev,
        tutorialStep: nextTutorialStep,
        objectives: nextObjectives
      };
    });
  }, [enabled, state.tutorialStep, state.currentScene, state.activeNPCId, state.activePermitId, state.pendingPermitAction, setState]);
};
