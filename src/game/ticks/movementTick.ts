import { GameState } from '../../types';
import { applyExhaustionCollapse } from '../exhaustion';
import { resolveStreetPickupCollection } from '../streetPickups';
import { getWeatherMovementMultiplier } from '../weatherSystem';
import { buildWorldSurfaceMap, WorldSurfaceMap } from '../../utils/worldSurface';
import { GameTickNotification } from './types';

export interface MovementTickRuntimeState {
  movementBudget: number;
}

export interface MovementTickResult {
  nextState: GameState;
  nextRuntime: MovementTickRuntimeState;
  notifications: GameTickNotification[];
}

export const createInitialMovementTickRuntime = (): MovementTickRuntimeState => ({
  movementBudget: 0,
});

export const advanceMovementTick = (
  state: GameState,
  runtime: MovementTickRuntimeState,
  surfaceMap: WorldSurfaceMap = buildWorldSurfaceMap(state.buildings),
): MovementTickResult => {
  if (state.path.length === 0) {
    return {
      nextState: state,
      nextRuntime: createInitialMovementTickRuntime(),
      notifications: [],
    };
  }

  let movementBudget = runtime.movementBudget + Math.max(
    0.55,
    state.movementSpeed * getWeatherMovementMultiplier(state.weather) * 0.75,
  );

  let currentPos = state.playerPos;
  let remainingPath = state.path;
  let newEnergy = state.energy;
  let nextStreetPickups = state.streetPickups;
  let didAdvance = false;
  const notifications: GameTickNotification[] = [];

  while (remainingPath.length > 0) {
    const nextPos = remainingPath[0];
    const dx = nextPos.x - currentPos.x;
    const dy = nextPos.y - currentPos.y;
    const segmentDistance = Math.hypot(dx, dy);

    if (segmentDistance <= 0 || movementBudget < segmentDistance) {
      break;
    }

    const energyCost = 0.35 * segmentDistance;

    movementBudget -= segmentDistance;
    newEnergy -= energyCost;
    currentPos = nextPos;
    remainingPath = remainingPath.slice(1);
    didAdvance = true;

    const collection = resolveStreetPickupCollection(
      {
        ...state,
        playerPos: currentPos,
        energy: newEnergy,
        streetPickups: nextStreetPickups,
      },
      currentPos,
      surfaceMap,
    );
    newEnergy = collection.nextState.energy;
    nextStreetPickups = collection.nextState.streetPickups;
    notifications.push(...collection.notifications);
  }

  if (!didAdvance) {
    return {
      nextState: state,
      nextRuntime: { movementBudget },
      notifications,
    };
  }

  if (newEnergy <= 0) {
    const collapsed = applyExhaustionCollapse({
      ...state,
      energy: newEnergy,
      playerPos: currentPos,
      path: remainingPath,
      streetPickups: nextStreetPickups,
    });

    return {
      nextState: collapsed.nextState,
      nextRuntime: createInitialMovementTickRuntime(),
      notifications: [...notifications, collapsed.notification],
    };
  }

  return {
    nextState: {
      ...state,
      playerPos: currentPos,
      energy: newEnergy,
      path: remainingPath,
      targetPos: remainingPath.length === 0 ? null : state.targetPos,
      streetPickups: nextStreetPickups,
    },
    nextRuntime: { movementBudget },
    notifications,
  };
};
