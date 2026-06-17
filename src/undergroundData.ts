import { Building, WorldPosition } from './types';
import { WORLD_SIZE } from './utils/voxelConstants';

export type UndergroundResourceType = 'ore' | 'coal' | 'gem' | 'rubble';

type BuildingVoxel = NonNullable<Building['voxels']>[number];

export interface UndergroundResourceNode {
  id: string;
  name: string;
  type: UndergroundResourceType;
  pos: { x: number; y: number };
  capacity: number;
  yield: number;
  hidden?: boolean;
}

export interface UndergroundResourceState extends UndergroundResourceNode {
  remaining: number;
  discovered: boolean;
}

export const UNDERGROUND_SIZE = Math.floor(WORLD_SIZE / 2);
export const UNDERGROUND_START_POS = {
  x: Math.floor(UNDERGROUND_SIZE / 2),
  y: Math.floor(UNDERGROUND_SIZE / 2),
};

export const UNDERGROUND_TERRAIN_CHUNK_SIZE = 8;
export const UNDERGROUND_TERRAIN_HEIGHT = 3;
const UNDERGROUND_START_CLEAR_RADIUS = 6;
const WALL_FRAME_COUNT = 5;

export const getUndergroundCellKey = (pos: WorldPosition) => `${Math.round(pos.x)},${Math.round(pos.y)}`;

const isWithinUndergroundBounds = (x: number, y: number) =>
  x >= 0 && x < UNDERGROUND_SIZE && y >= 0 && y < UNDERGROUND_SIZE;

export const isUndergroundTerrainSolid = (
  pos: WorldPosition,
  clearedCells: ReadonlySet<string>,
) => {
  const x = Math.round(pos.x);
  const y = Math.round(pos.y);

  if (!isWithinUndergroundBounds(x, y)) return false;
  return !clearedCells.has(getUndergroundCellKey({ x, y }));
};

export const createInitialClearedUndergroundCells = () => {
  const clearedCells = new Set<string>();

  for (let x = UNDERGROUND_START_POS.x - UNDERGROUND_START_CLEAR_RADIUS; x <= UNDERGROUND_START_POS.x + UNDERGROUND_START_CLEAR_RADIUS; x += 1) {
    for (let y = UNDERGROUND_START_POS.y - UNDERGROUND_START_CLEAR_RADIUS; y <= UNDERGROUND_START_POS.y + UNDERGROUND_START_CLEAR_RADIUS; y += 1) {
      if (!isWithinUndergroundBounds(x, y)) continue;
      if (Math.hypot(x - UNDERGROUND_START_POS.x, y - UNDERGROUND_START_POS.y) > UNDERGROUND_START_CLEAR_RADIUS) continue;
      clearedCells.add(getUndergroundCellKey({ x, y }));
    }
  }

  return clearedCells;
};

const terrainPalette = ['#44484c', '#53575b', '#62666a', '#383c40'];

const getTerrainVoxelColor = (x: number, y: number, z: number) => {
  const colorIndex = Math.abs((x * 17 + y * 31 + z * 7) % terrainPalette.length);
  return terrainPalette[colorIndex];
};

export const buildUndergroundTerrainBuildings = (
  clearedCells: ReadonlySet<string>,
): Building[] => {
  const chunks = new Map<string, { originX: number; originY: number; voxels: BuildingVoxel[] }>();

  for (let x = 0; x < UNDERGROUND_SIZE; x += 1) {
    for (let y = 0; y < UNDERGROUND_SIZE; y += 1) {
      if (!isUndergroundTerrainSolid({ x, y }, clearedCells)) continue;

      const chunkX = Math.floor(x / UNDERGROUND_TERRAIN_CHUNK_SIZE);
      const chunkY = Math.floor(y / UNDERGROUND_TERRAIN_CHUNK_SIZE);
      const chunkKey = `${chunkX},${chunkY}`;
      const originX = chunkX * UNDERGROUND_TERRAIN_CHUNK_SIZE;
      const originY = chunkY * UNDERGROUND_TERRAIN_CHUNK_SIZE;
      let chunk = chunks.get(chunkKey);

      if (!chunk) {
        chunk = { originX, originY, voxels: [] };
        chunks.set(chunkKey, chunk);
      }

      for (let z = 0; z < UNDERGROUND_TERRAIN_HEIGHT; z += 1) {
        chunk.voxels.push({
          id: chunk.voxels.length + 1,
          x: x - originX,
          y: y - originY,
          z,
          c: getTerrainVoxelColor(x, y, z),
        });
      }
    }
  }

  return Array.from(chunks.entries()).map(([chunkKey, chunk]) => ({
    id: `underground_terrain_${chunkKey.replace(',', '_')}`,
    npcId: 'none',
    name: 'Dense Stone',
    pos: { x: chunk.originX, y: chunk.originY },
    type: 'INDUSTRIAL',
    isDiscovered: true,
    description: 'A meshed block of gray underground stone.',
    voxels: chunk.voxels,
  }));
};

export const UNDERGROUND_RESOURCES: UndergroundResourceNode[] = [
  { id: 'underground_wall_1', name: 'Stone Wall', type: 'rubble', pos: { x: 86, y: 88 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_2', name: 'Stone Wall', type: 'rubble', pos: { x: 91, y: 88 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_3', name: 'Stone Wall', type: 'rubble', pos: { x: 96, y: 88 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_4', name: 'Stone Wall', type: 'rubble', pos: { x: 101, y: 88 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_5', name: 'Stone Wall', type: 'rubble', pos: { x: 102, y: 94 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_6', name: 'Stone Wall', type: 'rubble', pos: { x: 102, y: 100 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_7', name: 'Stone Wall', type: 'rubble', pos: { x: 92, y: 104 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_8', name: 'Stone Wall', type: 'rubble', pos: { x: 98, y: 108 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_9', name: 'Stone Wall', type: 'rubble', pos: { x: 110, y: 102 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_10', name: 'Stone Wall', type: 'rubble', pos: { x: 116, y: 102 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_wall_11', name: 'Stone Wall', type: 'rubble', pos: { x: 122, y: 102 }, capacity: WALL_FRAME_COUNT, yield: 0 },
  { id: 'underground_ore_1', name: 'Iron Seam', type: 'ore', pos: { x: 72, y: 78 }, capacity: 4, yield: 2 },
  { id: 'underground_ore_2', name: 'Copper Vein', type: 'ore', pos: { x: 106, y: 74 }, capacity: 5, yield: 2, hidden: true },
  { id: 'underground_ore_3', name: 'Buried Iron Pocket', type: 'ore', pos: { x: 108, y: 98 }, capacity: 4, yield: 2, hidden: true },
  { id: 'underground_coal_1', name: 'Coal Pocket', type: 'coal', pos: { x: 63, y: 112 }, capacity: 3, yield: 1 },
  { id: 'underground_coal_2', name: 'Char Ridge', type: 'coal', pos: { x: 126, y: 106 }, capacity: 4, yield: 1, hidden: true },
  { id: 'underground_gem_1', name: 'Quartz Bloom', type: 'gem', pos: { x: 95, y: 126 }, capacity: 3, yield: 4, hidden: true },
  { id: 'underground_gem_2', name: 'Amber Cluster', type: 'gem', pos: { x: 138, y: 84 }, capacity: 2, yield: 5, hidden: true },
];

const resourcePalette: Record<UndergroundResourceType, string[]> = {
  ore: ['#8b5e3c', '#b87333', '#d19a66', '#5a3b2b'],
  coal: ['#1f2933', '#2d3748', '#4a5568', '#111827'],
  gem: ['#115e59', '#14b8a6', '#67e8f9', '#fef3c7'],
  rubble: ['#51483e', '#463e36', '#39332d', '#2d2925'],
};

const makeWallVoxels = (node: UndergroundResourceState) => {
  const colors = resourcePalette.rubble;
  const frame = Math.max(0, Math.min(WALL_FRAME_COUNT - 1, WALL_FRAME_COUNT - node.remaining));
  const halfWidth = Math.max(1, 4 - frame);
  const depth = Math.max(1, 3 - Math.floor(frame / 2));
  const height = Math.max(1, 4 - frame);
  const voxels: BuildingVoxel[] = [];
  let id = 1;

  for (let x = -halfWidth; x <= halfWidth; x += 1) {
    for (let y = -Math.floor(depth / 2); y <= Math.floor(depth / 2); y += 1) {
      for (let z = 0; z < height; z += 1) {
        const edge = Math.abs(x) === halfWidth || z === height - 1;
        voxels.push({
          id: id++,
          x,
          y,
          z,
          c: edge ? colors[Math.min(frame + 1, colors.length - 1)] : colors[frame % colors.length],
        });
      }
    }
  }

  return voxels;
};

const makeResourceVoxels = (node: UndergroundResourceState) => {
  if (node.type === 'rubble') return makeWallVoxels(node);

  const colors = resourcePalette[node.type];
  const height = Math.max(1, Math.ceil(node.remaining / 2));
  const voxels: BuildingVoxel[] = [];
  let id = 1;

  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      const distance = Math.abs(x) + Math.abs(y);
      if (distance > 2) continue;

      for (let z = 0; z < height; z += 1) {
        if (z > 0 && distance > 1) continue;
        voxels.push({
          id: id++,
          x,
          y,
          z,
          c: colors[(id + x + y + z + colors.length) % colors.length],
        });
      }
    }
  }

  return voxels;
};

export const createInitialUndergroundResources = (): UndergroundResourceState[] =>
  UNDERGROUND_RESOURCES.map((node) => ({
    ...node,
    remaining: node.capacity,
    discovered: !node.hidden,
  }));

export const buildUndergroundResourceBuildings = (
  resources: UndergroundResourceState[],
): Building[] =>
  resources
    .filter((node) => node.remaining > 0 && node.discovered)
    .map((node) => ({
      id: node.id,
      npcId: 'none',
      name: node.name,
      pos: node.pos,
      type: node.type === 'rubble' ? 'INDUSTRIAL' : 'MINE_ENTRANCE',
      isDiscovered: true,
      description: node.type === 'rubble'
        ? `${node.remaining} wall frames remain.`
        : `${node.remaining} workable chunks remain.`,
      voxels: makeResourceVoxels(node),
    }));