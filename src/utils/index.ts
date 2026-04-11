// Barrel re-exports for utils/ module.
// Import from specific sub-modules for smaller bundles,
// or from this barrel for convenience.

export { CONFIG, WORLD_SIZE, WORLD_HALF_SIZE, COLORS } from './voxelConstants';
export { GreedyMesher } from './GreedyMesher';
export { MinHeap } from './MinHeap';
export type { HeapNode } from './MinHeap';
export { BuildingGenerator, rotateVoxels } from './buildingGenerator';
export type { Voxel, RotationStep } from './buildingGenerator';
export {
  deriveFootprint,
  footprintsOverlap,
  isInsideFootprint,
} from './buildingFootprint';
export {
  getBuildingAccessPosition,
  getBuildingFootprint,
  getStructureBaseHeight,
  isSolidBuilding,
} from './worldNavigation';
export type { BuildingFootprint } from './worldNavigation';
export {
  buildWorldSurfaceMap,
  buildWorldTerrainVoxels,
  getWorldSurfaceHeight,
  getWorldSurfaceTile,
  getNearestWalkableTile,
} from './worldSurface';
export type { WorldSurfaceMap } from './worldSurface';
export {
  findPath,
  findNpcPath,
  invalidatePathfindingCache,
} from './pathfinding';
export {
  DAY_NIGHT,
  SUNRISE_HOUR,
  hoursToTicks,
  ticksToHours,
  isDaytimeHours,
  isNightTime,
  getDaylightFactor,
  getCelestialPosition,
} from './dayNightCycle';
export {
  ZONE_DEFINITIONS,
  getZoneAt,
  setZoneAt,
  isBuildingAllowedInZone,
  paintZoneRect,
  getZoneStats,
} from './zoning';
export type { ZoneType, ZoneGrid } from './zoning';
