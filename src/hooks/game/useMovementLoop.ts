import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { applyExhaustionCollapse } from '../../game/exhaustion';
import { buildWorldSurfaceMap } from '../../utils/worldSurface';
import { resolveStreetPickupCollection } from '../../game/streetPickups';
import { getWeatherMovementMultiplier } from '../../game/weatherSystem';

interface UseMovementLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  homePos: { x: number; y: number };
  enabled?: boolean;
}

export const useMovementLoop = ({ setState, setNotification, homePos, enabled = true }: UseMovementLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;
    let movementBudget = 0;
    let cachedSurfaceMap: { buildings: GameState['buildings']; map: ReturnType<typeof buildWorldSurfaceMap> } | null = null;
    let lastTime = performance.now();

    // Performance: Use requestAnimationFrame for smoother movement synced with rendering
    let animationFrameId: number;
    const tick = () => {
      const now = performance.now();
      const deltaMs = now - lastTime;
      lastTime = now;

      // Only update if enough time has passed (roughly 60fps = 16.67ms per frame)
      // We run every ~70ms worth of time to match original behavior but sync with RAF
      if (deltaMs < 16) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      setState(prev => {
        if (prev.path.length === 0) {
          movementBudget = 0;
          return prev;
        }

        const surfaceMap = cachedSurfaceMap?.buildings === prev.buildings
          ? cachedSurfaceMap.map
          : buildWorldSurfaceMap(prev.buildings);
        if (cachedSurfaceMap?.buildings !== prev.buildings) {
          cachedSurfaceMap = { buildings: prev.buildings, map: surfaceMap };
        }

        movementBudget += Math.max(0.55, prev.movementSpeed * getWeatherMovementMultiplier(prev.weather) * 0.75);

        let currentPos = prev.playerPos;
        let remainingPath = prev.path;
        let newEnergy = prev.energy;
        let nextStreetPickups = prev.streetPickups;
        let didAdvance = false;
        const notifications: { title: string; msg: string }[] = [];

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
              ...prev,
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
          return prev;
        }

        notifications.forEach((notification) => setNotification(notification));

        if (newEnergy <= 0) {
          movementBudget = 0;
          const collapsed = applyExhaustionCollapse({
            ...prev,
            energy: newEnergy,
            playerPos: currentPos,
            path: remainingPath,
            streetPickups: nextStreetPickups,
          });
          setNotification(collapsed.notification);
          return collapsed.nextState;
        }

        return {
          ...prev,
          playerPos: currentPos,
          energy: newEnergy,
          path: remainingPath,
          targetPos: remainingPath.length === 0 ? null : prev.targetPos,
          streetPickups: nextStreetPickups,
        };
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [enabled, homePos, setNotification, setState]);
};
