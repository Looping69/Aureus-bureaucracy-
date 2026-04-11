/**
 * @module effects
 * Derives notification side-effects from a (prevState, action) pair.
 *
 * Rules:
 * - Pure: no React state setters, no I/O.
 * - May call the same underlying action helpers as the reducer to extract
 *   notification payloads; those helpers are pure so the double-call is safe.
 * - The GameProvider calls this after every dispatch and forwards the result
 *   to its notification state setter.
 */
import { GameState } from '../../types';
import { GameAction } from './actions';
import { applyMineTileInteraction, applyMineSceneAction } from '../actions/mineActions';
import { applyPermitOverlayAction, applyMiniGameCompletion } from '../actions/permitActions';
import { applyFoundItem, applyTakePhoto } from '../actions/evidenceActions';
import { applyDailyEconomyTick, applyOreExport } from '../economy';
import { applyOperationAction } from '../runCycle';
import { getBuildingAccessPosition } from '../../utils/buildingAccess';

type Notification = { title: string; msg: string };

/**
 * Returns the notification that should be shown to the player after
 * `action` is applied to `prevState`, or `null` if none is needed.
 *
 * Called by the GameProvider dispatch wrapper immediately after scheduling
 * the state update.
 */
export function getNotificationForAction(
  prevState: GameState,
  action: GameAction,
): Notification | null {
  switch (action.type) {

    // ── Mining ────────────────────────────────────────────────────────────

    case 'MINE_TILE': {
      const { notifications } = applyMineTileInteraction(prevState, action.tileId);
      return notifications[0] ?? null;
    }

    case 'MINE_ACTION': {
      const { notifications } = applyMineSceneAction(prevState, action.action);
      return notifications[0] ?? null;
    }

    // ── Travel ────────────────────────────────────────────────────────────

    case 'TRAVEL': {
      const mine = prevState.mines.find(m => m.id === action.mineId);
      if (!mine) return { title: 'Unknown Location', msg: "You haven't discovered this location yet." };
      if (!mine.discovered) return { title: 'Unknown Location', msg: "You haven't discovered this location yet." };
      const energyCost = mine.travelTime * 5;
      if (prevState.energy <= energyCost) {
        return {
          title: 'Too Exhausted',
          msg: `Traveling to ${mine.name} requires more than ${energyCost} energy.`,
        };
      }
      return {
        title: 'Travel Complete',
        msg: `You arrived at ${mine.name} after ${mine.travelTime} hours.`,
      };
    }

    // ── Scene navigation ──────────────────────────────────────────────────

    case 'OPEN_MINE_WORLD':
      if (!prevState.buildings.mine_entrance) {
        return { title: 'Unavailable', msg: 'No mine entrance found.' };
      }
      return null;

    // ── Rest ──────────────────────────────────────────────────────────────

    case 'REST': {
      const homeBuilding = prevState.buildings['player_home'];
      const homePos = homeBuilding ? getBuildingAccessPosition(homeBuilding) : prevState.playerPos;
      const restedState: GameState = {
        ...prevState,
        energy: prevState.maxEnergy,
        day: prevState.day + 1,
        time: 6,
        playerPos: homePos,
      };
      const daily = applyDailyEconomyTick(restedState);
      return daily.notification ?? {
        title: 'Rested',
        msg: "A good night's sleep. Energy and stamina are both back online.",
      };
    }

    // ── Permits ───────────────────────────────────────────────────────────

    case 'SUBMIT_PERMIT': {
      const { notifications } = applyPermitOverlayAction(prevState, action.id, action.action);
      return notifications[0] ?? null;
    }

    case 'MINI_GAME_COMPLETE': {
      const { notifications } = applyMiniGameCompletion(prevState, {
        accuracy: action.accuracy,
        time: action.time,
      });
      return notifications[0] ?? null;
    }

    // ── Evidence ──────────────────────────────────────────────────────────

    case 'TAKE_PHOTO': {
      const { notifications } = applyTakePhoto(prevState, action.itemId);
      return notifications[0] ?? null;
    }

    case 'FOUND_ITEM': {
      const { notifications } = applyFoundItem(prevState, action.itemId);
      return notifications[0] ?? null;
    }

    // ── Economy ───────────────────────────────────────────────────────────

    case 'EXPORT_ORE': {
      const result = applyOreExport(prevState, prevState.ore, action.strategy);
      return result.notification ?? null;
    }

    // ── Operations ────────────────────────────────────────────────────────

    case 'OPERATION_ACTION': {
      return applyOperationAction(prevState, action.actionId).notification;
    }

    // ── All other actions produce no autonomous notification ───────────────

    default:
      return null;
  }
}
