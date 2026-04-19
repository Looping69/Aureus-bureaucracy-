import { GameState, WorldPosition } from '../../types';
import { applyDailyEconomyTick } from '../economy';
import { applyExhaustionCollapse } from '../exhaustion';
import { advanceWeatherState, getWeatherAmbientEffects } from '../weatherSystem';
import { GameTickNotification } from './types';

export const DAY_NIGHT_TIME_SCALE = 0.08;

export interface TimeTickResult {
  nextState: GameState;
  notifications: GameTickNotification[];
}

export const advanceTimeTick = (
  state: GameState,
  homePos: WorldPosition,
  random: () => number = Math.random,
): TimeTickResult => {
  const ambientTimeStep = (state.time >= 20 || state.time < 6 ? 0.2 : 0.04) * DAY_NIGHT_TIME_SCALE;
  let newTime = state.time + ambientTimeStep;
  let newDay = state.day;
  let newExposure = state.meters.exposure;
  let newEnergy = state.energy;
  const weatherAdvance = advanceWeatherState(state.weather, ambientTimeStep, newTime, random);
  const nextWeather = weatherAdvance.nextWeather;
  const notifications: GameTickNotification[] = [];

  if (newTime >= 24) {
    newTime -= 24;
  }

  if (state.time < 6 && newTime >= 6) {
    newDay += 1;
    const daily = applyDailyEconomyTick({
      ...state,
      day: newDay,
      time: newTime,
      weather: nextWeather,
      energy: newEnergy,
      meters: {
        ...state.meters,
        exposure: newExposure,
      },
    });

    if (weatherAdvance.notification) {
      notifications.push(weatherAdvance.notification);
    }
    if (daily.notification) {
      notifications.push(daily.notification);
    }

    return {
      nextState: daily.nextState,
      notifications,
    };
  }

  const isNight = newTime >= 20 || newTime < 6;
  const isAtHome = state.playerPos.x === homePos.x && state.playerPos.y === homePos.y;
  const ambientEffects = isAtHome
    ? { exposurePerHour: 0, energyPerHour: 0 }
    : getWeatherAmbientEffects(nextWeather, isNight);

  newExposure = Math.min(100, newExposure + (ambientEffects.exposurePerHour * ambientTimeStep));
  newEnergy = Math.max(0, newEnergy - (ambientEffects.energyPerHour * ambientTimeStep));

  if (newEnergy <= 0) {
    const collapsed = applyExhaustionCollapse({
      ...state,
      time: newTime,
      day: newDay,
      weather: nextWeather,
      energy: newEnergy,
      meters: {
        ...state.meters,
        exposure: newExposure,
      },
    });

    return {
      nextState: collapsed.nextState,
      notifications: [collapsed.notification],
    };
  }

  if (weatherAdvance.notification) {
    notifications.push(weatherAdvance.notification);
  }

  return {
    nextState: {
      ...state,
      time: newTime,
      day: newDay,
      weather: nextWeather,
      energy: newEnergy,
      meters: {
        ...state.meters,
        exposure: newExposure,
      },
    },
    notifications,
  };
};
