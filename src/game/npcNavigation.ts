import { Building, NavigationZone, NPC, WorldPosition } from '../types';
import { findPath } from '../utils/pathfinding';
import { WORLD_SIZE } from '../utils/voxelConstants';
import { getBuildingAccessPosition } from '../utils/worldNavigation';
import {
  buildWorldSurfaceMap,
  getWorldSurfaceTile,
  SurfaceTile,
  WorldSurfaceMap,
} from '../utils/worldSurface';

export const NPC_WALK_SPEED = 5.5;
const BUILDING_FRONTAGE_SEARCH_STEPS = 24;
const FRONTAGE_DIRECTIONS: WorldPosition[] = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

export type RoadPedestrianZone = 'NS' | 'EW' | 'X' | null;

const keyFor = (position: WorldPosition) => `${position.x},${position.y}`;

const uniquePositions = (positions: WorldPosition[]) => {
  const deduped = new Map<string, WorldPosition>();
  positions.forEach((position) => {
    deduped.set(keyFor(position), position);
  });
  return [...deduped.values()];
};

const computeVoxelBounds = (building: Building) => {
  if (!building.voxels || building.voxels.length === 0) {
    return null;
  }

  return building.voxels.reduce(
    (bounds, voxel) => ({
      minX: Math.min(bounds.minX, voxel.x),
      maxX: Math.max(bounds.maxX, voxel.x),
      minY: Math.min(bounds.minY, voxel.y),
      maxY: Math.max(bounds.maxY, voxel.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  );
};

export const getRoadPedestrianZone = (building: Building): RoadPedestrianZone => {
  if (building.type !== 'ROAD') {
    return null;
  }

  const bounds = computeVoxelBounds(building);
  if (!bounds) {
    return null;
  }

  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;

  if (width >= 14 && height >= 14) {
    return 'X';
  }

  return width > height ? 'EW' : 'NS';
};

const isRoadPedestrianTile = (
  tile: SurfaceTile,
  buildings: Record<string, Building>,
) => {
  if (tile.kind === 'SIDEWALK') {
    return true;
  }

  if (tile.kind === 'PLAZA') {
    return false;
  }

  if (tile.kind !== 'ROAD' || !tile.buildingId) {
    return false;
  }

  const road = buildings[tile.buildingId];
  if (!road || road.type !== 'ROAD') {
    return false;
  }

  const relativeX = tile.x - road.pos.x;
  const relativeY = tile.y - road.pos.y;
  const absX = Math.abs(relativeX);
  const absY = Math.abs(relativeY);

  switch (getRoadPedestrianZone(road)) {
    case 'NS':
      return absX >= 3 && absX <= 4;
    case 'EW':
      return absY >= 3 && absY <= 4;
    case 'X': {
      const onCornerSidewalk = absX >= 3 && absY >= 3;
      const onCrossing = absX <= 2 || absY <= 2;
      return onCornerSidewalk || onCrossing;
    }
    default:
      return false;
  }
};

const isBaseNpcPedestrianTile = (
  tile: SurfaceTile,
  buildings: Record<string, Building>,
  allowedBuildingIds: Set<string>,
) => {
  if (tile.kind === 'SIDEWALK') {
    return true;
  }

  if (tile.kind === 'PLAZA') {
    return Boolean(tile.buildingId && allowedBuildingIds.has(tile.buildingId));
  }

  return isRoadPedestrianTile(tile, buildings);
};

export const isNpcPedestrianTile = (
  tile: SurfaceTile,
  buildings: Record<string, Building>,
  allowedBuildingIds: Set<string>,
  surfaceMap: WorldSurfaceMap = buildWorldSurfaceMap(buildings, WORLD_SIZE, []),
) => {
  if (!tile.walkable) {
    return false;
  }

  if (isBaseNpcPedestrianTile(tile, buildings, allowedBuildingIds)) {
    return true;
  }

  if (tile.kind !== 'GROUND' && tile.kind !== 'ROAD') {
    return false;
  }

  for (const buildingId of allowedBuildingIds) {
    const building = buildings[buildingId];
    if (!building) {
      continue;
    }

    const accessPos = getBuildingAccessPosition(building);
    for (const direction of FRONTAGE_DIRECTIONS) {
      const deltaX = tile.x - accessPos.x;
      const deltaY = tile.y - accessPos.y;
      const isOnLine = direction.x !== 0
        ? deltaY === 0 && Math.sign(deltaX) === direction.x
        : deltaX === 0 && Math.sign(deltaY) === direction.y;

      if (!isOnLine) {
        continue;
      }

      const distanceFromAccess = direction.x !== 0
        ? Math.abs(deltaX)
        : Math.abs(deltaY);

      if (distanceFromAccess < 0 || distanceFromAccess > BUILDING_FRONTAGE_SEARCH_STEPS) {
        continue;
      }

      let connectorStep = -1;

      for (let step = 1; step <= BUILDING_FRONTAGE_SEARCH_STEPS; step += 1) {
        const probeX = accessPos.x + (step * direction.x);
        const probeY = accessPos.y + (step * direction.y);
        const probeTile = getWorldSurfaceTile(surfaceMap, probeX, probeY);

        if (!probeTile) {
          break;
        }

        if (probeTile.kind === 'GROUND') {
          continue;
        }

        if (probeTile.kind === 'PLAZA' && probeTile.buildingId === buildingId) {
          continue;
        }

        if (isBaseNpcPedestrianTile(probeTile, buildings, allowedBuildingIds)) {
          connectorStep = step;
          break;
        }
      }

      if (connectorStep !== -1 && distanceFromAccess <= connectorStep) {
        return true;
      }
    }
  }

  return false;
};

export const buildNpcPedestrianPath = (
  npc: NPC,
  buildings: Record<string, Building>,
  mapSize: number = WORLD_SIZE,
  navigationZones: NavigationZone[] = [],
  startPos?: WorldPosition,
  endPos?: WorldPosition,
) => {
  const homeBuilding = npc.homeBuildingId ? buildings[npc.homeBuildingId] : null;
  const workBuilding = npc.workBuildingId ? buildings[npc.workBuildingId] : null;
  const fallbackStart = homeBuilding ? getBuildingAccessPosition(homeBuilding) : null;
  const fallbackEnd = workBuilding ? getBuildingAccessPosition(workBuilding) : null;

  const routeStart = startPos ?? fallbackStart;
  const routeEnd = endPos ?? fallbackEnd;
  if (!routeStart || !routeEnd) {
    return [];
  }

  const allowedBuildingIds = new Set<string>();
  if (npc.homeBuildingId) allowedBuildingIds.add(npc.homeBuildingId);
  if (npc.workBuildingId) allowedBuildingIds.add(npc.workBuildingId);
  const surfaceMap = buildWorldSurfaceMap(buildings, mapSize, navigationZones);

  return findPath(routeStart, routeEnd, buildings, mapSize, navigationZones, {
    tileFilter: ({ tile }) => isNpcPedestrianTile(tile, buildings, allowedBuildingIds, surfaceMap),
    nearestTileFilter: ({ tile }) => isNpcPedestrianTile(tile, buildings, allowedBuildingIds, surfaceMap),
  });
};

export const collectNpcRoamingDestinations = (
  npc: NPC,
  buildings: Record<string, Building>,
) => {
  const allowedBuildingIds = new Set<string>();
  const destinations: WorldPosition[] = [];
  const surfaceMap = buildWorldSurfaceMap(buildings, WORLD_SIZE, []);

  if (npc.homeBuildingId) {
    allowedBuildingIds.add(npc.homeBuildingId);
    const home = buildings[npc.homeBuildingId];
    if (home) {
      destinations.push(getBuildingAccessPosition(home));
    }
  }

  if (npc.workBuildingId) {
    allowedBuildingIds.add(npc.workBuildingId);
    const work = buildings[npc.workBuildingId];
    if (work) {
      destinations.push(getBuildingAccessPosition(work));
    }
  }

  Object.values(buildings).forEach((building) => {
    if (building.type === 'SIDEWALK') {
      destinations.push({ x: building.pos.x, y: building.pos.y });
      return;
    }

    if (building.type !== 'ROAD') {
      return;
    }

    switch (getRoadPedestrianZone(building)) {
      case 'NS':
        destinations.push(
          { x: building.pos.x - 4, y: building.pos.y },
          { x: building.pos.x + 4, y: building.pos.y },
        );
        break;
      case 'EW':
        destinations.push(
          { x: building.pos.x, y: building.pos.y - 4 },
          { x: building.pos.x, y: building.pos.y + 4 },
        );
        break;
      case 'X':
        destinations.push(
          { x: building.pos.x - 4, y: building.pos.y - 4 },
          { x: building.pos.x + 4, y: building.pos.y - 4 },
          { x: building.pos.x - 4, y: building.pos.y + 4 },
          { x: building.pos.x + 4, y: building.pos.y + 4 },
        );
        break;
      default:
        break;
    }
  });

  return uniquePositions(destinations).filter((destination) => {
    const tile = getWorldSurfaceTile(surfaceMap, destination.x, destination.y);
    return Boolean(tile) && isNpcPedestrianTile(tile, buildings, allowedBuildingIds, surfaceMap);
  });
};

export const chooseNpcRoamingDestination = (
  currentPos: WorldPosition,
  destinations: WorldPosition[],
  lastDestination: WorldPosition | null,
  random: () => number = Math.random,
) => {
  const currentKey = keyFor({ x: Math.round(currentPos.x), y: Math.round(currentPos.y) });
  const lastKey = lastDestination ? keyFor(lastDestination) : null;

  const candidates = destinations.filter((destination) => {
    const destinationKey = keyFor(destination);
    return destinationKey !== currentKey && destinationKey !== lastKey;
  });

  const pool = candidates.length > 0
    ? candidates
    : destinations.filter((destination) => keyFor(destination) !== currentKey);

  if (pool.length === 0) {
    return null;
  }

  const ranked = [...pool]
    .map((destination) => ({
      destination,
      distance: Math.hypot(destination.x - currentPos.x, destination.y - currentPos.y),
    }))
    .filter((candidate) => candidate.distance >= 2)
    .sort((a, b) => a.distance - b.distance);

  const selectionPool = (ranked.length > 0 ? ranked : pool.map((destination) => ({ destination, distance: 0 }))).slice(0, 6);
  return selectionPool[Math.floor(random() * selectionPool.length)]?.destination ?? null;
};
