import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { applyDailyEconomyTick } from '../../game/economy';
import { DAY_NIGHT, SUNRISE_HOUR, isNightTime } from '../../utils/dayNightCycle';
import {
  applyStaminaRecovery,
  collectNearbyStaminaPowerUps,
  triggerPlayerCollapse,
} from '../../game/staminaRescue';

interface UseTimeAndCurfewLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  homePos: { x: number; y: number };
  enabled?: boolean;
}

export const useTimeAndCurfewLoop = ({ setState, setNotification, homePos, enabled = true }: UseTimeAndCurfewLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setState(prev => {
        const hoursPerSecond = DAY_NIGHT.HOURS_PER_DAY / DAY_NIGHT.REAL_SECONDS_PER_DAY;
        let newTime = prev.time + hoursPerSecond;
        let newDay = prev.day;
        let newExposure = prev.meters.exposure;
        let newEnergy = prev.energy;

        if (newTime >= 24) {
          newTime -= 24;
        }

        if (prev.time < SUNRISE_HOUR && newTime >= SUNRISE_HOUR) {
          newDay += 1;
          const daily = applyDailyEconomyTick({
            ...prev,
            day: newDay,
            time: newTime,
            energy: newEnergy,
            meters: {
              ...prev.meters,
              exposure: newExposure
            }
          });
          if (daily.notification) {
            setNotification(daily.notification);
          }
          return daily.nextState;
        }

        const isNight = isNightTime(newTime);
        const isAtHome = prev.playerPos.x === homePos.x && prev.playerPos.y === homePos.y;

        if (isNight && !isAtHome) {
          newExposure = Math.min(100, newExposure + 0.2);
          newEnergy = Math.max(0, newEnergy - 0.1);
        }

        let nextState: GameState = {
          ...prev,
          time: newTime,
          day: newDay,
          energy: newEnergy,
          meters: {
            ...prev.meters,
            exposure: newExposure
          }
        };

        nextState = applyStaminaRecovery(nextState, 1);

        const collectionResult = collectNearbyStaminaPowerUps(nextState);
        nextState = collectionResult.nextState;
        if (collectionResult.collected.length > 0) {
          setNotification({
            title: 'Stamina Restored',
            msg: `${collectionResult.collected.map((powerUp) => powerUp.label).join(', ')} collected. Recovery window extended.`,
          });
        }

        if (newEnergy <= 0 || nextState.stamina.current <= 0) {
          setNotification({
            title: 'Collapse',
            msg: 'Stamina is gone. You are down until medical gets you back up.',
          });
          return triggerPlayerCollapse(nextState);
        }

        return nextState;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [enabled, homePos.x, homePos.y, setNotification, setState]);
};
