import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Building, DialogueCommand, GameScene, GameState, GameWorldState, RelationshipFeedback, WorldPosition } from './types';
import { BUILDINGS } from './data';

// Components
import { Header } from './components/Header';
import { DialogueOverlay } from './components/DialogueOverlay';
import { PermitOverlay } from './components/PermitOverlay';
import { FormMiniGame } from './components/FormMiniGame';
import { StartScreen } from './components/StartScreen';
import { LightLoadingOverlay } from './components/LightLoadingOverlay';
import { LoadingScreen } from './components/LoadingScreen';
import { TutorialOverlay } from './components/TutorialOverlay';
import { GameSceneRouter } from './components/GameSceneRouter';
import { ActionLogPanel } from './components/ActionLogPanel';
import { DebugPanel } from './components/DebugPanel';
import { EndingOverlay } from './components/EndingOverlay';
import { MarketOverlay } from './components/MarketOverlay';
import { UtilityDrawer } from './components/UtilityDrawer';
import { SideNavPanel } from './components/SideNavPanel';
import { NotificationOverlay } from './components/NotificationOverlay';
import { getBuildingAccessPosition } from './utils/buildingAccess';
import { findPath } from './utils/pathfinding';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from './utils/worldSurface';
import { WORLD_SIZE } from './utils/voxelConstants';
import { applyMineSceneAction, applyMineTileInteraction } from './game/actions/mineActions';
import { applyMiniGameCompletion, applyPermitOverlayAction } from './game/actions/permitActions';
import { applyFoundItem, applyTakePhoto } from './game/actions/evidenceActions';
import { applyDialogueSocialConsequences } from './game/actions/dialogueActions';
import { applyDailyEconomyTick, applyOreExport, getExportExposureIncrease, getExportOptions, getOreUnitPrice, hasExportLicense } from './game/economy';
import { useBuildingDiscovery } from './hooks/game/useBuildingDiscovery';
import { useFeedbackCleanup } from './hooks/game/useFeedbackCleanup';
import { useMovementLoop } from './hooks/game/useMovementLoop';
import { usePermitProcessingLoop } from './hooks/game/usePermitProcessingLoop';
import { useTimeAndCurfewLoop } from './hooks/game/useTimeAndCurfewLoop';
import { useTutorialProgression } from './hooks/game/useTutorialProgression';
import { useCityEventLoop } from './hooks/game/useCityEventLoop';
import { BUREAU_PERMIT_ID } from './game/ftue';
import { getUnlockedEnding } from './game/endings';
import { applyDialogueCommands } from './game/dialogue/dialogueCommands';
import { applyOperationAction } from './game/runCycle';
import { buildHydratedBuildings, buildInitialGameState } from './game/session';
import {
  applyPlannerWorld,
  closeOfficeExploration,
  enterMineWorldScene,
  enterOfficeBuilding,
  enterOfficeDirectory,
  enterOfficeNpc,
  openOfficeExploration,
  returnOfficeToDirectory,
  returnToWorldScene,
} from './game/sceneTransitions';
import {
  addOreToInventory,
  closeEnding,
  closeMiniGame,
  closeNpc,
  closePermit,
  dismissTutorial,
  openPlannerScene,
  selectNpc,
  selectPermit,
  startTutorialJourney,
  toggleTutorialMinimized,
} from './game/uiTransitions';
import {
  applyDirectWorldMove,
  applyMineTravel,
  applyPlannedWorldMove,
  applyRestAction,
} from './game/navigationActions';
import { useAppChrome } from './hooks/app/useAppChrome';
import { useGameSession } from './hooks/app/useGameSession';
import { useNotificationCenter } from './hooks/app/useNotificationCenter';

// --- Main App ---

const getWorldMapBuildings = (buildings: GameWorldState['buildings']) => buildings;

export default function App() {
  const HOME_POS = getBuildingAccessPosition(BUILDINGS.player_home);
  const hydrateBuildings = React.useCallback(buildHydratedBuildings, []);
  const plannerEnabled = import.meta.env.DEV;

  const [state, setState] = useState<GameState>(() => buildInitialGameState());
  const {
    notification,
    pushNotification,
    pushNotifications,
    queueNotification,
    dismissNotification,
    actionLog,
    setActionLog,
    resetNotifications,
  } = useNotificationCenter();
  const {
    showMinePicker,
    setShowMinePicker,
    showMarket,
    setShowMarket,
    showActionLog,
    setShowActionLog,
    showDebugPanel,
    setShowDebugPanel,
    showUtilityDrawer,
    setShowUtilityDrawer,
    showNavigationPanel,
    setShowNavigationPanel,
    resetChrome,
  } = useAppChrome();
  const [stateUpdateCount, setStateUpdateCount] = useState(0);
  const [lastActionName, setLastActionName] = useState('none');
  const [lastActionMs, setLastActionMs] = useState(0);
  const [showSceneTransitionLoading, setShowSceneTransitionLoading] = useState(false);
  const queuedFeedbackRef = useRef<RelationshipFeedback[]>([]);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });
  const pendingActionRef = useRef<{ name: string; startedAt: number } | null>(null);
  const previousSceneRef = useRef<GameScene | null>(null);
  const cachedSurfaceMapRef = useRef<{
    buildings: Record<string, Building>;
    navigationZones: GameState['navigationZones'];
    map: ReturnType<typeof buildWorldSurfaceMap>;
  } | null>(null);
  const resetDebugState = React.useCallback(() => {
    setStateUpdateCount(0);
    setLastActionName('none');
    setLastActionMs(0);
  }, []);
  const {
    gameStarted,
    hasSave,
    savePreview,
    startupLoading,
    hasCompletedInitialWorldBoot,
    handleStartNewGame,
    handleContinueGame,
    handleInitialSceneMounted,
    handleInitialWorldLoadingProgress,
    handleInitialWorldReady,
  } = useGameSession({
    state,
    setState,
    homePos: HOME_POS,
    plannerEnabled,
    hydrateBuildings,
    pushNotification,
    resetUiState: React.useCallback(() => {
      resetNotifications();
      resetChrome();
    }, [resetChrome, resetNotifications]),
    resetDebugState,
  });

  useEffect(() => {
    if (!gameStarted) {
      previousSceneRef.current = null;
      setShowSceneTransitionLoading(false);
      return;
    }

    if (!hasCompletedInitialWorldBoot) {
      previousSceneRef.current = state.currentScene;
      return;
    }

    if (previousSceneRef.current === null) {
      previousSceneRef.current = state.currentScene;
      return;
    }

    if (previousSceneRef.current === state.currentScene) {
      return;
    }

    previousSceneRef.current = state.currentScene;
    setShowSceneTransitionLoading(true);
    const timer = window.setTimeout(() => {
      setShowSceneTransitionLoading(false);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [gameStarted, hasCompletedInitialWorldBoot, state.currentScene]);

  useEffect(() => {
    setStateUpdateCount(c => c + 1);
    if (!pendingActionRef.current) return;
    const elapsed = performance.now() - pendingActionRef.current.startedAt;
    setLastActionName(pendingActionRef.current.name);
    setLastActionMs(elapsed);
    pendingActionRef.current = null;
  }, [state]);

  useEffect(() => {
    if (state.activeEndingId) return;
    const unlocked = getUnlockedEnding(state);
    if (!unlocked) return;

    setState(prev => ({
      ...prev,
      unlockedEndings: [...prev.unlockedEndings, unlocked.id],
      activeEndingId: unlocked.id
    }));
    pushNotification({ title: 'Ending Unlocked', msg: unlocked.title });
  }, [pushNotification, state]);

  const beginTrackedAction = (name: string) => {
    pendingActionRef.current = {
      name,
      startedAt: performance.now()
    };
  };

  useBuildingDiscovery({ state, setState, setNotification: queueNotification, enabled: gameStarted });
  useFeedbackCleanup(setState, gameStarted);
  useTimeAndCurfewLoop({ setState, setNotification: queueNotification, homePos: HOME_POS, enabled: gameStarted });
  usePermitProcessingLoop({ setState, setNotification: queueNotification, enabled: gameStarted });
  useMovementLoop({ setState, setNotification: queueNotification, homePos: HOME_POS, enabled: gameStarted });
  useTutorialProgression(state, setState, queueNotification, gameStarted);
  useCityEventLoop({ setState, setNotification: queueNotification, enabled: gameStarted });

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
    // Wheel interactions are handled by the 3D engine controls.
  };

  const handleMove = (pos: WorldPosition, options?: { ignoreDrag?: boolean }) => {
    if (!options?.ignoreDrag && dragDistanceRef.current > 10) return;
    setState(prev => {
      const path = findPath(
        prev.playerPos,
        pos,
        getWorldMapBuildings(prev.buildings),
        WORLD_SIZE,
        prev.navigationZones
      );
      return applyPlannedWorldMove(prev, pos, path);
    });
  };

  const handleDirectMove = (pos: WorldPosition) => {
    setState(prev => {
      // Reuse cached surface map when buildings haven't changed
      const cached = cachedSurfaceMapRef.current;
      const surfaceMap = cached &&
        cached.buildings === prev.buildings &&
        cached.navigationZones === prev.navigationZones
        ? cached.map
        : buildWorldSurfaceMap(prev.buildings, WORLD_SIZE, prev.navigationZones);
      if (
        !cached ||
        cached.buildings !== prev.buildings ||
        cached.navigationZones !== prev.navigationZones
      ) {
        cachedSurfaceMapRef.current = {
          buildings: prev.buildings,
          navigationZones: prev.navigationZones,
          map: surfaceMap,
        };
      }

      const result = applyDirectWorldMove(prev, pos, surfaceMap);
      pushNotifications(result.notifications);
      return result.nextState;
    });
  };

  const handleRecenter = () => {
    // Recenter is handled by VoxelWorldContainer via recenterTrigger.
  };

  const handleRest = () => {
    beginTrackedAction('rest');
    setState(prev => {
      const restedState = applyRestAction(prev, HOME_POS);
      const daily = applyDailyEconomyTick(restedState);
      if (daily.notification) {
        pushNotification(daily.notification);
      } else {
        pushNotification({ title: 'Rested', msg: "A good night's sleep. You feel ready for more paperwork." });
      }
      return daily.nextState;
    });
  };

  const handleMine = (tileId: string) => {
    beginTrackedAction(`mine_tile:${tileId}`);
    setState(prev => {
      const { nextState, notifications } = applyMineTileInteraction(prev, tileId);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const handleMineAction = (action: string) => {
    beginTrackedAction(`mine_action:${action}`);
    setState(prev => {
      const { nextState, notifications } = applyMineSceneAction(prev, action);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const handleTravel = (mineId: string) => {
    const result = applyMineTravel(state, mineId);
    if (result.kind === 'invalid') return;
    if (result.kind === 'undiscovered' || result.kind === 'too_tired') {
      pushNotification(result.notification);
      return;
    }

    beginTrackedAction(`travel:${mineId}`);
    pushNotification(result.notification);
    setState(result.nextState);
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
      pushNotification({ title: "No Mine Available", msg: "Discover a mine entrance first." });
      return;
    }

    if (discoveredMines.length === 1) {
      handleTravel(discoveredMines[0].id);
      return;
    }

    setShowMinePicker(true);
  };

  const handleDialogueAction = (commands: DialogueCommand[]) => {
    beginTrackedAction('dialogue_action');
    setState(s => {
      queuedFeedbackRef.current = [];
      const newState = applyDialogueCommands(s, commands, queuedFeedbackRef.current);
      const withConsequences = applyDialogueSocialConsequences(s, newState, queuedFeedbackRef.current);
      if (queuedFeedbackRef.current.length === 0) return withConsequences;
      return {
        ...withConsequences,
        feedbacks: [...withConsequences.feedbacks, ...queuedFeedbackRef.current]
      };
    });
  };

  const handlePermitAction = (id: string, action: 'SUBMIT' | 'PAY' | 'FAST_TRACK') => {
    beginTrackedAction(`permit:${id}:${action}`);
    setState(prev => {
      const { nextState, notifications } = applyPermitOverlayAction(prev, id, action);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const handleMiniGameComplete = (results: { accuracy: number; time: number }) => {
    beginTrackedAction('mini_game_complete');
    setState(prev => {
      const { nextState, notifications } = applyMiniGameCompletion(prev, results);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const handleOperationAction = React.useCallback((actionId: Parameters<typeof applyOperationAction>[1]) => {
    beginTrackedAction(`operation:${actionId}`);
    setState((prev) => {
      const result = applyOperationAction(prev, actionId);
      pushNotification(result.notification);
      return result.nextState;
    });
  }, [pushNotification]);

  const handleTakePhoto = (itemId: string) => {
    beginTrackedAction(`take_photo:${itemId}`);
    setState(prev => {
      const { nextState, notifications } = applyTakePhoto(prev, itemId);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const handleFoundItem = (itemId: string) => {
    beginTrackedAction(`found_item:${itemId}`);
    setState(prev => {
      const { nextState, notifications } = applyFoundItem(prev, itemId);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const activeNPC = useMemo(() => 
    state.activeNPCId ? state.npcs[state.activeNPCId] : null, 
    [state.activeNPCId, state.npcs]
  );

  const activePermit = useMemo(() => 
    state.activePermitId ? state.permits[state.activePermitId] : null, 
    [state.activePermitId, state.permits]
  );

  const marketSnapshot = useMemo(() => {
    const unitPrice = getOreUnitPrice(state);
    return {
      unitPrice,
      exposureIncrease: getExportExposureIncrease(state),
      payout: state.ore * unitPrice,
      licensed: hasExportLicense(state),
      options: getExportOptions(state, state.ore)
    };
  }, [state]);

  const isCompactFtueHud = useMemo(
    () =>
      state.tutorialStep !== 99 &&
      state.ftuePhase !== 'ftue_complete' &&
      state.activePermitId !== BUREAU_PERMIT_ID &&
      state.pendingPermitAction === null,
    [state.activePermitId, state.ftuePhase, state.pendingPermitAction, state.tutorialStep]
  );

  if (!gameStarted) {
    return (
      <StartScreen
        hasSave={hasSave}
        savePreview={savePreview}
        onNewGame={handleStartNewGame}
        onContinue={handleContinueGame}
      />
    );
  }

  const handleTravelTo = (buildingId: string) => {
    setState(prev => enterOfficeBuilding(prev, buildingId));
  };

  const handleOpenWorldScene = () => {
    beginTrackedAction('open_world');
    setState(returnToWorldScene);
  };

  const handleOpenMineWorld = () => {
    const mineEntrance = state.buildings.mine_entrance;
    if (!mineEntrance) {
      pushNotification({ title: 'Unavailable', msg: 'No mine entrance found.' });
      return;
    }
    beginTrackedAction('enter_mine_world:mine_entrance');
    setState(s => enterMineWorldScene(s, 'mine_entrance'));
  };

  const handleWorldInteract = (npcId: string, bId: string) => {
    if (npcId !== 'none') {
      beginTrackedAction(`world_interact_npc:${npcId}`);
      setState(s => enterOfficeNpc(s, npcId));
      return;
    }

    const building = state.buildings[bId];
    if (!building) return;

    // Mine entrance → open the 3-D mine world scene
    if (building.type === 'MINE_ENTRANCE') {
      beginTrackedAction(`enter_mine_world:${bId}`);
      setState(s => enterMineWorldScene(s, bId));
      return;
    }

    beginTrackedAction(`world_interact_building:${bId}`);
    setState(s => enterOfficeBuilding(s, bId));
  };

  return (
    <div className="h-[100dvh] flex flex-col max-w-md mx-auto bg-bureau-bg shadow-2xl relative overflow-hidden">
      <Header
        state={state}
        onOpenUtilities={() => setShowUtilityDrawer(true)}
        compactFtueHud={isCompactFtueHud}
      />

      <GameSceneRouter
        state={state}
        showMinePicker={showMinePicker}
        showDebug={showDebugPanel}
        plannerEnabled={plannerEnabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onMove={handleMove}
        onDirectMove={handleDirectMove}
        onMine={handleMine}
        onMineAction={handleMineAction}
        onOpenMine={openMineScene}
        onRest={handleRest}
        onRecenter={handleRecenter}
        onSelectMine={handleTravel}
        onCloseMinePicker={() => setShowMinePicker(false)}
        onWorldInteract={handleWorldInteract}
        onApplyAuthoring={(world) => setState(s => applyPlannerWorld(s, world))}
        onClosePlanner={() => setState(returnToWorldScene)}
        onReturnMineToWorld={() => setState(returnToWorldScene)}
        onCollectMineResource={(amount) => {
          beginTrackedAction('mine_world_collect');
          setState(s => addOreToInventory(s, amount));
        }}
        onSelectNPC={(id) => setState(s => selectNpc(s, id))}
        onSelectPermit={(id) => {
          beginTrackedAction(`select_permit:${id}`);
          setState(s => selectPermit(s, id));
        }}
        onFoundItem={handleFoundItem}
        onTakePhoto={handleTakePhoto}
        onExplorationComplete={() => {
          beginTrackedAction('exploration_complete');
          setState(closeOfficeExploration);
        }}
        onStartExploration={() => {
          beginTrackedAction('exploration_start');
          setState(openOfficeExploration);
        }}
        onTravelTo={handleTravelTo}
        onBackToDirectory={() => {
          beginTrackedAction('back_to_directory');
          setState(returnOfficeToDirectory);
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
        onToggleMinimized={() => setState(toggleTutorialMinimized)}
        onClose={() => setState(dismissTutorial)}
        onStartJourney={() => setState(s => startTutorialJourney(s, 'reach_bureau'))}
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
          setState(enterOfficeDirectory);
        }}
        onExport={() => {
          setShowMarket(true);
        }}
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
          setState(openPlannerScene);
          setShowUtilityDrawer(false);
        }}
        showPlanner={plannerEnabled}
      />

      {/* Overlays */}
      <AnimatePresence>
        {activeNPC && (
          <DialogueOverlay 
            key="dialogue-overlay"
            npc={activeNPC} 
            state={state}
            onClose={() => setState(closeNpc)} 
            onAction={handleDialogueAction}
          />
        )}
        {activePermit && (
          <PermitOverlay 
            key="permit-overlay"
            permit={activePermit} 
            onAction={handlePermitAction}
            onClose={() => setState(closePermit)} 
            tutorialStep={state.tutorialStep}
          />
        )}
        {state.activeMiniGame === 'FORM_PROCESSING' && (
          <FormMiniGame 
            key="form-minigame"
            onComplete={handleMiniGameComplete}
            onCancel={() => setState(closeMiniGame)}
          />
        )}
        {state.activeEndingId && (
          <EndingOverlay
            endingId={state.activeEndingId}
            onClose={() => setState(closeEnding)}
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
            onSellAll={(strategy) => {
              beginTrackedAction(`export_ore:${strategy}`);
              setState(s => {
                const exported = applyOreExport(s, s.ore, strategy);
                if (exported.notification) {
                  pushNotification(exported.notification);
                }
                return exported.nextState;
              });
              setShowMarket(false);
            }}
          />
        )}
      </AnimatePresence>

      <NotificationOverlay notification={notification} onClose={dismissNotification} />

      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 opacity-5 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
