import { WeatherState, WeatherType } from '../types';

type WeatherPreset = {
  minDuration: number;
  maxDuration: number;
  minIntensity: number;
  maxIntensity: number;
};

const WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  CLEAR: { minDuration: 3.5, maxDuration: 7.5, minIntensity: 0.04, maxIntensity: 0.16 },
  CLOUDY: { minDuration: 2.5, maxDuration: 5.5, minIntensity: 0.2, maxIntensity: 0.45 },
  RAIN: { minDuration: 1.5, maxDuration: 3.5, minIntensity: 0.4, maxIntensity: 0.7 },
  STORM: { minDuration: 0.75, maxDuration: 2.25, minIntensity: 0.7, maxIntensity: 1 },
  DUST_STORM: { minDuration: 1, maxDuration: 2.5, minIntensity: 0.55, maxIntensity: 0.9 },
  ACID_RAIN: { minDuration: 0.75, maxDuration: 1.75, minIntensity: 0.65, maxIntensity: 1 },
  HEATWAVE: { minDuration: 2.5, maxDuration: 5, minIntensity: 0.45, maxIntensity: 0.85 },
};

const WEATHER_LABELS: Record<WeatherType, string> = {
  CLEAR: 'Clear',
  CLOUDY: 'Cloudy',
  RAIN: 'Rain',
  STORM: 'Storm',
  DUST_STORM: 'Dust Storm',
  ACID_RAIN: 'Acid Rain',
  HEATWAVE: 'Heatwave',
};

const WEATHER_NOTICES: Record<WeatherType, { title: string; msg: string }> = {
  CLEAR: {
    title: 'Skies Cleared',
    msg: 'Visibility and movement recovered. The city can breathe again.',
  },
  CLOUDY: {
    title: 'Cloud Cover',
    msg: 'The light flattened out. It is easier to move quietly, but the city feels tense.',
  },
  RAIN: {
    title: 'Rain Front',
    msg: 'Wet streets slow movement and chew into stamina. Water reserves will stretch further.',
  },
  STORM: {
    title: 'Storm Warning',
    msg: 'Hard rain and bad visibility are rolling in. Movement slows and upkeep gets more expensive.',
  },
  DUST_STORM: {
    title: 'Dust Storm',
    msg: 'Black dust is hammering the streets. Exposure climbs faster outside and logistics get uglier.',
  },
  ACID_RAIN: {
    title: 'Acid Rain',
    msg: 'Chemical rain is stripping the city raw. Stay under cover unless the risk is worth it.',
  },
  HEATWAVE: {
    title: 'Heatwave',
    msg: 'The city is baking. Travel gets tiring and systems run hotter than they should.',
  },
};

const resolveWeatherType = (weather: WeatherState | WeatherType): WeatherType =>
  typeof weather === 'string' ? weather : weather.current;

const randomBetween = (min: number, max: number, random: () => number) =>
  min + (max - min) * random();

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const weightedPick = (
  weights: Record<WeatherType, number>,
  random: () => number,
): WeatherType => {
  const entries = Object.entries(weights) as [WeatherType, number][];
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) return 'CLEAR';

  let threshold = random() * total;
  for (const [type, weight] of entries) {
    threshold -= Math.max(0, weight);
    if (threshold <= 0) return type;
  }

  return entries[entries.length - 1][0];
};

const buildWeatherWeights = (timeOfDay: number, current: WeatherType): Record<WeatherType, number> => {
  const isNight = timeOfDay >= 20 || timeOfDay < 6;
  const isMidday = timeOfDay >= 11 && timeOfDay <= 16;

  const weights: Record<WeatherType, number> = {
    CLEAR: 0.28,
    CLOUDY: 0.22,
    RAIN: 0.14,
    STORM: 0.08,
    DUST_STORM: 0.1,
    ACID_RAIN: 0.04,
    HEATWAVE: 0.08,
  };

  if (isNight) {
    weights.CLOUDY += 0.05;
    weights.RAIN += 0.03;
    weights.ACID_RAIN += 0.04;
    weights.HEATWAVE -= 0.04;
  }

  if (isMidday) {
    weights.HEATWAVE += 0.1;
    weights.DUST_STORM += 0.04;
    weights.RAIN -= 0.03;
  }

  if (current === 'STORM' || current === 'ACID_RAIN' || current === 'DUST_STORM') {
    weights.CLEAR += 0.12;
    weights.CLOUDY += 0.1;
  }

  if (current === 'CLEAR') {
    weights.CLEAR += 0.08;
  }

  return weights;
};

export const createWeatherState = (
  type: WeatherType,
  random: () => number = Math.random,
): WeatherState => {
  const preset = WEATHER_PRESETS[type];

  return {
    current: type,
    timeLeft: randomBetween(preset.minDuration, preset.maxDuration, random),
    intensity: clamp01(randomBetween(preset.minIntensity, preset.maxIntensity, random)),
  };
};

export const createInitialWeatherState = (): WeatherState => ({
  current: 'CLEAR',
  timeLeft: 5,
  intensity: 0.1,
});

export const advanceWeatherState = (
  current: WeatherState,
  elapsedHours: number,
  timeOfDay: number,
  random: () => number = Math.random,
): { nextWeather: WeatherState; notification?: { title: string; msg: string } } => {
  const nextTimeLeft = current.timeLeft - elapsedHours;
  if (nextTimeLeft > 0) {
    return {
      nextWeather: {
        ...current,
        timeLeft: nextTimeLeft,
      },
    };
  }

  const nextType = weightedPick(buildWeatherWeights(timeOfDay, current.current), random);
  const nextWeather = createWeatherState(nextType, random);

  if (nextType === current.current) {
    return { nextWeather };
  }

  return {
    nextWeather,
    notification: WEATHER_NOTICES[nextType],
  };
};

export const formatWeatherLabel = (weather: WeatherState | WeatherType) =>
  WEATHER_LABELS[resolveWeatherType(weather)];

export const isSevereWeather = (weather: WeatherState | WeatherType) => {
  const type = resolveWeatherType(weather);
  return type === 'STORM' || type === 'DUST_STORM' || type === 'ACID_RAIN' || type === 'HEATWAVE';
};

export const getWeatherMovementMultiplier = (weather: WeatherState | WeatherType) => {
  switch (resolveWeatherType(weather)) {
    case 'RAIN':
      return 0.92;
    case 'STORM':
      return 0.76;
    case 'DUST_STORM':
      return 0.84;
    case 'ACID_RAIN':
      return 0.8;
    case 'HEATWAVE':
      return 0.88;
    default:
      return 1;
  }
};

export const getWeatherAmbientEffects = (
  weather: WeatherState | WeatherType,
  isNight: boolean,
): { exposurePerHour: number; energyPerHour: number } => {
  const type = resolveWeatherType(weather);
  let exposurePerHour = isNight ? 2.2 : 0.3;
  let energyPerHour = isNight ? 1.15 : 0.25;

  switch (type) {
    case 'CLOUDY':
      exposurePerHour += 0.1;
      break;
    case 'RAIN':
      energyPerHour += 0.45;
      break;
    case 'STORM':
      exposurePerHour += 0.55;
      energyPerHour += 0.9;
      break;
    case 'DUST_STORM':
      exposurePerHour += 1.25;
      energyPerHour += 0.65;
      break;
    case 'ACID_RAIN':
      exposurePerHour += 1.9;
      energyPerHour += 1.1;
      break;
    case 'HEATWAVE':
      exposurePerHour += 0.25;
      energyPerHour += 0.95;
      break;
    default:
      break;
  }

  return { exposurePerHour, energyPerHour };
};

export const getWeatherEconomyModifiers = (weather: WeatherState | WeatherType) => {
  switch (resolveWeatherType(weather)) {
    case 'CLOUDY':
      return { upkeepMultiplier: 1.03, auditRiskBonus: 0.01, subsidyChanceBonus: 0, exportPriceMultiplier: 0.99 };
    case 'RAIN':
      return { upkeepMultiplier: 1.08, auditRiskBonus: 0.01, subsidyChanceBonus: 0.02, exportPriceMultiplier: 0.98 };
    case 'STORM':
      return { upkeepMultiplier: 1.22, auditRiskBonus: 0.04, subsidyChanceBonus: -0.02, exportPriceMultiplier: 0.94 };
    case 'DUST_STORM':
      return { upkeepMultiplier: 1.18, auditRiskBonus: 0.05, subsidyChanceBonus: -0.03, exportPriceMultiplier: 0.95 };
    case 'ACID_RAIN':
      return { upkeepMultiplier: 1.35, auditRiskBonus: 0.07, subsidyChanceBonus: -0.05, exportPriceMultiplier: 0.9 };
    case 'HEATWAVE':
      return { upkeepMultiplier: 1.14, auditRiskBonus: 0.03, subsidyChanceBonus: -0.01, exportPriceMultiplier: 0.97 };
    default:
      return { upkeepMultiplier: 1, auditRiskBonus: 0, subsidyChanceBonus: 0, exportPriceMultiplier: 1 };
  }
};

export const getWeatherTravelModifiers = (weather: WeatherState | WeatherType) => {
  switch (resolveWeatherType(weather)) {
    case 'CLOUDY':
      return { timeMultiplier: 1.02, energyMultiplier: 1 };
    case 'RAIN':
      return { timeMultiplier: 1.1, energyMultiplier: 1.05 };
    case 'STORM':
      return { timeMultiplier: 1.35, energyMultiplier: 1.18 };
    case 'DUST_STORM':
      return { timeMultiplier: 1.22, energyMultiplier: 1.12 };
    case 'ACID_RAIN':
      return { timeMultiplier: 1.28, energyMultiplier: 1.2 };
    case 'HEATWAVE':
      return { timeMultiplier: 1.12, energyMultiplier: 1.15 };
    default:
      return { timeMultiplier: 1, energyMultiplier: 1 };
  }
};

export const getWeatherMiningModifiers = (weather: WeatherState | WeatherType) => {
  switch (resolveWeatherType(weather)) {
    case 'CLOUDY':
      return { hazardBonus: 1, energyMultiplier: 1, yieldMultiplier: 1, exposureBonus: 0.05 };
    case 'RAIN':
      return { hazardBonus: 4, energyMultiplier: 1.05, yieldMultiplier: 0.95, exposureBonus: 0.15 };
    case 'STORM':
      return { hazardBonus: 10, energyMultiplier: 1.18, yieldMultiplier: 0.88, exposureBonus: 0.45 };
    case 'DUST_STORM':
      return { hazardBonus: 7, energyMultiplier: 1.1, yieldMultiplier: 0.92, exposureBonus: 0.65 };
    case 'ACID_RAIN':
      return { hazardBonus: 12, energyMultiplier: 1.22, yieldMultiplier: 0.85, exposureBonus: 1.2 };
    case 'HEATWAVE':
      return { hazardBonus: 5, energyMultiplier: 1.16, yieldMultiplier: 0.94, exposureBonus: 0.3 };
    default:
      return { hazardBonus: 0, energyMultiplier: 1, yieldMultiplier: 1, exposureBonus: 0 };
  }
};

export const getWeatherToneClassName = (weather: WeatherState | WeatherType) => {
  switch (resolveWeatherType(weather)) {
    case 'RAIN':
      return 'border-sky-300 bg-sky-100/80 text-sky-900';
    case 'STORM':
      return 'border-indigo-400 bg-indigo-950/75 text-indigo-100';
    case 'DUST_STORM':
      return 'border-orange-400 bg-orange-950/75 text-orange-100';
    case 'ACID_RAIN':
      return 'border-lime-400 bg-lime-950/75 text-lime-100';
    case 'HEATWAVE':
      return 'border-amber-400 bg-amber-950/75 text-amber-100';
    case 'CLOUDY':
      return 'border-slate-300 bg-slate-100/80 text-slate-900';
    default:
      return 'border-emerald-300 bg-emerald-100/80 text-emerald-900';
  }
};

export const getWeatherWarningCopy = (weather: WeatherState | WeatherType) =>
  WEATHER_NOTICES[resolveWeatherType(weather)].msg;
