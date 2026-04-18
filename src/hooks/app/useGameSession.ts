import React from 'react';
import { GameState, GameWorldState, WorldPosition, WorldProfileId } from '../../types';
import { SaveSlotId, getNextSaveSlotId, hasSavedGameState, listSavedGameStates, loadSavedGameState, saveGameState } from '../../game/save';
import { buildInitialGameState, hydrateSavedState as hydrateState } from '../../game/session';
import { NotificationMessage } from './useNotificationCenter';

const STARTUP_OVERLAY_HIDE_MS = 180;

export type StartupLoadingState = {
  visible: boolean;
  progress: number;
  phase: string;
  awaitingWorldBoot: boolean;
};

type SessionMode = 'game' | 'planner-home';
type HomeScreenView = 'start' | 'archive';

type UseGameSessionParams = {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  homePos: WorldPosition;
  plannerEnabled: boolean;
  hydrateBuildings: (savedBuildings?: GameWorldState['buildings']) => GameWorldState['buildings'];
  pushNotification: (notification: NotificationMessage | null) => void;
  resetUiState: () => void;
  resetDebugState: () => void;
};

export const useGameSession = ({
  state,
  setState,
  homePos,
  plannerEnabled,
  hydrateBuildings,
  pushNotification,
  resetUiState,
  resetDebugState,
}: UseGameSessionParams) => {
  const [sessionMode, setSessionMode] = React.useState<SessionMode | null>(null);
  const [homeScreenView, setHomeScreenView] = React.useState<HomeScreenView>('start');
  const [hasSave, setHasSave] = React.useState(false);
  const [saveSlots, setSaveSlots] = React.useState(() => listSavedGameStates());
  const [hasCompletedInitialWorldBoot, setHasCompletedInitialWorldBoot] = React.useState(false);
  const [startupLoading, setStartupLoading] = React.useState<StartupLoadingState>({
    visible: false,
    progress: 0,
    phase: 'Opening archive file...',
    awaitingWorldBoot: false,
  });
  const startupDismissTimerRef = React.useRef<number | null>(null);
  const hasPersistedCurrentSessionRef = React.useRef(false);
  const activeSaveSlotIdRef = React.useRef<SaveSlotId | null>(null);

  const clearStartupDismissTimer = React.useCallback(() => {
    if (startupDismissTimerRef.current !== null) {
      window.clearTimeout(startupDismissTimerRef.current);
      startupDismissTimerRef.current = null;
    }
  }, []);

  const updateStartupLoading = React.useCallback((progress: number, phase: string) => {
    setStartupLoading((prev) => {
      if (!prev.visible) return prev;
      const nextProgress = Math.max(prev.progress, Math.min(100, Math.round(progress)));
      if (nextProgress === prev.progress && phase === prev.phase) return prev;
      return {
        ...prev,
        progress: nextProgress,
        phase,
      };
    });
  }, []);

  const finishStartupLoading = React.useCallback((phase = 'Access Granted') => {
    clearStartupDismissTimer();
    setStartupLoading((prev) => {
      if (!prev.visible) return prev;
      return {
        ...prev,
        progress: 100,
        phase,
        awaitingWorldBoot: false,
      };
    });

    startupDismissTimerRef.current = window.setTimeout(() => {
      setStartupLoading((prev) => ({
        ...prev,
        visible: false,
        awaitingWorldBoot: false,
      }));
      startupDismissTimerRef.current = null;
    }, STARTUP_OVERLAY_HIDE_MS);
  }, [clearStartupDismissTimer]);

  const beginStartupLoading = React.useCallback((awaitingWorldBoot: boolean, phase: string) => {
    clearStartupDismissTimer();
    setStartupLoading({
      visible: true,
      progress: awaitingWorldBoot ? 4 : 12,
      phase,
      awaitingWorldBoot,
    });
  }, [clearStartupDismissTimer]);

  const hydrateSavedState = React.useCallback((saved: GameState) => hydrateState({
    saved,
    homePos,
    plannerEnabled,
    hydrateBuildings,
  }), [homePos, plannerEnabled, hydrateBuildings]);

  const refreshSaveSlots = React.useCallback(() => {
    const nextSaveSlots = listSavedGameStates();
    setSaveSlots(nextSaveSlots);
    setHasSave(nextSaveSlots.some((slot) => slot.state !== null));
  }, []);

  React.useEffect(() => {
    refreshSaveSlots();
  }, [refreshSaveSlots]);

  React.useEffect(() => {
    return () => {
      clearStartupDismissTimer();
    };
  }, [clearStartupDismissTimer]);

  React.useEffect(() => {
    if (sessionMode !== 'game') return;
    const activeSaveSlotId = activeSaveSlotIdRef.current ?? getNextSaveSlotId();
    activeSaveSlotIdRef.current = activeSaveSlotId;

    if (!hasPersistedCurrentSessionRef.current) {
      saveGameState(state, activeSaveSlotId);
      hasPersistedCurrentSessionRef.current = true;
      refreshSaveSlots();
      return;
    }

    const timer = window.setTimeout(() => {
      saveGameState(state, activeSaveSlotId);
      refreshSaveSlots();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [refreshSaveSlots, sessionMode, state]);

  const handleStartNewGame = React.useCallback((worldProfileId: WorldProfileId = 'world-1') => {
    activeSaveSlotIdRef.current = getNextSaveSlotId();
    hasPersistedCurrentSessionRef.current = false;
    beginStartupLoading(true, 'Opening new archive file...');
    setState(buildInitialGameState(worldProfileId));
    setHasCompletedInitialWorldBoot(false);
    setHomeScreenView('start');
    resetUiState();
    resetDebugState();
    setSessionMode('game');
  }, [beginStartupLoading, resetDebugState, resetUiState, setState]);

  const handleOpenArchiveBrowser = React.useCallback(() => {
    if (!hasSavedGameState()) return;
    refreshSaveSlots();
    setHomeScreenView('archive');
  }, [refreshSaveSlots]);

  const handleLoadSaveSlot = React.useCallback((slotId: SaveSlotId) => {
    const saved = loadSavedGameState(slotId);
    if (!saved) {
      pushNotification({ title: 'Load Failed', msg: 'Save data is corrupted. Starting fresh.' });
      return;
    }

    activeSaveSlotIdRef.current = slotId;
    hasPersistedCurrentSessionRef.current = false;
    const bootingWorld = saved.currentScene === 'WORLD';
    beginStartupLoading(bootingWorld, bootingWorld ? 'Opening archived world state...' : 'Restoring case file...');
    setHasCompletedInitialWorldBoot(!bootingWorld);
    setState(hydrateSavedState(saved));
    setHasSave(true);
    setHomeScreenView('start');
    setSessionMode('game');
    pushNotification({ title: 'Save Loaded', msg: 'Resumed your previous session.' });
  }, [beginStartupLoading, hydrateSavedState, pushNotification, setState]);

  const handleBackToStartMenu = React.useCallback(() => {
    setHomeScreenView('start');
  }, []);

  const handleOpenPlannerFromHome = React.useCallback(() => {
    clearStartupDismissTimer();
    hasPersistedCurrentSessionRef.current = false;
    setStartupLoading({
      visible: false,
      progress: 0,
      phase: 'Opening planner...',
      awaitingWorldBoot: false,
    });
    setHasCompletedInitialWorldBoot(true);
    resetUiState();
    resetDebugState();
    setState(() => ({
      ...buildInitialGameState(),
      currentScene: 'CITY_PLANNER',
    }));
    setSessionMode('planner-home');
  }, [clearStartupDismissTimer, resetDebugState, resetUiState, setState]);

  const handleExitPlannerToHome = React.useCallback(() => {
    clearStartupDismissTimer();
    hasPersistedCurrentSessionRef.current = false;
    setStartupLoading({
      visible: false,
      progress: 0,
      phase: 'Opening archive file...',
      awaitingWorldBoot: false,
    });
    setHasCompletedInitialWorldBoot(false);
    setHomeScreenView('start');
    resetUiState();
    resetDebugState();
    setSessionMode(null);
  }, [clearStartupDismissTimer, resetDebugState, resetUiState]);

  const handleInitialSceneMounted = React.useCallback((scene: GameState['currentScene']) => {
    if (!startupLoading.visible) return;

    if (startupLoading.awaitingWorldBoot || scene === 'WORLD') {
      updateStartupLoading(12, 'Preparing voxel renderer...');
      return;
    }

    updateStartupLoading(100, 'Scene Ready');
    finishStartupLoading('Scene Ready');
  }, [finishStartupLoading, startupLoading.awaitingWorldBoot, startupLoading.visible, updateStartupLoading]);

  const handleInitialWorldLoadingProgress = React.useCallback((progress: number, phase: string) => {
    updateStartupLoading(progress, phase);
  }, [updateStartupLoading]);

  const handleInitialWorldReady = React.useCallback(() => {
    setHasCompletedInitialWorldBoot(true);
    finishStartupLoading();
  }, [finishStartupLoading]);

  return {
    gameStarted: sessionMode !== null,
    isPlannerHomeSession: sessionMode === 'planner-home',
    homeScreenView,
    hasSave,
    saveSlots,
    startupLoading,
    hasCompletedInitialWorldBoot,
    handleStartNewGame,
    handleOpenArchiveBrowser,
    handleLoadSaveSlot,
    handleBackToStartMenu,
    handleOpenPlannerFromHome,
    handleExitPlannerToHome,
    handleInitialSceneMounted,
    handleInitialWorldLoadingProgress,
    handleInitialWorldReady,
    setHasCompletedInitialWorldBoot,
  };
};
