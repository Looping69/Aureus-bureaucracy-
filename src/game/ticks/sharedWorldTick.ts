import { advanceWeatherState } from '../weatherSystem';
import { RoomSharedState } from '../../multiplayer/types';
import { GameTickNotification } from './types';

const DAY_NIGHT_TIME_SCALE = 0.08;

export interface SharedWorldTickResult {
  nextShared: RoomSharedState;
  notifications: GameTickNotification[];
}

export const advanceSharedWorldTick = (
  shared: RoomSharedState,
  random: () => number = Math.random,
): SharedWorldTickResult => {
  const ambientTimeStep = (shared.time >= 20 || shared.time < 6 ? 0.2 : 0.04) * DAY_NIGHT_TIME_SCALE;
  let newTime = shared.time + ambientTimeStep;
  let newDay = shared.day;
  const weatherAdvance = advanceWeatherState(shared.weather, ambientTimeStep, newTime, random);
  const nextWeather = weatherAdvance.nextWeather;
  const notifications: GameTickNotification[] = [];

  if (newTime >= 24) {
    newTime -= 24;
  }

  if (shared.time < 6 && newTime >= 6) {
    newDay += 1;
  }

  if (weatherAdvance.notification) {
    notifications.push(weatherAdvance.notification);
  }

  return {
    nextShared: {
      ...shared,
      day: newDay,
      time: newTime,
      weather: nextWeather,
    },
    notifications,
  };
};
