export const DAY_NIGHT = {
  HOURS_PER_DAY: 24,
  DAWN_START_HOUR: 4.5,
  SUNRISE_HOUR: 6,
  NOON_HOUR: 12,
  SUNSET_HOUR: 18.5,
  DUSK_END_HOUR: 20.25,
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

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const smoothstep = (value: number) => {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
};

export function isDaytime(timeOfDay: number): boolean {
  return getDaylightFactor(timeOfDay) >= 0.3;
}

export function getTwilightFactor(timeOfDay: number): number {
  const normalized = normalizeTimeOfDay(timeOfDay);

  if (normalized >= DAY_NIGHT.DAWN_START_HOUR && normalized < DAY_NIGHT.SUNRISE_HOUR) {
    return smoothstep(
      (normalized - DAY_NIGHT.DAWN_START_HOUR) /
        (DAY_NIGHT.SUNRISE_HOUR - DAY_NIGHT.DAWN_START_HOUR),
    );
  }

  if (normalized > DAY_NIGHT.SUNSET_HOUR && normalized <= DAY_NIGHT.DUSK_END_HOUR) {
    return 1 - smoothstep(
      (normalized - DAY_NIGHT.SUNSET_HOUR) /
        (DAY_NIGHT.DUSK_END_HOUR - DAY_NIGHT.SUNSET_HOUR),
    );
  }

  return 0;
}

export function getDaylightFactor(timeOfDay: number): number {
  const normalized = normalizeTimeOfDay(timeOfDay);

  if (normalized < DAY_NIGHT.DAWN_START_HOUR || normalized > DAY_NIGHT.DUSK_END_HOUR) {
    return 0;
  }

  if (normalized < DAY_NIGHT.SUNRISE_HOUR) {
    const dawnProgress =
      (normalized - DAY_NIGHT.DAWN_START_HOUR) /
      (DAY_NIGHT.SUNRISE_HOUR - DAY_NIGHT.DAWN_START_HOUR);
    return smoothstep(dawnProgress) * 0.28;
  }

  if (normalized <= DAY_NIGHT.SUNSET_HOUR) {
    const daylightSpan = DAY_NIGHT.SUNSET_HOUR - DAY_NIGHT.SUNRISE_HOUR;
    const daylightProgress = (normalized - DAY_NIGHT.SUNRISE_HOUR) / daylightSpan;
    return 0.28 + (Math.sin(daylightProgress * Math.PI) * 0.72);
  }

  const duskProgress =
    (normalized - DAY_NIGHT.SUNSET_HOUR) /
    (DAY_NIGHT.DUSK_END_HOUR - DAY_NIGHT.SUNSET_HOUR);
  return (1 - smoothstep(duskProgress)) * 0.28;
}

export function getMoonlightFactor(timeOfDay: number): number {
  const daylightFactor = getDaylightFactor(timeOfDay);
  return clamp01(1 - smoothstep(daylightFactor / 0.45));
}

export function getCelestialPosition(timeOfDay: number, distance: number): CelestialPosition {
  const normalized = normalizeTimeOfDay(timeOfDay) / DAY_NIGHT.HOURS_PER_DAY;
  const orbitAngle = (normalized - 0.25) * Math.PI * 2;
  const daylightFactor = getDaylightFactor(timeOfDay);
  const nightFactor = getMoonlightFactor(timeOfDay);
  const activeLight = Math.max(daylightFactor, nightFactor);
  const night = !isDaytime(timeOfDay);

  if (night) {
    const moonAngle = orbitAngle + Math.PI;
    return {
      x: Math.cos(moonAngle) * distance * 0.8,
      y: 28 + activeLight * 80,
      z: Math.sin(moonAngle) * distance * 0.5,
      isNight: true,
    };
  }

  return {
    x: Math.cos(orbitAngle) * distance,
    y: 25 + activeLight * 105,
    z: Math.sin(orbitAngle) * distance * 0.5,
    isNight: false,
  };
}
