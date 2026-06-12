import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { GameState } from '../types';
import { applyOreExport } from './economy';
import { transitionPermitStatus } from './machines/permitMachine';
import { normalizeSceneState } from './machines/sceneMachine';
import { validateGameStateCandidate } from './saveValidation';
import { buildInitialGameState } from './session';

const cloneState = (state: GameState): GameState => structuredClone(state);

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
