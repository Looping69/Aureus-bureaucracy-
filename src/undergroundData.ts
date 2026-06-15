import { Building } from './types';
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

const WALL_FRAME_COUNT = 5;

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
