// Barrel re-exports for hooks/ module.
export { useCameraControls } from './useCameraControls';
export { useFps } from './useFps';

// Game-specific hooks
export {
  useBuildingDiscovery,
  useCityEventLoop,
  useContinuousAnalogMovement,
  useFeedbackCleanup,
  useMovementLoop,
  usePermitProcessingLoop,
  useRescueLoop,
  useTimeAndCurfewLoop,
  useTutorialProgression,
} from './game';
export type { ContinuousAnalogMovementState } from './game';
