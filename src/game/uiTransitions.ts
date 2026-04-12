import {
  GameFtueState,
  GameInteractionState,
  GameResourceState,
} from '../types';
import { FtuePhase, getLegacyTutorialStepForFtuePhase } from './ftue';

type PlannerSceneState = Pick<GameInteractionState, 'currentScene'>;
type NpcSelectionState = Pick<GameInteractionState, 'activeNPCId'>;
type PermitSelectionState = Pick<GameInteractionState, 'activePermitId'>;
type MiniGameState = Pick<GameInteractionState, 'activeMiniGame'>;
type EndingState = Pick<GameInteractionState, 'activeEndingId'>;

export const openPlannerScene = (state: PlannerSceneState): PlannerSceneState => ({
  ...state,
  currentScene: 'CITY_PLANNER',
});

export const selectNpc = (state: NpcSelectionState, npcId: string): NpcSelectionState => ({
  ...state,
  activeNPCId: npcId,
});

export const closeNpc = (state: NpcSelectionState): NpcSelectionState => ({
  ...state,
  activeNPCId: null,
});

export const selectPermit = (
  state: PermitSelectionState,
  permitId: string,
): PermitSelectionState => ({
  ...state,
  activePermitId: permitId,
});

export const closePermit = (state: PermitSelectionState): PermitSelectionState => ({
  ...state,
  activePermitId: null,
});

export const addOreToInventory = (
  state: Pick<GameResourceState, 'ore'>,
  amount: number,
): Pick<GameResourceState, 'ore'> => ({
  ...state,
  ore: state.ore + amount,
});

export const closeMiniGame = (state: MiniGameState): MiniGameState => ({
  ...state,
  activeMiniGame: null,
});

export const closeEnding = (state: EndingState): EndingState => ({
  ...state,
  activeEndingId: null,
});

export const toggleTutorialMinimized = (
  state: Pick<GameFtueState, 'tutorialMinimized'>,
): Pick<GameFtueState, 'tutorialMinimized'> => ({
  ...state,
  tutorialMinimized: !state.tutorialMinimized,
});

export const dismissTutorial = (
  state: Pick<GameFtueState, 'tutorialStep'>,
): Pick<GameFtueState, 'tutorialStep'> => ({
  ...state,
  tutorialStep: 99,
});

export const startTutorialJourney = (
  state: Pick<GameFtueState, 'ftuePhase' | 'tutorialStep'>,
  nextPhase: FtuePhase = 'reach_bureau',
): Pick<GameFtueState, 'ftuePhase' | 'tutorialStep'> => ({
  ...state,
  ftuePhase: nextPhase,
  tutorialStep: getLegacyTutorialStepForFtuePhase(nextPhase),
});
