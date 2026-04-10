import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInitialGameState } from './GameStore';
import { applyDialogueChoiceAction, applyDirectMoveAction, gameReducer } from './reducer';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from '../../utils/worldSurface';
import { WORLD_SIZE } from '../../utils/voxelConstants';

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
