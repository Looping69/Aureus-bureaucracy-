import { GameState } from '../types';
import { isWorldEffectActive } from './dialogue/worldEffects';

export interface DailyEconomyResult {
  nextState: GameState;
  notification?: { title: string; msg: string };
}

const BASE_EXPORT_PRICE = 120;
const LICENSED_EXPORT_BONUS = 40;
const INFLUENCE_PRICE_FACTOR = 0.002;

export const hasExportLicense = (state: GameState) =>
  state.permits['export-license']?.status === 'APPROVED';

export const getOreUnitPrice = (state: GameState) => {
  const licensedBonus = hasExportLicense(state) ? LICENSED_EXPORT_BONUS : 0;
  const marketWindowBonus = isWorldEffectActive(state, 'marketInsight') ? 30 : 0;
  const influenceMultiplier = 1 + (state.meters.influence * INFLUENCE_PRICE_FACTOR);
  return Math.max(50, Math.round((BASE_EXPORT_PRICE + licensedBonus + marketWindowBonus) * influenceMultiplier));
};

export const getExportExposureIncrease = (state: GameState) =>
  Math.max(1, (hasExportLicense(state) ? 4 : 10) - (isWorldEffectActive(state, 'marketInsight') ? 2 : 0));

export const applyOreExport = (state: GameState, oreAmount: number): DailyEconomyResult => {
  if (oreAmount <= 0) {
    return {
      nextState: state,
      notification: { title: 'No Ore', msg: "You don't have any ore to sell." }
    };
  }

  const unitPrice = getOreUnitPrice(state);
  const payout = oreAmount * unitPrice;
  const exposureIncrease = getExportExposureIncrease(state);
  const licensed = hasExportLicense(state);

  return {
    nextState: {
      ...state,
      money: state.money + payout,
      ore: Math.max(0, state.ore - oreAmount),
      meters: {
        ...state.meters,
        exposure: Math.min(100, state.meters.exposure + exposureIncrease)
      }
    },
    notification: {
      title: licensed ? 'Export Successful' : 'Black-Market Export',
      msg: licensed
        ? `Sold ${oreAmount} ore for $${payout} at $${unitPrice}/unit.`
        : `Sold ${oreAmount} ore off-book for $${payout}. Exposure increased.`
    }
  };
};

export const applyDailyEconomyTick = (state: GameState): DailyEconomyResult => {
  const operationalMineCount = state.mines.filter(m => m.status === 'OPERATIONAL').length;
  const communityUpkeepRelief = isWorldEffectActive(state, 'communityBacking') ? 20 : 0;
  const baseUpkeep = Math.max(0, 35 + (state.upgrades.length * 12) + (operationalMineCount * 25) - communityUpkeepRelief);
  let nextState: GameState = {
    ...state,
    money: Math.max(0, state.money - baseUpkeep)
  };

  let notification: { title: string; msg: string } = {
    title: 'Daily Overhead',
    msg: `Operational costs deducted: $${baseUpkeep}.`
  };

  const auditChance = Math.min(
    0.85,
    0.05 +
      (state.meters.exposure / 140) +
      (isWorldEffectActive(state, 'mediaHeat') ? 0.18 : 0)
  );
  const aidChance = Math.min(
    0.5,
    0.04 +
      (state.meters.trust / 220) +
      (isWorldEffectActive(state, 'communityBacking') ? 0.12 : 0)
  );
  const roll = Math.random();

  if (roll < auditChance) {
    const fine = 80 + Math.round(state.meters.exposure * (isWorldEffectActive(state, 'mediaHeat') ? 2.8 : 2.2));
    nextState = {
      ...nextState,
      money: Math.max(0, nextState.money - fine),
      meters: {
        ...nextState.meters,
        trust: Math.max(0, nextState.meters.trust - 3)
      }
    };
    notification = {
      title: 'Compliance Audit',
      msg: `Inspectors issued a $${fine} fine. Keep exposure lower to avoid repeat audits.`
    };
  } else if (roll > 1 - aidChance) {
    const subsidy = 40 + Math.round(state.meters.trust * (isWorldEffectActive(state, 'communityBacking') ? 1.45 : 1.2));
    nextState = {
      ...nextState,
      money: nextState.money + subsidy,
      meters: {
        ...nextState.meters,
        influence: Math.min(100, nextState.meters.influence + 2)
      }
    };
    notification = {
      title: 'Community Subsidy',
      msg: `Trusted contacts covered $${subsidy} in costs. Influence +2.`
    };
  }

  return { nextState, notification };
};
