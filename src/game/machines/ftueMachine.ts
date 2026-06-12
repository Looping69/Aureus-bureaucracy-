import { createMachine } from 'xstate';
import { FtuePhase, GameState } from '../../types';
import { BUREAU_PERMIT_ID, getLegacyTutorialStepForFtuePhase } from '../ftue';

export type FtueMachineEvent =
  | { type: 'START' }
  | { type: 'ENTER_BUREAU' }
  | { type: 'TALK_VANE' }
  | { type: 'OPEN_FORM_17B' }
  | { type: 'SUBMIT_FORM_17B' }
  | { type: 'COMPLETE' }
  | { type: 'DISMISS' };

export const ftueMachine = createMachine({
  id: 'ftue',
  initial: 'intro',
  states: {
    intro: { on: { START: 'reach_bureau', DISMISS: 'ftue_complete' } },
    reach_bureau: { on: { ENTER_BUREAU: 'enter_bureau', DISMISS: 'ftue_complete' } },
    enter_bureau: { on: { TALK_VANE: 'talk_vane', DISMISS: 'ftue_complete' } },
    talk_vane: { on: { OPEN_FORM_17B: 'open_form_17b', DISMISS: 'ftue_complete' } },
    open_form_17b: { on: { SUBMIT_FORM_17B: 'submit_form_17b', DISMISS: 'ftue_complete' } },
    submit_form_17b: { on: { COMPLETE: 'ftue_complete', DISMISS: 'ftue_complete' } },
    ftue_complete: {},
  },
});

const ftueTransitions: Record<FtuePhase, Partial<Record<FtueMachineEvent['type'], FtuePhase>>> = {
  intro: { START: 'reach_bureau', DISMISS: 'ftue_complete' },
  reach_bureau: { ENTER_BUREAU: 'enter_bureau', DISMISS: 'ftue_complete' },
  enter_bureau: { TALK_VANE: 'talk_vane', DISMISS: 'ftue_complete' },
  talk_vane: { OPEN_FORM_17B: 'open_form_17b', DISMISS: 'ftue_complete' },
  open_form_17b: { SUBMIT_FORM_17B: 'submit_form_17b', DISMISS: 'ftue_complete' },
  submit_form_17b: { COMPLETE: 'ftue_complete', DISMISS: 'ftue_complete' },
  ftue_complete: {},
};

export const transitionFtuePhase = (
  phase: FtuePhase,
  eventType: FtueMachineEvent['type'],
): FtuePhase | null => ftueTransitions[phase][eventType] ?? null;

export const applyFtuePhase = (
  state: GameState,
  phase: FtuePhase,
): GameState => ({
  ...state,
  ftuePhase: phase,
  tutorialStep: phase === 'ftue_complete' && state.tutorialStep === 99
    ? 99
    : getLegacyTutorialStepForFtuePhase(phase),
});

export const hasValidFormProcessingContext = (state: GameState): boolean =>
  state.activeMiniGame !== 'FORM_PROCESSING' ||
  (state.activePermitId !== null && state.pendingPermitAction !== null && !!state.permits[state.activePermitId]);

export const normalizeFtueFormState = (state: GameState): GameState => {
  if (!hasValidFormProcessingContext(state)) {
    return {
      ...state,
      activeMiniGame: null,
      pendingPermitAction: null,
    };
  }

  if (
    state.ftuePhase === 'submit_form_17b' &&
    state.activeMiniGame === 'FORM_PROCESSING' &&
    state.activePermitId !== BUREAU_PERMIT_ID
  ) {
    return applyFtuePhase(state, 'open_form_17b');
  }

  return state;
};
