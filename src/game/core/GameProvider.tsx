/**
 * @module GameProvider
 * React integration layer for the game state machine.
 *
 * Responsibilities:
 * - Holds canonical {@link GameState} via useState.
 * - Exposes a type-safe `dispatch(action)` that routes through the pure
 *   {@link gameReducer} and calls {@link getNotificationForAction} for side
 *   effects.
 * - Wires all background game-loop hooks (movement, time, permits, tutorial,
 *   city events, feedback cleanup, building discovery) so App.tsx is free of
 *   loop management.
 * - Handles ending detection and auto-save via useEffect.
 * - Manages the legacy triggerFeedback / queuedFeedbackRef mechanism required
 *   by dialogue-option action closures (see DIALOGUE_CHOICE dispatch below).
 *
 * Public API (hooks):
 *   useGameState()    – read-only access to GameState
 *   useGameDispatch() – dispatch a GameAction
 *   useNotification() – current notification + setter
 *   useTriggerFeedback() – pass to DialogueOverlay as the triggerFeedback prop
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GameState, RelationshipFeedback } from '../../types';
import { GameAction } from './actions';
import { gameReducer } from './reducer';
import { getNotificationForAction } from './effects';
import { buildInitialGameState } from './GameStore';
import { queueFeedback } from '../actions/dialogueActions';
import { applyDialogueSocialConsequences } from '../actions/dialogueActions';
import { getUnlockedEnding } from '../endings';
import { saveGameState } from '../save';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from '../../utils/worldSurface';
import { WORLD_SIZE } from '../../utils/voxelConstants';
import { getBuildingAccessPosition } from '../../utils/buildingAccess';
import { useBuildingDiscovery } from '../../hooks/game/useBuildingDiscovery';
import { useFeedbackCleanup } from '../../hooks/game/useFeedbackCleanup';
import { useMovementLoop } from '../../hooks/game/useMovementLoop';
import { usePermitProcessingLoop } from '../../hooks/game/usePermitProcessingLoop';
import { useTimeAndCurfewLoop } from '../../hooks/game/useTimeAndCurfewLoop';
import { useTutorialProgression } from '../../hooks/game/useTutorialProgression';
import { useCityEventLoop } from '../../hooks/game/useCityEventLoop';
import { Building } from '../../types';
import { WorldSurfaceMap } from '../../utils/worldSurface';

// ── Context shape ─────────────────────────────────────────────────────────────

interface GameContextValue {
  gameState: GameState;
  dispatch: (action: GameAction) => void;
  notification: { title: string; msg: string } | null;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  /** Pass directly to DialogueOverlay's triggerFeedback prop. */
  triggerFeedback: (npcId: string, amount: number, type: 'TRUST' | 'LEVERAGE') => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface GameProviderProps {
  /** The starting state for this session (new game or hydrated save). */
  initialState: GameState;
  children: React.ReactNode;
}

export function GameProvider({ initialState, children }: GameProviderProps) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [notification, setNotification] = useState<{ title: string; msg: string } | null>(null);

  // ── Stable refs ────────────────────────────────────────────────────────
  // stateRef gives the dispatch wrapper synchronous access to the latest
  // committed state without depending on the `gameState` closure variable
  // (which would force dispatch to be recreated on every render).
  const stateRef = useRef<GameState>(gameState);
  stateRef.current = gameState;

  // Feedback queue for dialogue-option action closures (legacy mechanism).
  // Cleared at the start of every DIALOGUE_CHOICE dispatch; populated by
  // triggerFeedback calls embedded in option closures.
  const queuedFeedbackRef = useRef<RelationshipFeedback[]>([]);

  // Surface-map cache for DIRECT_MOVE performance optimisation.
  const cachedSurfaceMapRef = useRef<{
    buildings: Record<string, Building>;
    map: WorldSurfaceMap;
  } | null>(null);

  // ── Home position (derived once per buildings change) ──────────────────
  const homePos = useMemo(() => {
    const homeBuilding = gameState.buildings['player_home'];
    return homeBuilding
      ? getBuildingAccessPosition(homeBuilding)
      : { x: 0, y: 0 };
  }, [gameState.buildings]);

  // ── Background game loops ──────────────────────────────────────────────
  useBuildingDiscovery({ state: gameState, setState: setGameState, setNotification, enabled: true });
  useFeedbackCleanup(setGameState, true);
  useTimeAndCurfewLoop({ setState: setGameState, setNotification, homePos, enabled: true });
  usePermitProcessingLoop({ setState: setGameState, setNotification, enabled: true });
  useMovementLoop({ setState: setGameState, setNotification, homePos, enabled: true });
  useTutorialProgression(gameState, setGameState, true);
  useCityEventLoop({ setState: setGameState, setNotification, enabled: true });

  // ── Auto-save ──────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      saveGameState(gameState);
    }, 500);
    return () => clearTimeout(timer);
  }, [gameState]);

  // ── Ending detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (gameState.activeEndingId) return;
    const unlocked = getUnlockedEnding(gameState);
    if (!unlocked) return;
    setGameState(prev => ({
      ...prev,
      unlockedEndings: [...prev.unlockedEndings, unlocked.id],
      activeEndingId: unlocked.id,
    }));
    setNotification({ title: 'Ending Unlocked', msg: unlocked.title });
  }, [gameState]);

  // ── triggerFeedback (passed to DialogueOverlay) ────────────────────────
  const triggerFeedback = useCallback(
    (npcId: string, amount: number, type: 'TRUST' | 'LEVERAGE') => {
      queueFeedback(queuedFeedbackRef.current, npcId, amount, type);
    },
    [],
  );

  // ── Central dispatch ───────────────────────────────────────────────────
  const dispatch = useCallback((action: GameAction) => {
    // ── DIALOGUE_CHOICE: capture both direct and social feedback queues ──
    if (action.type === 'DIALOGUE_CHOICE') {
      queuedFeedbackRef.current = [];
      setGameState(prev => {
        const result = action.dialogueAction(prev);
        const newState = { ...prev, ...result } as GameState;
        const withConsequences = applyDialogueSocialConsequences(
          prev,
          newState,
          queuedFeedbackRef.current,
        );
        if (queuedFeedbackRef.current.length === 0) return withConsequences;
        return {
          ...withConsequences,
          feedbacks: [...withConsequences.feedbacks, ...queuedFeedbackRef.current],
        };
      });
      return;
    }

    // ── DIRECT_MOVE: use cached surface map for analog-movement performance ──
    if (action.type === 'DIRECT_MOVE') {
      setGameState(prev => {
        const sameTile =
          prev.playerPos.x === action.pos.x && prev.playerPos.y === action.pos.y;
        const shouldClearPath = prev.path.length > 0 || prev.targetPos !== null;
        if (sameTile && !shouldClearPath) return prev;

        const cached = cachedSurfaceMapRef.current;
        const surfaceMap =
          cached && cached.buildings === prev.buildings
            ? cached.map
            : buildWorldSurfaceMap(prev.buildings, WORLD_SIZE);
        if (!cached || cached.buildings !== prev.buildings) {
          cachedSurfaceMapRef.current = { buildings: prev.buildings, map: surfaceMap };
        }

        const tile = getWorldSurfaceTile(surfaceMap, action.pos.x, action.pos.y);
        if (!tile || !tile.walkable) {
          return shouldClearPath ? { ...prev, path: [], targetPos: null } : prev;
        }
        const energyCost = sameTile ? 0 : 0.35;
        if (energyCost > 0 && prev.energy <= energyCost) return prev;
        return {
          ...prev,
          playerPos: action.pos,
          path: [],
          targetPos: null,
          energy: prev.energy - energyCost,
        };
      });
      return;
    }

    // ── All other actions: route through the pure reducer ─────────────────
    const prevState = stateRef.current;
    setGameState(prev => gameReducer(prev, action));

    const notif = getNotificationForAction(prevState, action);
    if (notif) setNotification(notif);
  }, []);

  // ── Context value ──────────────────────────────────────────────────────
  const contextValue = useMemo<GameContextValue>(
    () => ({ gameState, dispatch, notification, setNotification, triggerFeedback }),
    [gameState, dispatch, notification, setNotification, triggerFeedback],
  );

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
}

// ── Public hooks ──────────────────────────────────────────────────────────────

function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGameContext must be used within a <GameProvider>.');
  }
  return ctx;
}

/** Read-only access to the full {@link GameState}. */
export function useGameState(): GameState {
  return useGameContext().gameState;
}

/** Dispatch a {@link GameAction} to update game state. */
export function useGameDispatch(): (action: GameAction) => void {
  return useGameContext().dispatch;
}

/** Current notification and its setter (for the notification overlay). */
export function useNotification(): {
  notification: { title: string; msg: string } | null;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
} {
  const { notification, setNotification } = useGameContext();
  return { notification, setNotification };
}

/**
 * Returns the triggerFeedback callback bound to the provider's internal
 * feedback queue.  Pass it directly to <DialogueOverlay>.
 */
export function useTriggerFeedback(): (
  npcId: string,
  amount: number,
  type: 'TRUST' | 'LEVERAGE',
) => void {
  return useGameContext().triggerFeedback;
}
