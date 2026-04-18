import { BUILDINGS, INITIAL_MINES } from '../data';
import { GameState, GameWorldState, Mine, WeatherState, WorldProfileId } from '../types';

export interface WorldProfileSummary {
  id: WorldProfileId;
  tag: string;
  title: string;
  description: string;
}

type WorldProfileDefinition = WorldProfileSummary & {
  day: number;
  time: number;
  weather: WeatherState;
  money: number;
  energy: number;
  evidence: number;
  ore: number;
  knownNpcIds: string[];
  discoveredBuildingIds: string[];
  discoveredMineIds: string[];
};

const DEFAULT_PROFILE_ID: WorldProfileId = 'world-1';

const cloneSerializable = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const WORLD_PROFILE_DEFINITIONS: Record<WorldProfileId, WorldProfileDefinition> = {
  'world-1': {
    id: 'world-1',
    tag: 'World 1',
    title: 'Core Basin',
    description: 'Balanced starting file. Clear weather, standard cash, standard pressure.',
    day: 1,
    time: 8,
    weather: {
      current: 'CLEAR',
      timeLeft: 4,
      intensity: 0.1,
    },
    money: 1000,
    energy: 100,
    evidence: 0,
    ore: 0,
    knownNpcIds: ['journalist'],
    discoveredBuildingIds: ['player_home', 'hotline_booth', 'chief_hut', 'central_park', 'mine_entrance'],
    discoveredMineIds: ['iron-vein'],
  },
  'world-2': {
    id: 'world-2',
    tag: 'World 2',
    title: 'Storm Ledger',
    description: 'Wet start, lighter cash buffer, and more of the west side already exposed.',
    day: 2,
    time: 6.5,
    weather: {
      current: 'RAIN',
      timeLeft: 5,
      intensity: 0.48,
    },
    money: 900,
    energy: 92,
    evidence: 0,
    ore: 0,
    knownNpcIds: ['journalist', 'chief'],
    discoveredBuildingIds: ['player_home', 'hotline_booth', 'chief_hut', 'central_park', 'mine_entrance', 'union_hall'],
    discoveredMineIds: ['iron-vein'],
  },
  'world-3': {
    id: 'world-3',
    tag: 'World 3',
    title: 'Testing Basin',
    description: 'Fast-start sandbox file. Clear weather, boosted cash, wider discovery, and both core mines already exposed.',
    day: 2,
    time: 10,
    weather: {
      current: 'CLEAR',
      timeLeft: 6,
      intensity: 0.08,
    },
    money: 2200,
    energy: 100,
    evidence: 0,
    ore: 4,
    knownNpcIds: ['journalist', 'licensing', 'chief', 'fixer'],
    discoveredBuildingIds: ['player_home', 'hotline_booth', 'chief_hut', 'central_park', 'mine_entrance', 'licensing_office', 'union_hall', 'fixer_den'],
    discoveredMineIds: ['iron-vein', 'deep-hollow'],
  },
  'world-4': {
    id: 'world-4',
    tag: 'World 4',
    title: 'Frontier Burn',
    description: 'Harsh dawn start with deeper intel, more resources, and a hotter operating climate.',
    day: 4,
    time: 5.5,
    weather: {
      current: 'HEATWAVE',
      timeLeft: 6,
      intensity: 0.64,
    },
    money: 1500,
    energy: 88,
    evidence: 2,
    ore: 2,
    knownNpcIds: ['journalist', 'fixer', 'chief'],
    discoveredBuildingIds: ['player_home', 'hotline_booth', 'chief_hut', 'central_park', 'mine_entrance', 'fixer_den', 'union_hall'],
    discoveredMineIds: ['iron-vein', 'deep-hollow'],
  },
};

export const WORLD_PROFILES: WorldProfileSummary[] = Object.values(WORLD_PROFILE_DEFINITIONS).map(
  ({ id, tag, title, description }) => ({
    id,
    tag,
    title,
    description,
  }),
);

export const getWorldProfile = (worldProfileId?: string | null): WorldProfileDefinition =>
  WORLD_PROFILE_DEFINITIONS[(worldProfileId as WorldProfileId) ?? DEFAULT_PROFILE_ID] ??
  WORLD_PROFILE_DEFINITIONS[DEFAULT_PROFILE_ID];

const applyBuildingDiscovery = (
  buildings: GameWorldState['buildings'],
  discoveredBuildingIds: string[],
): GameWorldState['buildings'] => {
  const discovered = new Set(discoveredBuildingIds);

  return Object.fromEntries(
    Object.entries(buildings).map(([id, building]) => [
      id,
      {
        ...building,
        isDiscovered: discovered.has(id) || ['ROAD', 'SIDEWALK', 'PARK'].includes(building.type),
      },
    ]),
  ) as GameWorldState['buildings'];
};

const applyMineDiscovery = (discoveredMineIds: string[]): Mine[] => {
  const discovered = new Set(discoveredMineIds);

  return cloneSerializable(INITIAL_MINES).map((mine) => ({
    ...mine,
    discovered: discovered.has(mine.id),
  }));
};

export const applyWorldProfileToState = (state: GameState, worldProfileId: WorldProfileId): GameState => {
  const profile = getWorldProfile(worldProfileId);
  const buildings = applyBuildingDiscovery(cloneSerializable(BUILDINGS), profile.discoveredBuildingIds);

  return {
    ...state,
    worldProfileId: profile.id,
    day: profile.day,
    time: profile.time,
    weather: cloneSerializable(profile.weather),
    money: profile.money,
    energy: profile.energy,
    evidence: profile.evidence,
    ore: profile.ore,
    knownNpcIds: [...profile.knownNpcIds],
    buildings,
    mines: applyMineDiscovery(profile.discoveredMineIds),
  };
};
