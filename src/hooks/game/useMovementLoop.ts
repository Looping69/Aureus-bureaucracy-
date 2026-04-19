import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { buildWorldSurfaceMap } from '../../utils/worldSurface';
import {
  advanceMovementTick,
  createInitialMovementTickRuntime,
} from '../../game/ticks/movementTick';

interface UseMovementLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  homePos: { x: number; y: number };
  enabled?: boolean;
}

export const useMovementLoop = ({ setState, setNotification, homePos, enabled = true }: UseMovementLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;
    const runtime = createInitialMovementTickRuntime();
    let cachedSurfaceMap: { buildings: GameState['buildings']; map: ReturnType<typeof buildWorldSurfaceMap> } | null = null;
    const timer = setInterval(() => {
      setState(prev => {
        const surfaceMap = cachedSurfaceMap?.buildings === prev.buildings
          ? cachedSurfaceMap.map
          : buildWorldSurfaceMap(prev.buildings);
        if (cachedSurfaceMap?.buildings !== prev.buildings) {
          cachedSurfaceMap = { buildings: prev.buildings, map: surfaceMap };
        }

        const result = advanceMovementTick(prev, runtime, surfaceMap);
        runtime.movementBudget = result.nextRuntime.movementBudget;
        result.notifications.forEach((notification) => setNotification(notification));
        return result.nextState;
      });
    }, 70);
    return () => clearInterval(timer);
  }, [enabled, homePos, setNotification, setState]);
};
