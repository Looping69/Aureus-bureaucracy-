import { Building, NavigationZone, WorldPosition } from '../types';
import { WORLD_SIZE } from './voxelConstants';
import {
  buildWorldSurfaceMap,
  getWorldSurfaceTile,
  type SurfaceTile,
  type WorldSurfaceMap,
} from './worldSurface';
import { MinHeap } from './MinHeap';

export interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export interface PathTileFilterContext {
  tile: SurfaceTile;
  surfaceMap: WorldSurfaceMap;
}

export interface FindPathOptions {
  tileFilter?: (context: PathTileFilterContext) => boolean;
  nearestTileFilter?: (context: PathTileFilterContext) => boolean;
  /** Pre-built surface map – avoids a redundant buildWorldSurfaceMap call. */
  surfaceMap?: WorldSurfaceMap;
}

const STRAIGHT_COST = 1;
const DIAGONAL_COST = Math.SQRT2;
const STEP_HEIGHT_LIMIT = 1;

const DIRECTIONS = [
  { x: 1, y: 0, cost: STRAIGHT_COST },
  { x: -1, y: 0, cost: STRAIGHT_COST },
  { x: 0, y: 1, cost: STRAIGHT_COST },
  { x: 0, y: -1, cost: STRAIGHT_COST },
  { x: 1, y: 1, cost: DIAGONAL_COST },
  { x: 1, y: -1, cost: DIAGONAL_COST },
  { x: -1, y: 1, cost: DIAGONAL_COST },
  { x: -1, y: -1, cost: DIAGONAL_COST },
];

const keyFor = (x: number, y: number) => `${x},${y}`;

const clampWorldCoordinate = (value: number, mapSize: number) => {
  const rounded = Math.round(value);
  return Math.max(0, Math.min(mapSize - 1, rounded));
};

const clampWorldPosition = (
  pos: WorldPosition,
  mapSize: number
): WorldPosition => ({
  x: clampWorldCoordinate(pos.x, mapSize),
  y: clampWorldCoordinate(pos.y, mapSize),
});

const octileDistance = (a: WorldPosition, b: WorldPosition) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy + (DIAGONAL_COST - 2) * Math.min(dx, dy);
};

const buildBlockedTiles = (surfaceMap: WorldSurfaceMap) => {
  const blocked = new Set<string>();

  surfaceMap.tiles.forEach((tile) => {
    if (!tile.walkable) {
      blocked.add(keyFor(tile.x, tile.y));
    }
  });

  return blocked;
};

const matchesTileFilter = (
  tile: SurfaceTile | null,
  surfaceMap: WorldSurfaceMap,
  tileFilter?: (context: PathTileFilterContext) => boolean
) => {
  if (!tile) {
    return false;
  }

  if (!tileFilter) {
    return true;
  }

  return tileFilter({ tile, surfaceMap });
};

const isInBounds = (x: number, y: number, mapSize: number) =>
  x >= 0 && x < mapSize && y >= 0 && y < mapSize;

const canOccupyTile = (
  x: number,
  y: number,
  blocked: Set<string>,
  mapSize: number,
  surfaceMap: WorldSurfaceMap,
  tileFilter?: (context: PathTileFilterContext) => boolean
) => {
  if (!isInBounds(x, y, mapSize) || blocked.has(keyFor(x, y))) {
    return false;
  }

  const tile = getWorldSurfaceTile(surfaceMap, x, y);
  return Boolean(tile?.walkable) && matchesTileFilter(tile, surfaceMap, tileFilter);
};

const getNearestAllowedTile = (
  target: WorldPosition,
  surfaceMap: WorldSurfaceMap,
  maxRadius: number = 12,
  tileFilter?: (context: PathTileFilterContext) => boolean
) => {
  const startTile = getWorldSurfaceTile(surfaceMap, target.x, target.y);
  if (startTile?.walkable && matchesTileFilter(startTile, surfaceMap, tileFilter)) {
    return startTile;
  }

  for (let radius = 1; radius <= maxRadius; radius += 1) {
    const ring: SurfaceTile[] = [];

    for (let dx = -radius; dx <= radius; dx += 1) {
      const top = getWorldSurfaceTile(surfaceMap, target.x + dx, target.y - radius);
      const bottom = getWorldSurfaceTile(surfaceMap, target.x + dx, target.y + radius);
      if (top) ring.push(top);
      if (bottom) ring.push(bottom);
    }

    for (let dy = -radius + 1; dy <= radius - 1; dy += 1) {
      const left = getWorldSurfaceTile(surfaceMap, target.x - radius, target.y + dy);
      const right = getWorldSurfaceTile(surfaceMap, target.x + radius, target.y + dy);
      if (left) ring.push(left);
      if (right) ring.push(right);
    }

    const candidate = ring.find((tile) => tile.walkable && matchesTileFilter(tile, surfaceMap, tileFilter));
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

const reconstructPath = (node: PathNode) => {
  // Performance: Build path in reverse order, then reverse once
  // This is faster than unshift() which requires shifting all elements
  const path: WorldPosition[] = [];
  let current: PathNode | null = node;

  while (current && current.parent) {
    path.push({ x: current.x, y: current.y });
    current = current.parent;
  }

  // Reverse the path once at the end
  return path.reverse();
};

const findPathOnGrid = (
  start: WorldPosition,
  end: WorldPosition,
  blocked: Set<string>,
  mapSize: number,
  surfaceMap: WorldSurfaceMap,
  tileFilter?: (context: PathTileFilterContext) => boolean
): WorldPosition[] => {
  const openHeap = new MinHeap<PathNode>((a, b) => a.f - b.f);
  const openMap = new Map<string, PathNode>();
  const closed = new Set<string>();

  const startTile = getWorldSurfaceTile(surfaceMap, start.x, start.y);
  const endTile = getWorldSurfaceTile(surfaceMap, end.x, end.y);

  if (!startTile || !endTile) {
    return [];
  }

  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: octileDistance(start, end),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  openHeap.push(startNode);
  openMap.set(keyFor(start.x, start.y), startNode);

  while (openHeap.size > 0) {
    const current = openHeap.pop()!;
    const currentKey = keyFor(current.x, current.y);

    // Skip stale entries (node was already superseded by a better path)
    if (closed.has(currentKey)) {
      continue;
    }
    openMap.delete(currentKey);
    closed.add(currentKey);

    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(current);
    }

    const currentSurface = getWorldSurfaceTile(surfaceMap, current.x, current.y);
    if (!currentSurface) {
      continue;
    }

    for (const direction of DIRECTIONS) {
      const nextX = current.x + direction.x;
      const nextY = current.y + direction.y;
      const nextKey = keyFor(nextX, nextY);

      if (closed.has(nextKey)) {
        continue;
      }

      if (!canOccupyTile(nextX, nextY, blocked, mapSize, surfaceMap, tileFilter)) {
        continue;
      }

      const nextSurface = getWorldSurfaceTile(surfaceMap, nextX, nextY);
      if (!nextSurface) {
        continue;
      }

      const heightDelta = Math.abs(nextSurface.height - currentSurface.height);
      if (heightDelta > STEP_HEIGHT_LIMIT) {
        continue;
      }

      if (direction.x !== 0 && direction.y !== 0) {
        if (
          !canOccupyTile(current.x + direction.x, current.y, blocked, mapSize, surfaceMap, tileFilter) ||
          !canOccupyTile(current.x, current.y + direction.y, blocked, mapSize, surfaceMap, tileFilter)
        ) {
          continue;
        }
      }

      const g = current.g + direction.cost + nextSurface.cost + heightDelta * 0.4;
      const existing = openMap.get(nextKey);

      if (!existing || g < existing.g) {
        const node: PathNode = {
          x: nextX,
          y: nextY,
          g,
          h: octileDistance({ x: nextX, y: nextY }, end),
          f: 0,
          parent: current,
        };
        node.f = node.g + node.h;
        openHeap.push(node);
        openMap.set(nextKey, node);
      }
    }
  }

  return [];
};

export const findPath = (
  start: WorldPosition,
  end: WorldPosition,
  buildings: Record<string, Building>,
  mapSize: number = WORLD_SIZE,
  navigationZones: NavigationZone[] = [],
  options: FindPathOptions = {}
): WorldPosition[] => {
  const surfaceMap = options.surfaceMap ?? buildWorldSurfaceMap(buildings, mapSize, navigationZones);
  const blocked = buildBlockedTiles(surfaceMap);

  const startTile = getNearestAllowedTile(
    clampWorldPosition(start, mapSize),
    surfaceMap,
    12,
    options.nearestTileFilter ?? options.tileFilter
  );
  const endTile = getNearestAllowedTile(
    clampWorldPosition(end, mapSize),
    surfaceMap,
    12,
    options.nearestTileFilter ?? options.tileFilter
  );

  if (!startTile || !endTile) {
    return [];
  }

  const startPos = { x: startTile.x, y: startTile.y };
  const endPos = { x: endTile.x, y: endTile.y };

  if (startPos.x === endPos.x && startPos.y === endPos.y) {
    return [];
  }

  blocked.delete(keyFor(startPos.x, startPos.y));

  return findPathOnGrid(startPos, endPos, blocked, mapSize, surfaceMap, options.tileFilter);
};
