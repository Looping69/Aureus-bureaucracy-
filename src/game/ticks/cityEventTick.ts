import { GameState } from '../../types';
import { extendWorldEffect } from '../dialogue/worldEffects';
import { hasStoryFlag } from '../dialogue/storyFlags';
import { GameTickNotification } from './types';

export interface CityEventTickResult {
  nextState: GameState;
  notification?: GameTickNotification;
}

export const advanceCityEventTick = (
  state: GameState,
  random: () => number = Math.random,
): CityEventTickResult => {
  const hourKey = (state.day * 24) + Math.floor(state.time);
  if (hourKey === state.lastCityEventHour) {
    return { nextState: state };
  }

  const chance = 0.22;
  if (random() > chance) {
    return {
      nextState: {
        ...state,
        lastCityEventHour: hourKey,
      },
    };
  }

  const options = [
    () => ({
      title: 'Union Relief Run',
      msg: 'Workers shared supplies. Energy +8, Trust +2.',
      next: {
        ...state,
        energy: Math.min(state.maxEnergy, state.energy + 8),
        meters: { ...state.meters, trust: Math.min(100, state.meters.trust + 2) },
        lastCityEventHour: hourKey,
      },
    }),
    () => ({
      title: 'Black Dust Storm',
      msg: 'Logistics disrupted. You lost $120 and gained +3 Exposure.',
      next: {
        ...state,
        money: Math.max(0, state.money - 120),
        meters: { ...state.meters, exposure: Math.min(100, state.meters.exposure + 3) },
        lastCityEventHour: hourKey,
      },
    }),
    () => ({
      title: 'Anonymous Tip',
      msg: 'A courier dropped off intelligence. +1 Evidence, +1 Influence.',
      next: {
        ...state,
        evidence: state.evidence + 1,
        meters: { ...state.meters, influence: Math.min(100, state.meters.influence + 1) },
        lastCityEventHour: hourKey,
      },
    }),
    () => ({
      title: 'Permit Window Surge',
      msg: 'Clerks are unusually efficient today. Pending applications moved faster.',
      next: {
        ...state,
        lastCityEventHour: hourKey,
      },
    }),
  ];

  if (hasStoryFlag(state, 'community_pact')) {
    options.push(() => ({
      title: 'Village Water Crew',
      msg: 'Okon sent crews to stabilize supply lines. Exposure -2, Community Backing refreshed.',
      next: {
        ...state,
        worldEffects: extendWorldEffect(state, 'communityBacking', 12),
        meters: {
          ...state.meters,
          exposure: Math.max(0, state.meters.exposure - 2),
          trust: Math.min(100, state.meters.trust + 2),
        },
        lastCityEventHour: hourKey,
      },
    }));
  }

  if (hasStoryFlag(state, 'fixer_smuggling_tie')) {
    options.push(() => ({
      title: 'Smuggler Cache',
      msg: 'Slink routed contraband through your lane. +$180, +4 Exposure, Market Window extended.',
      next: {
        ...state,
        money: state.money + 180,
        worldEffects: extendWorldEffect(state, 'marketInsight', 12),
        meters: {
          ...state.meters,
          exposure: Math.min(100, state.meters.exposure + 4),
        },
        lastCityEventHour: hourKey,
      },
    }));
  }

  if (hasStoryFlag(state, 'vox_exclusive')) {
    options.push(() => ({
      title: 'Exclusive Follow-Up',
      msg: 'Vox pushed the story harder. Influence +4, Exposure +4.',
      next: {
        ...state,
        meters: {
          ...state.meters,
          influence: Math.min(100, state.meters.influence + 4),
          exposure: Math.min(100, state.meters.exposure + 4),
        },
        lastCityEventHour: hourKey,
      },
    }));
  }

  if (hasStoryFlag(state, 'vox_embargo')) {
    options.push(() => ({
      title: 'Press Freeze',
      msg: 'The embargo is holding. Exposure -2 and clerks are less jumpy.',
      next: {
        ...state,
        worldEffects: extendWorldEffect(state, 'bureauPull', 8),
        meters: {
          ...state.meters,
          exposure: Math.max(0, state.meters.exposure - 2),
        },
        lastCityEventHour: hourKey,
      },
    }));
  }

  if (hasStoryFlag(state, 'inspector_deputized') || hasStoryFlag(state, 'reform_alliance')) {
    options.push(() => ({
      title: 'Internal Memo Leak',
      msg: 'Krell slipped you a compliance memo. +1 Evidence, Bureau Pull refreshed.',
      next: {
        ...state,
        evidence: state.evidence + 1,
        worldEffects: extendWorldEffect(state, 'bureauPull', 10),
        lastCityEventHour: hourKey,
      },
    }));
  }

  if (hasStoryFlag(state, 'inspector_blacklist')) {
    options.push(() => ({
      title: 'Compliance Sweep',
      msg: 'Blacklisted crews got hit hard. -$180 and +5 Exposure.',
      next: {
        ...state,
        money: Math.max(0, state.money - 180),
        meters: {
          ...state.meters,
          exposure: Math.min(100, state.meters.exposure + 5),
        },
        lastCityEventHour: hourKey,
      },
    }));
  }

  const event = options[Math.floor(random() * options.length)]();
  return {
    nextState: event.next,
    notification: {
      title: event.title,
      msg: event.msg,
    },
  };
};
