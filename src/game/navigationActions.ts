import {
  GameState,
  WorldPosition,
} from '../types';
import { getWorldSurfaceTile } from '../utils/worldSurface';
import { applyExhaustionCollapse } from './exhaustion';

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
): GameState => {
  const sameTile = state.playerPos.x === destination.x && state.playerPos.y === destination.y;
  const shouldClearPath = state.path.length > 0 || state.targetPos !== null;

  if (sameTile && !shouldClearPath) return state;

  const tile = getWorldSurfaceTile(surfaceMap, destination.x, destination.y);
  if (!tile || !tile.walkable) {
    if (!shouldClearPath) return state;
    return {
      ...state,
      path: [],
      targetPos: null,
    };
  }

  const energyCost = sameTile ? 0 : 0.35;
  if (energyCost > 0 && state.energy <= energyCost) return state;

  return {
    ...state,
    playerPos: destination,
    path: [],
    targetPos: null,
    energy: state.energy - energyCost,
  };
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

  const energyCost = mine.travelTime * 5;
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

  return {
    kind: 'traveled',
    notification: { title: 'Travel Complete', msg: `You arrived at ${mine.name} after ${mine.travelTime} hours.` },
    nextState: {
      ...state,
      currentScene: 'MINE',
      activeMineId: mineId,
      energy: state.energy - energyCost,
      time: (state.time + mine.travelTime) % 24,
    },
  };
};
