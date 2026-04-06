import { GameState } from '../types';
import { getEndingForecast } from './endings';
import { extendWorldEffect, getWorldHour, isWorldEffectActive } from './dialogue/worldEffects';
import { hasStoryFlag } from './dialogue/storyFlags';

export type RunCyclePhaseId = 'SECURE' | 'PREPARE' | 'EXECUTE' | 'RESOLVE' | 'POLITICAL';
export type OperationActionId = 'PRESSURE_CLERKS' | 'SCOUT_BUYERS' | 'COMMUNITY_COVER' | 'LEAK_TO_PRESS';

export interface RunCyclePhase {
  id: RunCyclePhaseId;
  label: string;
  state: 'ACTIVE' | 'READY' | 'LOCKED';
}

export interface RunCycleSummary {
  phase: RunCyclePhaseId;
  title: string;
  detail: string;
  steps: RunCyclePhase[];
  nextDecision: string;
}

export interface OperationActionDefinition {
  id: OperationActionId;
  label: string;
  detail: string;
  costLabel: string;
  effectLabel: string;
  disabledReason?: string;
}

export interface OperationActionResult {
  nextState: GameState;
  notification: {
    title: string;
    msg: string;
  };
}

const CORE_PERMIT_ORDER = [
  'extraction-intent',
  'prospecting-license',
  'mining-permit-iron',
  'export-license',
  'prospecting-permit-deep',
  'mining-permit-deep',
  'prospecting-permit-abyss',
  'mining-permit-abyss',
  'wash-plant-permit',
  'claim-expansion'
] as const;

const OPERATIONS_COOLDOWN_PREFIX = 'operations:';

const getOperationsCooldownKey = (actionId: OperationActionId) => `${OPERATIONS_COOLDOWN_PREFIX}${actionId}`;

const getCooldownRemaining = (state: GameState, actionId: OperationActionId) => {
  const expiry = state.dialogueCooldowns[getOperationsCooldownKey(actionId)] ?? 0;
  return Math.max(0, Math.ceil(expiry - getWorldHour(state)));
};

const withCooldown = (state: GameState, actionId: OperationActionId, hours: number) => ({
  ...state.dialogueCooldowns,
  [getOperationsCooldownKey(actionId)]: getWorldHour(state) + hours
});

const clampMeter = (value: number) => Math.max(0, Math.min(100, value));

const getImmediatePermitNeed = (state: GameState) =>
  CORE_PERMIT_ORDER
    .map((id) => state.permits[id])
    .find((permit) => permit && (permit.status === 'AVAILABLE' || permit.status === 'REJECTED'));

const hasPendingPermit = (state: GameState) => {
  for (const permitId of Object.keys(state.permits)) {
    if (state.permits[permitId]?.status === 'PENDING') return true;
  }
  return false;
};

const getBestMine = (state: GameState) =>
  state.mines.find((mine) => mine.status === 'OPERATIONAL' && mine.discovered) ??
  state.mines.find((mine) => mine.status === 'PROSPECTING' && mine.discovered) ??
  null;

const getPhaseState = (activePriority: number, targetPriority: number): RunCyclePhase['state'] => {
  if (activePriority === targetPriority) return 'ACTIVE';
  if (activePriority > targetPriority) return 'READY';
  return 'LOCKED';
};

export const getRunCycleSummary = (state: GameState): RunCycleSummary => {
  const permitNeed = getImmediatePermitNeed(state);
  const pendingPermit = hasPendingPermit(state);
  const activeMine = getBestMine(state);
  const threatenedEnding = getEndingForecast(state).find((ending) => ending.status === 'THREATENED');
  const canPrep =
    !isWorldEffectActive(state, 'bureauPull') ||
    !isWorldEffectActive(state, 'marketInsight') ||
    state.energy < state.maxEnergy * 0.7;

  let phase: RunCyclePhaseId = 'POLITICAL';
  let title = 'Shape The City';
  let detail = 'Use dialogue, evidence, and route choices to decide what kind of operator you are becoming.';
  let nextDecision = threatenedEnding
    ? `Protect the ${threatenedEnding.title} route before your next big decision closes it.`
    : 'Push a faction choice or leverage play before the city chooses for you.';

  if (state.ore > 0) {
    phase = 'RESOLVE';
    title = 'Resolve The Haul';
    detail = `You have ${state.ore} ore ready. Decide whether to cash out cleanly, hide the shipment, reinvest, or weaponize the sale.`;
    nextDecision = 'The market is now the real choice point: money, heat, tempo, or influence.';
  } else if (
    activeMine &&
    (state.currentScene === 'MINE' || state.currentScene === 'MINE_WORLD' || (!pendingPermit && !canPrep))
  ) {
    phase = 'EXECUTE';
    title = activeMine.status === 'PROSPECTING' ? 'Survey The Claim' : 'Run The Extraction';
    detail = activeMine.status === 'PROSPECTING'
      ? `${activeMine.name} still needs field samples before full extraction. Prospect aggressively while your prep is hot.`
      : `${activeMine.name} is operational. Convert prep into ore while your energy and effect windows are still favorable.`;
    nextDecision = activeMine.status === 'PROSPECTING'
      ? 'Every survey click should move you toward the mining permit unlock.'
      : 'Mine now, then come back out with a reason to care about how the cargo gets moved.';
  } else if (permitNeed) {
    phase = 'SECURE';
    title = 'Secure The Next Permit';
    detail = `${permitNeed.name} is your current blocker. File it well, or manipulate the system before your run stalls.`;
    nextDecision = 'A permit is the gate. Everything downstream depends on moving this paperwork.';
  } else if (pendingPermit || canPrep) {
    phase = 'PREPARE';
    title = 'Prepare The Operation';
    detail = pendingPermit
      ? 'Your filings are in motion. Use office time to line up buyers, protection, and clerical pressure.'
      : 'Your next run is viable, but stronger prep can turn a decent trip into a great one.';
    nextDecision = 'Spend office time to create a market window, faster approvals, safer routes, or louder political fallout.';
  }

  const phasePriority: Record<RunCyclePhaseId, number> = {
    SECURE: 0,
    PREPARE: 1,
    EXECUTE: 2,
    RESOLVE: 3,
    POLITICAL: 4
  };

  const steps: RunCyclePhase[] = [
    { id: 'SECURE', label: 'Secure', state: getPhaseState(phasePriority[phase], 0) },
    { id: 'PREPARE', label: 'Prepare', state: getPhaseState(phasePriority[phase], 1) },
    { id: 'EXECUTE', label: 'Execute', state: getPhaseState(phasePriority[phase], 2) },
    { id: 'RESOLVE', label: 'Resolve', state: getPhaseState(phasePriority[phase], 3) },
    { id: 'POLITICAL', label: 'Route', state: getPhaseState(phasePriority[phase], 4) }
  ];

  return {
    phase,
    title,
    detail,
    steps,
    nextDecision
  };
};

export const getOperationActions = (state: GameState): OperationActionDefinition[] => {
  const pressureCooldown = getCooldownRemaining(state, 'PRESSURE_CLERKS');
  const scoutCooldown = getCooldownRemaining(state, 'SCOUT_BUYERS');
  const coverCooldown = getCooldownRemaining(state, 'COMMUNITY_COVER');
  const leakCooldown = getCooldownRemaining(state, 'LEAK_TO_PRESS');

  return [
    {
      id: 'PRESSURE_CLERKS',
      label: 'Pressure Clerks',
      detail: 'Spend cash to make the bureaucracy care about your file again.',
      costLabel: '$140',
      effectLabel: 'Bureau Pull 12 h, Influence +2',
      disabledReason:
        pressureCooldown > 0
          ? `Ready again in ${pressureCooldown}h`
          : state.money < 140
            ? 'Need $140'
            : undefined
    },
    {
      id: 'SCOUT_BUYERS',
      label: 'Scout Buyers',
      detail: 'Line up demand before you extract so the next haul lands into a better window.',
      costLabel: '$110',
      effectLabel: 'Market Window 18h, Exposure -1',
      disabledReason:
        scoutCooldown > 0
          ? `Ready again in ${scoutCooldown}h`
          : state.money < 110
            ? 'Need $110'
            : undefined
    },
    {
      id: 'COMMUNITY_COVER',
      label: 'Community Cover',
      detail: 'Pay for water and logistics relief so the field stays calmer on the next run.',
      costLabel: '$90',
      effectLabel: 'Community Backing 14h, Exposure -4',
      disabledReason:
        coverCooldown > 0
          ? `Ready again in ${coverCooldown}h`
          : state.money < 90
            ? 'Need $90'
            : !hasStoryFlag(state, 'community_pact') && state.meters.trust < 55
              ? 'Need Community Pact or 55 Trust'
              : undefined
    },
    {
      id: 'LEAK_TO_PRESS',
      label: 'Leak To Press',
      detail: 'Cash in evidence for political momentum and a louder next cycle.',
      costLabel: '1 Evidence',
      effectLabel: 'Media Heat 12h, Influence +5, Exposure +4',
      disabledReason:
        leakCooldown > 0
          ? `Ready again in ${leakCooldown}h`
          : state.evidence < 1
            ? 'Need 1 Evidence'
            : undefined
    }
  ];
};

export const applyOperationAction = (
  state: GameState,
  actionId: OperationActionId
): OperationActionResult => {
  switch (actionId) {
    case 'PRESSURE_CLERKS': {
      if (getCooldownRemaining(state, actionId) > 0 || state.money < 140) {
        return {
          nextState: state,
          notification: { title: 'Operation Desk', msg: 'You cannot pressure the clerks right now.' }
        };
      }
      return {
        nextState: {
          ...state,
          money: state.money - 140,
          dialogueCooldowns: withCooldown(state, actionId, 18),
          worldEffects: extendWorldEffect(state, 'bureauPull', 12),
          meters: {
            ...state.meters,
            influence: clampMeter(state.meters.influence + 2)
          }
        },
        notification: {
          title: 'Clerks Lean In',
          msg: 'Your paperwork now has gravity. Bureau Pull is active for the next 12 hours.'
        }
      };
    }
    case 'SCOUT_BUYERS': {
      if (getCooldownRemaining(state, actionId) > 0 || state.money < 110) {
        return {
          nextState: state,
          notification: { title: 'Operation Desk', msg: 'You cannot scout buyers right now.' }
        };
      }
      return {
        nextState: {
          ...state,
          money: state.money - 110,
          dialogueCooldowns: withCooldown(state, actionId, 18),
          worldEffects: extendWorldEffect(state, 'marketInsight', 18),
          meters: {
            ...state.meters,
            exposure: clampMeter(state.meters.exposure - 1)
          }
        },
        notification: {
          title: 'Buyer Window Opened',
          msg: 'Scouts found a better lane. Market Window is active for the next 18 hours.'
        }
      };
    }
    case 'COMMUNITY_COVER': {
      if (
        getCooldownRemaining(state, actionId) > 0 ||
        state.money < 90 ||
        (!hasStoryFlag(state, 'community_pact') && state.meters.trust < 55)
      ) {
        return {
          nextState: state,
          notification: { title: 'Operation Desk', msg: 'You do not have the standing to call in community cover.' }
        };
      }
      return {
        nextState: {
          ...state,
          money: state.money - 90,
          dialogueCooldowns: withCooldown(state, actionId, 24),
          worldEffects: extendWorldEffect(state, 'communityBacking', 14),
          meters: {
            ...state.meters,
            exposure: clampMeter(state.meters.exposure - 4),
            trust: clampMeter(state.meters.trust + 1)
          }
        },
        notification: {
          title: 'Field Cover Secured',
          msg: 'Community crews are smoothing the next run. Heat drops and the field gets safer.'
        }
      };
    }
    case 'LEAK_TO_PRESS': {
      if (getCooldownRemaining(state, actionId) > 0 || state.evidence < 1) {
        return {
          nextState: state,
          notification: { title: 'Operation Desk', msg: 'You do not have enough evidence to push the press.' }
        };
      }
      return {
        nextState: {
          ...state,
          evidence: state.evidence - 1,
          dialogueCooldowns: withCooldown(state, actionId, 18),
          worldEffects: extendWorldEffect(state, 'mediaHeat', 12),
          meters: {
            ...state.meters,
            influence: clampMeter(state.meters.influence + 5),
            exposure: clampMeter(state.meters.exposure + 4)
          }
        },
        notification: {
          title: 'Press Heat Rising',
          msg: 'You fed the press. Influence jumps, but the next cycle will be hotter and riskier.'
        }
      };
    }
  }
};
