import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, INITIAL_NPCS } from '../data';
import {
  buildNpcPedestrianPath,
  collectNpcRoamingDestinations,
  getRoadPedestrianZone,
  isNpcPedestrianTile,
} from './npcNavigation';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from '../utils/worldSurface';

test('non-intersection roads keep pedestrians on sidewalk bands, while intersections allow controlled crossing', () => {
  const roads = Object.values(BUILDINGS).filter((building) => building.type === 'ROAD');
  const northSouthRoad = roads.find((building) => getRoadPedestrianZone(building) === 'NS');
  const intersectionRoad = roads.find((building) => getRoadPedestrianZone(building) === 'X');

  assert.ok(northSouthRoad, 'expected a north-south road tile in the city layout');
  assert.ok(intersectionRoad, 'expected an intersection tile in the city layout');

  const surfaceMap = buildWorldSurfaceMap(BUILDINGS);
  const allowedBuildingIds = new Set<string>();

  const nsSidewalkTile = getWorldSurfaceTile(surfaceMap, northSouthRoad.pos.x - 4, northSouthRoad.pos.y);
  const nsRoadCenterTile = getWorldSurfaceTile(surfaceMap, northSouthRoad.pos.x, northSouthRoad.pos.y);
  const intersectionCenterTile = getWorldSurfaceTile(surfaceMap, intersectionRoad.pos.x, intersectionRoad.pos.y);

  assert.ok(nsSidewalkTile, 'expected a sidewalk tile on the north-south road');
  assert.ok(nsRoadCenterTile, 'expected a carriageway center tile on the north-south road');
  assert.ok(intersectionCenterTile, 'expected a crossing tile at the intersection center');

  assert.equal(isNpcPedestrianTile(nsSidewalkTile, BUILDINGS, allowedBuildingIds, surfaceMap), true);
  assert.equal(isNpcPedestrianTile(nsRoadCenterTile, BUILDINGS, allowedBuildingIds, surfaceMap), false);
  assert.equal(isNpcPedestrianTile(intersectionCenterTile, BUILDINGS, allowedBuildingIds, surfaceMap), true);
});

test('npc home-work pedestrian routes stay inside the legal pedestrian network', () => {
  const surfaceMap = buildWorldSurfaceMap(BUILDINGS);

  Object.values(INITIAL_NPCS).forEach((npc) => {
    if (!npc.homeBuildingId || !npc.workBuildingId || npc.homeBuildingId === npc.workBuildingId) {
      return;
    }

    const path = buildNpcPedestrianPath(npc, BUILDINGS);
    assert.ok(path.length > 0, `expected a pedestrian path for ${npc.id}`);

    const allowedBuildingIds = new Set([npc.homeBuildingId, npc.workBuildingId]);
    path.forEach((step) => {
      const tile = getWorldSurfaceTile(surfaceMap, step.x, step.y);
      assert.ok(tile, `expected a surface tile for ${npc.id} at ${step.x},${step.y}`);
      assert.equal(
        isNpcPedestrianTile(tile!, BUILDINGS, allowedBuildingIds, surfaceMap),
        true,
        `illegal pedestrian step for ${npc.id} at ${step.x},${step.y}`,
      );
    });
  });
});

test('off-duty roaming destinations stay inside sidewalks plus the npc home/work access points', () => {
  const npc = INITIAL_NPCS.resident_a;
  const surfaceMap = buildWorldSurfaceMap(BUILDINGS);
  const destinations = collectNpcRoamingDestinations(npc, BUILDINGS);
  const allowedBuildingIds = new Set([npc.homeBuildingId!, npc.workBuildingId!]);

  assert.ok(destinations.length > 2, 'expected several off-duty destinations');

  destinations.forEach((destination) => {
    const tile = getWorldSurfaceTile(surfaceMap, destination.x, destination.y);
    assert.ok(tile, `expected a tile at roaming destination ${destination.x},${destination.y}`);
    assert.equal(isNpcPedestrianTile(tile!, BUILDINGS, allowedBuildingIds, surfaceMap), true);
  });
});
