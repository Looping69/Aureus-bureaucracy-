// Barrel re-exports for game/actions/ module.
export { queueFeedback, applyDialogueSocialConsequences } from './dialogueActions';
export { applyTakePhoto, applyFoundItem } from './evidenceActions';
export { applyMineTileInteraction, applyMineSceneAction } from './mineActions';
export type { GameNotification } from './mineActions';
export { applyPermitOverlayAction, applyMiniGameCompletion } from './permitActions';
