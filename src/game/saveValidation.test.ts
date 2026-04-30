import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInitialGameState } from './session';
import { validateGameStateCandidate } from './saveValidation';

test('current game state passes save validation', () => {
  const result = validateGameStateCandidate(buildInitialGameState('world-1'));

  assert.equal(result.valid, true);
});

test('legacy-compatible saves can omit newer hydrated fields', () => {
  const legacy = { ...buildInitialGameState('world-3') };
  delete (legacy as Partial<typeof legacy>).activeCityIncident;
  delete (legacy as Partial<typeof legacy>).streetPickups;

  const result = validateGameStateCandidate(legacy);

  assert.equal(result.valid, true);
});

test('corrupt saves report concrete validation reasons', () => {
  const corrupt = {
    ...buildInitialGameState('world-1'),
    money: '1000',
    meters: {
      trust: 50,
      influence: 'high',
      exposure: 0,
    },
    currentScene: 'NOT_A_SCENE',
  };

  const result = validateGameStateCandidate(corrupt);

  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes('money must be a finite number'));
  assert.ok(result.reasons.includes('influence must be a finite number'));
  assert.ok(result.reasons.includes('currentScene must be a known game scene'));
});
