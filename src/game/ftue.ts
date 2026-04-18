import { FtuePhase, GameFtueState, GameInteractionState, GameProgressionState } from '../types';

export const BUREAU_BUILDING_ID = 'licensing_office';
export const BUREAU_NPC_ID = 'licensing';
export const BUREAU_PERMIT_ID = 'extraction-intent';

export const FTUE_PHASE_ORDER: FtuePhase[] = [
  'intro',
  'reach_bureau',
  'enter_bureau',
  'talk_vane',
  'open_form_17b',
  'submit_form_17b',
  'ftue_complete'
];

export const deriveFtuePhaseFromTutorialStep = (tutorialStep: number | undefined): FtuePhase => {
  switch (tutorialStep) {
    case 0:
      return 'intro';
    case 1:
      return 'enter_bureau';
    case 2:
      return 'talk_vane';
    case 3:
      return 'open_form_17b';
    case 4:
      return 'submit_form_17b';
    default:
      return 'ftue_complete';
  }
};

export const getLegacyTutorialStepForFtuePhase = (phase: FtuePhase): number => {
  switch (phase) {
    case 'intro':
      return 0;
    case 'reach_bureau':
    case 'enter_bureau':
      return 1;
    case 'talk_vane':
      return 2;
    case 'open_form_17b':
      return 3;
    case 'submit_form_17b':
      return 4;
    case 'ftue_complete':
    default:
      return 5;
  }
};

export const isFtueActive = (state: Pick<GameFtueState, 'ftuePhase' | 'tutorialStep'>) =>
  state.tutorialStep !== 99 && state.ftuePhase !== 'ftue_complete';

export const isFtueWorldFunnelPhase = (phase: FtuePhase) =>
  phase === 'reach_bureau' || phase === 'enter_bureau';

export const isFtueHudCompact = (
  state: Pick<GameFtueState, 'ftuePhase' | 'tutorialStep'> &
    Pick<GameInteractionState, 'activePermitId' | 'pendingPermitAction'>,
) =>
  state.tutorialStep !== 99 &&
  state.ftuePhase !== 'ftue_complete' &&
  state.activePermitId !== BUREAU_PERMIT_ID &&
  state.pendingPermitAction === null;

export const shouldHighlightVane = (state: Pick<GameFtueState, 'ftuePhase' | 'tutorialStep'>) =>
  state.tutorialStep !== 99 && state.ftuePhase === 'talk_vane';

export const shouldHighlightForm17B = (state: Pick<GameFtueState, 'ftuePhase' | 'tutorialStep'>) =>
  state.tutorialStep !== 99 &&
  (state.ftuePhase === 'open_form_17b' || state.ftuePhase === 'submit_form_17b');

export const hasUnlockedBureauFilings = (
  state: Pick<GameProgressionState, 'permits'>,
) => state.permits[BUREAU_PERMIT_ID]?.status !== 'LOCKED';

export const shouldLockBureauDirectory = (state: Pick<GameFtueState, 'ftuePhase' | 'tutorialStep'>) =>
  state.tutorialStep !== 99 &&
  (state.ftuePhase === 'talk_vane' || state.ftuePhase === 'open_form_17b' || state.ftuePhase === 'submit_form_17b');

export const getFtueStepNumber = (phase: FtuePhase) => {
  const index = FTUE_PHASE_ORDER.indexOf(phase);
  return index === -1 ? FTUE_PHASE_ORDER.length : index + 1;
};

export const getFtueCopy = (phase: FtuePhase) => {
  switch (phase) {
    case 'intro':
      return {
        title: 'No Permit. No Mine.',
        body: 'Start moving now. The Bureau controls whether you dig or starve.',
        hint: 'Begin the run and get to the Bureau.'
      };
    case 'reach_bureau':
      return {
        title: 'Get To The Bureau',
        body: 'Do not drift. Find the Bureau of Extraction and get yourself in front of it.',
        hint: 'The Bureau is east of your house.'
      };
    case 'enter_bureau':
      return {
        title: 'Inside. Now.',
        body: 'You found the Bureau. Tap it and get inside before you lose momentum.',
        hint: 'When you are close enough, entry should happen immediately.'
      };
    case 'talk_vane':
      return {
        title: 'Find Officer Vane',
        body: 'Vane owns the permit path. Talk to him now and force the first filing open.',
        hint: 'He is the only person in the room who matters right now.'
      };
    case 'open_form_17b':
      return {
        title: 'Open Form 17-B',
        body: 'Vane unlocked it. Go straight to Active Filings and open Extraction Intent.',
        hint: 'Do not back out into the directory.'
      };
    case 'submit_form_17b':
      return {
        title: 'File It Now',
        body: 'Submit Form 17-B. You need this filing in motion before anything else matters.',
        hint: 'Use the highlighted filing button.'
      };
    case 'ftue_complete':
    default:
      return {
        title: 'Bureau Loop Complete',
        body: 'The first gate is open. Now the rest of the system can start pushing back.',
        hint: 'Keep pressure on permits, money, and relationships.'
      };
  }
};
