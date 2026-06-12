import { create } from 'zustand';

interface UiChromeState {
  showMinePicker: boolean;
  showMarket: boolean;
  showActionLog: boolean;
  showDebugPanel: boolean;
  showUtilityDrawer: boolean;
  showNavigationPanel: boolean;
  showSceneTransitionLoading: boolean;
  tutorialUnreadCount: number;
  setShowMinePicker: (value: boolean) => void;
  setShowMarket: (value: boolean) => void;
  setShowActionLog: (value: boolean) => void;
  setShowDebugPanel: (value: boolean) => void;
  setShowUtilityDrawer: (value: boolean) => void;
  setShowNavigationPanel: (value: boolean) => void;
  setShowSceneTransitionLoading: (value: boolean) => void;
  setTutorialUnreadCount: (value: number) => void;
  resetChrome: () => void;
}

interface DebugTelemetryState {
  stateUpdateCount: number;
  lastActionName: string;
  lastActionMs: number;
  incrementStateUpdateCount: () => void;
  recordActionTiming: (name: string, elapsedMs: number) => void;
  resetDebugTelemetry: () => void;
}

const initialChromeState = {
  showMinePicker: false,
  showMarket: false,
  showActionLog: false,
  showDebugPanel: false,
  showUtilityDrawer: false,
  showNavigationPanel: false,
  showSceneTransitionLoading: false,
  tutorialUnreadCount: 0,
};

export const useUiChromeStore = create<UiChromeState>((set) => ({
  ...initialChromeState,
  setShowMinePicker: (showMinePicker) => set({ showMinePicker }),
  setShowMarket: (showMarket) => set({ showMarket }),
  setShowActionLog: (showActionLog) => set({ showActionLog }),
  setShowDebugPanel: (showDebugPanel) => set({ showDebugPanel }),
  setShowUtilityDrawer: (showUtilityDrawer) => set({ showUtilityDrawer }),
  setShowNavigationPanel: (showNavigationPanel) => set({ showNavigationPanel }),
  setShowSceneTransitionLoading: (showSceneTransitionLoading) => set({ showSceneTransitionLoading }),
  setTutorialUnreadCount: (tutorialUnreadCount) => set({ tutorialUnreadCount }),
  resetChrome: () => set(initialChromeState),
}));

export const useDebugTelemetryStore = create<DebugTelemetryState>((set) => ({
  stateUpdateCount: 0,
  lastActionName: 'none',
  lastActionMs: 0,
  incrementStateUpdateCount: () => set((state) => ({ stateUpdateCount: state.stateUpdateCount + 1 })),
  recordActionTiming: (lastActionName, lastActionMs) => set({ lastActionName, lastActionMs }),
  resetDebugTelemetry: () => set({ stateUpdateCount: 0, lastActionName: 'none', lastActionMs: 0 }),
}));
