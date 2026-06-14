/**
 * Mine World Data
 *
 * Purpose-built shaft art for the 3D mining level. The mechanics depend on the
 * stable building ids below, so this file only changes presentation and layout.
 */

import { Building } from './types';
import { BuildingGenerator } from './utils/buildingGenerator';
import { WORLD_HALF_SIZE } from './utils/voxelConstants';

const BASALT = '#2f3438';
const DARK_ROCK = '#1f2327';
const MID_ROCK = '#4a4f53';
const LIGHT_ROCK = '#6f757a';
const FLOOR_DUST = '#7f705d';
const TRACK_STEEL = '#6b7280';
const TRACK_DARK = '#2f363d';
const TIMBER = '#6b4f38';
const TIMBER_DARK = '#3e2f24';
const LAMP_GLOW = '#f2c879';
const LAMP_BLUE = '#76a9b7';
const ORE_AMBER = '#d28a3d';
const ORE_GOLD = '#edbd55';
const COAL = '#141619';
const COAL_SHEEN = '#40454a';
const GEM_CYAN = '#4fc3d0';
const GEM_TEAL = '#1abc9c';
const GEM_PURPLE = '#9b59b6';
const STEEL = '#8c949b';
const STEEL_DARK = '#414951';
const SAFETY_BLUE = '#3b82f6';
const SMELTER_RED = '#a84034';
const FURNACE_ORANGE = '#d97706';
const STORAGE_GREEN = '#2f8f54';
const CANVAS = '#b49b74';

const makeFloorTile = (accent: string = FLOOR_DUST) => {
  const gen = new BuildingGenerator();
  gen.addBox(-7, -7, 0, 7, 7, 0, accent);
  gen.addBox(-1, -7, 1, -1, 7, 1, TRACK_STEEL);
  gen.addBox(1, -7, 1, 1, 7, 1, TRACK_STEEL);
  gen.addBox(0, -7, 1, 0, 7, 1, TRACK_DARK);
  gen.addVoxel(-5, -5, 1, MID_ROCK);
  gen.addVoxel(5, 4, 1, MID_ROCK);
  return gen.getVoxels();
};

const makeCrossingTile = () => {
  const gen = new BuildingGenerator();
  gen.addBox(-7, -7, 0, 7, 7, 0, FLOOR_DUST);
  gen.addBox(-1, -7, 1, -1, 7, 1, TRACK_STEEL);
  gen.addBox(1, -7, 1, 1, 7, 1, TRACK_STEEL);
  gen.addBox(-7, -1, 1, 7, -1, 1, TRACK_STEEL);
  gen.addBox(-7, 1, 1, 7, 1, 1, TRACK_STEEL);
  gen.addBox(-2, -2, 1, 2, 2, 1, STEEL_DARK);
  gen.addVoxel(0, 0, 2, LAMP_GLOW);
  return gen.getVoxels();
};

const makeSupportRib = () => {
  const gen = new BuildingGenerator();
  gen.addBox(-5, -1, 0, -4, 1, 6, TIMBER_DARK);
  gen.addBox(4, -1, 0, 5, 1, 6, TIMBER_DARK);
  gen.addBox(-5, -1, 6, 5, 1, 7, TIMBER);
  gen.addBox(-3, 0, 4, 3, 0, 4, TIMBER);
  gen.addVoxel(0, 0, 8, LAMP_GLOW);
  return gen.getVoxels();
};

const makeLamp = () => {
  const gen = new BuildingGenerator();
  gen.addBox(0, 0, 0, 0, 0, 4, STEEL_DARK);
  gen.addBox(0, 0, 4, 2, 0, 4, STEEL_DARK);
  gen.addVoxel(2, 0, 3, LAMP_GLOW);
  gen.addVoxel(2, 0, 4, LAMP_BLUE);
  return gen.getVoxels();
};

const makeMineCart = (loadColor: string) => {
  const gen = new BuildingGenerator();
  gen.addBox(-2, -1, 1, 2, 1, 2, STEEL_DARK);
  gen.addBox(-1, -1, 3, 1, 1, 3, loadColor);
  gen.addVoxel(-2, -1, 0, COAL);
  gen.addVoxel(2, -1, 0, COAL);
  gen.addVoxel(-2, 1, 0, COAL);
  gen.addVoxel(2, 1, 0, COAL);
  return gen.getVoxels();
};

const makeOreFace = (core: string, vein: string, glint: string) => {
  const gen = new BuildingGenerator();
  gen.addBox(-5, -3, 0, 5, 3, 0, FLOOR_DUST);
  gen.addBox(-4, -2, 1, 4, 2, 3, BASALT);
  gen.addBox(-3, -1, 4, 3, 1, 5, DARK_ROCK);
  gen.addBox(-2, 0, 2, 2, 0, 5, core);
  gen.addBox(-3, 1, 3, -1, 1, 5, vein);
  gen.addVoxel(2, -1, 4, glint);
  gen.addVoxel(0, 0, 6, glint);
  gen.addBox(-5, -3, 1, -5, 3, 4, TIMBER_DARK);
  gen.addBox(5, -3, 1, 5, 3, 4, TIMBER_DARK);
  gen.addBox(-5, -3, 5, 5, 3, 5, TIMBER);
  return gen.getVoxels();
};

const makeBraceDepot = () => {
  const gen = new BuildingGenerator();
  gen.addBox(-5, -4, 0, 5, 4, 0, STEEL_DARK);
  gen.addBox(-5, -4, 1, 5, 4, 1, STEEL);
  gen.addBox(-4, -3, 2, 4, -3, 4, SAFETY_BLUE);
  gen.addBox(-4, 3, 2, 4, 3, 4, SAFETY_BLUE);
  gen.addBox(-3, -1, 2, 3, 1, 3, TIMBER);
  gen.addBox(-4, -4, 5, 4, -4, 5, SAFETY_BLUE);
  gen.addBox(-2, 2, 2, -1, 3, 4, CANVAS);
  gen.addBox(1, 2, 2, 2, 3, 4, CANVAS);
  gen.addVoxel(0, -4, 6, LAMP_GLOW);
  return gen.getVoxels();
};

const makeCrusherSmelter = () => {
  const gen = new BuildingGenerator();
  gen.addBox(-6, -5, 0, 6, 5, 0, STEEL_DARK);
  gen.addBox(-5, -4, 1, 5, 4, 3, SMELTER_RED);
  gen.addBox(-2, 5, 2, 2, 5, 4, FURNACE_ORANGE);
  gen.addBox(-1, 5, 2, 1, 5, 3, LAMP_GLOW);
  gen.addBox(-5, -5, 4, 5, -5, 5, STEEL);
  gen.addBox(-4, 1, 4, 4, 2, 5, STEEL_DARK);
  gen.addBox(-4, -4, 4, -3, -3, 9, DARK_ROCK);
  gen.addBox(3, -4, 4, 4, -3, 8, DARK_ROCK);
  gen.addVoxel(-4, -4, 10, LIGHT_ROCK);
  gen.addVoxel(4, -4, 9, LIGHT_ROCK);
  return gen.getVoxels();
};

const makeHoistWarehouse = () => {
  const gen = new BuildingGenerator();
  gen.addBox(-6, -5, 0, 6, 5, 0, STEEL_DARK);
  gen.addBox(-5, -4, 1, 5, 4, 4, STORAGE_GREEN);
  gen.addBox(-2, 5, 1, 2, 5, 4, STEEL);
  gen.addBox(-6, -5, 5, 6, 5, 5, DARK_ROCK);
  gen.addBox(-4, -3, 6, 4, 3, 6, STEEL_DARK);
  gen.addBox(-3, -2, 7, 3, 2, 7, STEEL);
  gen.addBox(-1, -1, 8, 1, 1, 10, TIMBER_DARK);
  gen.addBox(-5, -6, 3, 5, -6, 4, LAMP_GLOW);
  return gen.getVoxels();
};

const makeEntrance = () => {
  const gen = new BuildingGenerator();
  gen.addBox(-6, -2, 0, 6, 4, 0, FLOOR_DUST);
  gen.addBox(-6, -2, 1, -4, 0, 6, BASALT);
  gen.addBox(4, -2, 1, 6, 0, 6, BASALT);
  gen.addBox(-6, -2, 7, 6, 0, 8, DARK_ROCK);
  gen.addBox(-4, -2, 4, 4, -2, 4, TIMBER);
  gen.addBox(-2, -3, 5, 2, -3, 6, STEEL_DARK);
  gen.addVoxel(0, -3, 7, LAMP_GLOW);
  return gen.getVoxels();
};

const ORE_NODE_VOXELS = makeOreFace(ORE_AMBER, ORE_GOLD, LAMP_GLOW);
const COAL_NODE_VOXELS = makeOreFace(COAL, COAL_SHEEN, LIGHT_ROCK);
const GEM_NODE_VOXELS = makeOreFace(GEM_CYAN, GEM_TEAL, GEM_PURPLE);
const SHAFT_FLOOR_NS_VOXELS = makeFloorTile(FLOOR_DUST);
const SHAFT_FLOOR_EW_VOXELS = makeFloorTile('#887867');
const SHAFT_CROSSING_VOXELS = makeCrossingTile();
const SUPPORT_RIB_VOXELS = makeSupportRib();
const MINE_LAMP_VOXELS = makeLamp();
const ORE_CART_VOXELS = makeMineCart(ORE_AMBER);
const COAL_CART_VOXELS = makeMineCart(COAL_SHEEN);
const GEM_CART_VOXELS = makeMineCart(GEM_CYAN);
const BRACE_DEPOT_VOXELS = makeBraceDepot();
const CRUSHER_SMELTER_VOXELS = makeCrusherSmelter();
const HOIST_WAREHOUSE_VOXELS = makeHoistWarehouse();
const MINE_ENTRANCE_VOXELS = makeEntrance();

const CX = WORLD_HALF_SIZE;
const CY = WORLD_HALF_SIZE;
const pos = (dx: number, dy: number) => ({ x: CX + dx, y: CY + dy });

export const MINE_WORLD_ENTRANCE_POS = pos(0, -40);

export const MINE_WORLD_BUILDINGS: Record<string, Building> = {
  mine_world_entrance: {
    id: 'mine_world_entrance',
    npcId: 'none',
    name: 'Shaft Mouth',
    pos: pos(0, -40),
    type: 'MINE_ENTRANCE',
    isDiscovered: true,
    voxels: MINE_ENTRANCE_VOXELS,
  },

  ore_node: {
    id: 'ore_node',
    npcId: 'none',
    name: 'Iron Ore Face',
    pos: pos(-25, -15),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A reinforced iron face with visible amber veins.',
    voxels: ORE_NODE_VOXELS,
  },

  coal_node: {
    id: 'coal_node',
    npcId: 'none',
    name: 'Coal Face',
    pos: pos(28, -18),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A dark coal face braced into the east drift.',
    voxels: COAL_NODE_VOXELS,
  },

  gem_node: {
    id: 'gem_node',
    npcId: 'none',
    name: 'Gem Pocket',
    pos: pos(5, 20),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A crystal pocket glowing in the south drift.',
    voxels: GEM_NODE_VOXELS,
  },

  loading_zone: {
    id: 'loading_zone',
    npcId: 'none',
    name: 'Brace Depot',
    pos: pos(-30, 30),
    type: 'LOADING_ZONE',
    isDiscovered: true,
    description: 'A blue-painted supply depot where brace charges are restocked.',
    voxels: BRACE_DEPOT_VOXELS,
  },

  unloading_zone: {
    id: 'unloading_zone',
    npcId: 'none',
    name: 'Crusher Smelter',
    pos: pos(32, 32),
    type: 'UNLOADING_ZONE',
    isDiscovered: true,
    description: 'A compact crusher and furnace for processing ore and coal.',
    voxels: CRUSHER_SMELTER_VOXELS,
  },

  delivery_zone: {
    id: 'delivery_zone',
    npcId: 'none',
    name: 'Hoist Warehouse',
    pos: pos(0, 48),
    type: 'DELIVERY_ZONE',
    isDiscovered: true,
    description: 'A lift house where carried materials are secured for export.',
    voxels: HOIST_WAREHOUSE_VOXELS,
  },

  path_n1: { id: 'path_n1', npcId: 'none', name: 'Rail Drift', pos: pos(-12, -28), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_EW_VOXELS },
  path_n2: { id: 'path_n2', npcId: 'none', name: 'Rail Drift', pos: pos(0, -28), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_EW_VOXELS },
  path_n3: { id: 'path_n3', npcId: 'none', name: 'Rail Drift', pos: pos(14, -28), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_EW_VOXELS },
  path_w1: { id: 'path_w1', npcId: 'none', name: 'West Drift', pos: pos(-25, 0), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_NS_VOXELS },
  path_e1: { id: 'path_e1', npcId: 'none', name: 'East Drift', pos: pos(25, 0), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_NS_VOXELS },
  path_s1: { id: 'path_s1', npcId: 'none', name: 'South Drift', pos: pos(-15, 15), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_EW_VOXELS },
  path_s2: { id: 'path_s2', npcId: 'none', name: 'Central Switch', pos: pos(0, 15), type: 'ROAD', isDiscovered: true, voxels: SHAFT_CROSSING_VOXELS },
  path_s3: { id: 'path_s3', npcId: 'none', name: 'South Drift', pos: pos(15, 15), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_EW_VOXELS },
  path_sw: { id: 'path_sw', npcId: 'none', name: 'Depot Spur', pos: pos(-15, 30), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_EW_VOXELS },
  path_se: { id: 'path_se', npcId: 'none', name: 'Smelter Spur', pos: pos(15, 30), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_EW_VOXELS },
  path_sc: { id: 'path_sc', npcId: 'none', name: 'Hoist Track', pos: pos(0, 35), type: 'ROAD', isDiscovered: true, voxels: SHAFT_FLOOR_NS_VOXELS },

  rib_north: { id: 'rib_north', npcId: 'none', name: 'Timber Rib', pos: pos(0, -14), type: 'LANDMARK', isDiscovered: true, voxels: SUPPORT_RIB_VOXELS },
  rib_west: { id: 'rib_west', npcId: 'none', name: 'Timber Rib', pos: pos(-24, 12), type: 'LANDMARK', isDiscovered: true, voxels: SUPPORT_RIB_VOXELS },
  rib_east: { id: 'rib_east', npcId: 'none', name: 'Timber Rib', pos: pos(24, 12), type: 'LANDMARK', isDiscovered: true, voxels: SUPPORT_RIB_VOXELS },
  rib_south: { id: 'rib_south', npcId: 'none', name: 'Timber Rib', pos: pos(0, 32), type: 'LANDMARK', isDiscovered: true, voxels: SUPPORT_RIB_VOXELS },

  lamp_north: { id: 'lamp_north', npcId: 'none', name: 'Shaft Lamp', pos: pos(-8, -30), type: 'LANDMARK', isDiscovered: true, voxels: MINE_LAMP_VOXELS },
  lamp_west: { id: 'lamp_west', npcId: 'none', name: 'Shaft Lamp', pos: pos(-35, 2), type: 'LANDMARK', isDiscovered: true, voxels: MINE_LAMP_VOXELS },
  lamp_east: { id: 'lamp_east', npcId: 'none', name: 'Shaft Lamp', pos: pos(35, 2), type: 'LANDMARK', isDiscovered: true, voxels: MINE_LAMP_VOXELS },
  lamp_south: { id: 'lamp_south', npcId: 'none', name: 'Shaft Lamp', pos: pos(8, 34), type: 'LANDMARK', isDiscovered: true, voxels: MINE_LAMP_VOXELS },

  cart_ore: { id: 'cart_ore', npcId: 'none', name: 'Ore Cart', pos: pos(-18, -8), type: 'LANDMARK', isDiscovered: true, voxels: ORE_CART_VOXELS },
  cart_coal: { id: 'cart_coal', npcId: 'none', name: 'Coal Cart', pos: pos(18, -8), type: 'LANDMARK', isDiscovered: true, voxels: COAL_CART_VOXELS },
  cart_gem: { id: 'cart_gem', npcId: 'none', name: 'Gem Cart', pos: pos(5, 12), type: 'LANDMARK', isDiscovered: true, voxels: GEM_CART_VOXELS },
};

export const MINE_NODE_YIELDS: Record<string, number> = {
  ore_node: 3,
  coal_node: 2,
  gem_node: 1,
};

export const NODE_HARVEST_COOLDOWN_MS = 8_000;

export const MINE_INTERACTION_RADIUS = 5;
