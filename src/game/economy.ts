import { GameState } from '../types';
import { extendWorldEffect, isWorldEffectActive } from './dialogue/worldEffects';
import { getWeatherEconomyModifiers } from './weatherSystem';

export interface DailyEconomyResult {
  nextState: GameState;
  notification?: { title: string; msg: string };
}

export type ExportStrategy = 'STANDARD' | 'QUIET' | 'REINVEST' | 'EXPOSE';

export interface ExportOptionPreview {
  strategy: ExportStrategy;
  label: string;
  detail: string;
  payout: number;
  exposureChange: number;
  influenceChange: number;
  effectLabel?: string;
}

const BASE_EXPORT_PRICE = 120;
const LICENSED_EXPORT_BONUS = 40;
const INFLUENCE_PRICE_FACTOR = 0.002;
// Strategy modifiers intentionally trade immediate cash against heat and follow-up tempo.
const QUIET_SALE_PAYOUT_MULTIPLIER = 0.82;
const REINVEST_SALE_PAYOUT_MULTIPLIER = 0.9;
const EXPOSE_SALE_PAYOUT_MULTIPLIER = 1.02;

export const hasExportLicense = (state: GameState) =>
  state.permits['export-license']?.status === 'APPROVED';

export const getOreUnitPrice = (state: GameState) => {
  const licensedBonus = hasExportLicense(state) ? LICENSED_EXPORT_BONUS : 0;
  const marketWindowBonus = isWorldEffectActive(state, 'marketInsight') ? 30 : 0;
  const influenceMultiplier = 1 + (state.meters.influence * INFLUENCE_PRICE_FACTOR);
  const weatherModifiers = getWeatherEconomyModifiers(state.weather);
  return Math.max(
    50,
    Math.round((BASE_EXPORT_PRICE + licensedBonus + marketWindowBonus) * influenceMultiplier * weatherModifiers.exportPriceMultiplier),
  );
};

export const getExportExposureIncrease = (state: GameState) =>
  Math.max(1, (hasExportLicense(state) ? 4 : 10) - (isWorldEffectActive(state, 'marketInsight') ? 2 : 0));

const getExportOptionPreview = (
  state: GameState,
  oreAmount: number,
  strategy: ExportStrategy
): ExportOptionPreview => {
  const unitPrice = getOreUnitPrice(state);
  const baseExposure = getExportExposureIncrease(state);

  if (strategy === 'QUIET') {
    return {
      strategy,
      label: 'Quiet Sale',
      detail: 'Move the ore carefully for less cash but far less heat.',
      payout: Math.round(oreAmount * unitPrice * QUIET_SALE_PAYOUT_MULTIPLIER),
      exposureChange: Math.max(0, baseExposure - (hasExportLicense(state) ? 3 : 6)),
      influenceChange: 0,
      effectLabel: 'Low heat payout'
    };
  }

  if (strategy === 'REINVEST') {
    return {
      strategy,
      label: 'Reinvest The Haul',
      detail: 'Take a smaller payout and roll the rest into the next cycle.',
      payout: Math.round(oreAmount * unitPrice * REINVEST_SALE_PAYOUT_MULTIPLIER),
      exposureChange: Math.max(1, baseExposure - 2),
      influenceChange: 1,
      effectLabel: 'Bureau Pull + 8h, Energy +12'
    };
  }

  if (strategy === 'EXPOSE') {
    return {
      strategy,
      label: 'Expose The Shipment',
      detail: 'Turn the sale into a public story for influence at the cost of heat.',
      payout: Math.round(oreAmount * unitPrice * EXPOSE_SALE_PAYOUT_MULTIPLIER),
      exposureChange: baseExposure + 6,
      influenceChange: 5,
      effectLabel: 'Media Heat + 12h'
    };
  }

  return {
    strategy,
    label: 'Sell All Ore',
    detail: hasExportLicense(state)
      ? 'Move ore through the legal channel for the clean default payout.'
      : 'Take the direct off-book payout and accept the normal exposure hit.',
    payout: oreAmount * unitPrice,
    exposureChange: baseExposure,
    influenceChange: 0
  };
};

export const getExportOptions = (state: GameState, oreAmount: number): ExportOptionPreview[] =>
  (['STANDARD', 'QUIET', 'REINVEST', 'EXPOSE'] as ExportStrategy[]).map((strategy) =>
    getExportOptionPreview(state, oreAmount, strategy)
  );

export const applyOreExport = (
  state: GameState,
  oreAmount: number,
  strategy: ExportStrategy = 'STANDARD'
): DailyEconomyResult => {
  if (oreAmount <= 0) {
    return {
      nextState: state,
      notification: { title: 'No Ore', msg: "You don't have any ore to sell." }
    };
  }

  const option = getExportOptionPreview(state, oreAmount, strategy);
  const licensed = hasExportLicense(state);
  const worldEffects =
    strategy === 'REINVEST'
      ? extendWorldEffect(state, 'bureauPull', 8)
      : strategy === 'EXPOSE'
        ? extendWorldEffect(state, 'mediaHeat', 12)
        : state.worldEffects;

  return {
    nextState: {
      ...state,
      money: state.money + option.payout,
      ore: Math.max(0, state.ore - oreAmount),
      energy: strategy === 'REINVEST' ? Math.min(state.maxEnergy, state.energy + 12) : state.energy,
      worldEffects,
      meters: {
        ...state.meters,
        exposure: Math.min(100, state.meters.exposure + option.exposureChange),
        influence: Math.min(100, state.meters.influence + option.influenceChange)
      }
    },
    notification: {
      title:
        strategy === 'QUIET'
          ? 'Quiet Cargo Moved'
          : strategy === 'REINVEST'
            ? 'Haul Reinvested'
            : strategy === 'EXPOSE'
              ? 'Shipment Exposed'
              : licensed
                ? 'Export Successful'
                : 'Black-Market Export',
      msg:
        strategy === 'QUIET'
          ? `Moved ${oreAmount} ore quietly for $${option.payout}. Lower heat, lower margin.`
          : strategy === 'REINVEST'
            ? `Sold ${oreAmount} ore for $${option.payout} and rolled the rest into faster follow-up operations.`
            : strategy === 'EXPOSE'
              ? `Sold ${oreAmount} ore for $${option.payout} and turned the shipment into a public pressure play.`
              : licensed
                ? `Sold ${oreAmount} ore for $${option.payout} through the legal channel.`
                : `Sold ${oreAmount} ore off-book for $${option.payout}. Exposure increased.`
    }
  };
};

export const applyDailyEconomyTick = (state: GameState): DailyEconomyResult => {
  const operationalMineCount = state.mines.filter(m => m.status === 'OPERATIONAL').length;
  const communityUpkeepRelief = isWorldEffectActive(state, 'communityBacking') ? 20 : 0;
  const weatherModifiers = getWeatherEconomyModifiers(state.weather);
  const baseUpkeep = Math.max(
    0,
    Math.round((35 + (state.upgrades.length * 12) + (operationalMineCount * 25) - communityUpkeepRelief) * weatherModifiers.upkeepMultiplier),
  );
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
      (isWorldEffectActive(state, 'mediaHeat') ? 0.18 : 0) +
      weatherModifiers.auditRiskBonus
  );
  const aidChance = Math.min(
    0.5,
    0.04 +
      (state.meters.trust / 220) +
      (isWorldEffectActive(state, 'communityBacking') ? 0.12 : 0) +
      weatherModifiers.subsidyChanceBonus
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
