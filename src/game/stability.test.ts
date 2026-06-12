import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { GameState } from '../types';
import { applyMineSceneAction, applyMineTileInteraction } from './actions/mineActions';
import { applyPermitOverlayAction } from './actions/permitActions';
import { applyOreExport } from './economy';
import { normalizeFtueFormState } from './machines/ftueMachine';
import { transitionPermitStatus } from './machines/permitMachine';
import { normalizeSceneState } from './machines/sceneMachine';
import { validateGameStateCandidate } from './saveValidation';
import { buildInitialGameState } from './session';
import { closeMiniGame } from './uiTransitions';

const cloneState = (state: GameState): GameState => structuredClone(state);

const buildOperationalMineState = (): GameState => {
  const state = buildInitialGameState();
  const mineIndex = state.mines.findIndex((mine) => mine.id === 'iron-vein');
  const mine = state.mines[mineIndex];
  const firstTile = mine.grid[0];

  return {
    ...state,
    activeMineId: 'iron-vein',
    currentScene: 'MINE',
    energy: 100,
    permits: {
      ...state.permits,
      [mine.permits.miningId]: {
        ...state.permits[mine.permits.miningId],
        status: 'APPROVED',
      },
    },
    mines: state.mines.map((entry, index) => index === mineIndex
      ? {
          ...entry,
          status: 'OPERATIONAL',
          carriedOre: 0,
          carryLimit: 80,
          shaftStability: 100,
          grid: entry.grid.map((tile, tileIndex) => tileIndex === 0
            ? { ...firstTile, type: 'ORE', stability: 95, revealed: true, mined: false }
            : tile
          ),
        }
      : entry
    ),
  };
};

describe('stability guardrails', () => {
  it('exports ore without creating invalid resource values', () => {
    const state = {
      ...buildInitialGameState(),
      ore: 3,
      money: 100,
    };

    const result = applyOreExport(state, 2);

    expect(result.nextState.ore).toBe(1);
    expect(result.nextState.money).toBeGreaterThan(100);
    expect(Number.isFinite(result.nextState.money)).toBe(true);
    expect(Number.isFinite(result.nextState.ore)).toBe(true);
  });

  it('keeps permit transitions explicit and legal', () => {
    expect(transitionPermitStatus('LOCKED', 'MAKE_AVAILABLE')).toBe('AVAILABLE');
    expect(transitionPermitStatus('AVAILABLE', 'SUBMIT')).toBe('PENDING');
    expect(transitionPermitStatus('PENDING', 'APPROVE')).toBe('APPROVED');
    expect(transitionPermitStatus('APPROVED', 'REJECT')).toBeNull();
  });

  it('keeps form minigames attached to their active permit', () => {
    const state = buildInitialGameState();
    const { nextState } = applyPermitOverlayAction(state, 'extraction-intent', 'SUBMIT');

    expect(nextState.activePermitId).toBe('extraction-intent');
    expect(nextState.activeMiniGame).toBe('FORM_PROCESSING');
    expect(nextState.pendingPermitAction).toBe('SUBMIT');
  });

  it('clears stale pending permit state when a minigame closes', () => {
    const state = {
      ...buildInitialGameState(),
      activeMiniGame: 'FORM_PROCESSING' as const,
      pendingPermitAction: 'SUBMIT' as const,
    };

    const nextState = closeMiniGame(state);

    expect(nextState.activeMiniGame).toBeNull();
    expect(nextState.pendingPermitAction).toBeNull();
  });

  it('loads extracted ore into carried mine load before stockpile', () => {
    const state = buildOperationalMineState();
    const tileId = state.mines.find((mine) => mine.id === 'iron-vein')?.grid[0].id;
    expect(tileId).toBeTruthy();

    const { nextState } = applyMineTileInteraction(state, tileId!);
    const mine = nextState.mines.find((entry) => entry.id === 'iron-vein') as typeof nextState.mines[number] & { carriedOre?: number };

    expect(nextState.ore).toBe(0);
    expect(mine.carriedOre ?? 0).toBeGreaterThan(0);
  });

  it('secures carried ore into the stockpile', () => {
    const state = buildOperationalMineState();
    const loadedState = {
      ...state,
      mines: state.mines.map((mine) => mine.id === 'iron-vein'
        ? { ...mine, carriedOre: 12 }
        : mine
      ),
    };

    const { nextState } = applyMineSceneAction(loadedState, 'SECURE_LOAD');
    const mine = nextState.mines.find((entry) => entry.id === 'iron-vein') as typeof nextState.mines[number] & { carriedOre?: number };

    expect(nextState.ore).toBe(12);
    expect(mine.carriedOre ?? 0).toBe(0);
  });

  it('normalizes malformed ftue form state', () => {
    const state = {
      ...buildInitialGameState(),
      activeMiniGame: 'FORM_PROCESSING' as const,
      activePermitId: null,
      pendingPermitAction: 'SUBMIT' as const,
    };

    const normalized = normalizeFtueFormState(state);

    expect(normalized.activeMiniGame).toBeNull();
    expect(normalized.pendingPermitAction).toBeNull();
  });

  it('normalizes mine scenes that do not have a valid active mine', () => {
    const state = {
      ...buildInitialGameState(),
      currentScene: 'MINE' as const,
      activeMineId: null,
    };

    const normalized = normalizeSceneState(state, true);

    expect(normalized.currentScene).toBe('WORLD');
    expect(normalized.activeMineId).toBeNull();
  });

  it('rejects minigame saves that have no pending permit action', () => {
    const state = {
      ...buildInitialGameState(),
      activeMiniGame: 'FORM_PROCESSING' as const,
      pendingPermitAction: null,
    };

    const result = validateGameStateCandidate(state);

    expect(result.valid).toBe(false);
  });

  it('keeps core meters and resources finite across exported ore amounts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (oreAmount, exposure) => {
          const state = cloneState(buildInitialGameState());
          state.ore = oreAmount;
          state.meters.exposure = exposure;

          const { nextState } = applyOreExport(state, oreAmount);

          expect(Number.isFinite(nextState.money)).toBe(true);
          expect(Number.isFinite(nextState.ore)).toBe(true);
          expect(Number.isFinite(nextState.energy)).toBe(true);
          expect(nextState.ore).toBe(0);
          expect(nextState.energy).toBeGreaterThanOrEqual(0);
          expect(nextState.energy).toBeLessThanOrEqual(nextState.maxEnergy);
          expect(nextState.meters.exposure).toBeGreaterThanOrEqual(0);
          expect(nextState.meters.exposure).toBeLessThanOrEqual(100);
        },
      ),
    );
  });
});
