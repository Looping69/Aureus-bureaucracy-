// Barrel re-exports for game/ module.
// Import from specific sub-modules for smaller bundles,
// or from this barrel for convenience.

// Core state management
export {
  buildHydratedBuildings,
  buildInitialGameState,
  hydrateSavedState,
  getNotificationForAction,
  applyDirectMoveAction,
  applyDialogueChoiceAction,
  gameReducer,
  GameProvider,
  useGameState,
  useGameDispatch,
  useNotification,
  useTriggerFeedback,
} from './core';
export type { GameAction } from './core';

// Economy
export {
  hasExportLicense,
  getOreUnitPrice,
  getExportExposureIncrease,
  getExportOptions,
  applyOreExport,
  applyDailyEconomyTick,
} from './economy';
export type { DailyEconomyResult, ExportStrategy, ExportOptionPreview } from './economy';

// Endings
export {
  ENDINGS,
  getUnlockedEnding,
  getEndingById,
  getEndingForecast,
} from './endings';
export type { EndingDefinition, EndingForecast } from './endings';

// Exhaustion
export { EXHAUSTION_FINE, applyExhaustionCollapse } from './exhaustion';

// FTUE
export {
  BUREAU_BUILDING_ID,
  BUREAU_NPC_ID,
  BUREAU_PERMIT_ID,
  FTUE_PHASE_ORDER,
  deriveFtuePhaseFromTutorialStep,
  getLegacyTutorialStepForFtuePhase,
  isFtueActive,
  isFtueWorldFunnelPhase,
  isFtueHudCompact,
  shouldHighlightVane,
} from './ftue';

// Objectives
export { isObjectiveComplete, completeObjective, upsertObjective } from './objectives';

// Permit progression
export { applyPermitApproval } from './permitProgression';

// Progression guide
export { getProgressGuidance } from './progressionGuide';
export type { ProgressGuidance } from './progressionGuide';

// Run cycle
export {
  getRunCycleSummary,
  getOperationActions,
  applyOperationAction,
} from './runCycle';
export type {
  RunCyclePhaseId,
  OperationActionId,
  RunCyclePhase,
  RunCycleSummary,
  OperationActionDefinition,
  OperationActionResult,
} from './runCycle';

// Save
export { loadSavedGameState, saveGameState, hasSavedGameState, clearSavedGameState } from './save';

// Stamina rescue
export {
  createInitialStaminaState,
  createInitialStaminaPowerUps,
  createInitialMedicalNpcs,
  createInitialEmergencyVehicles,
  createIdleRescueMission,
  isPlayerDowned,
  canPlayerAct,
  applyStaminaDrain,
  applyStaminaRecovery,
  collectNearbyStaminaPowerUps,
} from './staminaRescue';
