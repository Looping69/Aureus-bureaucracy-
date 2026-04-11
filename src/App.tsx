/**
 * @module App
 * Root application component – orchestration and layout only.
 *
 * Responsibilities:
 * - Shows the StartScreen until a game session begins.
 * - Manages UI-only state: startup loading overlay, scene-transition spinner,
 *   action log, debug panel, utility drawer, navigation panel, market overlay,
 *   and the notification toast.
 * - Provides save / load entry points that prepare initial GameState and
 *   render the GameProvider.
 * - Reads game state via useGameState and dispatches actions via
 *   useGameDispatch.  No direct setState game-logic lives here.
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldAlert, X } from 'lucide-react';
import { GameState } from './types';
import { BUILDINGS } from './data';

// ── Game state management ───────────────────────────────────────────────────
import {
  GameProvider,
  useGameState,
  useGameDispatch,
  useNotification,
  useTriggerFeedback,
} from './game/core/GameProvider';
import { buildInitialGameState, hydrateSavedState } from './game/core/GameStore';
import {
  clearSavedGameState,
  hasSavedGameState,
  loadSavedGameState,
} from './game/save';
import {
  getExportExposureIncrease,
  getExportOptions,
  getOreUnitPrice,
  hasExportLicense,
} from './game/economy';

// ── Components ──────────────────────────────────────────────────────────────
import { Header } from './components/Header';
import { DialogueOverlay } from './components/DialogueOverlay';
import { PermitOverlay } from './components/PermitOverlay';
import { FormMiniGame } from './components/FormMiniGame';
import { StartScreen } from './components/StartScreen';
import { LightLoadingOverlay } from './components/LightLoadingOverlay';
import { LoadingScreen } from './components/LoadingScreen';
import { TutorialOverlay } from './components/TutorialOverlay';
import { GameSceneRouter } from './components/GameSceneRouter';
import { ActionLogEntry, ActionLogPanel } from './components/ActionLogPanel';
import { DebugPanel } from './components/DebugPanel';
import { EndingOverlay } from './components/EndingOverlay';
import { MarketOverlay } from './components/MarketOverlay';
import { UtilityDrawer } from './components/UtilityDrawer';
import { SideNavPanel } from './components/SideNavPanel';

import { getBuildingAccessPosition } from './utils/buildingAccess';
import { OperationActionId } from './game/runCycle';
import { canPlayerAct } from './game/staminaRescue';

const NOTIFICATION_AUTO_DISMISS_MS = 2800;
const STARTUP_OVERLAY_HIDE_MS = 180;

type StartupLoadingState = {
  visible: boolean;
  progress: number;
  phase: string;
  awaitingWorldBoot: boolean;
};

// ── Inner game UI (rendered inside GameProvider) ────────────────────────────

function GameUI({
  hasCompletedInitialWorldBoot,
  setHasCompletedInitialWorldBoot,
  startupLoading,
  updateStartupLoading,
  finishStartupLoading,
}: {
  hasCompletedInitialWorldBoot: boolean;
  setHasCompletedInitialWorldBoot: React.Dispatch<React.SetStateAction<boolean>>;
  startupLoading: StartupLoadingState;
  updateStartupLoading: (progress: number, phase: string) => void;
  finishStartupLoading: (phase?: string) => void;
}) {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { notification, setNotification } = useNotification();
  const triggerFeedback = useTriggerFeedback();

  // ── UI-only state ───────────────────────────────────────────────────────
  const [showMinePicker, setShowMinePicker] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [showActionLog, setShowActionLog] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showUtilityDrawer, setShowUtilityDrawer] = useState(false);
  const [showNavigationPanel, setShowNavigationPanel] = useState(false);
  const [stateUpdateCount, setStateUpdateCount] = useState(0);
  const [lastActionName, setLastActionName] = useState('none');
  const [lastActionMs, setLastActionMs] = useState(0);
  const [showSceneTransitionLoading, setShowSceneTransitionLoading] = useState(false);

  const pendingActionRef = useRef<{ name: string; startedAt: number } | null>(null);
  const previousSceneRef = useRef<GameState['currentScene'] | null>(null);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });

  const beginTrackedAction = (name: string) => {
    pendingActionRef.current = { name, startedAt: performance.now() };
  };

  // ── Scene-transition loading overlay ────────────────────────────────────
  useEffect(() => {
    if (!hasCompletedInitialWorldBoot) {
      previousSceneRef.current = state.currentScene;
      return;
    }
    if (previousSceneRef.current === null) {
      previousSceneRef.current = state.currentScene;
      return;
    }
    if (previousSceneRef.current === state.currentScene) return;
    previousSceneRef.current = state.currentScene;
    setShowSceneTransitionLoading(true);
    const timer = window.setTimeout(() => setShowSceneTransitionLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, [hasCompletedInitialWorldBoot, state.currentScene]);

  // ── Notification → action log ────────────────────────────────────────────
  useEffect(() => {
    if (!notification) return;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setActionLog(prev =>
      [
        {
          id: `${Date.now()}-${Math.random()}`,
          timestamp,
          title: notification.title,
          msg: notification.msg,
        },
        ...prev,
      ].slice(0, 40),
    );
  }, [notification]);

  // ── Auto-dismiss notification ────────────────────────────────────────────
  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(() => {
      setNotification(current => {
        if (!current) return null;
        if (
          current.title !== notification.title ||
          current.msg !== notification.msg
        )
          return current;
        return null;
      });
    }, NOTIFICATION_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeout);
  }, [notification, setNotification]);

  // ── Debug: track state update count and last action ─────────────────────
  useEffect(() => {
    setStateUpdateCount(c => c + 1);
    if (!pendingActionRef.current) return;
    const elapsed = performance.now() - pendingActionRef.current.startedAt;
    setLastActionName(pendingActionRef.current.name);
    setLastActionMs(elapsed);
    pendingActionRef.current = null;
  }, [state]);

  // ── Startup loading callbacks ────────────────────────────────────────────
  const handleInitialSceneMounted = useCallback(
    (scene: GameState['currentScene']) => {
      if (!startupLoading.visible) return;
      if (startupLoading.awaitingWorldBoot || scene === 'WORLD') {
        updateStartupLoading(12, 'Preparing voxel renderer...');
        return;
      }
      finishStartupLoading('Scene Ready');
    },
    [
      finishStartupLoading,
      startupLoading.awaitingWorldBoot,
      startupLoading.visible,
      updateStartupLoading,
    ],
  );

  const handleInitialWorldLoadingProgress = useCallback(
    (progress: number, phase: string) => updateStartupLoading(progress, phase),
    [updateStartupLoading],
  );

  const handleInitialWorldReady = useCallback(() => {
    setHasCompletedInitialWorldBoot(true);
    finishStartupLoading();
  }, [finishStartupLoading, setHasCompletedInitialWorldBoot]);

  // ── Pointer / drag tracking ──────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPointerPosRef.current.x;
    const dy = e.clientY - lastPointerPosRef.current.y;
    dragDistanceRef.current += Math.abs(dx) + Math.abs(dy);
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };
  const handleWheel = (_e: React.WheelEvent) => {
    // Wheel handled by 3-D engine controls.
  };

  // ── Action handlers ──────────────────────────────────────────────────────

  const handleMove = (
    pos: { x: number; y: number },
    options?: { ignoreDrag?: boolean },
  ) => {
    if (!canPlayerAct(state)) return;
    if (!options?.ignoreDrag && dragDistanceRef.current > 10) return;
    dispatch({ type: 'MOVE', pos });
  };

  const handleDirectMove = (pos: { x: number; y: number }) => {
    if (!canPlayerAct(state)) return;
    dispatch({ type: 'DIRECT_MOVE', pos });
  };

  const handleRest = () => {
    beginTrackedAction('rest');
    dispatch({ type: 'REST' });
  };

  const handleMine = (tileId: string) => {
    beginTrackedAction(`mine_tile:${tileId}`);
    dispatch({ type: 'MINE_TILE', tileId });
  };

  const handleMineAction = (action: string) => {
    beginTrackedAction(`mine_action:${action}`);
    dispatch({ type: 'MINE_ACTION', action });
  };

  const handleTravel = (mineId: string) => {
    beginTrackedAction(`travel:${mineId}`);
    dispatch({ type: 'TRAVEL', mineId });
    setShowMinePicker(false);
  };

  const openMineScene = () => {
    const discoveredMines = state.mines.filter(m => m.discovered);
    const activeMineIsValid = state.activeMineId
      ? discoveredMines.some(m => m.id === state.activeMineId)
      : false;
    if (activeMineIsValid && state.activeMineId) {
      handleTravel(state.activeMineId);
      return;
    }
    if (discoveredMines.length === 0) {
      setNotification({
        title: 'No Mine Available',
        msg: 'Discover a mine entrance first.',
      });
      return;
    }
    if (discoveredMines.length === 1) {
      handleTravel(discoveredMines[0].id);
      return;
    }
    setShowMinePicker(true);
  };

  const handleDialogueAction = (action: (s: GameState) => Partial<GameState>) => {
    beginTrackedAction('dialogue_action');
    dispatch({ type: 'DIALOGUE_CHOICE', dialogueAction: action });
  };

  const handlePermitAction = (
    id: string,
    action: 'SUBMIT' | 'PAY' | 'FAST_TRACK',
  ) => {
    beginTrackedAction(`permit:${id}:${action}`);
    dispatch({ type: 'SUBMIT_PERMIT', id, action });
  };

  const handleMiniGameComplete = (results: {
    accuracy: number;
    time: number;
  }) => {
    beginTrackedAction('mini_game_complete');
    dispatch({
      type: 'MINI_GAME_COMPLETE',
      accuracy: results.accuracy,
      time: results.time,
    });
  };

  const handleOperationAction = useCallback(
    (actionId: OperationActionId) => {
      beginTrackedAction(`operation:${actionId}`);
      dispatch({ type: 'OPERATION_ACTION', actionId });
    },
    [dispatch],
  );

  const handleTakePhoto = (itemId: string) => {
    beginTrackedAction(`take_photo:${itemId}`);
    dispatch({ type: 'TAKE_PHOTO', itemId });
  };

  const handleFoundItem = (itemId: string) => {
    beginTrackedAction(`found_item:${itemId}`);
    dispatch({ type: 'FOUND_ITEM', itemId });
  };

  const handleTravelTo = (buildingId: string) => {
    dispatch({ type: 'TRAVEL_TO_BUILDING', buildingId });
  };

  const handleOpenWorldScene = () => {
    beginTrackedAction('open_world');
    dispatch({ type: 'OPEN_WORLD_SCENE' });
  };

  const handleOpenMineWorld = () => {
    beginTrackedAction('enter_mine_world:mine_entrance');
    dispatch({ type: 'OPEN_MINE_WORLD' });
  };

  const handleOpenTesting = () => {
    beginTrackedAction('enter_testing');
    dispatch({ type: 'OPEN_TESTING' });
  };

  const handleWorldInteract = (npcId: string, bId: string) => {
    if (!canPlayerAct(state)) return;
    beginTrackedAction(
      `world_interact:${npcId !== 'none' ? `npc:${npcId}` : `building:${bId}`}`,
    );
    dispatch({ type: 'WORLD_INTERACT', npcId, buildingId: bId });
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const activeNPC = useMemo(
    () => (state.activeNPCId ? state.npcs[state.activeNPCId] : null),
    [state.activeNPCId, state.npcs],
  );

  const activePermit = useMemo(
    () => (state.activePermitId ? state.permits[state.activePermitId] : null),
    [state.activePermitId, state.permits],
  );

  const marketSnapshot = useMemo(() => {
    const unitPrice = getOreUnitPrice(state);
    return {
      unitPrice,
      exposureIncrease: getExportExposureIncrease(state),
      payout: state.ore * unitPrice,
      licensed: hasExportLicense(state),
      options: getExportOptions(state, state.ore),
    };
  }, [state]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] flex flex-col max-w-md mx-auto bg-bureau-bg shadow-2xl relative overflow-hidden">
      <Header state={state} onOpenUtilities={() => setShowUtilityDrawer(true)} />

      <GameSceneRouter
        state={state}
        showMinePicker={showMinePicker}
        showDebug={showDebugPanel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onMove={handleMove}
        onDirectMove={handleDirectMove}
        onMine={handleMine}
        onMineAction={handleMineAction}
        onOpenMine={openMineScene}
        onRecenter={() => { /* recenter is self-contained within WorldScene */ }}
        onSelectMine={handleTravel}
        onCloseMinePicker={() => setShowMinePicker(false)}
        onWorldInteract={handleWorldInteract}
        onOpenPlanner={() => dispatch({ type: 'OPEN_PLANNER' })}
        onUpdateBuildings={newBuildings =>
          dispatch({ type: 'UPDATE_BUILDINGS', buildings: newBuildings })
        }
        onClosePlanner={() => dispatch({ type: 'CLOSE_PLANNER' })}
        onReturnMineToWorld={() => dispatch({ type: 'RETURN_MINE_TO_WORLD' })}
        onReturnTestingToWorld={() => dispatch({ type: 'RETURN_TESTING_TO_WORLD' })}
        onCollectMineResource={amount => {
          beginTrackedAction('mine_world_collect');
          dispatch({ type: 'COLLECT_MINE_RESOURCE', amount });
        }}
        onSelectNPC={id => dispatch({ type: 'SELECT_NPC', id })}
        onSelectPermit={id => {
          beginTrackedAction(`select_permit:${id}`);
          dispatch({ type: 'SELECT_PERMIT', id });
        }}
        onFoundItem={handleFoundItem}
        onTakePhoto={handleTakePhoto}
        onExplorationComplete={() => {
          beginTrackedAction('exploration_complete');
          dispatch({ type: 'EXPLORATION_COMPLETE' });
        }}
        onStartExploration={() => {
          beginTrackedAction('exploration_start');
          dispatch({ type: 'EXPLORATION_START' });
        }}
        onTravelTo={handleTravelTo}
        onBackToDirectory={() => {
          beginTrackedAction('back_to_directory');
          dispatch({ type: 'BACK_TO_DIRECTORY' });
        }}
        onOperationAction={handleOperationAction}
        suppressInitialWorldFallback={!hasCompletedInitialWorldBoot}
        showInitialWorldLoadingOverlay={false}
        onInitialWorldReady={handleInitialWorldReady}
        onInitialWorldLoadingProgress={handleInitialWorldLoadingProgress}
        onInitialSceneMounted={handleInitialSceneMounted}
      />

      <LoadingScreen
        visible={startupLoading.visible}
        progress={startupLoading.progress}
        phase={startupLoading.phase}
      />
      <LightLoadingOverlay visible={showSceneTransitionLoading} />

      <TutorialOverlay
        ftuePhase={state.ftuePhase}
        tutorialStep={state.tutorialStep}
        tutorialMinimized={state.tutorialMinimized}
        onToggleMinimized={() => dispatch({ type: 'TOGGLE_TUTORIAL_MINIMIZED' })}
        onClose={() => dispatch({ type: 'CLOSE_TUTORIAL' })}
        onStartJourney={() => dispatch({ type: 'START_JOURNEY' })}
      />

      <SideNavPanel
        state={state}
        isOpen={showNavigationPanel}
        onToggle={() => setShowNavigationPanel(v => !v)}
        onOpenMine={openMineScene}
        onOpenMineWorld={handleOpenMineWorld}
        onOpenWorld={handleOpenWorldScene}
        onOpenOffice={() => {
          beginTrackedAction('open_office');
          dispatch({ type: 'OPEN_OFFICE' });
        }}
        onExport={() => setShowMarket(true)}
      />

      <ActionLogPanel
        entries={actionLog}
        isOpen={showActionLog}
        onToggle={() => setShowActionLog(v => !v)}
        onClear={() => setActionLog([])}
        showToggle={false}
      />

      <DebugPanel
        state={state}
        stateUpdates={stateUpdateCount}
        lastAction={lastActionName}
        lastActionMs={lastActionMs}
        onResetStateCounter={() => setStateUpdateCount(0)}
        isOpen={showDebugPanel}
        onToggle={() => setShowDebugPanel(v => !v)}
        showToggle={false}
      />

      <UtilityDrawer
        isOpen={showUtilityDrawer}
        onClose={() => setShowUtilityDrawer(false)}
        onOpenActionLog={() => {
          setShowActionLog(true);
          setShowUtilityDrawer(false);
        }}
        onOpenDebug={() => {
          setShowDebugPanel(true);
          setShowUtilityDrawer(false);
        }}
        onOpenPlanner={() => {
          dispatch({ type: 'OPEN_PLANNER' });
          setShowUtilityDrawer(false);
        }}
        onOpenTesting={() => {
          handleOpenTesting();
          setShowUtilityDrawer(false);
        }}
      />

      {/* Overlays */}
      <AnimatePresence>
        {activeNPC && (
          <DialogueOverlay
            key="dialogue-overlay"
            npc={activeNPC}
            state={state}
            onClose={() => dispatch({ type: 'CLOSE_DIALOGUE' })}
            onAction={handleDialogueAction}
            triggerFeedback={triggerFeedback}
          />
        )}
        {activePermit && (
          <PermitOverlay
            key="permit-overlay"
            permit={activePermit}
            onAction={handlePermitAction}
            onClose={() => dispatch({ type: 'CLOSE_PERMIT' })}
            tutorialStep={state.tutorialStep}
          />
        )}
        {state.activeMiniGame === 'FORM_PROCESSING' && (
          <FormMiniGame
            key="form-minigame"
            onComplete={handleMiniGameComplete}
            onCancel={() => dispatch({ type: 'CANCEL_MINI_GAME' })}
          />
        )}
        {state.activeEndingId && (
          <EndingOverlay
            endingId={state.activeEndingId}
            onClose={() => dispatch({ type: 'CLOSE_ENDING' })}
          />
        )}
        {showMarket && (
          <MarketOverlay
            key="market-overlay"
            ore={state.ore}
            unitPrice={marketSnapshot.unitPrice}
            payout={marketSnapshot.payout}
            exposureIncrease={marketSnapshot.exposureIncrease}
            licensed={marketSnapshot.licensed}
            options={marketSnapshot.options}
            onClose={() => setShowMarket(false)}
            onSellAll={strategy => {
              beginTrackedAction(`export_ore:${strategy}`);
              dispatch({ type: 'EXPORT_ORE', strategy });
              setShowMarket(false);
            }}
          />
        )}
        {notification && (
          <motion.div
            key="notification-overlay"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-[100] bg-black text-white p-4 rounded-xl shadow-2xl flex gap-3 items-start"
          >
            <ShieldAlert className="text-amber-400 shrink-0" size={20} />
            <div className="flex-1">
              <h4 className="font-bold text-sm">{notification.title}</h4>
              <p className="text-xs opacity-80">{notification.msg}</p>
            </div>
            <button onClick={() => setNotification(null)}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 opacity-5 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  // ── Meta-game state (pre-session) ────────────────────────────────────────
  const [gameStarted, setGameStarted] = useState(false);
  const [initialGameState, setInitialGameState] = useState<GameState | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [savePreview, setSavePreview] = useState<GameState | null>(null);

  // ── Startup loading overlay (UI only) ───────────────────────────────────
  const [startupLoading, setStartupLoading] = useState<StartupLoadingState>({
    visible: false,
    progress: 0,
    phase: 'Opening archive file...',
    awaitingWorldBoot: false,
  });
  const [hasCompletedInitialWorldBoot, setHasCompletedInitialWorldBoot] =
    useState(false);
  const startupDismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = loadSavedGameState();
    setHasSave(hasSavedGameState());
    setSavePreview(saved);
  }, []);

  useEffect(() => {
    return () => {
      if (startupDismissTimerRef.current !== null) {
        window.clearTimeout(startupDismissTimerRef.current);
      }
    };
  }, []);

  const clearStartupDismissTimer = useCallback(() => {
    if (startupDismissTimerRef.current !== null) {
      window.clearTimeout(startupDismissTimerRef.current);
      startupDismissTimerRef.current = null;
    }
  }, []);

  const updateStartupLoading = useCallback(
    (progress: number, phase: string) => {
      setStartupLoading(prev => {
        if (!prev.visible) return prev;
        const nextProgress = Math.max(prev.progress, Math.min(100, Math.round(progress)));
        if (nextProgress === prev.progress && phase === prev.phase) return prev;
        return { ...prev, progress: nextProgress, phase };
      });
    },
    [],
  );

  const finishStartupLoading = useCallback(
    (phase = 'Access Granted') => {
      clearStartupDismissTimer();
      setStartupLoading(prev => {
        if (!prev.visible) return prev;
        return { ...prev, progress: 100, phase, awaitingWorldBoot: false };
      });
      startupDismissTimerRef.current = window.setTimeout(() => {
        setStartupLoading(prev => ({
          ...prev,
          visible: false,
          awaitingWorldBoot: false,
        }));
        startupDismissTimerRef.current = null;
      }, STARTUP_OVERLAY_HIDE_MS);
    },
    [clearStartupDismissTimer],
  );

  const beginStartupLoading = useCallback(
    (awaitingWorldBoot: boolean, phase: string) => {
      clearStartupDismissTimer();
      setStartupLoading({
        visible: true,
        progress: awaitingWorldBoot ? 4 : 12,
        phase,
        awaitingWorldBoot,
      });
    },
    [clearStartupDismissTimer],
  );

  // ── Session start / continue ─────────────────────────────────────────────

  const handleStartNewGame = useCallback(() => {
    clearSavedGameState();
    const freshState = buildInitialGameState();
    beginStartupLoading(true, 'Opening new archive file...');
    setInitialGameState(freshState);
    setHasCompletedInitialWorldBoot(false);
    setHasSave(false);
    setSavePreview(null);
    setGameStarted(true);
  }, [beginStartupLoading]);

  const handleContinueGame = useCallback(() => {
    let saved: GameState | null = null;
    try {
      saved = loadSavedGameState();
    } catch {
      return;
    }
    if (!saved) return;
    const hydratedState = hydrateSavedState(saved);
    const bootingWorld = saved.currentScene === 'WORLD';
    beginStartupLoading(
      bootingWorld,
      bootingWorld ? 'Opening archived world state...' : 'Restoring case file...',
    );
    setHasCompletedInitialWorldBoot(!bootingWorld);
    setInitialGameState(hydratedState);
    setSavePreview(saved);
    setHasSave(true);
    setGameStarted(true);
  }, [beginStartupLoading]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (!gameStarted || !initialGameState) {
    return (
      <StartScreen
        hasSave={hasSave}
        savePreview={savePreview}
        onNewGame={handleStartNewGame}
        onContinue={handleContinueGame}
      />
    );
  }

  return (
    <GameProvider initialState={initialGameState}>
      <GameUI
        hasCompletedInitialWorldBoot={hasCompletedInitialWorldBoot}
        setHasCompletedInitialWorldBoot={setHasCompletedInitialWorldBoot}
        startupLoading={startupLoading}
        updateStartupLoading={updateStartupLoading}
        finishStartupLoading={finishStartupLoading}
      />
    </GameProvider>
  );
}
