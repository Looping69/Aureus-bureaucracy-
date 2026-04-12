import { GameState, VoxelData, WorldPosition, WorldPickup } from '../types';
import { COLORS, WORLD_HALF_SIZE, WORLD_SIZE } from '../utils/voxelConstants';
import { WorldSurfaceMap, buildWorldSurfaceMap, getWorldSurfaceTile } from '../utils/worldSurface';

const STREET_PICKUP_TARGET_COUNT = 12;
const STREET_PICKUP_RESTORE = 10;
const STREET_PICKUP_KINDS = new Set<string>(['ROAD', 'SIDEWALK']);

type CollectionResult = {
  nextState: GameState;
  notifications: { title: string; msg: string }[];
};

const keyFor = (position: WorldPosition) => `${Math.round(position.x)},${Math.round(position.y)}`;

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const buildSpawnCandidates = (
  surfaceMap: WorldSurfaceMap,
  blocked: Set<string>,
) => {
  const candidates: WorldPosition[] = [];

  for (const tile of surfaceMap.tiles.values()) {
    if (!tile.walkable || !STREET_PICKUP_KINDS.has(tile.kind)) continue;
    const key = keyFor(tile);
    if (blocked.has(key)) continue;
    candidates.push({ x: tile.x, y: tile.y });
  }

  return shuffle(candidates);
};

const refillStreetPickups = (
  existing: WorldPickup[],
  surfaceMap: WorldSurfaceMap,
  excludedPositions: WorldPosition[] = [],
) => {
  const blocked = new Set<string>([
    ...existing.map((pickup) => keyFor(pickup.pos)),
    ...excludedPositions.map((position) => keyFor(position)),
  ]);

  const next = [...existing];
  const candidates = buildSpawnCandidates(surfaceMap, blocked);

  while (next.length < STREET_PICKUP_TARGET_COUNT && candidates.length > 0) {
    const pos = candidates.pop();
    if (!pos) break;

    next.push({
      id: `street-pickup-${pos.x}-${pos.y}-${Math.random().toString(36).slice(2, 8)}`,
      pos,
      energyRestore: STREET_PICKUP_RESTORE,
    });
  }

  return next;
};

export const createInitialStreetPickups = (
  buildings: GameState['buildings'],
  excludedPositions: WorldPosition[] = [],
): WorldPickup[] => {
  const surfaceMap = buildWorldSurfaceMap(buildings, WORLD_SIZE);
  return refillStreetPickups([], surfaceMap, excludedPositions);
};

export const resolveStreetPickupCollection = (
  state: GameState,
  position: WorldPosition,
  surfaceMap: WorldSurfaceMap,
): CollectionResult => {
  const pickup = state.streetPickups.find((candidate) => keyFor(candidate.pos) === keyFor(position));
  if (!pickup) {
    return { nextState: state, notifications: [] };
  }

  const restored = Math.min(pickup.energyRestore, Math.max(0, state.maxEnergy - state.energy));
  const remainingPickups = state.streetPickups.filter((candidate) => candidate.id !== pickup.id);
  const replenished = refillStreetPickups(remainingPickups, surfaceMap, [position]);

  const notifications = restored > 0
    ? [{
      title: 'Stamina Restored',
      msg: `Collected a gold block and restored ${restored} stamina.`,
    }]
    : [{
      title: 'Gold Block Collected',
      msg: 'You picked it up, but your stamina was already full.',
    }];

  return {
    nextState: {
      ...state,
      energy: Math.min(state.maxEnergy, state.energy + pickup.energyRestore),
      streetPickups: replenished,
    },
    notifications,
  };
};

export const buildStreetPickupVoxels = (
  pickups: WorldPickup[],
  surfaceMap: WorldSurfaceMap,
): VoxelData[] => {
  const voxels: VoxelData[] = [];

  pickups.forEach((pickup) => {
    const tile = getWorldSurfaceTile(surfaceMap, pickup.pos.x, pickup.pos.y);
    if (!tile) return;

    const x = pickup.pos.x - WORLD_HALF_SIZE;
    const z = pickup.pos.y - WORLD_HALF_SIZE;
    const baseY = tile.height + 1;

    // Keep pickups visually tiny: one gold voxel, roughly arm-sized relative to the player.
    voxels.push({ x, y: baseY, z, color: COLORS.GOLD });
  });

  return voxels;
};
