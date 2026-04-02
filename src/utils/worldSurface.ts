import { Building, VoxelData } from '../types';
import { COLORS, CONFIG, WORLD_HALF_SIZE, WORLD_SIZE } from './voxelConstants';
import {
  getBuildingFootprint,
  getStructureBaseHeight,
  isSolidBuilding,
} from './worldNavigation';
import type { BuildingFootprint } from './worldNavigation';

export type SurfaceKind =
  | 'GROUND'
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

const WALKABLE_COSTS: Record<SurfaceKind, number> = {
  GROUND: 1.65,
  ROAD: 0.8,
  SIDEWALK: 0.95,
  PARK: 1.05,
  PLAZA: 1.15,
  FOUNDATION: Number.POSITIVE_INFINITY,
  CLIFF: 1.9,
};

const SURFACE_COLORS: Record<SurfaceKind, [number, number, number, number]> = {
  GROUND: [COLORS.GRASS, COLORS.DARK, COLORS.GREY, COLORS.SAND],
  ROAD: [COLORS.ROAD, COLORS.DARK_GREY, COLORS.GREY, COLORS.SAND],
  SIDEWALK: [COLORS.SIDEWALK, COLORS.GREY, COLORS.DARK_GREY, COLORS.SAND],
  PARK: [COLORS.GRASS, 0x5a6d46, COLORS.GREY, COLORS.SAND],
  PLAZA: [COLORS.SIDEWALK, COLORS.GREY, COLORS.DARK_GREY, COLORS.SAND],
  FOUNDATION: [COLORS.GREY, COLORS.DARK_GREY, COLORS.DARK, COLORS.SAND],
  CLIFF: [COLORS.GREY, COLORS.DARK_GREY, COLORS.DARK, COLORS.SAND],
};

const keyFor = (x: number, y: number) => `${x},${y}`;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const withinBounds = (x: number, y: number, mapSize: number = WORLD_SIZE) =>
  x >= 0 && x < mapSize && y >= 0 && y < mapSize;

const quantizeHeight = (value: number) =>
  clamp(Math.round(value), MIN_SURFACE_HEIGHT, MAX_SURFACE_HEIGHT);

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

  return quantizeHeight(tier + wobble);
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

export const buildWorldSurfaceMap = (
  buildings: Record<string, Building> | Building[],
  mapSize: number = WORLD_SIZE
): WorldSurfaceMap => {
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

      tiles.set(keyFor(x, y), tile);
    }
  }

  return {
    width: mapSize,
    height: mapSize,
    tiles,
  };
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
  mapSize: number = WORLD_SIZE
) => {
  const surfaceMap = buildWorldSurfaceMap(buildings, mapSize);
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
