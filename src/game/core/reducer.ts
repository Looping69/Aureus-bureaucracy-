/**
 * @module reducer
 * Pure reducer for the game state machine.
 *
 * Rules:
 * - No side effects (no I/O, no React state setters, no random beyond what
 *   already exists in the underlying action helpers).
 * - Always returns a new state object; never mutates the incoming state.
 * - Every {@link GameAction} must have a corresponding case.
 */
import { GameState, RelationshipFeedback } from '../../types';
import { GameAction } from './actions';
import { applyMineTileInteraction, applyMineSceneAction } from '../actions/mineActions';
import { applyPermitOverlayAction, applyMiniGameCompletion } from '../actions/permitActions';
import { applyDialogueSocialConsequences } from '../actions/dialogueActions';
import { applyFoundItem, applyTakePhoto } from '../actions/evidenceActions';
import { applyDailyEconomyTick, applyOreExport } from '../economy';
import { applyOperationAction } from '../runCycle';
import { getBuildingAccessPosition } from '../../utils/buildingAccess';
import { findPath, invalidatePathfindingCache } from '../../utils/pathfinding';
import { buildWorldSurfaceMap, getWorldSurfaceTile, WorldSurfaceMap } from '../../utils/worldSurface';
import { WORLD_SIZE } from '../../utils/voxelConstants';
import { refreshAllRelationshipStates } from '../dialogue/relationshipState';

export const applyDirectMoveAction = (
  state: GameState,
  pos: { x: number; y: number },
  options?: { surfaceMap?: WorldSurfaceMap },
): GameState => {
  const sameTile = state.playerPos.x === pos.x && state.playerPos.y === pos.y;
  const shouldClearPath = state.path.length > 0 || state.targetPos !== null;
  if (sameTile && !shouldClearPath) return state;

  const surfaceMap = options?.surfaceMap ?? buildWorldSurfaceMap(state.buildings, WORLD_SIZE);
  const tile = getWorldSurfaceTile(surfaceMap, pos.x, pos.y);
  if (!tile || !tile.walkable) {
    return shouldClearPath ? { ...state, path: [], targetPos: null } : state;
  }
  const energyCost = sameTile ? 0 : 0.35;
  if (energyCost > 0 && state.energy <= energyCost) return state;
  return { ...state, playerPos: pos, path: [], targetPos: null, energy: state.energy - energyCost };
};

export const applyDialogueChoiceAction = (
  state: GameState,
  dialogueAction: (s: GameState) => Partial<GameState>,
  feedbackQueue: RelationshipFeedback[] = [],
): GameState => {
  const result = dialogueAction(state);
  const newState = { ...state, ...result } as GameState;
  const withConsequences = applyDialogueSocialConsequences(state, newState, feedbackQueue);
  // Recompute all NPC relationship states after any dialogue change
  const withRelationships = {
    ...withConsequences,
    npcs: refreshAllRelationshipStates(withConsequences),
  };
  return feedbackQueue.length === 0
    ? withRelationships
    : { ...withRelationships, feedbacks: [...withRelationships.feedbacks, ...feedbackQueue] };
};

/**
 * Central pure reducer.
 *
 * The provider dispatch short-circuits two hot paths for performance:
 *  - DIRECT_MOVE  – uses a cached WorldSurfaceMap ref.
 *  - DIALOGUE_CHOICE – wires the legacy feedback-queue ref so that
 *    triggerFeedback calls inside option closures are captured.
 *
 * Both cases are still handled here for standalone / test use.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    // ── Mining ────────────────────────────────────────────────────────────

    case 'MINE_TILE':
      return applyMineTileInteraction(state, action.tileId).nextState;

    case 'MINE_ACTION':
      return applyMineSceneAction(state, action.action).nextState;

    case 'COLLECT_MINE_RESOURCE':
      return { ...state, ore: state.ore + action.amount };

    // ── Travel ────────────────────────────────────────────────────────────

    case 'TRAVEL': {
      const mine = state.mines.find(m => m.id === action.mineId);
      if (!mine || !mine.discovered) return state;
      const energyCost = mine.travelTime * 5;
      if (state.energy <= energyCost) return state;
      return {
        ...state,
        currentScene: 'MINE' as const,
        activeMineId: action.mineId,
        energy: state.energy - energyCost,
        time: (state.time + mine.travelTime) % 24,
      };
    }

    case 'TRAVEL_TO_BUILDING': {
      const building = state.buildings[action.buildingId];
      if (!building) return state;
      return {
        ...state,
        activeBuildingId: action.buildingId,
        currentScene: 'OFFICE' as const,
        playerPos: getBuildingAccessPosition(building),
        explorationActive: !!(building.explorationItems && building.explorationItems.length > 0),
      };
    }

    // ── Scene navigation ──────────────────────────────────────────────────

    case 'OPEN_WORLD_SCENE':
      return {
        ...state,
        currentScene: 'WORLD' as const,
        playerPos:
          state.activeBuildingId && state.buildings[state.activeBuildingId]
            ? getBuildingAccessPosition(state.buildings[state.activeBuildingId])
            : state.playerPos,
      };

    case 'OPEN_MINE_WORLD':
      if (!state.buildings.mine_entrance) return state;
      return { ...state, activeBuildingId: 'mine_entrance', currentScene: 'MINE_WORLD' as const };

    case 'OPEN_TESTING':
      return { ...state, currentScene: 'TESTING' as const };

    case 'OPEN_OFFICE':
      return { ...state, currentScene: 'OFFICE' as const };

    case 'OPEN_PLANNER':
      return { ...state, currentScene: 'CITY_PLANNER' as const };

    case 'CLOSE_PLANNER':
    case 'RETURN_MINE_TO_WORLD':
    case 'RETURN_TESTING_TO_WORLD':
      return { ...state, currentScene: 'WORLD' as const };

    case 'UPDATE_BUILDINGS':
      invalidatePathfindingCache();
      return { ...state, buildings: action.buildings, currentScene: 'WORLD' as const };

    // ── Movement ──────────────────────────────────────────────────────────

    case 'MOVE': {
      const { pos } = action;
      if (state.playerPos.x === pos.x && state.playerPos.y === pos.y) return state;
      const path = findPath(state.playerPos, pos, state.buildings);
      return path.length > 0 ? { ...state, path, targetPos: pos } : state;
    }

    /**
     * Analog-stick direct-move.  The GameProvider dispatch pre-computes the
     * WorldSurfaceMap with caching before delegating here, so in the live game
     * this case only receives walkability-checked positions.  When called
     * directly from tests the map is rebuilt inline (no cache).
     */
    case 'DIRECT_MOVE': {
      return applyDirectMoveAction(state, action.pos);
    }

    case 'REST': {
      const homeBuilding = state.buildings['player_home'];
      const homePos = homeBuilding ? getBuildingAccessPosition(homeBuilding) : state.playerPos;
      const restedState: GameState = {
        ...state,
        energy: state.maxEnergy,
        day: state.day + 1,
        time: 6,
        playerPos: homePos,
      };
      return applyDailyEconomyTick(restedState).nextState;
    }

    // ── World interaction ─────────────────────────────────────────────────

    case 'WORLD_INTERACT': {
      const { npcId, buildingId } = action;
      if (npcId !== 'none') {
        return {
          ...state,
          activeNPCId: npcId,
          activeBuildingId: null,
          explorationActive: false,
          currentScene: 'OFFICE' as const,
        };
      }
      const building = state.buildings[buildingId];
      if (!building) return state;
      if (building.type === 'MINE_ENTRANCE') {
        return { ...state, activeBuildingId: buildingId, currentScene: 'MINE_WORLD' as const };
      }
      const interactableTypes = ['OFFICE', 'HOME', 'PUB', 'HOTLINE'];
      if (!interactableTypes.includes(building.type)) return state;
      return {
        ...state,
        activeNPCId: null,
        activeBuildingId: buildingId,
        explorationActive: !!(building.explorationItems && building.explorationItems.length > 0),
        currentScene: 'OFFICE' as const,
      };
    }

    // ── Permits ───────────────────────────────────────────────────────────

    case 'SUBMIT_PERMIT':
      return applyPermitOverlayAction(state, action.id, action.action).nextState;

    case 'MINI_GAME_COMPLETE':
      return applyMiniGameCompletion(state, { accuracy: action.accuracy, time: action.time }).nextState;

    case 'SELECT_PERMIT':
      return { ...state, activePermitId: action.id };

    case 'CLOSE_PERMIT':
      return { ...state, activePermitId: null };

    case 'CANCEL_MINI_GAME':
      return { ...state, activeMiniGame: null };

    // ── Dialogue ──────────────────────────────────────────────────────────

    /**
     * Applies a dialogue option's state-transformer function.
     * Social consequence ripples (rival/ally trust) are calculated from a
     * local queue and merged into feedbacks.
     *
     * NOTE: action closures built by buildSpecialDialogueOptions close over
     * the triggerFeedback callback provided by GameProvider – those direct
     * feedback bubbles land in the provider's queuedFeedbackRef, not in the
     * local queue below.  The GameProvider dispatch intercepts DIALOGUE_CHOICE
     * to capture both queues; this case handles the pure state portion only.
     */
    case 'DIALOGUE_CHOICE': {
      return applyDialogueChoiceAction(state, action.dialogueAction);
    }

    case 'SELECT_NPC':
      return { ...state, activeNPCId: action.id };

    case 'CLOSE_DIALOGUE':
      return { ...state, activeNPCId: null };

    // ── Evidence ──────────────────────────────────────────────────────────

    case 'TAKE_PHOTO':
      return applyTakePhoto(state, action.itemId).nextState;

    case 'FOUND_ITEM':
      return applyFoundItem(state, action.itemId).nextState;

    case 'EXPLORATION_COMPLETE':
      return { ...state, explorationActive: false };

    case 'EXPLORATION_START':
      return { ...state, explorationActive: true };

    case 'BACK_TO_DIRECTORY':
      return { ...state, activeBuildingId: null };

    // ── Economy ───────────────────────────────────────────────────────────

    case 'EXPORT_ORE':
      return applyOreExport(state, state.ore, action.strategy).nextState;

    // ── Operations ────────────────────────────────────────────────────────

    case 'OPERATION_ACTION':
      return applyOperationAction(state, action.actionId).nextState;

    // ── Tutorial ──────────────────────────────────────────────────────────

    case 'TOGGLE_TUTORIAL_MINIMIZED':
      return { ...state, tutorialMinimized: !state.tutorialMinimized };

    case 'CLOSE_TUTORIAL':
      return { ...state, tutorialStep: 99 };

    case 'START_JOURNEY': {
      // Navigate the player toward the Bureau so they don't get stuck.
      // tutorialStep stays at 0 — useBuildingDiscovery will advance it
      // once the player is close enough.
      const bureau = state.buildings['licensing_office'];
      if (!bureau) return state;
      const bureauPos = getBuildingAccessPosition(bureau);
      const journeyPath = findPath(state.playerPos, bureauPos, state.buildings);
      return journeyPath.length > 0
        ? { ...state, path: journeyPath, targetPos: bureauPos }
        : state;
    }

    // ── Endings ───────────────────────────────────────────────────────────

    case 'UNLOCK_ENDING':
      if (state.unlockedEndings.includes(action.endingId)) return state;
      return {
        ...state,
        unlockedEndings: [...state.unlockedEndings, action.endingId],
        activeEndingId: action.endingId,
      };

    case 'CLOSE_ENDING':
      return { ...state, activeEndingId: null };

    default: {
      // Exhaustive-check helper – TypeScript will error here if a case is missing.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
