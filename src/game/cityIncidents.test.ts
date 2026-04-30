import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInitialGameState, hydrateSavedState } from './session';
import {
  applyCityIncidentChoice,
  maybeSelectCityIncident,
} from './cityIncidents';

test('city incidents do not spawn before FTUE is complete', () => {
  const state = buildInitialGameState('world-1');
  const result = maybeSelectCityIncident(state, 100);

  assert.equal(result.activeCityIncident, null);
  assert.equal(result.lastCityEventHour, 100);
});

test('city incidents do not replace an unresolved active incident', () => {
  const state = {
    ...buildInitialGameState('world-3'),
    activeCityIncident: {
      id: 'bureau-delay',
      title: 'Existing Pressure',
      description: 'A previous incident is still unresolved.',
      trigger: 'Test trigger.',
      choices: [],
    },
  };

  const result = maybeSelectCityIncident(state, 101);

  assert.equal(result.activeCityIncident?.title, 'Existing Pressure');
  assert.equal(result.lastCityEventHour, 101);
});

test('city incident choice applies its mutation and clears the active incident', () => {
  const state = {
    ...buildInitialGameState('world-3'),
    money: 500,
    activeCityIncident: {
      id: 'bureau-delay',
      title: 'Bureau Delay',
      description: 'Central filing is slowing your active applications.',
      trigger: 'A clerk found a mismatch in the queue.',
      choices: [
        {
          id: 'pay-overtime',
          label: 'Pay Overtime',
          detail: 'Pay clerks to move your file.',
          effectLabel: '-$160, Bureau Pull 10h',
        },
      ],
    },
  };

  const result = applyCityIncidentChoice(state, 'pay-overtime');

  assert.equal(result.nextState.activeCityIncident, null);
  assert.equal(result.nextState.money, 340);
  assert.ok(result.nextState.worldEffects.bureauPull > 0);
  assert.equal(result.notification.title, 'Incident Resolved');
});

test('disabled city incident choice leaves state untouched', () => {
  const state = {
    ...buildInitialGameState('world-3'),
    money: 20,
    activeCityIncident: {
      id: 'bureau-delay',
      title: 'Bureau Delay',
      description: 'Central filing is slowing your active applications.',
      trigger: 'A clerk found a mismatch in the queue.',
      choices: [
        {
          id: 'pay-overtime',
          label: 'Pay Overtime',
          detail: 'Pay clerks to move your file.',
          effectLabel: '-$160, Bureau Pull 10h',
          disabledReason: 'Need $160',
        },
      ],
    },
  };

  const result = applyCityIncidentChoice(state, 'pay-overtime');

  assert.equal(result.nextState, state);
  assert.equal(result.notification.title, 'Incident Blocked');
});

test('hydrating a legacy save defaults active city incident to null', () => {
  const saved = buildInitialGameState('world-3');
  const legacy = { ...saved };
  delete (legacy as Partial<typeof saved>).activeCityIncident;

  const hydrated = hydrateSavedState({
    saved: legacy,
    homePos: saved.playerPos,
    plannerEnabled: true,
    hydrateBuildings: () => saved.buildings,
  });

  assert.equal(hydrated.activeCityIncident, null);
});
