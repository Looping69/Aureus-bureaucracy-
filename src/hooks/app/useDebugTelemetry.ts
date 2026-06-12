import { useDebugTelemetryStore } from '../../stores/uiStore';

export const useDebugTelemetry = () => {
  const stateUpdateCount = useDebugTelemetryStore((state) => state.stateUpdateCount);
  const lastActionName = useDebugTelemetryStore((state) => state.lastActionName);
  const lastActionMs = useDebugTelemetryStore((state) => state.lastActionMs);
  const incrementStateUpdateCount = useDebugTelemetryStore((state) => state.incrementStateUpdateCount);
  const recordActionTiming = useDebugTelemetryStore((state) => state.recordActionTiming);
  const resetDebugTelemetry = useDebugTelemetryStore((state) => state.resetDebugTelemetry);

  return {
    stateUpdateCount,
    lastActionName,
    lastActionMs,
    incrementStateUpdateCount,
    recordActionTiming,
    resetDebugTelemetry,
  };
};
