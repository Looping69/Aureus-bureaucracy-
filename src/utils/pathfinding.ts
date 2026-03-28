import { WorldPosition, Building } from '../types';
import {
  clampWorldPosition,
  getBlockingFootprint,
} from './worldNavigation';
import { WORLD_SIZE } from './voxelConstants';

export interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

const STRAIGHT_COST = 1;
const DIAGONAL_COST = Math.SQRT2;
const SEARCH_RADIUS = 12;

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

const octileDistance = (a: WorldPosition, b: WorldPosition) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy + (DIAGONAL_COST - 2) * Math.min(dx, dy);
};

const buildBlockedTiles = (buildings: Record<string, Building>) => {
  const blocked = new Set<string>();

  Object.values(buildings).forEach((building) => {
    const footprint = getBlockingFootprint(building);
    if (!footprint) return;

    for (let x = footprint.minX; x <= footprint.maxX; x++) {
      for (let y = footprint.minY; y <= footprint.maxY; y++) {
        blocked.add(keyFor(x, y));
      }
    }
  });

  return blocked;
};

const getFootprintApproachTargets = (
  building: Building,
  blocked: Set<string>,
  mapSize: number
) => {
  const footprint = getBlockingFootprint(building);
  if (!footprint) return [];

  const candidates: WorldPosition[] = [];
  const seen = new Set<string>();
  const pushCandidate = (candidate: WorldPosition) => {
    const clamped = clampWorldPosition(candidate, mapSize);
    const candidateKey = keyFor(clamped.x, clamped.y);
    if (seen.has(candidateKey) || blocked.has(candidateKey)) {
      return;
    }
    seen.add(candidateKey);
    candidates.push(clamped);
  };

  for (let x = footprint.minX - 1; x <= footprint.maxX + 1; x++) {
    pushCandidate({ x, y: footprint.minY - 1 });
    pushCandidate({ x, y: footprint.maxY + 1 });
  }

  for (let y = footprint.minY; y <= footprint.maxY; y++) {
    pushCandidate({ x: footprint.minX - 1, y });
    pushCandidate({ x: footprint.maxX + 1, y });
  }

  return candidates;
};

const isInBounds = (x: number, y: number, mapSize: number) =>
  x >= 0 && x < mapSize && y >= 0 && y < mapSize;

const canOccupyTile = (x: number, y: number, blocked: Set<string>, mapSize: number) =>
  isInBounds(x, y, mapSize) && !blocked.has(keyFor(x, y));

const reconstructPath = (node: PathNode) => {
  const path: WorldPosition[] = [];
  let current: PathNode | null = node;

  while (current && current.parent) {
    path.push({ x: current.x, y: current.y });
    current = current.parent;
  }

  return path.reverse();
};

const findPathOnGrid = (
  start: WorldPosition,
  end: WorldPosition,
  blocked: Set<string>,
  mapSize: number
): WorldPosition[] => {
  const openList: PathNode[] = [];
  const openMap = new Map<string, PathNode>();
  const closed = new Set<string>();

  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: octileDistance(start, end),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  openList.push(startNode);
  openMap.set(keyFor(start.x, start.y), startNode);

  while (openList.length > 0) {
    let currentIndex = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[currentIndex].f) {
        currentIndex = i;
      }
    }

    const current = openList[currentIndex];
    openList.splice(currentIndex, 1);
    openMap.delete(keyFor(current.x, current.y));
    closed.add(keyFor(current.x, current.y));

    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(current);
    }

    for (const direction of DIRECTIONS) {
      const nextX = current.x + direction.x;
      const nextY = current.y + direction.y;
      const nextKey = keyFor(nextX, nextY);

      if (!canOccupyTile(nextX, nextY, blocked, mapSize) || closed.has(nextKey)) {
        continue;
      }

      // Do not let diagonals clip through building corners.
      if (direction.x !== 0 && direction.y !== 0) {
        if (
          !canOccupyTile(current.x + direction.x, current.y, blocked, mapSize) ||
          !canOccupyTile(current.x, current.y + direction.y, blocked, mapSize)
        ) {
          continue;
        }
      }

      const g = current.g + direction.cost;
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
        openList.push(node);
        openMap.set(nextKey, node);
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = existing.g + existing.h;
        existing.parent = current;
      }
    }
  }

  return [];
};

const getCandidateTargets = (
  target: WorldPosition,
  blocked: Set<string>,
  mapSize: number,
  buildings: Record<string, Building>
) => {
  const candidates: WorldPosition[] = [];
  const seen = new Set<string>();

  const pushCandidate = (candidate: WorldPosition) => {
    const clamped = clampWorldPosition(candidate, mapSize);
    const candidateKey = keyFor(clamped.x, clamped.y);
    if (seen.has(candidateKey) || blocked.has(candidateKey)) {
      return;
    }
    seen.add(candidateKey);
    candidates.push(clamped);
  };

  pushCandidate(target);

  Object.values(buildings).forEach((building) => {
    const footprint = getBlockingFootprint(building);
    if (!footprint) return;

    const withinFootprint =
      target.x >= footprint.minX &&
      target.x <= footprint.maxX &&
      target.y >= footprint.minY &&
      target.y <= footprint.maxY;

    if (!withinFootprint) return;

    getFootprintApproachTargets(building, blocked, mapSize).forEach(pushCandidate);
  });

  for (let radius = 1; radius <= SEARCH_RADIUS; radius++) {
    const ring: WorldPosition[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
      ring.push({ x: target.x + dx, y: target.y - radius });
      ring.push({ x: target.x + dx, y: target.y + radius });
    }
    for (let dy = -radius + 1; dy <= radius - 1; dy++) {
      ring.push({ x: target.x - radius, y: target.y + dy });
      ring.push({ x: target.x + radius, y: target.y + dy });
    }

    ring
      .sort((a, b) => octileDistance(a, target) - octileDistance(b, target))
      .forEach(pushCandidate);
  }

  return candidates;
};

export const findPath = (
  start: WorldPosition,
  end: WorldPosition,
  buildings: Record<string, Building>,
  mapSize: number = WORLD_SIZE
): WorldPosition[] => {
  const startTile = clampWorldPosition(start, mapSize);
  const endTile = clampWorldPosition(end, mapSize);

  if (startTile.x === endTile.x && startTile.y === endTile.y) {
    return [];
  }

  const blocked = buildBlockedTiles(buildings);
  blocked.delete(keyFor(startTile.x, startTile.y));

  for (const candidate of getCandidateTargets(endTile, blocked, mapSize, buildings)) {
    const path = findPathOnGrid(startTile, candidate, blocked, mapSize);
    if (path.length > 0) {
      return path;
    }
  }

  return [];
};
