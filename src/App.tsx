import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  ShieldAlert,
  X
} from 'lucide-react';
import { GameState, WorldPosition, RelationshipFeedback } from './types';
import { INITIAL_NPCS, INITIAL_PERMITS, INITIAL_MINES, BUILDINGS } from './data';

// Components
import { Header } from './components/Header';
import { DialogueOverlay } from './components/DialogueOverlay';
import { PermitOverlay } from './components/PermitOverlay';
import { FormMiniGame } from './components/FormMiniGame';
import { StartScreen } from './components/StartScreen';
import { TutorialOverlay } from './components/TutorialOverlay';
import { BottomNav } from './components/BottomNav';
import { GameSceneRouter } from './components/GameSceneRouter';
import { ActionLogEntry, ActionLogPanel } from './components/ActionLogPanel';
import { DebugPanel } from './components/DebugPanel';
import { EndingOverlay } from './components/EndingOverlay';
import { getBuildingAccessPosition } from './utils/buildingAccess';
import { findPath } from './utils/pathfinding';
import { applyMineSceneAction, applyMineTileInteraction } from './game/actions/mineActions';
import { applyMiniGameCompletion, applyPermitOverlayAction } from './game/actions/permitActions';
import { applyFoundItem, applyTakePhoto } from './game/actions/evidenceActions';
import { applyDialogueSocialConsequences, queueFeedback } from './game/actions/dialogueActions';
import { applyDailyEconomyTick, applyOreExport } from './game/economy';
import { clearSavedGameState, hasSavedGameState, loadSavedGameState, saveGameState } from './game/save';
import { useBuildingDiscovery } from './hooks/game/useBuildingDiscovery';
import { useFeedbackCleanup } from './hooks/game/useFeedbackCleanup';
import { useMovementLoop } from './hooks/game/useMovementLoop';
import { usePermitProcessingLoop } from './hooks/game/usePermitProcessingLoop';
import { useTimeAndCurfewLoop } from './hooks/game/useTimeAndCurfewLoop';
import { useTutorialProgression } from './hooks/game/useTutorialProgression';
import { useCityEventLoop } from './hooks/game/useCityEventLoop';
import { getUnlockedEnding } from './game/endings';
import { EMPTY_WORLD_EFFECTS } from './game/dialogue/worldEffects';
// --- Main App ---

const NOTIFICATION_AUTO_DISMISS_MS = 2800;

const buildHydratedBuildings = (savedBuildings?: GameState['buildings']): GameState['buildings'] =>
  Object.fromEntries(
    Object.entries(BUILDINGS).map(([id, building]) => [
      id,
      {
        ...building,
        isDiscovered: savedBuildings?.[id]?.isDiscovered ?? building.isDiscovered
      }
    ])
  ) as GameState['buildings'];

const cloneSerializable = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const buildInitialGameState = (): GameState => {
  const homePos = getBuildingAccessPosition(BUILDINGS.player_home);

  return {
    money: 1000,
    ore: 0,
    evidence: 0,
    energy: 100,
    maxEnergy: 100,
    movementSpeed: 1,
    upgrades: [],
    dirtItems: [],
    leverage: [],
    foundOfficeItemIds: [],
    explorationActive: false,
    meters: {
      trust: 50,
      influence: 10,
      exposure: 0
    },
    permits: cloneSerializable(INITIAL_PERMITS),
    npcs: cloneSerializable(INITIAL_NPCS),
    knownNpcIds: ['journalist'],
    objectives: [
      { id: 'start', text: 'Find the Bureau of Extraction (East).', isCompleted: false, type: 'DISCOVER', targetId: 'licensing_office' }
    ],
    mines: cloneSerializable(INITIAL_MINES),
    activeMineId: null,
    currentScene: 'WORLD',
    activeNPCId: null,
    activePermitId: null,
    activeBuildingId: null,
    activeMiniGame: null,
    pendingPermitAction: null,
    buildings: buildHydratedBuildings(),
    day: 1,
    time: 8,
    playerPos: homePos,
    targetPos: null,
    path: [],
    feedbacks: [],
    dialogueCooldowns: {},
    worldEffects: EMPTY_WORLD_EFFECTS,
    storyFlags: [],
    lastCityEventHour: -1,
    unlockedEndings: [],
    activeEndingId: null,
    tutorialStep: 0,
    tutorialMinimized: false,
    camera: {
      x: 0,
      y: 0,
      zoom: 1
    }
  };
};

export default function App() {
  const HOME_POS = getBuildingAccessPosition(BUILDINGS.player_home);
  const hydrateBuildings = React.useCallback(buildHydratedBuildings, []);

  const [state, setState] = useState<GameState>(() => buildInitialGameState());
  const [gameStarted, setGameStarted] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [savePreview, setSavePreview] = useState<GameState | null>(null);

  const [notification, setNotification] = useState<{title: string, msg: string} | null>(null);
  const [showMinePicker, setShowMinePicker] = useState(false);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [showActionLog, setShowActionLog] = useState(false);
  const [stateUpdateCount, setStateUpdateCount] = useState(0);
  const [lastActionName, setLastActionName] = useState('none');
  const [lastActionMs, setLastActionMs] = useState(0);
  const queuedFeedbackRef = useRef<RelationshipFeedback[]>([]);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });
  const pendingActionRef = useRef<{ name: string; startedAt: number } | null>(null);
  const pushNotification = (n: { title: string; msg: string } | null) => {
    if (!n) return;
    setNotification(n);
  };

  const appendActionLog = (title: string, msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActionLog(prev => [
      { id: `${Date.now()}-${Math.random()}`, timestamp, title, msg },
      ...prev
    ].slice(0, 40));
  };

  useEffect(() => {
    const saved = loadSavedGameState();
    setHasSave(hasSavedGameState());
    setSavePreview(saved);
  }, []);

  useEffect(() => {
    if (!gameStarted) return;
    const timer = setTimeout(() => {
      saveGameState(state);
      setHasSave(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [gameStarted, state]);

  useEffect(() => {
    if (!notification) return;
    appendActionLog(notification.title, notification.msg);
  }, [notification]);

  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(() => {
      setNotification(current => {
        if (!current) return null;
        if (current.title !== notification.title || current.msg !== notification.msg) return current;
        return null;
      });
    }, NOTIFICATION_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timeout);
  }, [notification]);

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
    setNotification({ title: 'Ending Unlocked', msg: unlocked.title });
  }, [state]);

  const beginTrackedAction = (name: string) => {
    pendingActionRef.current = {
      name,
      startedAt: performance.now()
    };
  };

  useBuildingDiscovery({ state, setState, setNotification, enabled: gameStarted });
  useFeedbackCleanup(setState, gameStarted);
  useTimeAndCurfewLoop({ setState, setNotification, homePos: HOME_POS, enabled: gameStarted });
  usePermitProcessingLoop({ setState, setNotification, enabled: gameStarted });
  useMovementLoop({ setState, setNotification, homePos: HOME_POS, enabled: gameStarted });
  useTutorialProgression(state, setState, gameStarted);
  useCityEventLoop({ setState, setNotification, enabled: gameStarted });

  const hydrateSavedState = React.useCallback((saved: GameState): GameState => {
    const baseState = buildInitialGameState();
    const saveUsesLegacyLayout =
      saved.buildings?.player_home?.pos.x !== BUILDINGS.player_home.pos.x ||
      saved.buildings?.player_home?.pos.y !== BUILDINGS.player_home.pos.y ||
      Object.keys(saved.buildings ?? {}).some((id) => !(id in BUILDINGS));
    const shouldResetWorldSpawn = saveUsesLegacyLayout || saved.currentScene === 'WORLD';

    return {
      ...baseState,
      ...saved,
      buildings: hydrateBuildings(saved.buildings),
      playerPos: shouldResetWorldSpawn ? HOME_POS : (saved.playerPos ?? baseState.playerPos),
      targetPos: shouldResetWorldSpawn ? null : (saved.targetPos ?? baseState.targetPos),
      path: shouldResetWorldSpawn ? [] : (saved.path ?? baseState.path),
      meters: { ...baseState.meters, ...(saved.meters ?? {}) },
      camera: { ...baseState.camera, ...(saved.camera ?? {}) },
      dialogueCooldowns: saved.dialogueCooldowns ?? {},
      worldEffects: { ...EMPTY_WORLD_EFFECTS, ...(saved.worldEffects ?? {}) },
      storyFlags: saved.storyFlags ?? [],
      lastCityEventHour: saved.lastCityEventHour ?? -1,
      unlockedEndings: saved.unlockedEndings ?? [],
      activeEndingId: saved.activeEndingId ?? null
    };
  }, [HOME_POS, hydrateBuildings]);

  const handleStartNewGame = React.useCallback(() => {
    clearSavedGameState();
    setState(buildInitialGameState());
    setNotification(null);
    setActionLog([]);
    setShowActionLog(false);
    setStateUpdateCount(0);
    setLastActionName('none');
    setLastActionMs(0);
    setShowMinePicker(false);
    setHasSave(false);
    setSavePreview(null);
    setGameStarted(true);
  }, []);

  const handleContinueGame = React.useCallback(() => {
    const saved = loadSavedGameState();
    if (!saved) return;
    setState(hydrateSavedState(saved));
    setSavePreview(saved);
    setHasSave(true);
    setGameStarted(true);
    setNotification({ title: 'Save Loaded', msg: 'Resumed your previous session.' });
  }, [hydrateSavedState]);

  const triggerFeedback = (npcId: string, amount: number, type: 'TRUST' | 'LEVERAGE') => {
    queueFeedback(queuedFeedbackRef.current, npcId, amount, type);
  };

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

  const handleMove = (pos: WorldPosition) => {
    if (dragDistanceRef.current > 10) return;
    setState(prev => {
      if (prev.playerPos.x === pos.x && prev.playerPos.y === pos.y) return prev;
      
      const path = findPath(prev.playerPos, pos, prev.buildings);
      if (path.length > 0) {
        return { ...prev, path, targetPos: pos };
      }

      return prev; // No path found
    });
  };

  const handleRecenter = () => {
    // Recenter is handled by VoxelWorldContainer via recenterTrigger.
  };

  const handleRest = () => {
    beginTrackedAction('rest');
    setState(prev => {
      const restedState: GameState = {
        ...prev,
        energy: prev.maxEnergy,
        day: prev.day + 1,
        time: 6,
        playerPos: HOME_POS
      };
      const daily = applyDailyEconomyTick(restedState);
      if (daily.notification) {
        setNotification(daily.notification);
      } else {
        setNotification({ title: 'Rested', msg: "A good night's sleep. You feel ready for more paperwork." });
      }
      return daily.nextState;
    });
  };

  const handleMine = (tileId: string) => {
    beginTrackedAction(`mine_tile:${tileId}`);
    setState(prev => {
      const { nextState, notifications } = applyMineTileInteraction(prev, tileId);
      pushNotification(notifications[0] ?? null);
      return nextState;
    });
  };

  const handleMineAction = (action: string) => {
    beginTrackedAction(`mine_action:${action}`);
    setState(prev => {
      const { nextState, notifications } = applyMineSceneAction(prev, action);
      pushNotification(notifications[0] ?? null);
      return nextState;
    });
  };

  const handleTravel = (mineId: string) => {
    const mine = state.mines.find(m => m.id === mineId);
    if (!mine) return;

    if (!mine.discovered) {
      setNotification({ title: "Unknown Location", msg: "You haven't discovered this location yet." });
      return;
    }

    const energyCost = mine.travelTime * 5;
    if (state.energy < energyCost) {
      setNotification({ title: "Too Exhausted", msg: `Traveling to ${mine.name} requires ${energyCost} energy.` });
      return;
    }

    beginTrackedAction(`travel:${mineId}`);
    setState(prev => ({
      ...prev,
      currentScene: 'MINE',
      activeMineId: mineId,
      energy: Math.max(0, prev.energy - energyCost),
      time: (prev.time + mine.travelTime) % 24
    }));
    setShowMinePicker(false);

    setNotification({ title: "Travel Complete", msg: `You arrived at ${mine.name} after ${mine.travelTime} hours.` });
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
      setNotification({ title: "No Mine Available", msg: "Discover a mine entrance first." });
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
    setState(s => {
      queuedFeedbackRef.current = [];
      const result = action(s);
      const newState = { ...s, ...result } as GameState;
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
      pushNotification(notifications[0] ?? null);
      return nextState;
    });
  };

  const handleMiniGameComplete = (results: { accuracy: number; time: number }) => {
    beginTrackedAction('mini_game_complete');
    setState(prev => {
      const { nextState, notifications } = applyMiniGameCompletion(prev, results);
      pushNotification(notifications[0] ?? null);
      return nextState;
    });
  };

  const handleTakePhoto = (itemId: string) => {
    beginTrackedAction(`take_photo:${itemId}`);
    setState(prev => {
      const { nextState, notifications } = applyTakePhoto(prev, itemId);
      pushNotification(notifications[0] ?? null);
      return nextState;
    });
  };

  const handleFoundItem = (itemId: string) => {
    beginTrackedAction(`found_item:${itemId}`);
    setState(prev => {
      const { nextState, notifications } = applyFoundItem(prev, itemId);
      pushNotification(notifications[0] ?? null);
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
    const building = state.buildings[buildingId];
    if (!building) return;
    const accessPos = getBuildingAccessPosition(building);

    setState(prev => ({
      ...prev,
      activeBuildingId: buildingId,
      currentScene: 'OFFICE',
      playerPos: accessPos,
      // Ensure exploration is active if it has items and hasn't been fully explored?
      // Or just default to exploration view
      explorationActive: building.explorationItems && building.explorationItems.length > 0
    }));
  };

  const handleWorldInteract = (npcId: string, bId: string) => {
    if (npcId !== 'none') {
      beginTrackedAction(`world_interact_npc:${npcId}`);
      setState(s => ({
        ...s,
        activeNPCId: npcId,
        activeBuildingId: null,
        explorationActive: false,
        currentScene: 'OFFICE'
      }));
      return;
    }

    const building = state.buildings[bId];
    if (!building) return;

    const interactableTypes = ['OFFICE', 'HOME', 'MINE_ENTRANCE', 'PUB', 'HOTLINE'];
    if (!interactableTypes.includes(building.type)) return;

    const hasExploration = !!building.explorationItems && building.explorationItems.length > 0;
    beginTrackedAction(`world_interact_building:${bId}`);
    setState(s => ({
      ...s,
      activeNPCId: null,
      activeBuildingId: bId,
      explorationActive: hasExploration,
      currentScene: 'OFFICE'
    }));
  };

  return (
    <div className="h-[100dvh] flex flex-col max-w-md mx-auto bg-bureau-bg shadow-2xl relative overflow-hidden">
      <Header state={state} />

      <GameSceneRouter
        state={state}
        showMinePicker={showMinePicker}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onMove={handleMove}
        onMine={handleMine}
        onMineAction={handleMineAction}
        onOpenMine={openMineScene}
        onRest={handleRest}
        onRecenter={handleRecenter}
        onTravel={handleTravel}
        onSelectMine={handleTravel}
        onCloseMinePicker={() => setShowMinePicker(false)}
        onWorldInteract={handleWorldInteract}
        onOpenPlanner={() => setState(s => ({ ...s, currentScene: 'CITY_PLANNER' }))}
        onUpdateBuildings={(newBuildings) => setState(s => ({ ...s, buildings: newBuildings, currentScene: 'WORLD' }))}
        onClosePlanner={() => setState(s => ({ ...s, currentScene: 'WORLD' }))}
        onReturnMineToWorld={() => setState(s => ({ ...s, currentScene: 'WORLD' }))}
        onSelectNPC={(id) => setState(s => ({ ...s, activeNPCId: id }))}
        onSelectPermit={(id) => {
          beginTrackedAction(`select_permit:${id}`);
          setState(s => ({ ...s, activePermitId: id }));
        }}
        onFoundItem={handleFoundItem}
        onTakePhoto={handleTakePhoto}
        onExplorationComplete={() => {
          beginTrackedAction('exploration_complete');
          setState(s => ({ ...s, explorationActive: false }));
        }}
        onStartExploration={() => {
          beginTrackedAction('exploration_start');
          setState(s => ({ ...s, explorationActive: true }));
        }}
        onTravelTo={handleTravelTo}
        onBackToDirectory={() => {
          beginTrackedAction('back_to_directory');
          setState(s => ({ ...s, activeBuildingId: null }));
        }}
      />

      <TutorialOverlay
        tutorialStep={state.tutorialStep}
        tutorialMinimized={state.tutorialMinimized}
        onToggleMinimized={() => setState(s => ({ ...s, tutorialMinimized: !s.tutorialMinimized }))}
        onClose={() => setState(s => ({ ...s, tutorialStep: 99 }))}
        onStartJourney={() => setState(s => ({ ...s, tutorialStep: 1 }))}
      />

      <BottomNav
        state={state}
        onOpenMine={openMineScene}
        onOpenWorld={() => setState(s => ({
          ...s,
          currentScene: 'WORLD',
          playerPos: s.activeBuildingId && s.buildings[s.activeBuildingId]
            ? getBuildingAccessPosition(s.buildings[s.activeBuildingId])
            : s.playerPos
        }))}
        onOpenOffice={() => {
          beginTrackedAction('open_office');
          setState(s => ({ ...s, currentScene: 'OFFICE' }));
        }}
        onExport={() => {
          if (state.ore <= 0) return;
          beginTrackedAction('export_ore');
          setState(s => {
            const exported = applyOreExport(s, s.ore);
            if (exported.notification) {
              setNotification(exported.notification);
            }
            return exported.nextState;
          });
        }}
      />

      <ActionLogPanel
        entries={actionLog}
        isOpen={showActionLog}
        onToggle={() => setShowActionLog(v => !v)}
        onClear={() => setActionLog([])}
      />

      <DebugPanel
        state={state}
        stateUpdates={stateUpdateCount}
        lastAction={lastActionName}
        lastActionMs={lastActionMs}
        onResetStateCounter={() => setStateUpdateCount(0)}
      />

      {/* Overlays */}
      <AnimatePresence>
        {activeNPC && (
          <DialogueOverlay 
            key="dialogue-overlay"
            npc={activeNPC} 
            state={state}
            onClose={() => setState(s => ({ ...s, activeNPCId: null }))} 
            onAction={handleDialogueAction}
            triggerFeedback={triggerFeedback}
          />
        )}
        {activePermit && (
          <PermitOverlay 
            key="permit-overlay"
            permit={activePermit} 
            onAction={handlePermitAction}
            onClose={() => setState(s => ({ ...s, activePermitId: null }))} 
            tutorialStep={state.tutorialStep}
          />
        )}
        {state.activeMiniGame === 'FORM_PROCESSING' && (
          <FormMiniGame 
            key="form-minigame"
            onComplete={handleMiniGameComplete}
            onCancel={() => setState(s => ({ ...s, activeMiniGame: null }))}
          />
        )}
        {state.activeEndingId && (
          <EndingOverlay
            endingId={state.activeEndingId}
            onClose={() => setState(s => ({ ...s, activeEndingId: null }))}
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
            <button onClick={() => setNotification(null)}><X size={16}/></button>
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
