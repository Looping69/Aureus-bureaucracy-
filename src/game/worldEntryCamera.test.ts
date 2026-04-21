import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorldEntryCameraPlan,
  createWorldSpawnCameraPlan,
  sampleWorldEntryCameraPlan,
  sampleWorldSpawnCameraPlan,
} from './worldEntryCamera';

test('building entry camera plan ends at a first-person pose facing into the building', () => {
  const plan = createWorldEntryCameraPlan({
    orbitCameraPosition: { x: 24, y: 33, z: 16 },
    orbitCameraTarget: { x: 0, y: 2, z: 0 },
    playerPosition: { x: 0, y: 0.5, z: 0 },
    buildingLookTarget: { x: 0, y: 1.6, z: -4 },
  });

  assert.equal(plan.duration, 0.9);
  assert.deepEqual(plan.endPosition, { x: 0, y: 2.15, z: 0 });
  assert.deepEqual(plan.lookTarget, { x: 0, y: 1.6, z: -4 });
});

test('sampling the camera plan eases toward the first-person endpoint', () => {
  const plan = createWorldEntryCameraPlan({
    orbitCameraPosition: { x: 24, y: 33, z: 16 },
    orbitCameraTarget: { x: 0, y: 2, z: 0 },
    playerPosition: { x: 0, y: 0.5, z: 0 },
    buildingLookTarget: { x: 0, y: 1.6, z: -4 },
  });

  const halfway = sampleWorldEntryCameraPlan(plan, plan.duration / 2);
  const complete = sampleWorldEntryCameraPlan(plan, plan.duration);

  assert.ok(halfway.position.y < 33);
  assert.ok(halfway.position.y > 2.15);
  assert.ok(Math.abs(complete.position.y - 2.15) < 1e-9);
  assert.equal(complete.lookTarget.z, -4);
});

test('world spawn camera plan tightens into the standard follow offset', () => {
  const plan = createWorldSpawnCameraPlan({
    focusPosition: { x: 10, y: 0.5, z: -6 },
    orbitCameraOffset: { x: 24, y: 32, z: 16 },
    startMultiplier: 1.9,
  });

  assert.equal(plan.duration, 1.35);
  assert.deepEqual(plan.lookTarget, { x: 10, y: 0.5, z: -6 });
  assert.ok(Math.abs(plan.startPosition.x - 55.6) < 1e-9);
  assert.ok(Math.abs(plan.startPosition.y - 61.3) < 1e-9);
  assert.ok(Math.abs(plan.startPosition.z - 24.4) < 1e-9);
  assert.deepEqual(plan.endPosition, { x: 34, y: 32.5, z: 10 });
});

test('world spawn camera sampling holds the player focus and lands exactly on follow camera', () => {
  const plan = createWorldSpawnCameraPlan({
    focusPosition: { x: 0, y: 0.5, z: 0 },
    orbitCameraOffset: { x: 24, y: 32, z: 16 },
    startMultiplier: 1.9,
  });

  const start = sampleWorldSpawnCameraPlan(plan, 0);
  const halfway = sampleWorldSpawnCameraPlan(plan, plan.duration / 2);
  const complete = sampleWorldSpawnCameraPlan(plan, plan.duration);

  assert.deepEqual(start.lookTarget, { x: 0, y: 0.5, z: 0 });
  assert.deepEqual(complete.lookTarget, { x: 0, y: 0.5, z: 0 });
  assert.ok(halfway.position.y < start.position.y);
  assert.ok(halfway.position.y > complete.position.y);
  assert.deepEqual(complete.position, { x: 24, y: 32.5, z: 16 });
});
