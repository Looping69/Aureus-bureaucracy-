/**
 * @module cityLayout
 * Seed-based procedural city layout generator.
 *
 * Generates a varied initial city layout from a numeric seed so that
 * each playthrough starts with a unique but balanced arrangement of
 * buildings, roads, and parks.
 *
 * Features:
 * - Deterministic: same seed → same layout
 * - Configurable density and district placement
 * - Road network connecting key buildings
 * - Green-space distribution for visual variety
 */
import { Building } from './types';
import {
  GENERIC_HOUSE_A_VOXELS,
  GENERIC_HOUSE_B_VOXELS,
  GENERIC_HOUSE_D_VOXELS,
  GENERIC_OFFICE_VOXELS,
  ROAD_VOXELS,
  ROAD_CROSS_VOXELS,
  SIDEWALK_VOXELS,
  TREE_A_VOXELS,
  TREE_B_VOXELS,
  BUSH_VOXELS,
  GARDEN_VOXELS,
  FACTORY_VOXELS,
  STREET_LIGHT_VOXELS,
} from './buildings';

// ── Seeded PRNG ─────────────────────────────────────────────────────────────

/** Simple mulberry32 PRNG. Returns a function that yields 0..1. */
const createRng = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Layout configuration ────────────────────────────────────────────────────

export interface CityLayoutConfig {
  /** Numeric seed for the PRNG. */
  seed: number;
  /** Grid cell count (world-size / world-scale). Typically 24 for a 240-world. */
  gridSize: number;
  /** World-scale factor (voxels per grid cell). */
  worldScale: number;
  /** Target number of residential buildings. */
  houseCount: number;
  /** Target number of commercial/office buildings. */
  officeCount: number;
  /** Target number of park/foliage elements. */
  parkCount: number;
  /** How many road segments to lay down (horizontal + vertical). */
  roadDensity: number;
}

const DEFAULT_CONFIG: CityLayoutConfig = {
  seed: 42,
  gridSize: 24,
  worldScale: 10,
  houseCount: 8,
  officeCount: 3,
  parkCount: 12,
  roadDensity: 4,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const toWorld = (grid: number, scale: number) => grid * scale + Math.floor(scale / 2);

const isOccupied = (
  occupied: Set<string>,
  gx: number,
  gy: number,
  halfSize: number = 1
) => {
  for (let dx = -halfSize; dx <= halfSize; dx++) {
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      if (occupied.has(`${gx + dx},${gy + dy}`)) return true;
    }
  }
  return false;
};

const markOccupied = (
  occupied: Set<string>,
  gx: number,
  gy: number,
  halfSize: number = 1
) => {
  for (let dx = -halfSize; dx <= halfSize; dx++) {
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      occupied.add(`${gx + dx},${gy + dy}`);
    }
  }
};

// ── Generator ───────────────────────────────────────────────────────────────

/**
 * Generate a procedural city layout from a seed.
 *
 * @param config - Layout parameters. Uses sensible defaults for any omitted values.
 * @returns A `Record<string, Building>` suitable for `GameState.buildings`.
 */
export const generateCityLayout = (
  config: Partial<CityLayoutConfig> = {}
): Record<string, Building> => {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = createRng(cfg.seed);
  const buildings: Record<string, Building> = {};
  const occupied = new Set<string>();
  let idCounter = 0;

  /** Maximum scatter-placement attempts before giving up on a category. */
  const MAX_PLACEMENT_ATTEMPTS = 200;

  const nextId = (prefix: string) => `proc_${prefix}_${idCounter++}`;

  const tryPlace = (
    gx: number,
    gy: number,
    halfSize: number,
    margin: number = 0
  ): boolean => {
    const hs = halfSize + margin;
    if (gx - hs < 0 || gy - hs < 0 || gx + hs >= cfg.gridSize || gy + hs >= cfg.gridSize) {
      return false;
    }
    return !isOccupied(occupied, gx, gy, hs);
  };

  const addBuilding = (
    prefix: string,
    gx: number,
    gy: number,
    type: Building['type'],
    name: string,
    voxels: Building['voxels'],
    halfSize: number = 1
  ) => {
    const id = nextId(prefix);
    buildings[id] = {
      id,
      npcId: 'none',
      name,
      pos: { x: toWorld(gx, cfg.worldScale), y: toWorld(gy, cfg.worldScale) },
      type,
      isDiscovered: type === 'ROAD' || type === 'SIDEWALK' || type === 'PARK',
      voxels,
    };
    markOccupied(occupied, gx, gy, halfSize);
  };

  // 1. Lay down a cross-road pattern through the center
  const centerG = Math.floor(cfg.gridSize / 2);

  // Horizontal road
  for (let gx = 2; gx < cfg.gridSize - 2; gx++) {
    const id = nextId('road');
    buildings[id] = {
      id,
      npcId: 'none',
      name: 'Road',
      pos: { x: toWorld(gx, cfg.worldScale), y: toWorld(centerG, cfg.worldScale) },
      type: 'ROAD',
      isDiscovered: true,
      voxels: ROAD_VOXELS,
    };
    occupied.add(`${gx},${centerG}`);
  }

  // Vertical road
  for (let gy = 2; gy < cfg.gridSize - 2; gy++) {
    if (gy === centerG) continue; // Already placed intersection
    const id = nextId('road');
    buildings[id] = {
      id,
      npcId: 'none',
      name: 'Road',
      pos: { x: toWorld(centerG, cfg.worldScale), y: toWorld(gy, cfg.worldScale) },
      type: 'ROAD',
      isDiscovered: true,
      voxels: ROAD_VOXELS,
    };
    occupied.add(`${centerG},${gy}`);
  }

  // Intersection at center
  const crossId = nextId('cross');
  buildings[crossId] = {
    id: crossId,
    npcId: 'none',
    name: 'Crossroads',
    pos: { x: toWorld(centerG, cfg.worldScale), y: toWorld(centerG, cfg.worldScale) },
    type: 'ROAD',
    isDiscovered: true,
    voxels: ROAD_CROSS_VOXELS,
  };

  // Additional parallel roads based on density
  for (let r = 1; r <= cfg.roadDensity; r++) {
    const offset = Math.floor(cfg.gridSize / (cfg.roadDensity + 2)) * r;
    if (offset === centerG || offset < 2 || offset >= cfg.gridSize - 2) continue;

    for (let gx = 2; gx < cfg.gridSize - 2; gx++) {
      if (occupied.has(`${gx},${offset}`)) continue;
      const id = nextId('road');
      buildings[id] = {
        id,
        npcId: 'none',
        name: 'Road',
        pos: { x: toWorld(gx, cfg.worldScale), y: toWorld(offset, cfg.worldScale) },
        type: 'ROAD',
        isDiscovered: true,
        voxels: ROAD_VOXELS,
      };
      occupied.add(`${gx},${offset}`);
    }
  }

  // 2. Place sidewalks adjacent to roads
  const roadKeys = new Set<string>();
  for (const key of occupied) roadKeys.add(key);
  for (const key of roadKeys) {
    const [rx, ry] = key.split(',').map(Number);
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const sx = rx + dx;
      const sy = ry + dy;
      if (sx < 1 || sy < 1 || sx >= cfg.gridSize - 1 || sy >= cfg.gridSize - 1) continue;
      if (occupied.has(`${sx},${sy}`)) continue;
      if (rng() < 0.4) {
        const id = nextId('sidewalk');
        buildings[id] = {
          id,
          npcId: 'none',
          name: 'Sidewalk',
          pos: { x: toWorld(sx, cfg.worldScale), y: toWorld(sy, cfg.worldScale) },
          type: 'SIDEWALK',
          isDiscovered: true,
          voxels: SIDEWALK_VOXELS,
        };
        occupied.add(`${sx},${sy}`);
      }
    }
  }

  // 3. Scatter houses near roads
  const houseVoxels = [GENERIC_HOUSE_A_VOXELS, GENERIC_HOUSE_B_VOXELS, GENERIC_HOUSE_D_VOXELS];
  const houseNames = ['Townhouse', 'Bungalow', 'Worker Cabin'];
  let housesPlaced = 0;
  let attempts = 0;
  while (housesPlaced < cfg.houseCount && attempts < MAX_PLACEMENT_ATTEMPTS) {
    attempts++;
    const gx = Math.floor(rng() * (cfg.gridSize - 4)) + 2;
    const gy = Math.floor(rng() * (cfg.gridSize - 4)) + 2;
    if (!tryPlace(gx, gy, 1, 1)) continue;

    // Prefer near roads
    let nearRoad = false;
    for (let d = 1; d <= 3; d++) {
      if (roadKeys.has(`${gx},${gy + d}`) || roadKeys.has(`${gx},${gy - d}`) ||
          roadKeys.has(`${gx + d},${gy}`) || roadKeys.has(`${gx - d},${gy}`)) {
        nearRoad = true;
        break;
      }
    }
    if (!nearRoad && rng() < 0.7) continue;

    const vi = Math.floor(rng() * houseVoxels.length);
    addBuilding('house', gx, gy, 'HOME', houseNames[vi], houseVoxels[vi], 1);
    housesPlaced++;
  }

  // 4. Place offices near the center
  let officesPlaced = 0;
  attempts = 0;
  while (officesPlaced < cfg.officeCount && attempts < MAX_PLACEMENT_ATTEMPTS) {
    attempts++;
    const gx = centerG + Math.floor(rng() * 8) - 4;
    const gy = centerG + Math.floor(rng() * 8) - 4;
    if (!tryPlace(gx, gy, 1, 1)) continue;

    addBuilding('office', gx, gy, 'OFFICE', 'Office Block', GENERIC_OFFICE_VOXELS, 1);
    officesPlaced++;
  }

  // 5. Scatter parks and foliage
  const foliage = [
    { name: 'Oak Tree', voxels: TREE_A_VOXELS },
    { name: 'Pine Tree', voxels: TREE_B_VOXELS },
    { name: 'Bush', voxels: BUSH_VOXELS },
    { name: 'Garden', voxels: GARDEN_VOXELS },
  ];
  let parksPlaced = 0;
  attempts = 0;
  while (parksPlaced < cfg.parkCount && attempts < MAX_PLACEMENT_ATTEMPTS) {
    attempts++;
    const gx = Math.floor(rng() * (cfg.gridSize - 2)) + 1;
    const gy = Math.floor(rng() * (cfg.gridSize - 2)) + 1;
    if (occupied.has(`${gx},${gy}`)) continue;

    const fi = Math.floor(rng() * foliage.length);
    addBuilding('park', gx, gy, 'PARK', foliage[fi].name, foliage[fi].voxels, 0);
    parksPlaced++;
  }

  // 6. Add street lights along main roads
  for (const key of roadKeys) {
    if (rng() > 0.15) continue;
    const [rx, ry] = key.split(',').map(Number);
    const lx = rx + (rng() < 0.5 ? 1 : -1);
    if (occupied.has(`${lx},${ry}`)) continue;
    const id = nextId('light');
    buildings[id] = {
      id,
      npcId: 'none',
      name: 'Street Light',
      pos: { x: toWorld(lx, cfg.worldScale), y: toWorld(ry, cfg.worldScale) },
      type: 'LANDMARK',
      isDiscovered: true,
      voxels: STREET_LIGHT_VOXELS,
    };
    occupied.add(`${lx},${ry}`);
  }

  return buildings;
};
