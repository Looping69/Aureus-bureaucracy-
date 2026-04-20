import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_NIGHT_TIME_SCALE,
  WORLD_RENDER_Y_OFFSET,
  getAmbientTimeStep,
  toLogicalWorldY,
  toRenderedWorldY,
} from './worldPresentation';

test('day-night time scale is tuned slightly faster than before', () => {
  assert.equal(DAY_NIGHT_TIME_SCALE, 0.1);
  assert.equal(getAmbientTimeStep(12), 0.004);
  assert.ok(Math.abs(getAmbientTimeStep(22) - 0.02) < 1e-9);
});

test('rendered world Y offset round-trips back to logical Y', () => {
  assert.equal(WORLD_RENDER_Y_OFFSET, 1);
  assert.equal(toRenderedWorldY(0), 1);
  assert.equal(toLogicalWorldY(toRenderedWorldY(-3)), -3);
});
