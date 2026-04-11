import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInitialGameState } from './GameStore';
import { applyDialogueChoiceAction, applyDirectMoveAction, gameReducer } from './reducer';
import { getNotificationForAction } from './effects';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from '../../utils/worldSurface';
import { WORLD_SIZE } from '../../utils/voxelConstants';
import {
  collectNearbyStaminaPowerUps,
  triggerPlayerCollapse,
} from '../staminaRescue';

const findWalkableTileNear = (x: number, y: number, radius = 6) => {
  const state = buildInitialGameState();
  const surfaceMap = buildWorldSurfaceMap(state.buildings, WORLD_SIZE);

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const candidate = { x: x + dx, y: y + dy };
      const tile = getWorldSurfaceTile(surfaceMap, candidate.x, candidate.y);
      if (tile?.walkable) {
        return { candidate, surfaceMap };
      }
    }
  }

  throw new Error('Expected to find a walkable tile near the player start.');
};

// ── DIRECT_MOVE ──────────────────────────────────────────────────────────────

test('applyDirectMoveAction clears queued path when the destination tile is blocked', () => {
  const state = {
    ...buildInitialGameState(),
    path: [{ x: 1, y: 1 }],
    targetPos: { x: 1, y: 1 },
  };

  const nextState = applyDirectMoveAction(state, state.buildings.player_home.pos);

  assert.deepEqual(nextState.path, []);
  assert.equal(nextState.targetPos, null);
  assert.deepEqual(nextState.playerPos, state.playerPos);
});

test('gameReducer uses the shared direct-move transition for walkable tiles', () => {
  const state = buildInitialGameState();
  const { candidate, surfaceMap } = findWalkableTileNear(state.playerPos.x, state.playerPos.y);

  const reduced = gameReducer(state, { type: 'DIRECT_MOVE', pos: candidate });
  const expected = applyDirectMoveAction(state, candidate, { surfaceMap });

  assert.deepEqual(reduced, expected);
  assert.deepEqual(reduced.playerPos, candidate);
  assert.equal(reduced.energy, state.energy - 0.35);
  assert.deepEqual(reduced.path, []);
  assert.equal(reduced.targetPos, null);
});

test('DIRECT_MOVE is a no-op when player is already on the target tile', () => {
  const state = buildInitialGameState();
  const result = gameReducer(state, { type: 'DIRECT_MOVE', pos: state.playerPos });
  assert.equal(result, state); // identity — no new object allocation
});

test('DIRECT_MOVE rejects moves when energy is depleted', () => {
  const state = { ...buildInitialGameState(), energy: 0.1 };
  const { candidate } = findWalkableTileNear(state.playerPos.x, state.playerPos.y);
  const result = gameReducer(state, { type: 'DIRECT_MOVE', pos: candidate });
  assert.deepEqual(result.playerPos, state.playerPos);
});

test('triggerPlayerCollapse dispatches medics and locks the player', () => {
  const state = buildInitialGameState();
  const collapsed = triggerPlayerCollapse({
    ...state,
    stamina: { ...state.stamina, current: 0 },
  });

  assert.equal(collapsed.playerStatus.condition, 'COLLAPSING');
  assert.equal(collapsed.rescueMission.phase, 'DISPATCHED');
  assert.equal(collapsed.rescueMission.assignedMedicIds.length, 2);
  assert.equal(collapsed.path.length, 0);
});

test('collectNearbyStaminaPowerUps restores stamina and removes the pickup', () => {
  const state = buildInitialGameState();
  const powerUp = state.staminaPowerUps[0];
  const lowStamina = {
    ...state,
    playerPos: powerUp.pos,
    stamina: { ...state.stamina, current: 20 },
  };

  const result = collectNearbyStaminaPowerUps(lowStamina);

  assert.equal(result.collected.length, 1);
  assert.equal(result.nextState.staminaPowerUps.length, state.staminaPowerUps.length - 1);
  assert.equal(result.nextState.stamina.current, 20 + powerUp.restoreAmount);
});

// ── DIALOGUE_CHOICE ──────────────────────────────────────────────────────────

test('applyDialogueChoiceAction appends provider-captured and social feedback through one shared path', () => {
  const state = {
    ...buildInitialGameState(),
    activeNPCId: 'licensing',
  };
  const queuedFeedback = [
    {
      id: 'direct-feedback',
      npcId: 'licensing',
      amount: 4,
      type: 'TRUST' as const,
      timestamp: 1,
    },
  ];

  const nextState = applyDialogueChoiceAction(
    state,
    (current) => ({
      npcs: {
        ...current.npcs,
        licensing: {
          ...current.npcs.licensing,
          trustLevel: current.npcs.licensing.trustLevel + 10,
        },
      },
    }),
    queuedFeedback,
  );

  assert.equal(nextState.npcs.licensing.trustLevel, 60);
  assert.equal(nextState.npcs.chief.trustLevel, state.npcs.chief.trustLevel - 5);
  assert.equal(nextState.npcs.fixer.trustLevel, state.npcs.fixer.trustLevel - 5);
  assert.equal(nextState.npcs.inspector.trustLevel, state.npcs.inspector.trustLevel + 3);
  assert.deepEqual(
    nextState.feedbacks.map(({ npcId, amount }) => ({ npcId, amount })),
    [
      { npcId: 'licensing', amount: 4 },
      { npcId: 'chief', amount: -5 },
      { npcId: 'fixer', amount: -5 },
      { npcId: 'inspector', amount: 3 },
    ],
  );
});

test('DIALOGUE_CHOICE pure path (no queued feedback) produces no feedbacks array entries for a no-op action', () => {
  const state = {
    ...buildInitialGameState(),
    activeNPCId: 'licensing',
  };
  const result = gameReducer(state, {
    type: 'DIALOGUE_CHOICE',
    dialogueAction: () => ({}),
  });
  assert.deepEqual(result.feedbacks, []);
});

test('DIALOGUE_CHOICE refreshes relationship states after trust change', () => {
  const state = {
    ...buildInitialGameState(),
    activeNPCId: 'fixer',
  };
  // Start fixer below 30 trust — should be 'neutral'
  assert.equal(state.npcs.fixer.relationshipState, 'neutral');

  const result = gameReducer(state, {
    type: 'DIALOGUE_CHOICE',
    dialogueAction: (s) => ({
      npcs: {
        ...s.npcs,
        fixer: { ...s.npcs.fixer, trustLevel: 35 },
      },
    }),
  });
  // After trust crosses 30 threshold, fixer relationship state should update
  assert.equal(result.npcs.fixer.relationshipState, 'friendly');
});

// ── TRAVEL ───────────────────────────────────────────────────────────────────

test('TRAVEL to a discovered mine switches to MINE scene and costs energy and time', () => {
  const state = buildInitialGameState();
  // iron-vein starts discovered with travelTime 2
  const mine = state.mines.find(m => m.id === 'iron-vein')!;
  assert.ok(mine.discovered);

  const result = gameReducer(state, { type: 'TRAVEL', mineId: 'iron-vein' });

  assert.equal(result.currentScene, 'MINE');
  assert.equal(result.activeMineId, 'iron-vein');
  assert.equal(result.energy, state.energy - mine.travelTime * 5);
  assert.equal(result.time, (state.time + mine.travelTime) % 24);
});

test('TRAVEL to an undiscovered mine is a no-op', () => {
  const state = buildInitialGameState();
  const result = gameReducer(state, { type: 'TRAVEL', mineId: 'deep-hollow' });
  assert.equal(result, state);
});

test('TRAVEL to a non-existent mine is a no-op', () => {
  const state = buildInitialGameState();
  const result = gameReducer(state, { type: 'TRAVEL', mineId: 'nonexistent' });
  assert.equal(result, state);
});

test('TRAVEL with insufficient energy is a no-op', () => {
  const state = { ...buildInitialGameState(), energy: 1 };
  const result = gameReducer(state, { type: 'TRAVEL', mineId: 'iron-vein' });
  assert.equal(result.currentScene, 'WORLD');
  assert.equal(result.energy, 1);
});

test('TRAVEL notification shows travel complete for valid travel', () => {
  const state = buildInitialGameState();
  const notif = getNotificationForAction(state, { type: 'TRAVEL', mineId: 'iron-vein' });
  assert.ok(notif);
  assert.equal(notif.title, 'Travel Complete');
});

test('TRAVEL notification shows exhaustion for insufficient energy', () => {
  const state = { ...buildInitialGameState(), energy: 1 };
  const notif = getNotificationForAction(state, { type: 'TRAVEL', mineId: 'iron-vein' });
  assert.ok(notif);
  assert.equal(notif.title, 'Too Exhausted');
});

// ── WORLD_INTERACT ───────────────────────────────────────────────────────────

test('WORLD_INTERACT with NPC opens OFFICE scene with activeNPCId', () => {
  const state = buildInitialGameState();
  const result = gameReducer(state, {
    type: 'WORLD_INTERACT',
    npcId: 'licensing',
    buildingId: 'none',
  });
  assert.equal(result.currentScene, 'OFFICE');
  assert.equal(result.activeNPCId, 'licensing');
  assert.equal(result.activeBuildingId, null);
  assert.equal(result.explorationActive, false);
});

test('WORLD_INTERACT with OFFICE building opens OFFICE scene with activeBuildingId', () => {
  const state = buildInitialGameState();
  const result = gameReducer(state, {
    type: 'WORLD_INTERACT',
    npcId: 'none',
    buildingId: 'licensing_office',
  });
  assert.equal(result.currentScene, 'OFFICE');
  assert.equal(result.activeNPCId, null);
  assert.equal(result.activeBuildingId, 'licensing_office');
});

test('WORLD_INTERACT with MINE_ENTRANCE opens MINE_WORLD scene', () => {
  const state = buildInitialGameState();
  const result = gameReducer(state, {
    type: 'WORLD_INTERACT',
    npcId: 'none',
    buildingId: 'mine_entrance',
  });
  assert.equal(result.currentScene, 'MINE_WORLD');
  assert.equal(result.activeBuildingId, 'mine_entrance');
});

test('WORLD_INTERACT with non-interactable building is a no-op', () => {
  const state = buildInitialGameState();
  const result = gameReducer(state, {
    type: 'WORLD_INTERACT',
    npcId: 'none',
    buildingId: 'central_park',
  });
  // PARK is not interactable — state should be unchanged
  assert.equal(result, state);
});

test('WORLD_INTERACT with non-existent building is a no-op', () => {
  const state = buildInitialGameState();
  const result = gameReducer(state, {
    type: 'WORLD_INTERACT',
    npcId: 'none',
    buildingId: 'nonexistent',
  });
  assert.equal(result, state);
});

// ── PERMITS ──────────────────────────────────────────────────────────────────

test('SUBMIT_PERMIT with insufficient funds returns notification but no state change', () => {
  const state = { ...buildInitialGameState(), money: 0 };
  // Find a permit that is AVAILABLE
  const availablePermitId = Object.keys(state.permits).find(
    id => state.permits[id].status === 'AVAILABLE'
  );
  assert.ok(availablePermitId, 'Expected at least one AVAILABLE permit');

  const result = gameReducer(state, {
    type: 'SUBMIT_PERMIT',
    id: availablePermitId,
    action: 'SUBMIT',
  });
  assert.equal(result.money, 0);
  assert.equal(result.activeMiniGame, null);
});

test('SUBMIT_PERMIT with sufficient funds deducts money and starts mini-game', () => {
  const state = buildInitialGameState();
  const availablePermitId = Object.keys(state.permits).find(
    id => state.permits[id].status === 'AVAILABLE'
  )!;
  const permit = state.permits[availablePermitId];

  const result = gameReducer(state, {
    type: 'SUBMIT_PERMIT',
    id: availablePermitId,
    action: 'SUBMIT',
  });
  assert.equal(result.money, state.money - permit.cost);
  assert.equal(result.activeMiniGame, 'FORM_PROCESSING');
  assert.equal(result.pendingPermitAction, 'SUBMIT');
});

test('MINI_GAME_COMPLETE with low accuracy rejects the permit', () => {
  const state = buildInitialGameState();
  const availablePermitId = Object.keys(state.permits).find(
    id => state.permits[id].status === 'AVAILABLE'
  )!;
  // Set up state as if a permit was being processed
  const prepped = {
    ...state,
    activePermitId: availablePermitId,
    activeMiniGame: 'FORM_PROCESSING' as const,
    pendingPermitAction: 'SUBMIT' as const,
  };
  const result = gameReducer(prepped, {
    type: 'MINI_GAME_COMPLETE',
    accuracy: 0.3,
    time: 20,
  });
  assert.equal(result.permits[availablePermitId].status, 'REJECTED');
  assert.equal(result.activeMiniGame, null);
  assert.equal(result.activePermitId, null);
});

test('MINI_GAME_COMPLETE with good accuracy submits the permit to PENDING', () => {
  const state = buildInitialGameState();
  const availablePermitId = Object.keys(state.permits).find(
    id => state.permits[id].status === 'AVAILABLE'
  )!;
  const prepped = {
    ...state,
    activePermitId: availablePermitId,
    activeMiniGame: 'FORM_PROCESSING' as const,
    pendingPermitAction: 'SUBMIT' as const,
  };
  const result = gameReducer(prepped, {
    type: 'MINI_GAME_COMPLETE',
    accuracy: 0.85,
    time: 15,
  });
  assert.equal(result.permits[availablePermitId].status, 'PENDING');
  assert.equal(result.activeMiniGame, null);
});

// ── REST ─────────────────────────────────────────────────────────────────────

test('REST restores energy, advances day, and sets time to 6', () => {
  const state = { ...buildInitialGameState(), energy: 10, day: 3, time: 22 };
  const result = gameReducer(state, { type: 'REST' });

  assert.equal(result.energy, state.maxEnergy);
  assert.equal(result.day, 4);
  assert.equal(result.time, 6);
});

test('REST moves player to home position', () => {
  const state = buildInitialGameState();
  const homePos = state.playerPos; // Initial state starts at home
  const movedState = { ...state, playerPos: { x: 50, y: 50 } };
  const result = gameReducer(movedState, { type: 'REST' });
  assert.deepEqual(result.playerPos, homePos);
});

// ── Notification double-call safety (effects.ts) ─────────────────────────────

test('effects.ts TRAVEL notification is deterministic (safe to double-call)', () => {
  const state = buildInitialGameState();
  const action = { type: 'TRAVEL' as const, mineId: 'iron-vein' };
  const notif1 = getNotificationForAction(state, action);
  const notif2 = getNotificationForAction(state, action);
  assert.deepEqual(notif1, notif2);
});

test('effects.ts SUBMIT_PERMIT notification is deterministic', () => {
  const state = buildInitialGameState();
  const availablePermitId = Object.keys(state.permits).find(
    id => state.permits[id].status === 'AVAILABLE'
  )!;
  const action = { type: 'SUBMIT_PERMIT' as const, id: availablePermitId, action: 'SUBMIT' as const };
  const notif1 = getNotificationForAction(state, action);
  const notif2 = getNotificationForAction(state, action);
  assert.deepEqual(notif1, notif2);
});

test('effects.ts EXPORT_ORE notification is deterministic', () => {
  const state = { ...buildInitialGameState(), ore: 5 };
  const action = { type: 'EXPORT_ORE' as const, strategy: 'STANDARD' as const };
  const notif1 = getNotificationForAction(state, action);
  const notif2 = getNotificationForAction(state, action);
  assert.deepEqual(notif1, notif2);
});

test('effects.ts OPERATION_ACTION notification is deterministic', () => {
  const state = buildInitialGameState();
  const action = { type: 'OPERATION_ACTION' as const, actionId: 'PRESSURE_CLERKS' as const };
  const notif1 = getNotificationForAction(state, action);
  const notif2 = getNotificationForAction(state, action);
  assert.deepEqual(notif1, notif2);
});

test('effects.ts FOUND_ITEM notification is deterministic', () => {
  const state = buildInitialGameState();
  const action = { type: 'FOUND_ITEM' as const, itemId: 'nonexistent' };
  const notif1 = getNotificationForAction(state, action);
  const notif2 = getNotificationForAction(state, action);
  assert.deepEqual(notif1, notif2);
});

test('effects.ts REST notification is deterministic given same random seed caveat', () => {
  // REST uses Math.random() inside applyDailyEconomyTick, but the
  // helpers are pure functions of their inputs (the random is internal).
  // We verify the notification structure is always non-null.
  const state = buildInitialGameState();
  const action = { type: 'REST' as const };
  const notif = getNotificationForAction(state, action);
  assert.ok(notif, 'REST should always produce a notification');
  assert.ok(notif.title.length > 0);
});

// ── Relationship state detection & reactive text ─────────────────────────────

import {
  deriveRelationshipState,
  detectRelationshipStateChanges,
  buildRelationshipChangeNotification,
  getRelationshipReactiveText,
} from '../dialogue/relationshipState';

test('deriveRelationshipState returns aligned for licensing with trust>=50 and leverage>=20', () => {
  const state = buildInitialGameState();
  const npc = { ...state.npcs.licensing, trustLevel: 55, leverage: 25 };
  const rs = deriveRelationshipState('licensing', npc, state);
  assert.equal(rs, 'aligned');
});

test('deriveRelationshipState returns friendly for fixer with trust>=30', () => {
  const state = buildInitialGameState();
  const npc = { ...state.npcs.fixer, trustLevel: 35 };
  const rs = deriveRelationshipState('fixer', npc, state);
  assert.equal(rs, 'friendly');
});

test('detectRelationshipStateChanges returns changes when state transitions', () => {
  const state = buildInitialGameState();
  const oldNpcs = state.npcs;
  const newNpcs = {
    ...oldNpcs,
    fixer: { ...oldNpcs.fixer, relationshipState: 'friendly' as const },
  };
  const changes = detectRelationshipStateChanges(oldNpcs, newNpcs);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].npcId, 'fixer');
  assert.equal(changes[0].from, 'neutral');
  assert.equal(changes[0].to, 'friendly');
});

test('detectRelationshipStateChanges returns empty when no changes', () => {
  const state = buildInitialGameState();
  const changes = detectRelationshipStateChanges(state.npcs, state.npcs);
  assert.equal(changes.length, 0);
});

test('buildRelationshipChangeNotification returns null for empty changes', () => {
  assert.equal(buildRelationshipChangeNotification([]), null);
});

test('buildRelationshipChangeNotification returns single NPC notification', () => {
  const notif = buildRelationshipChangeNotification([
    { npcId: 'fixer', npcName: 'Slink', from: 'neutral', to: 'friendly' },
  ]);
  assert.ok(notif);
  assert.ok(notif.title.includes('Slink'));
  assert.ok(notif.msg.includes('Neutral'));
  assert.ok(notif.msg.includes('Friendly'));
});

test('buildRelationshipChangeNotification summarises multiple NPC changes', () => {
  const notif = buildRelationshipChangeNotification([
    { npcId: 'fixer', npcName: 'Slink', from: 'neutral', to: 'friendly' },
    { npcId: 'chief', npcName: 'Okon', from: 'neutral', to: 'disillusioned' },
  ]);
  assert.ok(notif);
  assert.equal(notif.title, 'Relationships Shifted');
  assert.ok(notif.msg.includes('Slink'));
  assert.ok(notif.msg.includes('Okon'));
});

test('getRelationshipReactiveText returns text for aligned licensing', () => {
  const state = buildInitialGameState();
  const npc = { ...state.npcs.licensing, relationshipState: 'aligned' as const };
  const text = getRelationshipReactiveText(npc, state);
  assert.ok(text, 'Expected reactive text for aligned licensing');
  assert.ok(text.includes('professional'));
});

test('getRelationshipReactiveText returns text for watching inspector', () => {
  const state = buildInitialGameState();
  const npc = { ...state.npcs.inspector, relationshipState: 'watching' as const };
  const text = getRelationshipReactiveText(npc, state);
  assert.ok(text, 'Expected reactive text for watching inspector');
  assert.ok(text.includes('attention'));
});

test('getRelationshipReactiveText returns text for friendly fixer', () => {
  const state = buildInitialGameState();
  const npc = { ...state.npcs.fixer, relationshipState: 'friendly' as const };
  const text = getRelationshipReactiveText(npc, state);
  assert.ok(text, 'Expected reactive text for friendly fixer');
  assert.ok(text.includes('rhythm'));
});

test('getRelationshipReactiveText returns text for interested journalist', () => {
  const state = buildInitialGameState();
  const npc = { ...state.npcs.journalist, relationshipState: 'interested' as const };
  const text = getRelationshipReactiveText(npc, state);
  assert.ok(text, 'Expected reactive text for interested journalist');
  assert.ok(text.includes('listening'));
});
