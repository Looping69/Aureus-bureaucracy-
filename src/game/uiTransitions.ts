import {
  GameFtueState,
  GameInteractionState,
  GameResourceState,
  GameState,
  FtuePhase,
} from '../types';
import { getLegacyTutorialStepForFtuePhase } from './ftue';

export const openPlannerScene = (state: GameState): GameState => ({
  ...state,
  currentScene: 'CITY_PLANNER',
});

export const selectNpc = (state: GameState, npcId: string): GameState => ({
  ...state,
  activeNPCId: npcId,
});

export const closeNpc = (state: GameState): GameState => ({
  ...state,
  activeNPCId: null,
});

export const selectPermit = (
  state: GameState,
  permitId: string,
): GameState => ({
  ...state,
  activePermitId: permitId,
});

export const closePermit = (state: GameState): GameState => ({
  ...state,
  activePermitId: null,
});

export const addOreToInventory = (
  state: GameState,
  amount: number,
): GameState => ({
  ...state,
  ore: state.ore + amount,
});

export const closeMiniGame = (state: GameState): GameState => ({
  ...state,
  activeMiniGame: null,
});

export const closeEnding = (state: GameState): GameState => ({
  ...state,
  activeEndingId: null,
});

export const toggleTutorialMinimized = (
  state: GameState,
): GameState => ({
  ...state,
  tutorialMinimized: !state.tutorialMinimized,
});

export const dismissTutorial = (
  state: GameState,
): GameState => ({
  ...state,
  tutorialStep: 99,
});

export const startTutorialJourney = (
  state: GameState,
  nextPhase: FtuePhase = 'reach_bureau',
): GameState => ({
  ...state,
  ftuePhase: nextPhase,
  tutorialStep: getLegacyTutorialStepForFtuePhase(nextPhase),
});
