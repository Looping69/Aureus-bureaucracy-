// Barrel re-exports for game/core/ module.
export { buildHydratedBuildings, buildInitialGameState, hydrateSavedState } from './GameStore';
export type { GameAction } from './actions';
export { getNotificationForAction } from './effects';
export { applyDirectMoveAction, applyDialogueChoiceAction, gameReducer } from './reducer';
export {
  GameProvider,
  useGameState,
  useGameDispatch,
  useNotification,
  useTriggerFeedback,
} from './GameProvider';
