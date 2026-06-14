/**
 * Mine World Data
 *
 * Resource-only field for the 3D mine world. The shaft scene now uses the same
 * visual/runtime path as the normal world and exposes only mineable resources.
 */

import { Building } from './types';
import { BuildingGenerator } from './utils/buildingGenerator';
import { WORLD_HALF_SIZE } from './utils/voxelConstants';

const ROCK_DARK = '#2f3438';
const ROCK_MID = '#4a4f53';
const ROCK_LIGHT = '#6f757a';
const GROUND_DUST = '#7f705d';
const ORE_AMBER = '#d28a3d';
const ORE_GOLD = '#edbd55';
const COAL = '#141619';
const COAL_SHEEN = '#40454a';
const GEM_CYAN = '#4fc3d0';
const GEM_TEAL = '#1abc9c';
const GEM_PURPLE = '#9b59b6';

const makeResourceNode = (core: string, vein: string, glint: string) => {
  const gen = new BuildingGenerator();
  gen.addBox(-4, -4, 0, 4, 4, 0, GROUND_DUST);
  gen.addBox(-3, -3, 1, 3, 3, 1, ROCK_MID);
  gen.addBox(-2, -2, 2, 2, 2, 3, ROCK_DARK);
  gen.addBox(-1, -1, 4, 1, 1, 4, ROCK_LIGHT);
  gen.addBox(-2, 0, 2, 2, 0, 4, core);
  gen.addBox(-1, 1, 3, 1, 1, 4, vein);
  gen.addVoxel(0, -1, 5, glint);
  gen.addVoxel(2, 1, 3, glint);
  return gen.getVoxels();
};

export const MINE_WORLD_ENTRANCE_POS = {
  x: WORLD_HALF_SIZE,
  y: WORLD_HALF_SIZE - 34,
};

const pos = (dx: number, dy: number) => ({
  x: WORLD_HALF_SIZE + dx,
  y: WORLD_HALF_SIZE + dy,
});

export const MINE_WORLD_BUILDINGS: Record<string, Building> = {
  ore_node: {
    id: 'ore_node',
    npcId: 'none',
    name: 'Iron Ore Deposit',
    pos: pos(-24, -12),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A mineable iron ore deposit.',
    voxels: makeResourceNode(ORE_AMBER, ORE_GOLD, ORE_GOLD),
  },

  coal_node: {
    id: 'coal_node',
    npcId: 'none',
    name: 'Coal Deposit',
    pos: pos(24, -10),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A mineable coal deposit.',
    voxels: makeResourceNode(COAL, COAL_SHEEN, ROCK_LIGHT),
  },

  gem_node: {
    id: 'gem_node',
    npcId: 'none',
    name: 'Gem Deposit',
    pos: pos(0, 22),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A mineable crystal deposit.',
    voxels: makeResourceNode(GEM_CYAN, GEM_TEAL, GEM_PURPLE),
  },
};

export const MINE_NODE_YIELDS: Record<string, number> = {
  ore_node: 3,
  coal_node: 2,
  gem_node: 5,
};

export const NODE_HARVEST_COOLDOWN_MS = 8_000;

export const MINE_INTERACTION_RADIUS = 5;
