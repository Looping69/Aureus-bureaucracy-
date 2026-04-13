import { GameState } from '../types';
import { isFtueActive, isFtueHudCompact } from './ftue';

export interface SceneMetaVisibility {
  showProgressGuide: boolean;
  showMetaPanels: boolean;
}

export const shouldShowCompactFtueHud = (state: GameState) => isFtueHudCompact(state);

export const getSceneMetaVisibility = (state: GameState): SceneMetaVisibility => {
  const showMetaPanels = state.ftuePhase === 'ftue_complete' || state.tutorialStep === 99;

  return {
    showProgressGuide: !isFtueActive(state),
    showMetaPanels,
  };
};
