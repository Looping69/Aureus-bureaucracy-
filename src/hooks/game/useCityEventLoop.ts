import { useEffect } from 'react';
import React from 'react';
import { GameState, StoryFlag } from '../../types';
import { extendWorldEffect } from '../../game/dialogue/worldEffects';
import { hasStoryFlag } from '../../game/dialogue/storyFlags';

interface UseCityEventLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  enabled?: boolean;
}

// ── Data-driven event registry ──────────────────────────────────────────────

interface CityEventOutcome {
  money?: number;
  energy?: number;
  evidence?: number;
  trust?: number;
  influence?: number;
  exposure?: number;
  worldEffect?: { id: 'bureauPull' | 'communityBacking' | 'marketInsight' | 'mediaHeat'; hours: number };
}

interface CityEventDef {
  title: string;
  msg: string;
  /** Story flags that must be active for this event to fire. Empty = always available. */
  requiredFlags: StoryFlag[];
  outcome: CityEventOutcome;
}

/**
 * City-event registry.  Add new events here without touching the hook logic.
 * Each entry is self-contained: title, message, required story flags, and
 * numeric outcome deltas.
 */
const CITY_EVENTS: CityEventDef[] = [
  // ── Base events (always available) ──
  {
    title: 'Union Relief Run',
    msg: 'Workers shared supplies. Energy +8, Trust +2.',
    requiredFlags: [],
    outcome: { energy: 8, trust: 2 },
  },
  {
    title: 'Black Dust Storm',
    msg: 'Logistics disrupted. You lost $120 and gained +3 Exposure.',
    requiredFlags: [],
    outcome: { money: -120, exposure: 3 },
  },
  {
    title: 'Anonymous Tip',
    msg: 'A courier dropped off intelligence. +1 Evidence, +1 Influence.',
    requiredFlags: [],
    outcome: { evidence: 1, influence: 1 },
  },
  {
    title: 'Permit Window Surge',
    msg: 'Clerks are unusually efficient today. Pending applications moved faster.',
    requiredFlags: [],
    outcome: {},
  },

  // ── Conditional events (gated by story flags) ──
  {
    title: 'Village Water Crew',
    msg: 'Okon sent crews to stabilize supply lines. Exposure -2, Community Backing refreshed.',
    requiredFlags: ['community_pact'],
    outcome: { exposure: -2, trust: 2, worldEffect: { id: 'communityBacking', hours: 12 } },
  },
  {
    title: 'Smuggler Cache',
    msg: 'Slink routed contraband through your lane. +$180, +4 Exposure, Market Window extended.',
    requiredFlags: ['fixer_smuggling_tie'],
    outcome: { money: 180, exposure: 4, worldEffect: { id: 'marketInsight', hours: 12 } },
  },
  {
    title: 'Exclusive Follow-Up',
    msg: 'Vox pushed the story harder. Influence +4, Exposure +4.',
    requiredFlags: ['vox_exclusive'],
    outcome: { influence: 4, exposure: 4 },
  },
  {
    title: 'Press Freeze',
    msg: 'The embargo is holding. Exposure -2 and clerks are less jumpy.',
    requiredFlags: ['vox_embargo'],
    outcome: { exposure: -2, worldEffect: { id: 'bureauPull', hours: 8 } },
  },
  {
    title: 'Internal Memo Leak',
    msg: 'Krell slipped you a compliance memo. +1 Evidence, Bureau Pull refreshed.',
    requiredFlags: ['inspector_deputized'],
    outcome: { evidence: 1, worldEffect: { id: 'bureauPull', hours: 10 } },
  },
  {
    title: 'Reform Intel',
    msg: 'Alliance contacts smuggled you audit records. +1 Evidence, Bureau Pull refreshed.',
    requiredFlags: ['reform_alliance'],
    outcome: { evidence: 1, worldEffect: { id: 'bureauPull', hours: 10 } },
  },
  {
    title: 'Compliance Sweep',
    msg: 'Blacklisted crews got hit hard. -$180 and +5 Exposure.',
    requiredFlags: ['inspector_blacklist'],
    outcome: { money: -180, exposure: 5 },
  },
];

/**
 * Apply an event outcome to a game state, returning the next state.
 */
const applyOutcome = (prev: GameState, outcome: CityEventOutcome, hourKey: number): GameState => {
  let next = { ...prev, lastCityEventHour: hourKey };

  if (outcome.money) {
    next.money = Math.max(0, next.money + outcome.money);
  }
  if (outcome.energy) {
    next.energy = Math.min(next.maxEnergy, Math.max(0, next.energy + outcome.energy));
  }
  if (outcome.evidence) {
    next.evidence = next.evidence + outcome.evidence;
  }

  const meters = { ...next.meters };
  if (outcome.trust) {
    meters.trust = Math.max(0, Math.min(100, meters.trust + outcome.trust));
  }
  if (outcome.influence) {
    meters.influence = Math.max(0, Math.min(100, meters.influence + outcome.influence));
  }
  if (outcome.exposure) {
    meters.exposure = Math.max(0, Math.min(100, meters.exposure + outcome.exposure));
  }
  next.meters = meters;

  if (outcome.worldEffect) {
    next.worldEffects = extendWorldEffect(next, outcome.worldEffect.id, outcome.worldEffect.hours);
  }

  return next;
};

/**
 * EVENT_CHANCE: probability per polling tick that an event fires.
 * EVENT_INTERVAL_MS: polling interval in milliseconds.
 */
const EVENT_CHANCE = 0.22;
const EVENT_INTERVAL_MS = 2500;

export const useCityEventLoop = ({ setState, setNotification, enabled = true }: UseCityEventLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setState(prev => {
        const hourKey = (prev.day * 24) + Math.floor(prev.time);
        if (hourKey === prev.lastCityEventHour) return prev;

        if (Math.random() > EVENT_CHANCE) {
          return { ...prev, lastCityEventHour: hourKey };
        }

        // Filter events to those whose required flags are all active
        const eligible = CITY_EVENTS.filter(ev =>
          ev.requiredFlags.every(flag => hasStoryFlag(prev, flag))
        );

        if (eligible.length === 0) return { ...prev, lastCityEventHour: hourKey };

        const event = eligible[Math.floor(Math.random() * eligible.length)];
        setNotification({ title: event.title, msg: event.msg });
        return applyOutcome(prev, event.outcome, hourKey);
      });
    }, EVENT_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [enabled, setNotification, setState]);
};
