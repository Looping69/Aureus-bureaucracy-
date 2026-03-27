import { GameState, WorldEffectId, WorldEffects } from '../../types';

type WorldEffectConfig = {
  label: string;
  detail: string;
  toneClassName: string;
};

export const EMPTY_WORLD_EFFECTS: WorldEffects = {
  bureauPull: 0,
  communityBacking: 0,
  marketInsight: 0,
  mediaHeat: 0
};

export const WORLD_EFFECTS: Record<WorldEffectId, WorldEffectConfig> = {
  bureauPull: {
    label: 'Bureau Pull',
    detail: 'Permits move faster and land with less resistance.',
    toneClassName: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  communityBacking: {
    label: 'Community Backing',
    detail: 'Locals steady your operation and reduce field pressure.',
    toneClassName: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  marketInsight: {
    label: 'Market Window',
    detail: 'Export timing is favorable and your buyers pay better.',
    toneClassName: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  mediaHeat: {
    label: 'Media Heat',
    detail: 'Everyone is watching. Influence rises faster, but so does scrutiny.',
    toneClassName: 'bg-rose-100 text-rose-700 border-rose-200'
  }
};

export const getWorldHour = (state: GameState) => (state.day * 24) + state.time;

export const getWorldEffectRemainingHours = (state: GameState, effectId: WorldEffectId) => {
  const expiry = state.worldEffects[effectId] ?? 0;
  return Math.max(0, Math.ceil(expiry - getWorldHour(state)));
};

export const isWorldEffectActive = (state: GameState, effectId: WorldEffectId) =>
  getWorldEffectRemainingHours(state, effectId) > 0;

export const extendWorldEffect = (
  state: GameState,
  effectId: WorldEffectId,
  hours: number
): WorldEffects => ({
  ...state.worldEffects,
  [effectId]: Math.max(state.worldEffects[effectId] ?? 0, getWorldHour(state) + hours)
});

export const getActiveWorldEffects = (state: GameState) =>
  (Object.keys(WORLD_EFFECTS) as WorldEffectId[])
    .filter(effectId => isWorldEffectActive(state, effectId))
    .map(effectId => ({
      id: effectId,
      remainingHours: getWorldEffectRemainingHours(state, effectId),
      ...WORLD_EFFECTS[effectId]
    }));
