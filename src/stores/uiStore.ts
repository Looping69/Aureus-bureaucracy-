import { create } from 'zustand';

type BooleanSetterValue = boolean | ((current: boolean) => boolean);

interface UiChromeState {
  showMinePicker: boolean;
  showMarket: boolean;
  showActionLog: boolean;
  showDebugPanel: boolean;
  showUtilityDrawer: boolean;
  showNavigationPanel: boolean;
  showSceneTransitionLoading: boolean;
  tutorialUnreadCount: number;
  setShowMinePicker: (value: BooleanSetterValue) => void;
  setShowMarket: (value: BooleanSetterValue) => void;
  setShowActionLog: (value: BooleanSetterValue) => void;
  setShowDebugPanel: (value: BooleanSetterValue) => void;
  setShowUtilityDrawer: (value: BooleanSetterValue) => void;
  setShowNavigationPanel: (value: BooleanSetterValue) => void;
  setShowSceneTransitionLoading: (value: BooleanSetterValue) => void;
  setTutorialUnreadCount: (value: number | ((current: number) => number)) => void;
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

const resolveBooleanSetter = (value: BooleanSetterValue, current: boolean) =>
  typeof value === 'function' ? value(current) : value;

const resolveNumberSetter = (value: number | ((current: number) => number), current: number) =>
  typeof value === 'function' ? value(current) : value;

export const useUiChromeStore = create<UiChromeState>((set) => ({
  ...initialChromeState,
  setShowMinePicker: (value) => set((state) => ({ showMinePicker: resolveBooleanSetter(value, state.showMinePicker) })),
  setShowMarket: (value) => set((state) => ({ showMarket: resolveBooleanSetter(value, state.showMarket) })),
  setShowActionLog: (value) => set((state) => ({ showActionLog: resolveBooleanSetter(value, state.showActionLog) })),
  setShowDebugPanel: (value) => set((state) => ({ showDebugPanel: resolveBooleanSetter(value, state.showDebugPanel) })),
  setShowUtilityDrawer: (value) => set((state) => ({ showUtilityDrawer: resolveBooleanSetter(value, state.showUtilityDrawer) })),
  setShowNavigationPanel: (value) => set((state) => ({ showNavigationPanel: resolveBooleanSetter(value, state.showNavigationPanel) })),
  setShowSceneTransitionLoading: (value) => set((state) => ({ showSceneTransitionLoading: resolveBooleanSetter(value, state.showSceneTransitionLoading) })),
  setTutorialUnreadCount: (value) => set((state) => ({ tutorialUnreadCount: resolveNumberSetter(value, state.tutorialUnreadCount) })),
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
