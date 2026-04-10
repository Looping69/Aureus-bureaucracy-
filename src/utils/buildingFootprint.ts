/**
 * @module buildingFootprint
 * Shared utility for computing building footprints.
 * Centralises the footprint derivation logic that was previously duplicated
 * across CityPlanner, worldSurface, and worldNavigation.
 */
import { Building } from '../types';
import type { BuildingFootprint } from './worldNavigation';

/**
 * Derive the 2-D axis-aligned bounding box of a building on the world grid.
 *
 * Strategy:
 * 1. If voxels exist, reduce them to min/max bounds offset by building pos.
 * 2. Otherwise fall back to a fixed half-extent based on building type.
 *
 * @returns A BuildingFootprint with minX/maxX/minY/maxY in world coordinates.
 */
export const deriveFootprint = (building: Building): BuildingFootprint => {
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

  const FALLBACK_HALF_EXTENTS: Partial<Record<Building['type'], number>> = {
    HOME: 3,
    OFFICE: 3,
    PUB: 4,
    HOTLINE: 2,
    LANDMARK: 4,
    RESIDENTIAL: 3,
    INDUSTRIAL: 4,
  };

  const halfExtent = FALLBACK_HALF_EXTENTS[building.type] ?? 3;
  return {
    minX: building.pos.x - halfExtent,
    maxX: building.pos.x + halfExtent,
    minY: building.pos.y - halfExtent,
    maxY: building.pos.y + halfExtent,
  };
};

/** Check whether two axis-aligned footprints overlap. */
export const footprintsOverlap = (
  a: BuildingFootprint,
  b: BuildingFootprint
): boolean =>
  !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);

/** Check if a world-space point is inside a footprint (with optional padding). */
export const isInsideFootprint = (
  x: number,
  y: number,
  footprint: BuildingFootprint,
  padding: number = 0
): boolean =>
  x >= footprint.minX - padding &&
  x <= footprint.maxX + padding &&
  y >= footprint.minY - padding &&
  y <= footprint.maxY + padding;
