import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldEntryCameraPlan, sampleWorldEntryCameraPlan } from './worldEntryCamera';

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
