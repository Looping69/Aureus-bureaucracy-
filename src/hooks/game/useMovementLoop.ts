import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import {
  applyStaminaDrain,
  collectNearbyStaminaPowerUps,
  triggerPlayerCollapse,
} from '../../game/staminaRescue';

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
        if (prev.playerStatus.condition !== 'ACTIVE') {
          movementBudget = 0;
          return prev;
        }

        if (prev.path.length === 0) {
          movementBudget = 0;
          return prev;
        }

        movementBudget += Math.max(0.75, prev.movementSpeed * 0.75);

        let currentPos = prev.playerPos;
        let remainingPath = prev.path;
        let newEnergy = prev.energy;
        let movingState = prev;
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
          const staminaCost = prev.stamina.movementDrainPerUnit * segmentDistance;

          movementBudget -= segmentDistance;
          newEnergy -= energyCost;
          currentPos = nextPos;
          remainingPath = remainingPath.slice(1);
          movingState = applyStaminaDrain(
            {
              ...movingState,
              playerPos: currentPos,
              path: remainingPath,
              energy: newEnergy,
              targetPos: remainingPath.length === 0 ? null : prev.targetPos,
            },
            staminaCost,
          );
          didAdvance = true;
        }

        if (!didAdvance) {
          return prev;
        }

        if (newEnergy <= 0 || movingState.stamina.current <= 0) {
          movementBudget = 0;
          setNotification({
            title: 'Collapse',
            msg: 'You burned through your stamina and hit the ground. Medical is on the way.',
          });
          return triggerPlayerCollapse({
            ...movingState,
            energy: newEnergy,
            playerPos: currentPos,
            path: remainingPath,
            targetPos: remainingPath.length === 0 ? null : prev.targetPos,
          });
        }

        const advancedState: GameState = {
          ...movingState,
          playerPos: currentPos,
          energy: newEnergy,
          path: remainingPath,
          targetPos: remainingPath.length === 0 ? null : prev.targetPos
        };
        const { nextState, collected } = collectNearbyStaminaPowerUps(advancedState);
        if (collected.length > 0) {
          setNotification({
            title: 'Stamina Restored',
            msg: `${collected.map((powerUp) => powerUp.label).join(', ')} collected. Keep moving, just not stupidly.`,
          });
        }
        return nextState;
      });
    }, 70);
    return () => clearInterval(timer);
  }, [enabled, homePos, setNotification, setState]);
};
