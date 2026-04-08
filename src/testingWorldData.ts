/**
 * Testing World Data
 * Defines a simple forest terrain with tree resource nodes for the wood-gathering
 * prototype scene.  Uses the same 240×240 world grid as other scenes.
 */

import { Building } from './types';
import { BuildingGenerator } from './utils/buildingGenerator';

// ─── colour palette ──────────────────────────────────────────────────────────
const TRUNK_BROWN  = '#5c3a1e';
const TRUNK_DARK   = '#3e2712';
const LEAF_GREEN   = '#2d8a4e';
const LEAF_DARK    = '#1e6b38';
const LEAF_LIGHT   = '#4ebd6e';
const GRASS_GREEN  = '#4a7c3f';
const GRASS_LIGHT  = '#5fa04f';
const DIRT_BROWN   = '#7c5c3c';
const PATH_GRAVEL  = '#b0a898';
const BEACON_WOOD  = '#a0522d'; // sienna beacon colour
const BEACON_WHITE = '#fef9c3';

// ─── tree resource node (clump of harvestable trees) ─────────────────────────
const genTree = new BuildingGenerator();
// Ground patch
genTree.addBox(-4, -4, 0, 4, 4, 0, GRASS_GREEN);
// Trunk cluster
genTree.addBox(-1, -1, 0, 0, 0, 4, TRUNK_BROWN);
genTree.addBox( 1,  1, 0, 2, 2, 3, TRUNK_DARK);
genTree.addBox(-2,  1, 0, -2, 1, 3, TRUNK_BROWN);
// Canopy – main tree
genTree.addBox(-3, -3, 5, 2, 2, 5, LEAF_GREEN);
genTree.addBox(-2, -2, 6, 1, 1, 6, LEAF_DARK);
genTree.addBox(-1, -1, 7, 0, 0, 7, LEAF_LIGHT);
// Canopy – secondary tree
genTree.addBox(-1, 0, 4, 3, 3, 4, LEAF_GREEN);
genTree.addBox( 0, 0, 5, 3, 3, 5, LEAF_DARK);
// Canopy – tertiary tree
genTree.addBox(-4, -1, 4, -1, 2, 4, LEAF_GREEN);
genTree.addBox(-3,  0, 5, -1, 2, 5, LEAF_DARK);
// Beacon pillar
genTree.addBox(4, -4, 1, 4, -4, 8, BEACON_WOOD);
genTree.addBox(4, -4, 9, 4, -4, 9, BEACON_WHITE);
genTree.addBox(3, -4, 9, 3, -4, 9, BEACON_WOOD);
genTree.addBox(4, -3, 9, 4, -3, 9, BEACON_WOOD);
export const TREE_NODE_VOXELS = genTree.getVoxels();

// ─── simple grass decoration ─────────────────────────────────────────────────
const genGrass = new BuildingGenerator();
genGrass.addBox(-7, -7, 0, 7, 7, 0, GRASS_LIGHT);
export const GRASS_PATCH_VOXELS = genGrass.getVoxels();

// ─── spawn shelter ───────────────────────────────────────────────────────────
const genShelter = new BuildingGenerator();
genShelter.addBox(-3, -2, 0, 3, 2, 0, PATH_GRAVEL);
genShelter.addBox(-3, -2, 1, -3, -2, 4, TRUNK_BROWN);
genShelter.addBox( 3, -2, 1,  3, -2, 4, TRUNK_BROWN);
genShelter.addBox(-3, -2, 5,  3, -2, 5, TRUNK_DARK);
genShelter.addBox(-3, -2, 5,  3,  0, 5, LEAF_DARK); // roof
export const SHELTER_VOXELS = genShelter.getVoxels();

// ─── world layout ────────────────────────────────────────────────────────────
const CX = 120;
const CY = 120;
const pos = (dx: number, dy: number) => ({ x: CX + dx, y: CY + dy });

export const TESTING_WORLD_ENTRANCE_POS = pos(0, -30);

export const TESTING_WORLD_BUILDINGS: Record<string, Building> = {
  // ── spawn shelter ──────────────────────────────────────────────────────
  testing_shelter: {
    id: 'testing_shelter',
    npcId: 'none',
    name: 'Forest Shelter',
    pos: pos(0, -30),
    type: 'LANDMARK',
    isDiscovered: true,
    voxels: SHELTER_VOXELS,
  },

  // ── tree resource nodes ────────────────────────────────────────────────
  tree_node_a: {
    id: 'tree_node_a',
    npcId: 'none',
    name: 'Oak Grove',
    pos: pos(-20, -10),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A dense cluster of oak trees ripe for felling.',
    voxels: TREE_NODE_VOXELS,
  },
  tree_node_b: {
    id: 'tree_node_b',
    npcId: 'none',
    name: 'Pine Stand',
    pos: pos(22, -8),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'Tall pines with plenty of usable timber.',
    voxels: TREE_NODE_VOXELS,
  },
  tree_node_c: {
    id: 'tree_node_c',
    npcId: 'none',
    name: 'Birch Copse',
    pos: pos(-5, 18),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'A copse of birch trees with straight, workable trunks.',
    voxels: TREE_NODE_VOXELS,
  },
  tree_node_d: {
    id: 'tree_node_d',
    npcId: 'none',
    name: 'Elm Thicket',
    pos: pos(25, 22),
    type: 'EXTRACTION_NODE',
    isDiscovered: true,
    description: 'Sturdy elm trees growing in a thick patch.',
    voxels: TREE_NODE_VOXELS,
  },

  // ── grass path connectors ──────────────────────────────────────────────
  grass_a: { id: 'grass_a', npcId: 'none', name: 'Grass', pos: pos(-10, -20), type: 'ROAD', isDiscovered: true, voxels: GRASS_PATCH_VOXELS },
  grass_b: { id: 'grass_b', npcId: 'none', name: 'Grass', pos: pos( 10, -20), type: 'ROAD', isDiscovered: true, voxels: GRASS_PATCH_VOXELS },
  grass_c: { id: 'grass_c', npcId: 'none', name: 'Grass', pos: pos(  0,   0), type: 'ROAD', isDiscovered: true, voxels: GRASS_PATCH_VOXELS },
  grass_d: { id: 'grass_d', npcId: 'none', name: 'Grass', pos: pos(-15,  10), type: 'ROAD', isDiscovered: true, voxels: GRASS_PATCH_VOXELS },
  grass_e: { id: 'grass_e', npcId: 'none', name: 'Grass', pos: pos( 15,  10), type: 'ROAD', isDiscovered: true, voxels: GRASS_PATCH_VOXELS },
  grass_f: { id: 'grass_f', npcId: 'none', name: 'Grass', pos: pos(  0,  30), type: 'ROAD', isDiscovered: true, voxels: GRASS_PATCH_VOXELS },
};

/** Resource node IDs → the tree nodes that can be gathered */
export const TESTING_TREE_NODES = ['tree_node_a', 'tree_node_b', 'tree_node_c', 'tree_node_d'];

/** Total wood per node before depletion */
export const TREE_INITIAL_AMOUNT = 28;

/** Proximity radius (grid tiles) to trigger gathering */
export const TESTING_GATHER_RANGE = 5;

/** Gather interval in milliseconds (0.1s for fast feel) */
export const TESTING_GATHER_INTERVAL_MS = 100;

/** Wood gained per gather tick */
export const TESTING_YIELD_PER_TICK = 1;
