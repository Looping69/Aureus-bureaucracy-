import { Building, NavigationZone, VoxelData } from '../types';
import { COLORS, CONFIG, WORLD_HALF_SIZE, WORLD_SIZE } from './voxelConstants';
import {
  getBuildingFootprint,
  getStructureBaseHeight,
  isSolidBuilding,
} from './worldNavigation';
import type { BuildingFootprint } from './worldNavigation';

export type SurfaceKind =
  | 'GROUND'
  | 'LOT_EDGE'
  | 'ROAD'
  | 'SIDEWALK'
  | 'PARK'
  | 'PLAZA'
  | 'FOUNDATION'
  | 'CLIFF';

export interface SurfaceTile {
  x: number;
  y: number;
  height: number;
  kind: SurfaceKind;
  walkable: boolean;
  cost: number;
  buildingId?: string;
}

export interface WorldSurfaceMap {
  width: number;
  height: number;
  tiles: Map<string, SurfaceTile>;
}

const MAX_SURFACE_HEIGHT = 0;
const MIN_SURFACE_HEIGHT = -3;
const TERRAIN_LAYERS = 4;
const TERRAIN_HEIGHT_LIFT = 1;
const LOT_EDGE_TARGET_DROP = 1;

const CARDINAL_NEIGHBORS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;

const WALKABLE_COSTS: Record<SurfaceKind, number> = {
  GROUND: 1.65,
  LOT_EDGE: 1.25,
  ROAD: 0.8,
  SIDEWALK: 0.95,
  PARK: 1.05,
  PLAZA: 1.15,
  FOUNDATION: Number.POSITIVE_INFINITY,
  CLIFF: 1.9,
};

const SURFACE_COLORS: Record<SurfaceKind, [number, number, number, number]> = {
  GROUND: [COLORS.GRASS, 0x5a6d46, 0x466038, 0x314827],
  LOT_EDGE: [0x738e57, 0x62784a, 0x51643d, 0x3f4e30],
  ROAD: [COLORS.ROAD, COLORS.DARK_GREY, COLORS.GREY, COLORS.SAND],
  SIDEWALK: [COLORS.SIDEWALK, COLORS.GREY, COLORS.DARK_GREY, COLORS.SAND],
  PARK: [COLORS.GRASS, 0x5a6d46, 0x466038, 0x314827],
  PLAZA: [COLORS.SIDEWALK, COLORS.GREY, COLORS.DARK_GREY, COLORS.SAND],
  FOUNDATION: [COLORS.GREY, COLORS.DARK_GREY, COLORS.DARK, COLORS.SAND],
  CLIFF: [COLORS.GRASS, 0x5a6d46, 0x466038, 0x314827],
};

const keyFor = (x: number, y: number) => `${x},${y}`;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const withinBounds = (x: number, y: number, mapSize: number = WORLD_SIZE) =>
  x >= 0 && x < mapSize && y >= 0 && y < mapSize;

const quantizeHeight = (value: number) =>
  clamp(Math.round(value), MIN_SURFACE_HEIGHT, MAX_SURFACE_HEIGHT);

const NATURAL_SURFACE_KINDS = new Set<SurfaceKind>(['GROUND', 'PARK', 'CLIFF', 'LOT_EDGE']);
const INFRASTRUCTURE_SURFACE_KINDS = new Set<SurfaceKind>(['ROAD', 'SIDEWALK', 'PLAZA']);

const terrainHeightAt = (x: number, y: number, mapSize: number = WORLD_SIZE) => {
  const nx = x / (mapSize - 1);
  const ny = y / (mapSize - 1);
  const dx = nx - 0.5;
  const dy = ny - 0.5;
  const distance = Math.hypot(dx, dy);

  const tier =
    distance < 0.18 ? 0 :
    distance < 0.33 ? -1 :
    distance < 0.52 ? -2 :
    -3;

  const wobble =
    Math.sin((x + y) * 0.14) * 0.35 +
    Math.cos((x - y) * 0.11) * 0.25 +
    Math.sin((x * 0.07) + (y * 0.05)) * 0.2;

  return quantizeHeight(tier + wobble + TERRAIN_HEIGHT_LIFT);
};

const isInsideFootprint = (
  x: number,
  y: number,
  footprint: BuildingFootprint,
  padding: number = 0
) =>
  x >= footprint.minX - padding &&
  x <= footprint.maxX + padding &&
  y >= footprint.minY - padding &&
  y <= footprint.maxY + padding;

const deriveFootprint = (building: Building): BuildingFootprint => {
  if (building.voxels && building.voxels.length > 0) {
    return building.voxels.reduce(
      (bounds, voxel) => ({
        minX: Math.min(bounds.minX, building.pos.x + voxel.x),
        maxX: Math.max(bounds.maxX, building.pos.x + voxel.x),
        minY: Math.min(bounds.minY, building.pos.y + voxel.y),
        maxY: Math.max(bounds.maxY, building.pos.y + voxel.y),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      }
    );
  }

  const solidFootprint = getBuildingFootprint(building);
  if (solidFootprint) {
    return solidFootprint;
  }

  return {
    minX: building.pos.x - 1,
    maxX: building.pos.x + 1,
    minY: building.pos.y - 1,
    maxY: building.pos.y + 1,
  };
};

const applyBaseTerrain = (tile: SurfaceTile, mapSize: number = WORLD_SIZE) => {
  let height = terrainHeightAt(tile.x, tile.y, mapSize);

  if (tile.x < 5 || tile.y < 5 || tile.x > mapSize - 6 || tile.y > mapSize - 6) {
    height = Math.min(height, -2);
  }

  tile.height = height;
  tile.kind = height <= -2 ? 'CLIFF' : 'GROUND';
  tile.walkable = true;
  tile.cost = WALKABLE_COSTS[tile.kind];
};

const applyWalkableSurface = (
  tile: SurfaceTile,
  kind: Extract<SurfaceKind, 'ROAD' | 'SIDEWALK' | 'PARK' | 'PLAZA'>,
  targetHeight: number
) => {
  tile.height = targetHeight;
  tile.kind = kind;
  tile.walkable = true;
  tile.cost = WALKABLE_COSTS[kind];
};

const applyBlockedSurface = (
  tile: SurfaceTile,
  buildingId: string,
  targetHeight: number
) => {
  tile.height = Math.min(tile.height, targetHeight);
  tile.kind = 'FOUNDATION';
  tile.walkable = false;
  tile.cost = WALKABLE_COSTS.FOUNDATION;
  tile.buildingId = buildingId;
};

// ── Surface-map reference-equality cache ─────────────────────────────────
// buildWorldSurfaceMap iterates every cell in the grid (360×360 = 130K)
// and is called repeatedly during NPC pathfinding.  By caching the result
// keyed on the *identity* of the buildings / zones references, we avoid
// the expensive rebuild when nothing has changed.
let _surfaceMapCache: {
  buildings: Record<string, Building> | Building[];
  mapSize: number;
  navigationZones: NavigationZone[];
  map: WorldSurfaceMap;
} | null = null;

/** Drop the cached surface map so the next call rebuilds from scratch. */
export const invalidateSurfaceMapCache = () => {
  _surfaceMapCache = null;
};

const EMPTY_NAVIGATION_ZONES: NavigationZone[] = [];
const softenLoweredLotEdges = (tiles: Map<string, SurfaceTile>) => {
  const updates = new Map<string, { height: number; kind: SurfaceKind }>();

  for (const tile of tiles.values()) {
    if (!tile.walkable || !NATURAL_SURFACE_KINDS.has(tile.kind)) {
      continue;
    }

    let supportedHeight = tile.height;
    let shouldTransition = false;

    for (const neighbor of CARDINAL_NEIGHBORS) {
      const adjacentTile = tiles.get(keyFor(tile.x + neighbor.x, tile.y + neighbor.y));
      if (!adjacentTile || !INFRASTRUCTURE_SURFACE_KINDS.has(adjacentTile.kind)) {
        continue;
      }

      const heightGap = adjacentTile.height - tile.height;
      if (heightGap < 1) {
        continue;
      }

      shouldTransition = true;
      supportedHeight = Math.max(supportedHeight, adjacentTile.height - LOT_EDGE_TARGET_DROP);
    }

    if (!shouldTransition) {
      continue;
    }

    updates.set(keyFor(tile.x, tile.y), {
      height: clamp(supportedHeight, MIN_SURFACE_HEIGHT, MAX_SURFACE_HEIGHT),
      kind: 'LOT_EDGE',
    });
  }

  for (const [key, update] of updates) {
    const tile = tiles.get(key);
    if (!tile) {
      continue;
    }

    tile.height = update.height;
    tile.kind = update.kind;
    tile.cost = WALKABLE_COSTS[update.kind];
  }
};
export const buildWorldSurfaceMap = (
  buildings: Record<string, Building> | Building[],
  mapSize: number = WORLD_SIZE,
  navigationZones: NavigationZone[] = EMPTY_NAVIGATION_ZONES
): WorldSurfaceMap => {
  if (
    _surfaceMapCache &&
    _surfaceMapCache.buildings === buildings &&
    _surfaceMapCache.mapSize === mapSize &&
    _surfaceMapCache.navigationZones === navigationZones
  ) {
    return _surfaceMapCache.map;
  }

  const entries = Array.isArray(buildings) ? buildings : Object.values(buildings);
  const tiles = new Map<string, SurfaceTile>();

  const footprintEntries = entries
    .map((building) => ({
      building,
      footprint: deriveFootprint(building),
    }))
    .filter((entry): entry is { building: Building; footprint: BuildingFootprint } => Boolean(entry.footprint));

  for (let x = 0; x < mapSize; x++) {
    for (let y = 0; y < mapSize; y++) {
      const tile: SurfaceTile = {
        x,
        y,
        height: 0,
        kind: 'GROUND',
        walkable: true,
        cost: WALKABLE_COSTS.GROUND,
      };

      applyBaseTerrain(tile, mapSize);

      for (const { building, footprint } of footprintEntries) {
        if (!isInsideFootprint(x, y, footprint, 1)) {
          continue;
        }

        const foundationHeight = Math.floor(getStructureBaseHeight(building.type));

        if (!isSolidBuilding(building)) {
          const walkableKind =
            building.type === 'ROAD' ? 'ROAD' :
            building.type === 'SIDEWALK' ? 'SIDEWALK' :
            building.type === 'PARK' ? 'PARK' :
            'PLAZA';

          applyWalkableSurface(tile, walkableKind, foundationHeight);
          tile.buildingId = building.id;
          continue;
        }

        if (isInsideFootprint(x, y, footprint, 0)) {
          applyBlockedSurface(tile, building.id, foundationHeight);
          continue;
        }

        applyWalkableSurface(tile, 'PLAZA', Math.max(tile.height, foundationHeight - 1));
        tile.buildingId = building.id;
      }

      for (const zone of navigationZones) {
        if (
          zone.kind === 'BLOCKED' &&
          x >= zone.minX &&
          x <= zone.maxX &&
          y >= zone.minY &&
          y <= zone.maxY
        ) {
          applyBlockedSurface(tile, zone.id, tile.height);
        }
      }

      tiles.set(keyFor(x, y), tile);
    }
  }

  // Give lowered parcels a deliberate shoulder where they meet the road/building plane
  // so the camera reads them as stepped lots rather than broken sinkholes.
  softenLoweredLotEdges(tiles);

  const result: WorldSurfaceMap = {
    width: mapSize,
    height: mapSize,
    tiles,
  };

  _surfaceMapCache = { buildings, mapSize, navigationZones, map: result };

  return result;
};

export const getWorldSurfaceTile = (
  surfaceMap: WorldSurfaceMap,
  x: number,
  y: number
) => surfaceMap.tiles.get(keyFor(x, y)) ?? null;

export const getWorldSurfaceHeight = (
  position: { x: number; y: number },
  surfaceMap: WorldSurfaceMap
) => {
  const tile = getWorldSurfaceTile(surfaceMap, Math.round(position.x), Math.round(position.y));
  if (!tile) {
    return CONFIG.FLOOR_Y + 0.5;
  }

  return tile.height + 0.5;
};

export const getNearestWalkableTile = (
  target: { x: number; y: number },
  surfaceMap: WorldSurfaceMap,
  maxRadius: number = 12
) => {
  const startTile = getWorldSurfaceTile(surfaceMap, target.x, target.y);
  if (startTile?.walkable) {
    return startTile;
  }

  for (let radius = 1; radius <= maxRadius; radius++) {
    const ring: SurfaceTile[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
      const top = getWorldSurfaceTile(surfaceMap, target.x + dx, target.y - radius);
      const bottom = getWorldSurfaceTile(surfaceMap, target.x + dx, target.y + radius);
      if (top) ring.push(top);
      if (bottom) ring.push(bottom);
    }

    for (let dy = -radius + 1; dy <= radius - 1; dy++) {
      const left = getWorldSurfaceTile(surfaceMap, target.x - radius, target.y + dy);
      const right = getWorldSurfaceTile(surfaceMap, target.x + radius, target.y + dy);
      if (left) ring.push(left);
      if (right) ring.push(right);
    }

    const candidate = ring.find((tile) => tile.walkable);
    if (candidate) {
      return candidate;
    }
  }

  return startTile ?? null;
};

export const buildWorldTerrainVoxels = (
  buildings: Record<string, Building> | Building[],
  mapSize: number = WORLD_SIZE,
  navigationZones: NavigationZone[] = []
) => {
  const surfaceMap = buildWorldSurfaceMap(buildings, mapSize, navigationZones);
  const voxels: VoxelData[] = [];

  for (const tile of surfaceMap.tiles.values()) {
    const palette = SURFACE_COLORS[tile.kind];

    for (let layer = 0; layer < TERRAIN_LAYERS; layer++) {
      const layerHeight = tile.height - layer;
      const color = palette[Math.min(layer, palette.length - 1)];

      voxels.push({
        x: tile.x - WORLD_HALF_SIZE,
        y: layerHeight,
        z: tile.y - WORLD_HALF_SIZE,
        color,
      });
    }
  }

  return {
    voxels,
    surfaceMap,
  };
};

