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
import { SaveArchiveScreen } from './components/SaveArchiveScreen';
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
import { hasUnlockedBureauFilings } from './game/ftue';
import {
  applyDirectWorldMove,
  applyMineTravel,
  applyPlannedWorldMove,
  applyRestAction,
} from './game/navigationActions';
import { useAppChrome } from './hooks/app/useAppChrome';
import { useGameSession } from './hooks/app/useGameSession';
import { useNotificationCenter } from './hooks/app/useNotificationCenter';
import { useRoomSession } from './hooks/app/useRoomSession';
import { useMultiplayerTransport } from './hooks/app/useMultiplayerTransport';
import { shouldShowCompactFtueHud } from './game/shellView';
import { WORLD_PROFILES } from './game/worldProfiles';
import { resolveMultiplayerClientConfig } from './multiplayer/clientConfig';

// --- Main App ---

const getWorldMapBuildings = (buildings: GameWorldState['buildings']) => buildings;

export default function App() {
  const HOME_POS = getBuildingAccessPosition(BUILDINGS.player_home);
  const hydrateBuildings = React.useCallback(buildHydratedBuildings, []);
  const plannerEnabled = import.meta.env.DEV;
  const multiplayerConfig = React.useMemo(() => resolveMultiplayerClientConfig(), []);

  const [state, setState] = useState<GameState>(() => buildInitialGameState());
  const {
    pushNotification,
    pushNotifications,
    queueNotification,
    actionLog,
    setActionLog,
    unreadActionLogCount,
    markAllActionLogRead,
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
  const [tutorialUnreadCount, setTutorialUnreadCount] = useState(0);
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
    isPlannerHomeSession,
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
  const {
    roomSnapshot,
    remotePlayers,
    applyServerRoomState,
    appendRelationshipFeedbacks,
  } = useRoomSession({
    state,
    setState,
    roomId: multiplayerConfig.roomId,
    playerId: multiplayerConfig.playerId,
    displayName: multiplayerConfig.displayName,
  });
  const multiplayerTransport = useMultiplayerTransport({
    enabled: multiplayerConfig.enabled,
    wsUrl: multiplayerConfig.wsUrl,
    roomId: multiplayerConfig.roomId,
    roomSnapshot,
    applyServerRoomState,
    applyRelationshipFeedbacks: appendRelationshipFeedbacks,
    pushNotification,
  });
  const sharedAuthorityLocal = !multiplayerTransport.isConnected || multiplayerTransport.isHost;

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

  useEffect(() => {
    if (!gameStarted) {
      setTutorialUnreadCount(0);
      return;
    }

    if (state.tutorialStep === 99 || state.ftuePhase === 'ftue_complete') {
      setTutorialUnreadCount(0);
      return;
    }

    setTutorialUnreadCount(1);
  }, [gameStarted, state.ftuePhase, state.tutorialStep]);

  useEffect(() => {
    if (!state.tutorialMinimized) {
      setTutorialUnreadCount(0);
    }
  }, [state.tutorialMinimized]);

  useEffect(() => {
    if (showActionLog && unreadActionLogCount > 0) {
      markAllActionLogRead();
    }
  }, [markAllActionLogRead, showActionLog, unreadActionLogCount]);

  const beginTrackedAction = (name: string) => {
    pendingActionRef.current = {
      name,
      startedAt: performance.now()
    };
  };

  useBuildingDiscovery({ state, setState, setNotification: queueNotification, enabled: gameStarted });
  useFeedbackCleanup(setState, gameStarted);
  useTimeAndCurfewLoop({
    setState,
    setNotification: queueNotification,
    homePos: HOME_POS,
    enabled: gameStarted && !multiplayerTransport.isConnected,
  });
  usePermitProcessingLoop({
    setState,
    setNotification: queueNotification,
    enabled: gameStarted && !multiplayerTransport.isConnected,
  });
  useMovementLoop({
    setState,
    setNotification: queueNotification,
    homePos: HOME_POS,
    enabled: gameStarted && !multiplayerTransport.isConnected,
  });
  useTutorialProgression(state, setState, queueNotification, gameStarted);
  useCityEventLoop({
    setState,
    setNotification: queueNotification,
    enabled: gameStarted && !multiplayerTransport.isConnected,
  });

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
    if (multiplayerTransport.isConnected) {
      multiplayerTransport.sendCommand({ type: 'MOVE_TO', destination: pos });
      return;
    }
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
    if (multiplayerTransport.isConnected) {
      multiplayerTransport.sendCommand({ type: 'DIRECT_MOVE', destination: pos });
      return;
    }
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
    if (multiplayerTransport.isConnected) {
      multiplayerTransport.sendCommand({ type: 'MINE_TILE', tileId });
      return;
    }
    setState(prev => {
      const { nextState, notifications } = applyMineTileInteraction(prev, tileId);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const handleMineAction = (action: string) => {
    beginTrackedAction(`mine_action:${action}`);
    if (multiplayerTransport.isConnected) {
      multiplayerTransport.sendCommand({ type: 'MINE_ACTION', actionId: action });
      return;
    }
    setState(prev => {
      const { nextState, notifications } = applyMineSceneAction(prev, action);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const handleTravel = (mineId: string) => {
    if (multiplayerTransport.isConnected) {
      beginTrackedAction(`travel:${mineId}`);
      multiplayerTransport.sendCommand({ type: 'TRAVEL_TO_MINE', mineId });
      setShowMinePicker(false);
      return;
    }
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
    if (multiplayerTransport.isConnected) {
      multiplayerTransport.sendCommand({ type: 'DIALOGUE_ACTION', commands });
      return;
    }
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
    if (multiplayerTransport.isConnected) {
      multiplayerTransport.sendCommand({ type: 'PERMIT_ACTION', permitId: id, action });
      return;
    }
    setState(prev => {
      const { nextState, notifications } = applyPermitOverlayAction(prev, id, action);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const handleMiniGameComplete = (results: { accuracy: number; time: number }) => {
    beginTrackedAction('mini_game_complete');
    if (multiplayerTransport.isConnected) {
      setState((prev) => ({
        ...prev,
        activePermitId: null,
        activeMiniGame: null,
        pendingPermitAction: null,
      }));
      multiplayerTransport.sendCommand({ type: 'COMPLETE_PERMIT_MINIGAME', results });
      return;
    }
    setState(prev => {
      const { nextState, notifications } = applyMiniGameCompletion(prev, results);
      pushNotifications(notifications);
      return nextState;
    });
  };

  const handleOperationAction = React.useCallback((actionId: Parameters<typeof applyOperationAction>[1]) => {
    beginTrackedAction(`operation:${actionId}`);
    if (multiplayerTransport.isConnected) {
      multiplayerTransport.sendCommand({ type: 'OPERATION_ACTION', actionId });
      return;
    }
    setState((prev) => {
      const result = applyOperationAction(prev, actionId);
      pushNotification(result.notification);
      return result.nextState;
    });
  }, [multiplayerTransport, pushNotification]);

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

  const isCompactFtueHud = useMemo(() => shouldShowCompactFtueHud(state), [state]);
  const bureauFilingsUnlocked = useMemo(() => hasUnlockedBureauFilings(state), [state.permits]);

  const handleToggleTutorialOverlay = () => {
    setTutorialUnreadCount(0);
    setState(toggleTutorialMinimized);
  };

  const handleDismissTutorialOverlay = () => {
    setTutorialUnreadCount(0);
    setState(dismissTutorial);
  };

  const handleStartTutorialRun = () => {
    setTutorialUnreadCount(0);
    setState(s => startTutorialJourney(s, 'reach_bureau'));
  };

  const handleToggleStoryLedger = () => {
    setShowActionLog(current => {
      const next = !current;
      if (next) markAllActionLogRead();
      return next;
    });
  };

  if (!gameStarted) {
    if (homeScreenView === 'archive') {
      return (
        <SaveArchiveScreen
          saveSlots={saveSlots}
          onBack={handleBackToStartMenu}
          onLoadSlot={handleLoadSaveSlot}
        />
      );
    }

    return (
      <StartScreen
        hasSave={hasSave}
        worldProfiles={WORLD_PROFILES}
        onStartWorld={handleStartNewGame}
        onContinue={handleOpenArchiveBrowser}
        onOpenPlanner={handleOpenPlannerFromHome}
        showPlannerAccess={plannerEnabled}
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
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#c8d0dc]">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f8fafc_0%,#d7dee8_42%,#b7c0ce_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(15,23,42,0.08))]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full items-center justify-center sm:px-6 sm:py-5">
        <div className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-bureau-bg transform-gpu sm:h-[min(920px,calc(100dvh-2.5rem))] sm:rounded-[34px] sm:border sm:border-black/15 sm:shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),transparent)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-24 bg-[linear-gradient(0deg,rgba(15,23,42,0.08),transparent)]" />

          <div
            className="relative isolate flex h-full flex-col overflow-hidden"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
            }}
          >
            <Header
              state={state}
              onOpenUtilities={() => setShowUtilityDrawer(true)}
              compactFtueHud={isCompactFtueHud}
            />

            <GameSceneRouter
              state={state}
              remotePlayers={remotePlayers}
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
              onClosePlanner={() => {
                if (isPlannerHomeSession) {
                  handleExitPlannerToHome();
                  return;
                }
                setState(returnToWorldScene);
              }}
              onReturnMineToWorld={() => setState(returnToWorldScene)}
              onCollectMineResource={(amount) => {
                beginTrackedAction('mine_world_collect');
                setState(s => addOreToInventory(s, amount));
              }}
              onSelectNPC={(id) => setState(s => selectNpc(s, id))}
              onSelectPermit={(id) => {
                if (!bureauFilingsUnlocked) return;
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
              unreadCount={tutorialUnreadCount}
              onToggleMinimized={handleToggleTutorialOverlay}
              onClose={handleDismissTutorialOverlay}
              onStartJourney={handleStartTutorialRun}
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
              unreadCount={unreadActionLogCount}
              isOpen={showActionLog}
              onToggle={handleToggleStoryLedger}
              onClear={() => setActionLog([])}
              showToggle={false}
            />

            <DebugPanel
              state={state}
              stateUpdates={stateUpdateCount}
              lastAction={lastActionName}
              lastActionMs={lastActionMs}
              multiplayerStatus={multiplayerConfig.enabled ? multiplayerTransport.status : undefined}
              multiplayerRoomId={multiplayerConfig.enabled ? multiplayerConfig.roomId : undefined}
              multiplayerPeerCount={multiplayerTransport.peerCount}
              multiplayerIsHost={multiplayerTransport.isHost}
              onResetStateCounter={() => setStateUpdateCount(0)}
              isOpen={showDebugPanel}
              onToggle={() => setShowDebugPanel(v => !v)}
              showToggle={false}
            />

            <UtilityDrawer
              isOpen={showUtilityDrawer}
              onClose={() => setShowUtilityDrawer(false)}
              onOpenActionLog={() => {
                markAllActionLogRead();
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
              {activePermit && bureauFilingsUnlocked && (
                <PermitOverlay
                  key="permit-overlay"
                  permit={activePermit}
                  onAction={handlePermitAction}
                  onClose={() => setState(closePermit)}
                  tutorialStep={state.tutorialStep}
                />
              )}
              {state.activeMiniGame === 'FORM_PROCESSING' && bureauFilingsUnlocked && (
                <FormMiniGame
                  key="form-minigame"
                  onComplete={handleMiniGameComplete}
                  onCancel={() => {
                    setState(closeMiniGame);
                    if (multiplayerTransport.isConnected) {
                      multiplayerTransport.sendCommand({ type: 'CANCEL_PERMIT_MINIGAME' });
                    }
                  }}
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
                    if (multiplayerTransport.isConnected) {
                      multiplayerTransport.sendCommand({ type: 'EXPORT_ORE', strategy });
                      setShowMarket(false);
                      return;
                    }
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

            <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]">
              <div className="absolute left-[-4rem] top-[18%] h-48 w-48 rounded-full bg-red-500 blur-[120px]" />
              <div className="absolute bottom-[12%] right-[-2.5rem] h-56 w-56 rounded-full bg-blue-500 blur-[120px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
