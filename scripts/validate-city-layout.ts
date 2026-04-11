import { BUILDINGS } from '../src/data';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from '../src/utils/worldSurface';
import {
  getBuildingAccessPosition,
  getBuildingFootprint,
  isSolidBuilding,
} from '../src/utils/worldNavigation';

type Footprint = NonNullable<ReturnType<typeof getBuildingFootprint>>;

const solidBuildings = Object.values(BUILDINGS).filter(isSolidBuilding);

const overlaps: string[] = [];
for (let index = 0; index < solidBuildings.length; index += 1) {
  for (let otherIndex = index + 1; otherIndex < solidBuildings.length; otherIndex += 1) {
    const left = solidBuildings[index];
    const right = solidBuildings[otherIndex];
    const leftFootprint = getBuildingFootprint(left) as Footprint | null;
    const rightFootprint = getBuildingFootprint(right) as Footprint | null;

    if (!leftFootprint || !rightFootprint) {
      continue;
    }

    const overlap =
      leftFootprint.minX <= rightFootprint.maxX &&
      leftFootprint.maxX >= rightFootprint.minX &&
      leftFootprint.minY <= rightFootprint.maxY &&
      leftFootprint.maxY >= rightFootprint.minY;

    if (overlap) {
      overlaps.push(`${left.id} overlaps ${right.id}`);
    }
  }
}

const surfaceMap = buildWorldSurfaceMap(BUILDINGS);
const accessIssues = Object.values(BUILDINGS)
  .filter((building) => ['OFFICE', 'HOME', 'PUB', 'HOTLINE', 'MINE_ENTRANCE'].includes(building.type))
  .flatMap((building) => {
    const access = getBuildingAccessPosition(building);
    const tile = getWorldSurfaceTile(surfaceMap, access.x, access.y);

    if (!tile) {
      return [`${building.id} access tile is outside the surface map`];
    }

    if (!tile.walkable) {
      return [`${building.id} access tile ${access.x},${access.y} is blocked (${tile.kind})`];
    }

    return [];
  });

if (overlaps.length > 0 || accessIssues.length > 0) {
  console.error('City layout validation failed.');
  overlaps.forEach((issue) => console.error(`OVERLAP: ${issue}`));
  accessIssues.forEach((issue) => console.error(`ACCESS: ${issue}`));
  process.exit(1);
}

console.log(`Validated ${solidBuildings.length} solid buildings with no overlaps.`);
console.log(`Validated ${accessIssues.length === 0 ? 'all' : 'some'} building access points.`);
