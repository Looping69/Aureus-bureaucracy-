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
const TRUNK_LIGHT  = '#7a5230'; // lighter bark highlight
const BARK_DETAIL  = '#4a2f14'; // bark crevice shade
const LEAF_GREEN   = '#2d8a4e';
const LEAF_DARK    = '#1e6b38';
const LEAF_LIGHT   = '#4ebd6e';
const LEAF_YELLOW  = '#c4b23a'; // seasonal – autumn tint
const LEAF_ORANGE  = '#d4842a'; // seasonal – autumn highlight
const LEAF_SPRING  = '#78d661'; // spring new-growth
const GRASS_GREEN  = '#4a7c3f';
const GRASS_LIGHT  = '#5fa04f';
const GRASS_DARK   = '#3a6830'; // shaded grass
const DIRT_BROWN   = '#7c5c3c';
const MOSS_GREEN   = '#5a7a3a'; // moss on roots / ground
const PATH_GRAVEL  = '#b0a898';
const BEACON_WOOD  = '#a0522d'; // sienna beacon colour
const BEACON_WHITE = '#fef9c3';
// log-pile specific colours
const LOG_BROWN_A  = '#8B4513'; // saddle brown
const LOG_BROWN_B  = '#A0522D'; // sienna
const LOG_DARK     = '#5C3317'; // dark end-grain
// depot enhancement colours
const STONE_GRAY   = '#8a8a8a';
const STONE_DARK   = '#5f5f5f';
const METAL_GRAY   = '#9e9e9e';
const LANTERN_GLOW = '#ffdd44';
const ROOF_BROWN   = '#6b3e26';
const CRATE_WOOD   = '#a07040';
const CRATE_DARK   = '#7a5530';
const SMOKE_LIGHT  = '#d0d0d0';
const SMOKE_MID    = '#b0b0b0';

// ─── tree resource node (enhanced with varied geometry & seasonal detail) ────
// NOTE: All voxels must stay within x∈[-4,4], y∈[-4,4] so the derived 2-D
// footprint does not grow beyond 9×9 and block pathfinding / gathering.
const genTree = new BuildingGenerator();

// Ground patch with varied grass & moss (constrained to -4..4)
genTree.addBox(-4, -4, 0, 4, 4, 0, GRASS_GREEN);
genTree.addBox(-3, -3, 0, -1, -1, 0, GRASS_DARK);   // shaded area
genTree.addBox( 2,  1, 0,  4,  3, 0, MOSS_GREEN);    // mossy ground patch
genTree.addBox(-4, -4, 0, -3, -3, 0, DIRT_BROWN);    // exposed dirt
genTree.addBox( 3,  3, 0,  4,  4, 0, DIRT_BROWN);    // exposed dirt corner

// ── Main trunk (thick, textured bark) ──
genTree.addBox(-1, -1, 0, 0, 0, 5, TRUNK_BROWN);
genTree.addBox(-1, -1, 2, -1, -1, 4, BARK_DETAIL);   // bark crevice left
genTree.addBox( 0,  0, 1,  0,  0, 3, TRUNK_LIGHT);   // bark highlight right
genTree.addBox(-1,  0, 0, -1,  0, 1, TRUNK_DARK);    // base shadow

// Root flares at base
genTree.addBox(-2, -1, 0, -2, 0, 1, TRUNK_DARK);     // root extending left
genTree.addBox( 1, -1, 0,  1, 0, 1, TRUNK_DARK);     // root extending right
genTree.addBox(-1, -2, 0,  0, -2, 1, TRUNK_BROWN);   // root extending forward
genTree.addBox(-1,  1, 0,  0,  1, 0, MOSS_GREEN);    // moss on root

// ── Secondary trunk (slightly shorter, offset) ──
genTree.addBox( 1,  1, 0, 2, 2, 4, TRUNK_DARK);
genTree.addBox( 2,  1, 1, 2, 1, 3, BARK_DETAIL);     // bark detail
genTree.addBox( 1,  2, 0, 1,  2, 1, TRUNK_LIGHT);    // highlight

// ── Tertiary trunk (small understory tree) ──
genTree.addBox(-3,  1, 0, -2, 1, 3, TRUNK_BROWN);
genTree.addBox(-3,  1, 1, -3, 1, 2, BARK_DETAIL);

// ── Branch stubs (visible between trunk and canopy) ──
genTree.addBox(-2, -1, 4, -2, -1, 4, TRUNK_BROWN);   // branch left
genTree.addBox( 1, -1, 4,  1, -1, 4, TRUNK_BROWN);   // branch right-fwd
genTree.addBox( 0,  1, 5,  0,  1, 5, TRUNK_DARK);    // branch back

// ── Main canopy – multi-layered with seasonal colour variation ──
// Layer 1: broad base (constrained to -4..3)
genTree.addBox(-4, -4, 5, 3, 3, 5, LEAF_GREEN);
genTree.addBox(-3, -3, 5, -2, -2, 5, LEAF_DARK);     // shadow pocket
genTree.addBox( 1,  1, 5,  2,  2, 5, LEAF_SPRING);   // spring new growth
// Layer 2: middle
genTree.addBox(-3, -3, 6, 2, 2, 6, LEAF_GREEN);
genTree.addBox(-2, -1, 6, 1, 1, 6, LEAF_DARK);
genTree.addBox( 1, -3, 6,  2, -2, 6, LEAF_YELLOW);   // autumn-tinted cluster
// Layer 3: upper
genTree.addBox(-2, -2, 7, 1, 1, 7, LEAF_GREEN);
genTree.addBox(-1, -1, 7, 0, 0, 7, LEAF_LIGHT);      // sun-lit top
genTree.addBox( 1,  0, 7,  1, 1, 7, LEAF_ORANGE);    // autumn highlight
// Layer 4: crown tip
genTree.addBox(-1, -1, 8, 0, 0, 8, LEAF_LIGHT);
genTree.addBox( 0,  0, 8,  0, 0, 8, LEAF_SPRING);    // bright tip

// ── Secondary canopy (shorter tree) ──
genTree.addBox(-1, 0, 4, 3, 3, 4, LEAF_GREEN);
genTree.addBox( 0, 0, 5, 3, 3, 5, LEAF_DARK);
genTree.addBox( 0, 1, 5, 2, 2, 5, LEAF_YELLOW);      // seasonal accent
genTree.addBox( 1, 1, 6, 2, 2, 6, LEAF_GREEN);       // top tuft

// ── Tertiary canopy (understory, constrained to -4..) ──
genTree.addBox(-4, -1, 4, -2, 2, 4, LEAF_GREEN);
genTree.addBox(-4,  0, 5, -2, 2, 5, LEAF_DARK);
genTree.addBox(-4,  0, 5, -3, 1, 5, LEAF_SPRING);    // new growth patch

// ── Undergrowth details (small bushes / shrubs at ground level) ──
genTree.addBox( 3, -3, 1, 4, -2, 1, LEAF_DARK);      // shrub
genTree.addBox( 3, -3, 2, 3, -2, 2, LEAF_GREEN);     // shrub top
genTree.addBox(-4,  3, 1, -3, 4, 1, MOSS_GREEN);     // moss clump
genTree.addBox(-4,  3, 2, -4, 3, 2, LEAF_DARK);      // tiny bush

// Beacon pillar (kept within -4..4 bounds)
genTree.addBox(4, -4, 1, 4, -4, 8, BEACON_WOOD);
genTree.addBox(4, -4, 9, 4, -4, 9, BEACON_WHITE);
genTree.addBox(3, -4, 9, 3, -4, 9, BEACON_WOOD);
genTree.addBox(4, -3, 9, 4, -3, 9, BEACON_WOOD);
export const TREE_NODE_VOXELS = genTree.getVoxels();

// ─── log depot (enhanced with storage shed, lighting, crates & smoke) ────────
// NOTE: All voxels must stay within x∈[-5,5], y∈[-4,4] so the derived 2-D
// footprint does not grow beyond 11×9 and block unloading proximity.
const genLogDepot = new BuildingGenerator();

// ── Foundation & ground (constrained to -5..5 x, -4..4 y) ──
genLogDepot.addBox(-5, -4, 0, 5, 4, 0, PATH_GRAVEL);       // gravel floor pad

// ── Stone foundation wall (low wall around three sides) ──
genLogDepot.addBox(-5, -4, 1, -5, 4, 2, STONE_GRAY);       // left wall base
genLogDepot.addBox( 5, -4, 1,  5, 4, 2, STONE_GRAY);       // right wall base
genLogDepot.addBox(-5,  4, 1,  5, 4, 2, STONE_DARK);       // back wall base

// ── Rear support posts ──
genLogDepot.addBox(-5, 4, 1, -5, 4, 8, TRUNK_BROWN);
genLogDepot.addBox( 5, 4, 1,  5, 4, 8, TRUNK_BROWN);
genLogDepot.addBox(-5, 4, 3, -5, 4, 3, BARK_DETAIL);       // post texture
genLogDepot.addBox( 5, 4, 3,  5, 4, 3, BARK_DETAIL);       // post texture

// ── Front support posts ──
genLogDepot.addBox(-5, -4, 1, -5, -4, 7, TRUNK_BROWN);
genLogDepot.addBox( 5, -4, 1,  5, -4, 7, TRUNK_BROWN);
genLogDepot.addBox(-5, -4, 4, -5, -4, 4, BARK_DETAIL);     // post texture
genLogDepot.addBox( 5, -4, 4,  5, -4, 4, BARK_DETAIL);     // post texture

// ── Top crossbeam & roof structure ──
genLogDepot.addBox(-5, 4, 8, 5, 4, 8, TRUNK_DARK);         // rear beam
genLogDepot.addBox(-5, -4, 7, 5, -4, 7, TRUNK_DARK);       // front beam
genLogDepot.addBox(-5, -4, 8, 5, -3, 8, ROOF_BROWN);       // roof overhang front
genLogDepot.addBox(-5, -4, 8, 5,  4, 8, ROOF_BROWN);       // main roof
genLogDepot.addBox(-4, -3, 9, 4,  3, 9, ROOF_BROWN);       // raised roof center

// ── Low side rails (keep logs from rolling off) ──
genLogDepot.addBox(-5, -4, 1, -5, 4, 3, TRUNK_DARK);
genLogDepot.addBox( 5, -4, 1,  5, 4, 3, TRUNK_DARK);

// ── Lanterns (warm light on front posts, kept inside bounds) ──
genLogDepot.addBox(-4, -4, 6, -4, -4, 6, METAL_GRAY);      // lantern bracket L
genLogDepot.addBox(-4, -4, 5, -4, -4, 5, LANTERN_GLOW);    // lantern glow L
genLogDepot.addBox( 4, -4, 6,  4, -4, 6, METAL_GRAY);      // lantern bracket R
genLogDepot.addBox( 4, -4, 5,  4, -4, 5, LANTERN_GLOW);    // lantern glow R

// ── Back wall lanterns ──
genLogDepot.addBox(-3, 4, 6, -3, 4, 6, METAL_GRAY);
genLogDepot.addBox(-3, 4, 5, -3, 4, 5, LANTERN_GLOW);
genLogDepot.addBox( 3, 4, 6,  3, 4, 6, METAL_GRAY);
genLogDepot.addBox( 3, 4, 5,  3, 4, 5, LANTERN_GLOW);

// ── Wooden crates (interactive prop feel) ──
// Left crate stack
genLogDepot.addBox(-4, 2, 1, -3, 3, 2, CRATE_WOOD);
genLogDepot.addBox(-4, 2, 1, -4, 3, 2, CRATE_DARK);        // crate shadow side
genLogDepot.addBox(-4, 3, 3, -3, 3, 3, CRATE_WOOD);        // stacked crate on top
// Right single crate
genLogDepot.addBox( 3, 3, 1,  4, 4, 2, CRATE_WOOD);
genLogDepot.addBox( 3, 3, 1,  3, 4, 2, CRATE_DARK);        // crate shadow side

// ── Smoke / steam voxels (above roof – static visual hint) ──
genLogDepot.addBox( 0, 2, 10,  0, 2, 10, SMOKE_LIGHT);
genLogDepot.addBox( 0, 2, 11,  0, 2, 11, SMOKE_MID);
genLogDepot.addBox( 1, 2, 12,  1, 2, 12, SMOKE_LIGHT);

// ── Beacon pillar at front-left corner ──
genLogDepot.addBox(-5, -4, 3, -5, -4, 10, BEACON_WOOD);
genLogDepot.addBox(-5, -4, 11, -5, -4, 11, BEACON_WHITE);
genLogDepot.addBox(-4, -4, 11, -4, -4, 11, BEACON_WOOD);
genLogDepot.addBox(-5, -3, 11, -5, -3, 11, BEACON_WOOD);
export const LOG_DEPOT_VOXELS = genLogDepot.getVoxels();

// ─── log pile stage 1 (small – 1-14 logs deposited) ─────────────────────────
const genLogPile1 = new BuildingGenerator();
// Bottom row: two parallel logs along the X axis
genLogPile1.addBox(-4, -3, 1, 4, -2, 2, LOG_BROWN_A);
genLogPile1.addBox(-4,  0, 1, 4,  1, 2, LOG_BROWN_B);
// End-grain faces (darker slice at each end)
genLogPile1.addBox(-4, -3, 1, -4,  1, 2, LOG_DARK);
genLogPile1.addBox( 4, -3, 1,  4,  1, 2, LOG_DARK);
// Top single log balanced between the two bottom ones
genLogPile1.addBox(-4, -1, 2, 4, 0, 3, LOG_BROWN_A);
genLogPile1.addBox(-4, -1, 2, -4, 0, 3, LOG_DARK);
genLogPile1.addBox( 4, -1, 2,  4, 0, 3, LOG_DARK);
export const LOG_PILE_STAGE1_VOXELS = genLogPile1.getVoxels();

// ─── log pile stage 2 (medium – 15-34 logs deposited) ───────────────────────
const genLogPile2 = new BuildingGenerator();
// Level 1 (same as stage 1 base)
genLogPile2.addBox(-4, -3, 1, 4, -2, 2, LOG_BROWN_A);
genLogPile2.addBox(-4,  0, 1, 4,  1, 2, LOG_BROWN_B);
genLogPile2.addBox(-4, -3, 1, -4,  1, 2, LOG_DARK);
genLogPile2.addBox( 4, -3, 1,  4,  1, 2, LOG_DARK);
// Level 2: three logs
genLogPile2.addBox(-4, -3, 2, 4, -2, 3, LOG_BROWN_B);
genLogPile2.addBox(-4,  0, 2, 4,  1, 3, LOG_BROWN_A);
genLogPile2.addBox(-4, -1, 2, 4,  0, 3, LOG_BROWN_A);
genLogPile2.addBox(-4, -3, 2, -4,  1, 3, LOG_DARK);
genLogPile2.addBox( 4, -3, 2,  4,  1, 3, LOG_DARK);
// Level 3: top log
genLogPile2.addBox(-4, -1, 3, 4, 0, 4, LOG_BROWN_B);
genLogPile2.addBox(-4, -1, 3, -4, 0, 4, LOG_DARK);
genLogPile2.addBox( 4, -1, 3,  4, 0, 4, LOG_DARK);
export const LOG_PILE_STAGE2_VOXELS = genLogPile2.getVoxels();

// ─── log pile stage 3 (large – 35+ logs deposited) ──────────────────────────
const genLogPile3 = new BuildingGenerator();
// Level 1
genLogPile3.addBox(-4, -3, 1, 4, -2, 2, LOG_BROWN_A);
genLogPile3.addBox(-4,  0, 1, 4,  1, 2, LOG_BROWN_B);
genLogPile3.addBox(-4, -3, 1, -4,  1, 2, LOG_DARK);
genLogPile3.addBox( 4, -3, 1,  4,  1, 2, LOG_DARK);
// Level 2
genLogPile3.addBox(-4, -3, 2, 4, -2, 3, LOG_BROWN_B);
genLogPile3.addBox(-4,  0, 2, 4,  1, 3, LOG_BROWN_A);
genLogPile3.addBox(-4, -1, 2, 4,  0, 3, LOG_BROWN_A);
genLogPile3.addBox(-4, -3, 2, -4,  1, 3, LOG_DARK);
genLogPile3.addBox( 4, -3, 2,  4,  1, 3, LOG_DARK);
// Level 3
genLogPile3.addBox(-4, -3, 3, 4, -2, 4, LOG_BROWN_A);
genLogPile3.addBox(-4,  0, 3, 4,  1, 4, LOG_BROWN_B);
genLogPile3.addBox(-4, -1, 3, 4,  0, 4, LOG_BROWN_B);
genLogPile3.addBox(-4, -3, 3, -4,  1, 4, LOG_DARK);
genLogPile3.addBox( 4, -3, 3,  4,  1, 4, LOG_DARK);
// Level 4 (tapered)
genLogPile3.addBox(-4, -2, 4, 4, -1, 5, LOG_BROWN_A);
genLogPile3.addBox(-4,  0, 4, 4,  0, 5, LOG_BROWN_B);
genLogPile3.addBox(-4, -2, 4, -4,  0, 5, LOG_DARK);
genLogPile3.addBox( 4, -2, 4,  4,  0, 5, LOG_DARK);
export const LOG_PILE_STAGE3_VOXELS = genLogPile3.getVoxels();

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
/** Position of the log depot drop-off zone */
const LOG_DEPOT_POS = pos(0, -18);

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

  // ── log drop-off depot ─────────────────────────────────────────────────
  log_depot: {
    id: 'log_depot',
    npcId: 'none',
    name: 'Log Depot',
    pos: LOG_DEPOT_POS,
    type: 'LANDMARK',
    isDiscovered: true,
    description: 'Bring harvested logs here to deposit them.',
    voxels: LOG_DEPOT_VOXELS,
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

/** Proximity radius (grid tiles) to trigger gathering.
 *  Must exceed the max half-extent of both tree & depot footprints so the
 *  player can reach the interaction zone from the nearest walkable tile. */
export const TESTING_GATHER_RANGE = 7;

/** Gather interval in milliseconds – longer for realistic pacing */
export const TESTING_GATHER_INTERVAL_MS = 15000;

/** Wood gained per gather tick */
export const TESTING_YIELD_PER_TICK = 1;

/** ID of the log depot building */
export const LOG_DEPOT_ID = 'log_depot';

/** Maximum number of logs the player can carry at once (visual blocks on back) */
export const TESTING_CARRY_MAX = 6;

/** Milliseconds between each block unloaded at the depot – 8× faster than before for quick dropoff */
export const TESTING_UNLOAD_INTERVAL_MS = 375;

/**
 * Log pile stages placed at the depot position.
 * These are NOT in TESTING_WORLD_BUILDINGS so they don't affect pathfinding;
 * they are merged into the buildings list for the voxel renderer only.
 */
export const LOG_PILE_BUILDINGS: Record<string, Building> = {
  log_pile_stage1: {
    id: 'log_pile_stage1',
    npcId: 'none',
    name: 'Log Pile',
    pos: LOG_DEPOT_POS,
    type: 'LANDMARK',
    isDiscovered: true,
    voxels: LOG_PILE_STAGE1_VOXELS,
  },
  log_pile_stage2: {
    id: 'log_pile_stage2',
    npcId: 'none',
    name: 'Log Pile',
    pos: LOG_DEPOT_POS,
    type: 'LANDMARK',
    isDiscovered: true,
    voxels: LOG_PILE_STAGE2_VOXELS,
  },
  log_pile_stage3: {
    id: 'log_pile_stage3',
    npcId: 'none',
    name: 'Log Pile',
    pos: LOG_DEPOT_POS,
    type: 'LANDMARK',
    isDiscovered: true,
    voxels: LOG_PILE_STAGE3_VOXELS,
  },
};

/** Deposited-log thresholds to switch between pile stages (≥1→stage1, ≥15→stage2, ≥35→stage3) */
export const LOG_PILE_THRESHOLDS = [1, 15, 35] as const;
