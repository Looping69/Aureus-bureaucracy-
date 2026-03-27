import { Building, WorldPosition } from '../types';
import { CONFIG } from './voxelConstants';

export interface BuildingFootprint {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const INFRASTRUCTURE_SURFACE_OFFSETS: Partial<Record<Building['type'], number>> = {
  ROAD: 0.015,
  SIDEWALK: 0.04,
  PARK: 0.03,
};

const WALKABLE_BUILDING_TYPES = new Set<Building['type']>([
  'ROAD',
  'SIDEWALK',
  'PARK',
  'MINE_ENTRANCE',
]);

const FALLBACK_HALF_EXTENTS: Partial<Record<Building['type'], number>> = {
  HOME: 3,
  OFFICE: 3,
  PUB: 4,
  HOTLINE: 2,
  LANDMARK: 4,
  RESIDENTIAL: 3,
  INDUSTRIAL: 4,
};

export const clampWorldCoordinate = (value: number, mapSize: number = 160) => {
  const rounded = Math.round(value);
  return Math.max(0, Math.min(mapSize - 1, rounded));
};

export const clampWorldPosition = (
  pos: WorldPosition,
  mapSize: number = 160
): WorldPosition => ({
  x: clampWorldCoordinate(pos.x, mapSize),
  y: clampWorldCoordinate(pos.y, mapSize),
});

export const isSolidBuilding = (building: Building) => !WALKABLE_BUILDING_TYPES.has(building.type);

export const getBuildingFootprint = (building: Building): BuildingFootprint | null => {
  if (!isSolidBuilding(building)) {
    return null;
  }

  if (building.voxels && building.voxels.length > 0) {
    const footprint = building.voxels.reduce(
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

    if (Number.isFinite(footprint.minX)) {
      return footprint;
    }
  }

  const halfExtent = FALLBACK_HALF_EXTENTS[building.type] ?? 3;
  return {
    minX: building.pos.x - halfExtent,
    maxX: building.pos.x + halfExtent,
    minY: building.pos.y - halfExtent,
    maxY: building.pos.y + halfExtent,
  };
};

export const getBuildingAccessPosition = (
  building: Building,
  mapSize: number = 160
): WorldPosition => {
  const footprint = getBuildingFootprint(building);

  if (!footprint) {
    return clampWorldPosition(building.pos, mapSize);
  }

  const centerX = Math.round((footprint.minX + footprint.maxX) / 2);

  switch (building.type) {
    case 'MINE_ENTRANCE':
      return clampWorldPosition({ x: centerX, y: footprint.minY - 1 }, mapSize);
    default:
      return clampWorldPosition({ x: centerX, y: footprint.maxY + 1 }, mapSize);
  }
};

export const getStructureBaseHeight = (type: Building['type']) => {
  return CONFIG.FLOOR_Y + 1.0 + (INFRASTRUCTURE_SURFACE_OFFSETS[type] ?? 0);
};

export const getWorldSurfaceHeight = (
  position: WorldPosition,
  buildings: Building[]
) => {
  let surfaceHeight = CONFIG.FLOOR_Y + 0.5;

  buildings.forEach((building) => {
    if (!WALKABLE_BUILDING_TYPES.has(building.type)) {
      return;
    }

    const footprint = getBuildingFootprint(building) ?? {
      minX: building.pos.x,
      maxX: building.pos.x,
      minY: building.pos.y,
      maxY: building.pos.y,
    };

    if (
      position.x >= footprint.minX &&
      position.x <= footprint.maxX &&
      position.y >= footprint.minY &&
      position.y <= footprint.maxY
    ) {
      surfaceHeight = Math.max(surfaceHeight, getStructureBaseHeight(building.type) + 0.5);
    }
  });

  return surfaceHeight;
};
