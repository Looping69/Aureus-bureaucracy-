import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { applyExhaustionCollapse } from '../../game/exhaustion';

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
    const timer = setInterval(() => {
      setState(prev => {
        if (prev.path.length === 0) {
          movementBudget = 0;
          return prev;
        }

        movementBudget += Math.max(0.75, prev.movementSpeed * 0.75);

        let currentPos = prev.playerPos;
        let remainingPath = prev.path;
        let newEnergy = prev.energy;
        let didAdvance = false;

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
        }

        if (!didAdvance) {
          return prev;
        }

        if (newEnergy <= 0) {
          movementBudget = 0;
          const collapsed = applyExhaustionCollapse({
            ...prev,
            energy: newEnergy,
            playerPos: currentPos,
            path: remainingPath,
          });
          setNotification(collapsed.notification);
          return collapsed.nextState;
        }

        return {
          ...prev,
          playerPos: currentPos,
          energy: newEnergy,
          path: remainingPath,
          targetPos: remainingPath.length === 0 ? null : prev.targetPos
        };
      });
    }, 70);
    return () => clearInterval(timer);
  }, [enabled, homePos, setNotification, setState]);
};
