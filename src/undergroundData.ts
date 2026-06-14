import { Building } from './types';
import { WORLD_SIZE } from './utils/voxelConstants';

export type UndergroundResourceType = 'ore' | 'coal' | 'gem';

export interface UndergroundResourceNode {
  id: string;
  name: string;
  type: UndergroundResourceType;
  pos: { x: number; y: number };
  capacity: number;
  yield: number;
}

export interface UndergroundResourceState extends UndergroundResourceNode {
  remaining: number;
}

export const UNDERGROUND_SIZE = Math.floor(WORLD_SIZE / 2);
export const UNDERGROUND_START_POS = {
  x: Math.floor(UNDERGROUND_SIZE / 2),
  y: Math.floor(UNDERGROUND_SIZE / 2),
};

export const UNDERGROUND_RESOURCES: UndergroundResourceNode[] = [
  { id: 'underground_ore_1', name: 'Iron Seam', type: 'ore', pos: { x: 72, y: 78 }, capacity: 4, yield: 2 },
  { id: 'underground_ore_2', name: 'Copper Vein', type: 'ore', pos: { x: 106, y: 74 }, capacity: 5, yield: 2 },
  { id: 'underground_coal_1', name: 'Coal Pocket', type: 'coal', pos: { x: 63, y: 112 }, capacity: 3, yield: 1 },
  { id: 'underground_coal_2', name: 'Char Ridge', type: 'coal', pos: { x: 126, y: 106 }, capacity: 4, yield: 1 },
  { id: 'underground_gem_1', name: 'Quartz Bloom', type: 'gem', pos: { x: 95, y: 126 }, capacity: 3, yield: 4 },
  { id: 'underground_gem_2', name: 'Amber Cluster', type: 'gem', pos: { x: 138, y: 84 }, capacity: 2, yield: 5 },
];

const resourcePalette: Record<UndergroundResourceType, string[]> = {
  ore: ['#8b5e3c', '#b87333', '#d19a66', '#5a3b2b'],
  coal: ['#1f2933', '#2d3748', '#4a5568', '#111827'],
  gem: ['#115e59', '#14b8a6', '#67e8f9', '#fef3c7'],
};

const makeResourceVoxels = (node: UndergroundResourceState) => {
  const colors = resourcePalette[node.type];
  const height = Math.max(1, Math.ceil(node.remaining / 2));
  const voxels: Building['voxels'] = [];
  let id = 1;

  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      const distance = Math.abs(x) + Math.abs(y);
      if (distance > 2) continue;

      for (let z = 0; z < height; z += 1) {
        if (z > 0 && distance > 1) continue;
        voxels.push({
          id: id++ ,
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
  UNDERGROUND_RESOURCES.map((node) => ({ ...node, remaining: node.capacity }));

export const buildUndergroundResourceBuildings = (
  resources: UndergroundResourceState[],
): Building[] =>
  resources
    .filter((node) => node.remaining > 0)
    .map((node) => ({
      id: node.id,
      npcId: 'none',
      name: node.name,
      pos: node.pos,
      type: 'MINE_ENTRANCE',
      isDiscovered: true,
      description: `${node.remaining} workable chunks remain.`,
      voxels: makeResourceVoxels(node),
    }));
