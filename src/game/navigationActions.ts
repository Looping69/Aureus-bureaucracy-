import {
  GameState,
  WorldPosition,
} from '../types';
import { getWorldSurfaceTile } from '../utils/worldSurface';
import { applyExhaustionCollapse } from './exhaustion';
import { resolveStreetPickupCollection } from './streetPickups';
import { formatWeatherLabel, getWeatherTravelModifiers } from './weatherSystem';

export type NavigationNotification = { title: string; msg: string };

export const applyPlannedWorldMove = (
  state: GameState,
  destination: WorldPosition,
  path: WorldPosition[],
): GameState => {
  if (state.playerPos.x === destination.x && state.playerPos.y === destination.y) {
    return state;
  }

  if (path.length === 0) return state;

  return {
    ...state,
    path,
    targetPos: destination,
  };
};

export const applyDirectWorldMove = (
  state: GameState,
  destination: WorldPosition,
  surfaceMap: ReturnType<typeof import('../utils/worldSurface').buildWorldSurfaceMap>,
): { nextState: GameState; notifications: NavigationNotification[] } => {
  const sameTile = state.playerPos.x === destination.x && state.playerPos.y === destination.y;
  const shouldClearPath = state.path.length > 0 || state.targetPos !== null;

  if (sameTile && !shouldClearPath) return { nextState: state, notifications: [] };

  const tile = getWorldSurfaceTile(surfaceMap, destination.x, destination.y);
  if (!tile || !tile.walkable) {
    if (!shouldClearPath) return { nextState: state, notifications: [] };
    return {
      nextState: {
        ...state,
        path: [],
        targetPos: null,
      },
      notifications: [],
    };
  }

  const energyCost = sameTile ? 0 : 0.35;
  if (energyCost > 0 && state.energy <= energyCost) {
    return { nextState: state, notifications: [] };
  }

  const movedState: GameState = {
    ...state,
    playerPos: destination,
    path: [],
    targetPos: null,
    energy: state.energy - energyCost,
  };

  return resolveStreetPickupCollection(movedState, destination, surfaceMap);
};

export const applyRestAction = (
  state: GameState,
  homePos: WorldPosition,
): GameState => ({
  ...state,
  energy: state.maxEnergy,
  day: state.day + 1,
  time: 6,
  playerPos: homePos,
});

type MineTravelResult =
  | { kind: 'invalid' }
  | { kind: 'undiscovered'; notification: NavigationNotification }
  | { kind: 'too_tired'; notification: NavigationNotification }
  | { kind: 'collapsed'; notification: NavigationNotification; nextState: GameState }
  | { kind: 'traveled'; notification: NavigationNotification; nextState: GameState };

export const applyMineTravel = (
  state: GameState,
  mineId: string,
): MineTravelResult => {
  const mine = state.mines.find((entry) => entry.id === mineId);
  if (!mine) return { kind: 'invalid' };

  if (!mine.discovered) {
    return {
      kind: 'undiscovered',
      notification: { title: 'Unknown Location', msg: "You haven't discovered this location yet." },
    };
  }

  const travelModifiers = getWeatherTravelModifiers(state.weather);
  const travelTimeHours = mine.travelTime * travelModifiers.timeMultiplier;
  const energyCost = Math.ceil(mine.travelTime * 5 * travelModifiers.energyMultiplier);
  if (state.energy <= energyCost) {
    return {
      kind: 'too_tired',
      notification: { title: 'Too Exhausted', msg: `Traveling to ${mine.name} requires more than ${energyCost} energy.` },
    };
  }

  if (state.energy - energyCost <= 0) {
    const collapsed = applyExhaustionCollapse({
      ...state,
      energy: state.energy - energyCost,
      time: (state.time + mine.travelTime) % 24,
    });

    return {
      kind: 'collapsed',
      notification: collapsed.notification,
      nextState: collapsed.nextState,
    };
  }
  const weatherSuffix = travelModifiers.timeMultiplier > 1.01
    ? ` through ${formatWeatherLabel(state.weather).toLowerCase()} conditions`
    : '';
  const formattedTravelTime = Number.isInteger(travelTimeHours) ? `${travelTimeHours}` : travelTimeHours.toFixed(1);

  return {
    kind: 'traveled',
    notification: { title: 'Travel Complete', msg: `You arrived at ${mine.name} after ${formattedTravelTime} hours${weatherSuffix}.` },
    nextState: {
      ...state,
      currentScene: 'MINE',
      activeMineId: mineId,
      energy: state.energy - energyCost,
      time: (state.time + travelTimeHours) % 24,
    },
  };
};
