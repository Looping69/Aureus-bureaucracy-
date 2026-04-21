import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from './worldSurface';
import type { Building } from '../types';

const TEST_ROAD: Building = {
  id: 'test-road',
  npcId: 'none',
  name: 'Test Road',
  pos: { x: 5, y: 10 },
  type: 'ROAD',
  isDiscovered: true,
  voxels: [{ id: 1, x: 0, y: 0, z: 0, c: '#222222' }],
};

test('lowered terrain next to roads becomes a stepped lot edge instead of a raw cliff drop', () => {
  const surfaceMap = buildWorldSurfaceMap([TEST_ROAD], 20);

  const roadTile = getWorldSurfaceTile(surfaceMap, 4, 10);
  const transitionedLotTile = getWorldSurfaceTile(surfaceMap, 3, 10);
  const untouchedLotTile = getWorldSurfaceTile(surfaceMap, 2, 10);

  assert.ok(roadTile, 'expected a walkable road tile');
  assert.ok(transitionedLotTile, 'expected a lowered lot tile next to the road');
  assert.ok(untouchedLotTile, 'expected a second lowered lot tile away from the road');

  assert.equal(roadTile.kind, 'ROAD');
  assert.equal(transitionedLotTile.kind, 'LOT_EDGE');
  assert.equal(transitionedLotTile.height, roadTile.height - 1);
  assert.equal(Math.abs(roadTile.height - transitionedLotTile.height), 1);
  assert.equal(untouchedLotTile.kind, 'CLIFF');
  assert.equal(untouchedLotTile.height, transitionedLotTile.height);
});
