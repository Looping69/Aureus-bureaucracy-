/**
 * Mine World Data
 *
 * The shaft uses the same VoxelWorldContainer and surface renderer as the normal
 * world. These props deliberately reuse the regular world building kit where it
 * fits, with only small low-cost markers for resource deposits.
 */

import { Building } from './types';
import {
  BUSH_VOXELS,
  FACTORY_VOXELS,
  GENERIC_OFFICE_VOXELS,
  ROAD_CROSS_VOXELS,
  ROAD_EW_VOXELS,
  ROAD_NS_VOXELS,
  STREET_LIGHT_VOXELS,
} from './buildings';
import { BuildingGenerator } from './utils/buildingGenerator';
import { WORLD_HALF_SIZE } from './utils/voxelConstants';

const CHARCOAL = '#30363d';
const SLATE = '#6f7378';
const CONCRETE = '#9ca2a6';
const PALE_STONE = '#c6beb1';
const TIMBER = '#674f3c';
const GLASS = '#8fa3ad';
const WARM_LIGHT = '#d6bb71';
const ORE_AMBER = '#c87941';
const ORE_GOLD = '#e0a840';
const COAL_BLACK = '#1a1a1a';
const COAL_DARK = '#2e2a26';
const GEM_CYAN = '#4fc3d0';
const GEM_PURPLE = '#9b59b6';
const GEM_TEAL = '#1abc9c';
const MINE_DUST = '#8a7a64';

const buildDepositNode = (base: string, vein: string, highlight: string) => {
  const gen = new BuildingGenerator();
  gen.addBox(-3, -3, 0, 3, 3, 0, MINE_DUST);
  gen.addBox(-2, -2, 1, 2, 2, 1, SLATE);
  gen.addBox(-1, -1, 2, 1, 1, 2, base);
  gen.addBox(-1, 0, 3, 1, 0, 3, vein);
  gen.addVoxel(0, 1, 3, highlight);
  gen.addBox(-3, -3, 1, -3, 3, 1, CHARCOAL);
  gen.addBox(3, -3, 1, 3, 3, 1, CHARCOAL);
  return gen.getVoxels();
};

const genEntrance = new BuildingGenerator();
genEntrance.addBox(-5, -2, 0, 5, 4, 0, CONCRETE);
genEntrance.addBox(-5, -2, 1, -4, -1, 5, PALE_STONE);
genEntrance.addBox(4, -2, 1, 5, -1, 5, PALE_STONE);
genEntrance.addBox(-5, -2, 6, 5, -1, 6, CHARCOAL);
genEntrance.addBox(-3, -2, 3, 3, -2, 3, TIMBER);
genEntrance.addBox(-2, -3, 4, 2, -3, 5, SLATE);
genEntrance.addVoxel(0, -3, 6, WARM_LIGHT);
export const MINE_ENTRANCE_ARCH_VOXELS = genEntrance.getVoxels();

export const ORE_NODE_VOXELS = buildDepositNode(SLATE, ORE_AMBER, ORE_GOLD);
export const COAL_NODE_VOXELS = buildDepositNode(COAL_DARK, COAL_BLACK, PALE_STONE);
export const GEM_NODE_VOXELS = buildDepositNode(SLATE, GEM_CYAN, GEM_PURPLE);

const genWarehouse = new BuildingGenerator();
genWarehouse.addBox(-4, -4, 0, 4, 4, 0, CHARCOAL);
genWarehouse.addBox(-4, -4, 1, 4, 4, 1, CONCRETE);
genWarehouse.addHollowBox(-4, -4, 2, 4, 4, 5, PALE_STONE);
genWarehouse.addBox(-2, 4, 2, 2, 4, 4, SLATE);
genWarehouse.addBox(-4, -4, 6, 4, 4, 6, SLATE);
genWarehouse.addBox(-2, -2, 7, 2, 2, 7, CONCRETE);
genWarehouse.addBox(-3, -5, 3, 3, -5, 4, WARM_LIGHT);
export const DELIVERY_ZONE_VOXELS = genWarehouse.getVoxels();

const genMineLamp = new BuildingGenerator();
genMineLamp.addBox(0, 0, 0, 0, 0, 4, CHARCOAL);
genMineLamp.addBox(0, 0, 5, 2, 0, 5, CHARCOAL);
genMineLamp.addVoxel(2, 0, 4, WARM_LIGHT);
export const MINE_LAMP_VOXELS = genMineLamp.getVoxels();

const CX = WORLD_HALF_SIZE;
const CY = WORLD_HALF_SIZE;

const pos = (dx: number, dy: number) => ({ x: CX + dx, y: CY + dy });

export const MINE_WORLD_ENTRANCE_POS = pos(0, -40);

export const MINE_WORLD_BUILDINGS: Record<string, Building> = {
  mine_world_entrance: {
    id: 'mine_world_entrance',
    npcId: 'none',
    name: 'Mine Entrance',
    pos: pos(0, -40),
    type: 'MINE_ENTRANCE',
    isDiscovered: true,
    voxels: MINE_ENTRANCE_ARCH_VOXELS,
  },

  ore_node: {
    id: 'ore_node',
    npcId: 'none',
    name: 'Iron Ore Deposit',
    pos: pos(-25, -15),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A compact iron deposit marker using the standard world material palette.',
    voxels: ORE_NODE_VOXELS,
  },

  coal_node: {
    id: 'coal_node',
    npcId: 'none',
    name: 'Coal Deposit',
    pos: pos(28, -18),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A compact coal deposit marker using the standard world material palette.',
    voxels: COAL_NODE_VOXELS,
  },

  gem_node: {
    id: 'gem_node',
    npcId: 'none',
    name: 'Gem Deposit',
    pos: pos(5, 20),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A compact crystal deposit marker using the standard world material palette.',
    voxels: GEM_NODE_VOXELS,
  },

  loading_zone: {
    id: 'loading_zone',
    npcId: 'none',
    name: 'Loading Bay',
    pos: pos(-30, 30),
    type: 'LOADING_ZONE',
    isDiscovered: true,
    description: 'A standard industrial bay used for brace supplies and staging.',
    voxels: FACTORY_VOXELS,
  },

  unloading_zone: {
    id: 'unloading_zone',
    npcId: 'none',
    name: 'Ore Smelter',
    pos: pos(32, 32),
    type: 'UNLOADING_ZONE',
    isDiscovered: true,
    description: 'A standard industrial smelter using the same visual kit as the normal world.',
    voxels: FACTORY_VOXELS,
  },

  delivery_zone: {
    id: 'delivery_zone',
    npcId: 'none',
    name: 'Storage Warehouse',
    pos: pos(0, 48),
    type: 'DELIVERY_ZONE',
    isDiscovered: true,
    description: 'A compact warehouse matching the normal world building style.',
    voxels: DELIVERY_ZONE_VOXELS,
  },

  path_n1: { id: 'path_n1', npcId: 'none', name: 'Service Road', pos: pos(-12, -28), type: 'ROAD', isDiscovered: true, voxels: ROAD_EW_VOXELS },
  path_n2: { id: 'path_n2', npcId: 'none', name: 'Service Road', pos: pos(0, -28), type: 'ROAD', isDiscovered: true, voxels: ROAD_EW_VOXELS },
  path_n3: { id: 'path_n3', npcId: 'none', name: 'Service Road', pos: pos(14, -28), type: 'ROAD', isDiscovered: true, voxels: ROAD_EW_VOXELS },
  path_w1: { id: 'path_w1', npcId: 'none', name: 'Service Road', pos: pos(-25, 0), type: 'ROAD', isDiscovered: true, voxels: ROAD_NS_VOXELS },
  path_e1: { id: 'path_e1', npcId: 'none', name: 'Service Road', pos: pos(25, 0), type: 'ROAD', isDiscovered: true, voxels: ROAD_NS_VOXELS },
  path_s1: { id: 'path_s1', npcId: 'none', name: 'Service Road', pos: pos(-15, 15), type: 'ROAD', isDiscovered: true, voxels: ROAD_EW_VOXELS },
  path_s2: { id: 'path_s2', npcId: 'none', name: 'Service Road', pos: pos(0, 15), type: 'ROAD', isDiscovered: true, voxels: ROAD_CROSS_VOXELS },
  path_s3: { id: 'path_s3', npcId: 'none', name: 'Service Road', pos: pos(15, 15), type: 'ROAD', isDiscovered: true, voxels: ROAD_EW_VOXELS },
  path_sw: { id: 'path_sw', npcId: 'none', name: 'Service Road', pos: pos(-15, 30), type: 'ROAD', isDiscovered: true, voxels: ROAD_EW_VOXELS },
  path_se: { id: 'path_se', npcId: 'none', name: 'Service Road', pos: pos(15, 30), type: 'ROAD', isDiscovered: true, voxels: ROAD_EW_VOXELS },
  path_sc: { id: 'path_sc', npcId: 'none', name: 'Service Road', pos: pos(0, 35), type: 'ROAD', isDiscovered: true, voxels: ROAD_NS_VOXELS },

  lamp_north: { id: 'lamp_north', npcId: 'none', name: 'Mine Lamp', pos: pos(-8, -30), type: 'LANDMARK', isDiscovered: true, voxels: STREET_LIGHT_VOXELS },
  lamp_west: { id: 'lamp_west', npcId: 'none', name: 'Mine Lamp', pos: pos(-24, 12), type: 'LANDMARK', isDiscovered: true, voxels: MINE_LAMP_VOXELS },
  lamp_east: { id: 'lamp_east', npcId: 'none', name: 'Mine Lamp', pos: pos(24, 12), type: 'LANDMARK', isDiscovered: true, voxels: MINE_LAMP_VOXELS },
  lamp_south: { id: 'lamp_south', npcId: 'none', name: 'Mine Lamp', pos: pos(0, 34), type: 'LANDMARK', isDiscovered: true, voxels: STREET_LIGHT_VOXELS },
  scrub_a: { id: 'scrub_a', npcId: 'none', name: 'Mine Scrub', pos: pos(-42, 45), type: 'LANDMARK', isDiscovered: true, voxels: BUSH_VOXELS },
  scrub_b: { id: 'scrub_b', npcId: 'none', name: 'Mine Scrub', pos: pos(42, 5), type: 'LANDMARK', isDiscovered: true, voxels: BUSH_VOXELS },
  office_marker: { id: 'office_marker', npcId: 'none', name: 'Shaft Office', pos: pos(-42, -5), type: 'LANDMARK', isDiscovered: true, voxels: GENERIC_OFFICE_VOXELS },
};

export const MINE_NODE_YIELDS: Record<string, number> = {
  ore_node: 3,
  coal_node: 2,
  gem_node: 1,
};

export const NODE_HARVEST_COOLDOWN_MS = 8_000;

export const MINE_INTERACTION_RADIUS = 5;
