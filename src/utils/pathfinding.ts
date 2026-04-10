/**
 * @module pathfinding
 * A* pathfinding on the 2-D world grid produced by {@link buildWorldSurfaceMap}.
 *
 * The algorithm uses an **octile-distance** heuristic to handle diagonal movement
 * efficiently. Blocked tiles (building foundations) are collected into a `Set<string>`
 * for O(1) lookup.  The open list is a **binary min-heap** for O(log n) extract-min,
 * replacing the original O(n) linear scan.
 *
 * Surface maps are **cached** by buildings reference to avoid rebuilding the
 * 240×240-tile grid on every pathfind call.
 *
 * Entry point: {@link findPath}.
 */
import { Building, WorldPosition } from '../types';
import { WORLD_SIZE } from './voxelConstants';
import {
  buildWorldSurfaceMap,
  getNearestWalkableTile,
  getWorldSurfaceTile,
  type WorldSurfaceMap,
} from './worldSurface';
import { MinHeap } from './MinHeap';

/**
 * Single node in the A* search tree.
 * `g` is the cost from start, `h` the heuristic to goal, `f = g + h`.
 */
export interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

const STRAIGHT_COST = 1; // Cost for cardinal (N/S/E/W) movement
const DIAGONAL_COST = Math.SQRT2; // √2 ≈ 1.414 — Euclidean cost for diagonal movement
const STEP_HEIGHT_LIMIT = 1; // Maximum terrain-height delta the player can traverse in one step

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

/** Admissible octile-distance heuristic for diagonal-movement grids. */
const octileDistance = (a: WorldPosition, b: WorldPosition) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy + (DIAGONAL_COST - 2) * Math.min(dx, dy);
};

/** Collect all non-walkable tile keys into a Set for O(1) blocked-check. */
const buildBlockedTiles = (surfaceMap: WorldSurfaceMap) => {
  const blocked = new Set<string>();

  surfaceMap.tiles.forEach((tile) => {
    if (!tile.walkable) {
      blocked.add(keyFor(tile.x, tile.y));
    }
  });

  return blocked;
};

const isInBounds = (x: number, y: number, mapSize: number) =>
  x >= 0 && x < mapSize && y >= 0 && y < mapSize;

/** Return true if the tile at (x, y) is in-bounds and walkable. */
const canOccupyTile = (
  x: number,
  y: number,
  blocked: Set<string>,
  mapSize: number,
  surfaceMap: WorldSurfaceMap
) => {
  if (!isInBounds(x, y, mapSize) || blocked.has(keyFor(x, y))) {
    return false;
  }

  const tile = getWorldSurfaceTile(surfaceMap, x, y);
  return Boolean(tile?.walkable);
};

/** Walk parent pointers from the goal node back to start and return the path. */
const reconstructPath = (node: PathNode) => {
  const path: WorldPosition[] = [];
  let current: PathNode | null = node;

  while (current && current.parent) {
    path.push({ x: current.x, y: current.y });
    current = current.parent;
  }

  return path.reverse();
};

/**
 * Off-road penalty multiplier for NPC pathfinding.
 * Applied to non-road/sidewalk surface costs so NPCs strongly prefer
 * walking along roads rather than cutting across grass.
 */
const NPC_OFF_ROAD_PENALTY = 6;

/**
 * Core A* loop operating on a pre-built surface map and blocked-tile set.
 * Uses a binary min-heap for O(log n) extract-min instead of O(n) linear scan.
 */
const findPathOnGrid = (
  start: WorldPosition,
  end: WorldPosition,
  blocked: Set<string>,
  mapSize: number,
  surfaceMap: WorldSurfaceMap,
  preferRoads: boolean = false
): WorldPosition[] => {
  const openHeap = new MinHeap<PathNode>();
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

  while (!openHeap.isEmpty()) {
    const current = openHeap.pop()!;
    const currentKey = keyFor(current.x, current.y);
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

      if (!canOccupyTile(nextX, nextY, blocked, mapSize, surfaceMap)) {
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
          !canOccupyTile(current.x + direction.x, current.y, blocked, mapSize, surfaceMap) ||
          !canOccupyTile(current.x, current.y + direction.y, blocked, mapSize, surfaceMap)
        ) {
          continue;
        }
      }

      // Apply off-road penalty for NPC pathfinding so they strongly prefer roads/sidewalks
      let surfaceCost = nextSurface.cost;
      if (preferRoads && nextSurface.kind !== 'ROAD' && nextSurface.kind !== 'SIDEWALK' && nextSurface.kind !== 'PLAZA') {
        surfaceCost *= NPC_OFF_ROAD_PENALTY;
      }

      const g = current.g + direction.cost + surfaceCost + heightDelta * 0.4;
      const existing = openMap.get(nextKey);

      if (!existing) {
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
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = existing.g + existing.h;
        existing.parent = current;
        openHeap.decreaseKey(existing);
      }
    }
  }

  return [];
};

// ── Surface-map cache ───────────────────────────────────────────────────────
// Cache the surface map and blocked-tile set by buildings reference so that
// consecutive pathfind calls on the same frame/buildings don't rebuild the
// full 240×240-tile grid.

let _cachedBuildings: Record<string, Building> | null = null;
let _cachedMapSize: number = 0;
let _cachedSurfaceMap: WorldSurfaceMap | null = null;
let _cachedBlocked: Set<string> | null = null;

const getCachedSurfaceData = (
  buildings: Record<string, Building>,
  mapSize: number
) => {
  if (
    _cachedSurfaceMap &&
    _cachedBlocked &&
    _cachedBuildings === buildings &&
    _cachedMapSize === mapSize
  ) {
    return { surfaceMap: _cachedSurfaceMap, blocked: _cachedBlocked };
  }

  const surfaceMap = buildWorldSurfaceMap(buildings, mapSize);
  const blocked = buildBlockedTiles(surfaceMap);

  _cachedBuildings = buildings;
  _cachedMapSize = mapSize;
  _cachedSurfaceMap = surfaceMap;
  _cachedBlocked = blocked;

  return { surfaceMap, blocked };
};

/** Explicitly invalidate the surface-map cache (call after building changes). */
export const invalidatePathfindingCache = () => {
  _cachedBuildings = null;
  _cachedMapSize = 0;
  _cachedSurfaceMap = null;
  _cachedBlocked = null;
};

/**
 * Find a walkable path between two world-space positions using A*.
 *
 * @param start - World-grid start position (tile coordinates, 0..mapSize-1).
 * @param end   - World-grid goal position.
 * @param buildings - All buildings in the scene; used to build the surface map.
 * @param mapSize - Side length of the square world grid (default: {@link WORLD_SIZE}).
 * @returns Ordered array of world-position waypoints from start to end (exclusive).
 *          Returns an empty array if no path exists or start === end.
 */
export const findPath = (
  start: WorldPosition,
  end: WorldPosition,
  buildings: Record<string, Building>,
  mapSize: number = WORLD_SIZE
): WorldPosition[] => {
  const { surfaceMap, blocked: cachedBlocked } = getCachedSurfaceData(buildings, mapSize);
  // Clone the blocked set so per-call tweaks (deleting start tile) don't persist
  const blocked = new Set(cachedBlocked);

  const startTile = getNearestWalkableTile(clampWorldPosition(start, mapSize), surfaceMap);
  const endTile = getNearestWalkableTile(clampWorldPosition(end, mapSize), surfaceMap);

  if (!startTile || !endTile) {
    return [];
  }

  const startPos = { x: startTile.x, y: startTile.y };
  const endPos = { x: endTile.x, y: endTile.y };

  if (startPos.x === endPos.x && startPos.y === endPos.y) {
    return [];
  }

  blocked.delete(keyFor(startPos.x, startPos.y));

  return findPathOnGrid(startPos, endPos, blocked, mapSize, surfaceMap);
};

/**
 * Find a path for NPCs that strongly prefers roads and sidewalks.
 * NPCs will avoid cutting across grass and instead walk along roads
 * to reach their destination at a natural pace.
 */
export const findNpcPath = (
  start: WorldPosition,
  end: WorldPosition,
  buildings: Record<string, Building>,
  mapSize: number = WORLD_SIZE
): WorldPosition[] => {
  const { surfaceMap, blocked: cachedBlocked } = getCachedSurfaceData(buildings, mapSize);
  const blocked = new Set(cachedBlocked);

  const startTile = getNearestWalkableTile(clampWorldPosition(start, mapSize), surfaceMap);
  const endTile = getNearestWalkableTile(clampWorldPosition(end, mapSize), surfaceMap);

  if (!startTile || !endTile) {
    return [];
  }

  const startPos = { x: startTile.x, y: startTile.y };
  const endPos = { x: endTile.x, y: endTile.y };

  if (startPos.x === endPos.x && startPos.y === endPos.y) {
    return [];
  }

  blocked.delete(keyFor(startPos.x, startPos.y));

  return findPathOnGrid(startPos, endPos, blocked, mapSize, surfaceMap, true);
};
