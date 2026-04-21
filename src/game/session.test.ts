import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInitialGameState } from './session';

test('world-1 still boots into the normal FTUE permit funnel', () => {
  const state = buildInitialGameState('world-1');

  assert.equal(state.ftuePhase, 'intro');
  assert.equal(state.tutorialStep, 0);
  assert.equal(state.permits['extraction-intent'].status, 'LOCKED');
  assert.equal(state.mines.find((mine) => mine.id === 'iron-vein')?.status, 'PROSPECTING');
  assert.equal(state.mines.find((mine) => mine.id === 'deep-hollow')?.discovered, false);
});

test('world-3 boots as a free-roam sandbox instead of FTUE', () => {
  const state = buildInitialGameState('world-3');
  const ironMine = state.mines.find((mine) => mine.id === 'iron-vein');
  const deepMine = state.mines.find((mine) => mine.id === 'deep-hollow');

  assert.equal(state.ftuePhase, 'ftue_complete');
  assert.equal(state.tutorialStep, 99);
  assert.equal(state.permits['extraction-intent'].status, 'APPROVED');
  assert.equal(state.permits['prospecting-license'].status, 'APPROVED');
  assert.equal(state.permits['mining-permit-iron'].status, 'APPROVED');
  assert.equal(state.permits['prospecting-permit-deep'].status, 'AVAILABLE');
  assert.equal(ironMine?.status, 'OPERATIONAL');
  assert.equal(deepMine?.discovered, true);
  assert.equal(deepMine?.status, 'PROSPECTING');
  assert.equal(state.objectives[0]?.id, 'sandbox-free-roam');
});
