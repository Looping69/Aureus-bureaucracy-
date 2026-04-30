import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorldSurfaceMap } from '../utils/worldSurface';
import { WORLD_SIZE } from '../utils/voxelConstants';
import { buildInitialGameState } from './session';
import { resolveStreetPickupCollection } from './streetPickups';

test('street stamina pickups restore a meaningful energy chunk', () => {
  const state = {
    ...buildInitialGameState('world-3'),
    energy: 50,
  };
  const pickup = state.streetPickups[0];
  assert.ok(pickup, 'expected initial street pickup to spawn');

  const surfaceMap = buildWorldSurfaceMap(state.buildings, WORLD_SIZE);
  const result = resolveStreetPickupCollection(state, pickup.pos, surfaceMap);

  assert.equal(result.nextState.energy, 70);
  assert.equal(result.nextState.playerFeedbacks.at(-1)?.amount, 20);
});
