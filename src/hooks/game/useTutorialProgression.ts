import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { completeObjective, isObjectiveComplete, upsertObjective } from '../../game/objectives';
import {
  BUREAU_BUILDING_ID,
  BUREAU_NPC_ID,
  BUREAU_PERMIT_ID,
  getLegacyTutorialStepForFtuePhase
} from '../../game/ftue';

export const useTutorialProgression = (
  state: GameState,
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;
    setState(prev => {
      let changed = false;
      let nextTutorialStep = prev.tutorialStep;
      let nextObjectives = prev.objectives;
      let nextFtuePhase = prev.ftuePhase;

      if (
        prev.ftuePhase === 'enter_bureau' &&
        prev.currentScene === 'OFFICE' &&
        prev.activeBuildingId === BUREAU_BUILDING_ID
      ) {
        nextFtuePhase = 'talk_vane';
        nextTutorialStep = getLegacyTutorialStepForFtuePhase('talk_vane');
        nextObjectives = completeObjective(nextObjectives, 'enter-bureau');
        nextObjectives = upsertObjective(nextObjectives, {
          id: 'talk-vane',
          text: 'Talk to Officer Vane now.',
          isCompleted: false,
          type: 'TALK',
          targetId: BUREAU_NPC_ID
        });
        setNotification({ title: 'Inside The Bureau', msg: 'Good. Now pin Vane down and get Form 17-B open.' });
        changed = true;
      }

      if (
        prev.ftuePhase === 'talk_vane' &&
        prev.currentScene === 'OFFICE' &&
        prev.activeBuildingId === BUREAU_BUILDING_ID &&
        prev.activeNPCId === null &&
        prev.activePermitId === null
      ) {
        setNotification({ title: 'Officer Vane', msg: 'No dead air. Vane is up. Start the permit conversation.' });
        return {
          ...prev,
          activeNPCId: BUREAU_NPC_ID,
          ftuePhase: nextFtuePhase,
          tutorialStep: nextTutorialStep,
          objectives: nextObjectives
        };
      }

      if (
        prev.ftuePhase === 'talk_vane' &&
        prev.activeNPCId === BUREAU_NPC_ID &&
        !isObjectiveComplete(nextObjectives, 'talk-vane')
      ) {
        nextObjectives = completeObjective(nextObjectives, 'talk-vane');
        changed = true;
      }

      if (
        prev.ftuePhase === 'talk_vane' &&
        prev.permits[BUREAU_PERMIT_ID]?.status === 'AVAILABLE'
      ) {
        nextFtuePhase = 'open_form_17b';
        nextTutorialStep = getLegacyTutorialStepForFtuePhase('open_form_17b');
        setNotification({ title: 'Form 17-B Unlocked', msg: 'Vane blinked. Good. Open Extraction Intent and file it now.' });
        changed = true;
      }

      if (prev.ftuePhase === 'open_form_17b') {
        const withPermitObjective = upsertObjective(nextObjectives, {
          id: 'file-17b',
          text: 'Open and submit Extraction Intent (Form 17-B).',
          isCompleted: false,
          type: 'PERMIT',
          targetId: BUREAU_PERMIT_ID
        });
        if (withPermitObjective !== nextObjectives) {
          nextObjectives = withPermitObjective;
          changed = true;
        }
      }

      if (prev.ftuePhase === 'open_form_17b' && prev.activePermitId === BUREAU_PERMIT_ID) {
        nextFtuePhase = 'submit_form_17b';
        nextTutorialStep = getLegacyTutorialStepForFtuePhase('submit_form_17b');
        setNotification({ title: 'Form Open', msg: 'No stalling. Submit Form 17-B and get the filing in motion.' });
        changed = true;
      }

      if (
        prev.ftuePhase === 'submit_form_17b' &&
        (prev.pendingPermitAction === 'SUBMIT' || prev.pendingPermitAction === 'FAST_TRACK' || prev.activeMiniGame === 'FORM_PROCESSING')
      ) {
        nextFtuePhase = 'ftue_complete';
        nextTutorialStep = 5;
        if (!isObjectiveComplete(nextObjectives, 'file-17b')) {
          nextObjectives = completeObjective(nextObjectives, 'file-17b');
        }
        setNotification({ title: 'Filing In Motion', msg: 'Good. The first gate is open. Now the rest of the system starts mattering.' });
        changed = true;
      }

      if (!changed) return prev;

      return {
        ...prev,
        ftuePhase: nextFtuePhase,
        tutorialStep: nextTutorialStep,
        objectives: nextObjectives
      };
    });
  }, [
    enabled,
    setNotification,
    setState,
    state.activeBuildingId,
    state.activeMiniGame,
    state.activeNPCId,
    state.activePermitId,
    state.currentScene,
    state.ftuePhase,
    state.pendingPermitAction,
    state.permits
  ]);
};
