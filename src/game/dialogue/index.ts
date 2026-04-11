// Barrel re-exports for game/dialogue/ module.
export {
  deriveRelationshipState,
  refreshAllRelationshipStates,
  detectRelationshipStateChanges,
  buildRelationshipChangeNotification,
  getRelationshipReactiveText,
} from './relationshipState';
export type { RelationshipStateChange } from './relationshipState';

export { buildSpecialDialogueOptions } from './specialOptions';
export type { SpecialDialogueOption } from './specialOptions';

export {
  isNpcAvailableAtTime,
  getNpcMoodInfluence,
  getDefaultDialogueText,
} from './status';

export {
  hasStoryFlag,
  addStoryFlag,
  addStoryFlags,
  getPoliticalPosition,
  getClosedRouteWarnings,
  getRunLedger,
} from './storyFlags';
export type { StoryStatusItem, RunLedgerItem } from './storyFlags';

export {
  EMPTY_WORLD_EFFECTS,
  WORLD_EFFECTS,
  getWorldHour,
  getWorldEffectRemainingHours,
  isWorldEffectActive,
  extendWorldEffect,
  getActiveWorldEffects,
} from './worldEffects';
