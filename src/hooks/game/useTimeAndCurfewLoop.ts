import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { applyDailyEconomyTick } from '../../game/economy';
import { applyExhaustionCollapse } from '../../game/exhaustion';
import { advanceWeatherState, getWeatherAmbientEffects } from '../../game/weatherSystem';

const DAY_NIGHT_TIME_SCALE = 0.08;

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
        const ambientTimeStep = (prev.time >= 20 || prev.time < 6 ? 0.2 : 0.04) * DAY_NIGHT_TIME_SCALE;
        let newTime = prev.time + ambientTimeStep;
        let newDay = prev.day;
        let newExposure = prev.meters.exposure;
        let newEnergy = prev.energy;
        const weatherAdvance = advanceWeatherState(prev.weather, ambientTimeStep, newTime);
        const nextWeather = weatherAdvance.nextWeather;

        if (newTime >= 24) {
          newTime -= 24;
        }

        if (prev.time < 6 && newTime >= 6) {
          newDay += 1;
          const daily = applyDailyEconomyTick({
            ...prev,
            day: newDay,
            time: newTime,
            weather: nextWeather,
            energy: newEnergy,
            meters: {
              ...prev.meters,
              exposure: newExposure
            }
          });
          if (weatherAdvance.notification) {
            setNotification(weatherAdvance.notification);
          }
          if (daily.notification) {
            setNotification(daily.notification);
          }
          return daily.nextState;
        }

        const isNight = newTime >= 20 || newTime < 6;
        const isAtHome = prev.playerPos.x === homePos.x && prev.playerPos.y === homePos.y;
        const ambientEffects = isAtHome
          ? { exposurePerHour: 0, energyPerHour: 0 }
          : getWeatherAmbientEffects(nextWeather, isNight);

        newExposure = Math.min(100, newExposure + (ambientEffects.exposurePerHour * ambientTimeStep));
        newEnergy = Math.max(0, newEnergy - (ambientEffects.energyPerHour * ambientTimeStep));

        if (newEnergy <= 0) {
          const collapsed = applyExhaustionCollapse({
            ...prev,
            time: newTime,
            day: newDay,
            weather: nextWeather,
            energy: newEnergy,
            meters: {
              ...prev.meters,
              exposure: newExposure
            }
          });
          setNotification(collapsed.notification);
          return collapsed.nextState;
        }

        if (weatherAdvance.notification) {
          setNotification(weatherAdvance.notification);
        }

        return {
          ...prev,
          time: newTime,
          day: newDay,
          weather: nextWeather,
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
