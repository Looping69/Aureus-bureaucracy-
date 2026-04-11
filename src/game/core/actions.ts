/**
 * @module actions
 * Strict union of every action that can mutate {@link GameState}.
 * Components must only mutate state by dispatching one of these actions –
 * never by calling `setState` directly.
 */
import { GameState } from '../../types';
import { ExportStrategy } from '../economy';
import { OperationActionId } from '../runCycle';

export type GameAction =
  // ── Mining ──────────────────────────────────────────────────────────────
  /** Mine a single tile in the active mine grid. */
  | { type: 'MINE_TILE'; tileId: string }
  /** Execute a named action within the mine scene (e.g. EXPORT_ORE, BUY_SAFETY_KIT). */
  | { type: 'MINE_ACTION'; action: string }
  /** Credit the player with ore collected from the 3-D mine world. */
  | { type: 'COLLECT_MINE_RESOURCE'; amount: number }

  // ── Travel / scene navigation ────────────────────────────────────────────
  /** Travel to a discovered mine site and switch to the MINE scene. */
  | { type: 'TRAVEL'; mineId: string }
  /** Enter an office building and switch to the OFFICE scene. */
  | { type: 'TRAVEL_TO_BUILDING'; buildingId: string }
  | { type: 'OPEN_WORLD_SCENE' }
  | { type: 'OPEN_MINE_WORLD' }
  | { type: 'OPEN_TESTING' }
  | { type: 'OPEN_OFFICE' }
  | { type: 'OPEN_PLANNER' }
  | { type: 'CLOSE_PLANNER' }
  | { type: 'RETURN_MINE_TO_WORLD' }
  | { type: 'RETURN_TESTING_TO_WORLD' }
  /** Replace the buildings map and return to WORLD scene (city planner save). */
  | { type: 'UPDATE_BUILDINGS'; buildings: GameState['buildings'] }

  // ── Player movement ──────────────────────────────────────────────────────
  /** Pathfind to a world-grid position (click-to-move). */
  | { type: 'MOVE'; pos: { x: number; y: number } }
  /** Instant one-tile step for analog-stick movement. */
  | { type: 'DIRECT_MOVE'; pos: { x: number; y: number } }
  /** Rest at home: restore energy, advance day, apply daily economy tick. */
  | { type: 'REST' }

  // ── World interaction ────────────────────────────────────────────────────
  /** Interact with an NPC or building in the world scene. */
  | { type: 'WORLD_INTERACT'; npcId: string; buildingId: string }

  // ── Permits ──────────────────────────────────────────────────────────────
  /** Submit, pay, or fast-track a permit from the permit overlay. */
  | { type: 'SUBMIT_PERMIT'; id: string; action: 'SUBMIT' | 'PAY' | 'FAST_TRACK' }
  /** Record mini-game completion results and finalise permit processing. */
  | { type: 'MINI_GAME_COMPLETE'; accuracy: number; time: number }
  | { type: 'SELECT_PERMIT'; id: string }
  | { type: 'CLOSE_PERMIT' }
  | { type: 'CANCEL_MINI_GAME' }

  // ── Dialogue ─────────────────────────────────────────────────────────────
  /**
   * Apply a player's dialogue-option action.
   * The action function is a pure state transformer (Partial<GameState>).
   * Social consequences (rival/ally trust ripples) are computed inside the
   * reducer; direct feedback bubbles are handled in the provider dispatch.
   */
  | { type: 'DIALOGUE_CHOICE'; dialogueAction: (s: GameState) => Partial<GameState> }
  | { type: 'SELECT_NPC'; id: string }
  | { type: 'CLOSE_DIALOGUE' }

  // ── Evidence / exploration ───────────────────────────────────────────────
  | { type: 'TAKE_PHOTO'; itemId: string }
  | { type: 'FOUND_ITEM'; itemId: string }
  | { type: 'EXPLORATION_COMPLETE' }
  | { type: 'EXPLORATION_START' }
  | { type: 'BACK_TO_DIRECTORY' }

  // ── Economy ──────────────────────────────────────────────────────────────
  | { type: 'EXPORT_ORE'; strategy: ExportStrategy }

  // ── Operations ───────────────────────────────────────────────────────────
  | { type: 'OPERATION_ACTION'; actionId: OperationActionId }

  // ── Tutorial ─────────────────────────────────────────────────────────────
  | { type: 'TOGGLE_TUTORIAL_MINIMIZED' }
  | { type: 'CLOSE_TUTORIAL' }
  | { type: 'START_JOURNEY' }

  // ── Endings ──────────────────────────────────────────────────────────────
  | { type: 'UNLOCK_ENDING'; endingId: string }
  | { type: 'CLOSE_ENDING' };
