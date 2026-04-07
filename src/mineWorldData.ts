/**
 * Mine World Data
 * Defines the 3-D voxel terrain, extraction nodes, loading / unloading zones,
 * delivery storage, and mine entrance for the walkable mine world scene.
 *
 * All buildings are placed in the central 80×80 area of the 240×240 world grid
 * so the surrounding terrain provides natural rocky-hill variety.
 */

import { Building } from './types';
import { BuildingGenerator } from './utils/buildingGenerator';

// ─── colour palette ──────────────────────────────────────────────────────────
const DARK_ROCK   = '#2d2d2d';
const MID_ROCK    = '#4a4540';
const PALE_ROCK   = '#7a7068';
const ORE_AMBER   = '#c87941';
const ORE_GOLD    = '#e0a840';
const COAL_BLACK  = '#1a1a1a';
const COAL_DARK   = '#2e2a26';
const GEM_CYAN    = '#4fc3d0';
const GEM_PURPLE  = '#9b59b6';
const GEM_TEAL    = '#1abc9c';
const METAL_GREY  = '#6b7280';
const METAL_DARK  = '#374151';
const METAL_LIGHT = '#9ca3af';
const CONVEYOR    = '#4b5563';
const CONVEYOR_ST = '#fbbf24';
const BRICK_RED   = '#8b3a3a';
const BRICK_DARK  = '#5c2626';
const FURNACE_ORG = '#d97706';
const FURNACE_YLW = '#fbbf24';
const WAREHOUSE   = '#d6cfc4';
const WAREHOUSE_D = '#9ca2a6';
const TIMBER      = '#674f3c';
const ARCH_STONE  = '#8a7f72';
const DIRT_BROWN  = '#7c5c3c';
const PATH_GRAVEL = '#b0a898';
const SIGNAL_YLW  = '#f59e0b';

// Beacon / indicator colours (vivid, eye-catching)
const BEACON_ORE     = '#ff8c00';  // bright orange-amber
const BEACON_COAL    = '#64748b';  // cool slate-grey
const BEACON_GEM     = '#06b6d4';  // vivid cyan
const BEACON_SMELTER = '#ef4444';  // hot red
const BEACON_STORAGE = '#22c55e';  // bright green
const BEACON_LOADING = '#3b82f6';  // bright blue
const BEACON_WHITE   = '#fef9c3';  // warm glow cap

// ─── extraction node: iron ore ────────────────────────────────────────────────
const genOreNode = new BuildingGenerator();
// Base rocky mound
genOreNode.addBox(-3, -3, 0, 3, 3, 0, MID_ROCK);
genOreNode.addBox(-2, -2, 1, 2, 2, 1, DARK_ROCK);
genOreNode.addBox(-2, -2, 2, 2, 2, 2, MID_ROCK);
genOreNode.addBox(-1, -1, 3, 1, 1, 3, PALE_ROCK);
// Ore veins
genOreNode.addBox(-2,  0, 1,  0,  1, 1, ORE_AMBER);
genOreNode.addBox( 1, -2, 2,  2, -1, 2, ORE_GOLD);
genOreNode.addBox(-1,  1, 3,  0,  1, 3, ORE_AMBER);
// Ground patch
genOreNode.addBox(-4, -4, 0, 4, 4, 0, DIRT_BROWN);
// ── Beacon pillar: tall amber column with glowing cap ──
genOreNode.addBox(4, -4, 1, 4, -4, 8, BEACON_ORE);
genOreNode.addBox(4, -4, 9, 4, -4, 9, BEACON_WHITE);
genOreNode.addBox(3, -4, 9, 3, -4, 9, BEACON_ORE);
genOreNode.addBox(4, -3, 9, 4, -3, 9, BEACON_ORE);
export const ORE_NODE_VOXELS = genOreNode.getVoxels();

// ─── extraction node: coal ────────────────────────────────────────────────────
const genCoalNode = new BuildingGenerator();
genCoalNode.addBox(-3, -3, 0, 3, 3, 0, COAL_DARK);
genCoalNode.addBox(-3, -3, 1, 3, 3, 1, COAL_BLACK);
genCoalNode.addBox(-2, -2, 2, 2, 2, 2, COAL_DARK);
genCoalNode.addBox(-1, -1, 3, 1, 1, 3, COAL_BLACK);
genCoalNode.addBox( 0,  0, 4, 0, 0, 4, METAL_GREY);  // glint
// Pick-marks
genCoalNode.addBox(-2,  0, 2, -1,  1, 2, PALE_ROCK);
genCoalNode.addBox( 1, -2, 1,  2, -1, 1, PALE_ROCK);
genCoalNode.addBox(-4, -4, 0,  4,  4, 0, DARK_ROCK);
// ── Beacon pillar: cool slate column with bright cap ──
genCoalNode.addBox(4, -4, 1, 4, -4, 8, BEACON_COAL);
genCoalNode.addBox(4, -4, 9, 4, -4, 9, BEACON_WHITE);
genCoalNode.addBox(3, -4, 9, 3, -4, 9, BEACON_COAL);
genCoalNode.addBox(4, -3, 9, 4, -3, 9, BEACON_COAL);
export const COAL_NODE_VOXELS = genCoalNode.getVoxels();

// ─── extraction node: gems ────────────────────────────────────────────────────
const genGemNode = new BuildingGenerator();
// Base rock
genGemNode.addBox(-3, -3, 0, 3, 3, 0, MID_ROCK);
genGemNode.addBox(-2, -2, 1, 2, 2, 1, DARK_ROCK);
genGemNode.addBox(-1, -1, 2, 1, 1, 2, MID_ROCK);
// Crystal spires
genGemNode.addVoxel(-1, -1, 3, GEM_CYAN);
genGemNode.addVoxel( 1, -1, 3, GEM_TEAL);
genGemNode.addVoxel(-1,  1, 3, GEM_PURPLE);
genGemNode.addVoxel( 0,  0, 4, GEM_CYAN);
genGemNode.addVoxel( 0,  0, 5, GEM_TEAL);
genGemNode.addVoxel( 1,  1, 4, GEM_PURPLE);
genGemNode.addBox(-4, -4, 0, 4, 4, 0, DIRT_BROWN);
// ── Beacon pillar: vivid cyan column with teal/purple accents ──
genGemNode.addBox(4, -4, 1, 4, -4, 8, BEACON_GEM);
genGemNode.addBox(4, -4, 9, 4, -4, 9, BEACON_WHITE);
genGemNode.addVoxel(4, -4, 10, GEM_PURPLE);
genGemNode.addBox(3, -4, 9, 3, -4, 9, BEACON_GEM);
genGemNode.addBox(4, -3, 9, 4, -3, 9, BEACON_GEM);
export const GEM_NODE_VOXELS = genGemNode.getVoxels();

// ─── mine entrance arch ───────────────────────────────────────────────────────
const genEntrance = new BuildingGenerator();
// Ground platform
genEntrance.addBox(-5, -2, 0, 5, 4, 0, PATH_GRAVEL);
// Side pillars
genEntrance.addBox(-5, -2, 1, -4, -1, 6, ARCH_STONE);
genEntrance.addBox( 4, -2, 1,  5, -1, 6, ARCH_STONE);
// Top beam
genEntrance.addBox(-5, -2, 7,  5, -1, 7, DARK_ROCK);
// Cross timbers
genEntrance.addBox(-3, -2, 5, -3, -1, 6, TIMBER);
genEntrance.addBox( 3, -2, 5,  3, -1, 6, TIMBER);
genEntrance.addBox(-3, -2, 3,  3, -2, 3, TIMBER);
// Sign
genEntrance.addBox(-2, -3, 4,  2, -3, 5, WAREHOUSE);
genEntrance.addBox(-1, -3, 4,  1, -3, 5, METAL_GREY);
// Warning stripes
genEntrance.addBox(-5, -2, 1, -4, -2, 1, SIGNAL_YLW);
genEntrance.addBox( 4, -2, 1,  5, -2, 1, SIGNAL_YLW);
export const MINE_ENTRANCE_ARCH_VOXELS = genEntrance.getVoxels();

// ─── loading zone (truck bay) ─────────────────────────────────────────────────
const genLoading = new BuildingGenerator();
// Concrete platform
genLoading.addBox(-6, -5, 0,  6,  5, 1, METAL_GREY);
genLoading.addBox(-6, -5, 2,  6, -3, 2, METAL_DARK);   // rear wall
// Loading arm mast
genLoading.addBox(-1, -4, 2,  1, -4, 7, METAL_GREY);
genLoading.addBox(-2, -4, 7,  2, -4, 7, METAL_DARK);   // arm cross
// Conveyor belt (alternating colours for stripe effect)
for (let cx = -5; cx <= 5; cx++) {
  genLoading.addVoxel(cx, 0, 2, cx % 2 === 0 ? CONVEYOR : CONVEYOR_ST);
  genLoading.addVoxel(cx, 1, 2, cx % 2 === 0 ? CONVEYOR_ST : CONVEYOR);
}
// Side rails
genLoading.addBox(-6, -1, 3, -6, 2, 4, METAL_GREY);
genLoading.addBox( 6, -1, 3,  6, 2, 4, METAL_GREY);
// Dock lip
genLoading.addBox(-6, 5, 1,  6, 5, 2, SIGNAL_YLW);
// Warning stripes on floor
genLoading.addBox(-6, 4, 1, -5, 5, 1, SIGNAL_YLW);
genLoading.addBox( 5, 4, 1,  6, 5, 1, SIGNAL_YLW);
// ── Beacon: tall blue mast with cross arm ──
genLoading.addBox(-6, -5, 1, -6, -5, 10, BEACON_LOADING);
genLoading.addBox(-6, -5, 11, -6, -5, 11, BEACON_WHITE);
genLoading.addBox(-7, -5, 10, -5, -5, 10, BEACON_LOADING);
export const LOADING_ZONE_VOXELS = genLoading.getVoxels();

// ─── unloading zone (smelter / crusher) ───────────────────────────────────────
const genUnloading = new BuildingGenerator();
// Brick base
genUnloading.addBox(-6, -5, 0,  6,  5, 0, BRICK_DARK);
genUnloading.addHollowBox(-6, -5, 1,  6,  5, 5, BRICK_RED);
// Chimney stacks (two)
genUnloading.addBox(-3, -4, 6, -2, -3, 10, BRICK_DARK);
genUnloading.addBox( 2, -4, 6,  3, -3, 10, BRICK_DARK);
genUnloading.addBox(-3, -4, 11, -2, -3, 11, METAL_GREY);
genUnloading.addBox( 2, -4, 11,  3, -3, 11, METAL_GREY);
// Furnace opening
genUnloading.addBox(-2,  4, 2,  2,  5, 4, FURNACE_ORG);
genUnloading.addBox(-1,  4, 2,  1,  5, 3, FURNACE_YLW);
// Hopper ramp
genUnloading.addBox(-4, 2, 1,  4, 3, 3, METAL_DARK);
// Warning stripe
genUnloading.addBox(-6, -5, 1, -5, -5, 2, SIGNAL_YLW);
genUnloading.addBox( 5, -5, 1,  6, -5, 2, SIGNAL_YLW);
// ── Beacon: bright red pillar next to chimneys ──
genUnloading.addBox(-6, -5, 1, -6, -5, 10, BEACON_SMELTER);
genUnloading.addBox(-6, -5, 11, -6, -5, 11, BEACON_WHITE);
genUnloading.addBox(-7, -5, 10, -5, -5, 10, BEACON_SMELTER);
// Furnace glow ring around opening
genUnloading.addBox(-3,  5, 2,  3,  5, 4, FURNACE_ORG);
genUnloading.addBox(-3,  5, 5,  3,  5, 5, BEACON_SMELTER);
export const UNLOADING_ZONE_VOXELS = genUnloading.getVoxels();

// ─── delivery / storage warehouse ─────────────────────────────────────────────
const genDelivery = new BuildingGenerator();
// Foundation
genDelivery.addBox(-7, -6, 0,  7,  6, 0, WAREHOUSE_D);
// Walls
genDelivery.addHollowBox(-7, -6, 1,  7,  6, 4, WAREHOUSE);
// Roof
genDelivery.addBox(-7, -6, 5,  7,  6, 5, WAREHOUSE_D);
genDelivery.addBox(-5, -4, 6,  5,  4, 6, WAREHOUSE);   // raised roof peak
// Rolling door
genDelivery.addBox(-3,  5, 1,  3,  6, 4, METAL_GREY);
genDelivery.addBox(-2,  5, 1,  2,  6, 3, METAL_DARK);
// Storage crates inside (visible through door)
genDelivery.addBox(-4,  2, 1, -2,  4, 2, ORE_AMBER);
genDelivery.addBox( 2,  2, 1,  4,  4, 2, COAL_DARK);
// Signage
genDelivery.addBox(-3, -7, 3,  3, -7, 4, SIGNAL_YLW);
genDelivery.addBox(-2, -7, 3,  2, -7, 4, WAREHOUSE);
// ── Beacon: tall green pillar with flag arm ──
genDelivery.addBox(-7, -6, 1, -7, -6, 10, BEACON_STORAGE);
genDelivery.addBox(-7, -6, 11, -7, -6, 11, BEACON_WHITE);
genDelivery.addBox(-8, -6, 9, -7, -6, 10, BEACON_STORAGE);
genDelivery.addBox(-8, -6, 10, -8, -6, 11, BEACON_STORAGE);
export const DELIVERY_ZONE_VOXELS = genDelivery.getVoxels();

// ─── gravel path tile (small square) ─────────────────────────────────────────
const genPath = new BuildingGenerator();
genPath.addBox(-7, -7, 0, 7, 7, 0, PATH_GRAVEL);
export const MINE_PATH_VOXELS = genPath.getVoxels();

// ─── rocky hill decoration ─────────────────────────────────────────────────────
const genRock = new BuildingGenerator();
genRock.addBox(-3, -3, 0, 3, 3, 2, MID_ROCK);
genRock.addBox(-2, -2, 3, 2, 2, 4, DARK_ROCK);
genRock.addBox(-1, -1, 5, 1, 1, 6, PALE_ROCK);
export const ROCK_HILL_VOXELS = genRock.getVoxels();

// ─── world layout ─────────────────────────────────────────────────────────────
// Centre of the mine world in the 240×240 grid
const CX = 120;
const CY = 120;

const pos = (dx: number, dy: number) => ({ x: CX + dx, y: CY + dy });

export const MINE_WORLD_ENTRANCE_POS = pos(0, -40);   // player spawn point

export const MINE_WORLD_BUILDINGS: Record<string, Building> = {
  // ── entrance arch (player spawn) ───────────────────────────────────────
  mine_world_entrance: {
    id: 'mine_world_entrance',
    npcId: 'none',
    name: 'Mine Entrance',
    pos: pos(0, -40),
    type: 'MINE_ENTRANCE',
    isDiscovered: true,
    voxels: MINE_ENTRANCE_ARCH_VOXELS,
  },

  // ── extraction node – iron ore ──────────────────────────────────────────
  ore_node: {
    id: 'ore_node',
    npcId: 'none',
    name: 'Iron Ore Deposit',
    pos: pos(-25, -15),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A rich vein of iron ore embedded in the rock face.',
    voxels: ORE_NODE_VOXELS,
  },

  // ── extraction node – coal ──────────────────────────────────────────────
  coal_node: {
    id: 'coal_node',
    npcId: 'none',
    name: 'Coal Seam',
    pos: pos(28, -18),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A thick coal seam exposed by recent blasting.',
    voxels: COAL_NODE_VOXELS,
  },

  // ── extraction node – gems ──────────────────────────────────────────────
  gem_node: {
    id: 'gem_node',
    npcId: 'none',
    name: 'Gem Pocket',
    pos: pos(5, 20),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A pocket of semi-precious crystals glittering in the rock.',
    voxels: GEM_NODE_VOXELS,
  },

  // ── loading zone (truck bay / railcar siding) ───────────────────────────
  loading_zone: {
    id: 'loading_zone',
    npcId: 'none',
    name: 'Truck Loading Bay',
    pos: pos(-30, 30),
    type: 'LOADING_ZONE',
    isDiscovered: true,
    description: 'A heavy-duty loading platform where ore is transferred to transport vehicles.',
    voxels: LOADING_ZONE_VOXELS,
  },

  // ── unloading zone (smelter / crusher) ──────────────────────────────────
  unloading_zone: {
    id: 'unloading_zone',
    npcId: 'none',
    name: 'Ore Smelter',
    pos: pos(32, 32),
    type: 'UNLOADING_ZONE',
    isDiscovered: true,
    description: 'A roaring smelter that processes raw ore into refined metal.',
    voxels: UNLOADING_ZONE_VOXELS,
  },

  // ── delivery / storage warehouse ────────────────────────────────────────
  delivery_zone: {
    id: 'delivery_zone',
    npcId: 'none',
    name: 'Storage Warehouse',
    pos: pos(0, 48),
    type: 'DELIVERY_ZONE',
    isDiscovered: true,
    description: 'The central warehouse where processed materials are stored before export.',
    voxels: DELIVERY_ZONE_VOXELS,
  },

  // ── gravel path connectors ───────────────────────────────────────────────
  path_n1: { id: 'path_n1', npcId: 'none', name: 'Gravel Path', pos: pos(-12, -28), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_n2: { id: 'path_n2', npcId: 'none', name: 'Gravel Path', pos: pos(  0, -28), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_n3: { id: 'path_n3', npcId: 'none', name: 'Gravel Path', pos: pos( 14, -28), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_w1: { id: 'path_w1', npcId: 'none', name: 'Gravel Path', pos: pos(-25,   0), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_e1: { id: 'path_e1', npcId: 'none', name: 'Gravel Path', pos: pos( 25,   0), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_s1: { id: 'path_s1', npcId: 'none', name: 'Gravel Path', pos: pos(-15,  15), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_s2: { id: 'path_s2', npcId: 'none', name: 'Gravel Path', pos: pos(  0,  15), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_s3: { id: 'path_s3', npcId: 'none', name: 'Gravel Path', pos: pos( 15,  15), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_sw: { id: 'path_sw', npcId: 'none', name: 'Gravel Path', pos: pos(-15,  30), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_se: { id: 'path_se', npcId: 'none', name: 'Gravel Path', pos: pos( 15,  30), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },
  path_sc: { id: 'path_sc', npcId: 'none', name: 'Gravel Path', pos: pos(  0,  35), type: 'ROAD', isDiscovered: true, voxels: MINE_PATH_VOXELS },

  // ── rocky hill decorations ────────────────────────────────────────────────
  rock_a: { id: 'rock_a', npcId: 'none', name: 'Rocky Outcrop', pos: pos(-40,  -5), type: 'LANDMARK', isDiscovered: true, voxels: ROCK_HILL_VOXELS },
  rock_b: { id: 'rock_b', npcId: 'none', name: 'Rocky Outcrop', pos: pos( 40,   5), type: 'LANDMARK', isDiscovered: true, voxels: ROCK_HILL_VOXELS },
  rock_c: { id: 'rock_c', npcId: 'none', name: 'Rocky Outcrop', pos: pos(-10,  55), type: 'LANDMARK', isDiscovered: true, voxels: ROCK_HILL_VOXELS },
  rock_d: { id: 'rock_d', npcId: 'none', name: 'Rocky Outcrop', pos: pos( 15, -50), type: 'LANDMARK', isDiscovered: true, voxels: ROCK_HILL_VOXELS },
  rock_e: { id: 'rock_e', npcId: 'none', name: 'Rocky Outcrop', pos: pos(-42,  45), type: 'LANDMARK', isDiscovered: true, voxels: ROCK_HILL_VOXELS },
};

/** Resource yields per extraction node (amount added to ore on collection) */
export const MINE_NODE_YIELDS: Record<string, number> = {
  ore_node:  3,
  coal_node: 2,
  gem_node:  1,
};

/** Cooldown in milliseconds before a node can be harvested again */
export const NODE_HARVEST_COOLDOWN_MS = 8_000;

/** Proximity radius (grid tiles) to trigger zone/node interactions */
export const MINE_INTERACTION_RADIUS = 5;
