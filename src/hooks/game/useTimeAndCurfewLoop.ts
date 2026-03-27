import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { applyDailyEconomyTick } from '../../game/economy';

const DAY_NIGHT_TIME_SCALE = 0.2;

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
        const ambientTimeStep = (prev.time >= 20 || prev.time < 6 ? 0.2 : 0.1) * DAY_NIGHT_TIME_SCALE;
        let newTime = prev.time + ambientTimeStep;
        let newDay = prev.day;
        let newExposure = prev.meters.exposure;
        let newEnergy = prev.energy;

        if (newTime >= 24) {
          newTime -= 24;
        }

        if (prev.time < 6 && newTime >= 6) {
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

        const isNight = newTime >= 20 || newTime < 6;
        const isAtHome = prev.playerPos.x === homePos.x && prev.playerPos.y === homePos.y;

        if (isNight && !isAtHome) {
          newExposure = Math.min(100, newExposure + 0.2);
          newEnergy = Math.max(0, newEnergy - 0.1);
        }

        return {
          ...prev,
          time: newTime,
          day: newDay,
          energy: newEnergy,
          meters: {
            ...prev.meters,
            exposure: newExposure
          }
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [enabled, homePos.x, homePos.y, setNotification, setState]);
};
