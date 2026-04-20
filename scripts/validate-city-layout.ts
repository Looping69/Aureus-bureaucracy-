import { BUILDINGS, INITIAL_NPCS } from '../src/data';
import { WORLD_SIZE } from '../src/utils/voxelConstants';
import { getBuildingAccessPosition, getBuildingFootprint } from '../src/utils/worldNavigation';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from '../src/utils/worldSurface';
import { buildNpcPedestrianPath } from '../src/game/npcNavigation';

const overlaps = (
  a: { minX: number; maxX: number; minY: number; maxY: number },
  b: { minX: number; maxX: number; minY: number; maxY: number }
) => !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);

const issues: string[] = [];
const buildings = Object.values(BUILDINGS);
const surfaceMap = buildWorldSurfaceMap(BUILDINGS, WORLD_SIZE, []);

buildings.forEach((building, index) => {
  const footprint = getBuildingFootprint(building);
  if (!footprint) {
    return;
  }

  if (
    footprint.minX < 0 ||
    footprint.minY < 0 ||
    footprint.maxX >= WORLD_SIZE ||
    footprint.maxY >= WORLD_SIZE
  ) {
    issues.push(`bounds:${building.id}`);
  }

  const access = getBuildingAccessPosition(building);
  const accessTile = getWorldSurfaceTile(surfaceMap, access.x, access.y);
  if (!accessTile?.walkable) {
    issues.push(`blocked-access:${building.id}`);
  }

  for (let otherIndex = index + 1; otherIndex < buildings.length; otherIndex += 1) {
    const other = buildings[otherIndex];
    const otherFootprint = getBuildingFootprint(other);
    if (otherFootprint && overlaps(footprint, otherFootprint)) {
      issues.push(`overlap:${building.id}:${other.id}`);
    }
  }
});

Object.values(INITIAL_NPCS).forEach((npc) => {
  if (!npc.homeBuildingId || !npc.workBuildingId || npc.homeBuildingId === npc.workBuildingId) {
    return;
  }

  const home = BUILDINGS[npc.homeBuildingId];
  const work = BUILDINGS[npc.workBuildingId];
  if (!home || !work) {
    issues.push(`missing-route-endpoint:${npc.id}`);
    return;
  }

  const pedestrianPath = buildNpcPedestrianPath(
    npc,
    BUILDINGS,
    WORLD_SIZE,
    [],
    getBuildingAccessPosition(home),
    getBuildingAccessPosition(work),
  );

  if (pedestrianPath.length === 0) {
    issues.push(`no-path:${npc.id}`);
  }
});

if (issues.length > 0) {
  console.error('city-layout-invalid');
  issues.forEach((issue) => console.error(issue));
  process.exit(1);
}

console.log(`city-layout-valid:${buildings.length}-buildings`);
