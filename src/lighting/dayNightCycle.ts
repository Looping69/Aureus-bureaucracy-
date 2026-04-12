export const DAY_NIGHT = {
  HOURS_PER_DAY: 24,
  SUNRISE_HOUR: 5,
  NOON_HOUR: 12,
  SUNSET_HOUR: 19,
} as const;

export interface CelestialPosition {
  x: number;
  y: number;
  z: number;
  isNight: boolean;
}

export function normalizeTimeOfDay(timeOfDay: number): number {
  const hours = DAY_NIGHT.HOURS_PER_DAY;
  return ((timeOfDay % hours) + hours) % hours;
}

export function isDaytime(timeOfDay: number): boolean {
  const normalized = normalizeTimeOfDay(timeOfDay);
  return normalized >= DAY_NIGHT.SUNRISE_HOUR && normalized <= DAY_NIGHT.SUNSET_HOUR;
}

export function getDaylightFactor(timeOfDay: number): number {
  const normalized = normalizeTimeOfDay(timeOfDay);

  if (!isDaytime(normalized)) {
    return 0;
  }

  const daylightSpan = DAY_NIGHT.SUNSET_HOUR - DAY_NIGHT.SUNRISE_HOUR;
  const daylightProgress = (normalized - DAY_NIGHT.SUNRISE_HOUR) / daylightSpan;
  return Math.sin(daylightProgress * Math.PI);
}

export function getCelestialPosition(timeOfDay: number, distance: number): CelestialPosition {
  const normalized = normalizeTimeOfDay(timeOfDay) / DAY_NIGHT.HOURS_PER_DAY;
  const orbitAngle = (normalized - 0.25) * Math.PI * 2;
  const daylightFactor = getDaylightFactor(timeOfDay);
  const night = daylightFactor <= 0;

  if (night) {
    const moonAngle = orbitAngle + Math.PI;
    return {
      x: Math.cos(moonAngle) * distance * 0.8,
      y: 40 + Math.abs(Math.sin(moonAngle)) * 60,
      z: Math.sin(moonAngle) * distance * 0.5,
      isNight: true,
    };
  }

  return {
    x: Math.cos(orbitAngle) * distance,
    y: 30 + daylightFactor * 100,
    z: Math.sin(orbitAngle) * distance * 0.5,
    isNight: false,
  };
}
