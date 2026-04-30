import { CityIncident, CityIncidentChoice, GameState, WorldEffectId } from '../types';
import { extendWorldEffect } from './dialogue/worldEffects';

type CityIncidentId =
  | 'bureau-delay'
  | 'road-protest'
  | 'buyer-squeeze'
  | 'mine-flooding'
  | 'press-rumor';

type CityIncidentChoiceId =
  | 'pay-overtime'
  | 'call-in-favor'
  | 'accept-delay'
  | 'negotiate-route'
  | 'force-through'
  | 'wait-out-protest'
  | 'take-discount'
  | 'hold-shipment'
  | 'lean-on-buyers'
  | 'pump-shaft'
  | 'send-crew-anyway'
  | 'pause-mining'
  | 'spend-evidence'
  | 'feed-counterstory'
  | 'ignore-rumor';

interface CityIncidentDefinition {
  id: CityIncidentId;
  title: string;
  description: string;
  trigger: (state: GameState) => string;
  isEligible?: (state: GameState) => boolean;
  choices: Array<{
    id: CityIncidentChoiceId;
    label: string;
    detail: string;
    effectLabel: string;
    disabledReason?: (state: GameState) => string | undefined;
    apply: (state: GameState) => GameState;
  }>;
}

export interface CityIncidentChoiceResult {
  nextState: GameState;
  notification: {
    title: string;
    msg: string;
  };
}

const clampMeter = (value: number) => Math.max(0, Math.min(100, value));

const withMeters = (
  state: GameState,
  delta: Partial<Record<keyof GameState['meters'], number>>,
): GameState => ({
  ...state,
  meters: {
    trust: clampMeter(state.meters.trust + (delta.trust ?? 0)),
    influence: clampMeter(state.meters.influence + (delta.influence ?? 0)),
    exposure: clampMeter(state.meters.exposure + (delta.exposure ?? 0)),
  },
});

const withWorldEffect = (state: GameState, effectId: WorldEffectId, hours: number): GameState => ({
  ...state,
  worldEffects: extendWorldEffect(state, effectId, hours),
});

const activePendingPermitCount = (state: GameState) =>
  Object.values(state.permits).filter((permit) => permit.status === 'PENDING').length;

const hasOperationalMine = (state: GameState) =>
  state.mines.some((mine) => mine.discovered && mine.status === 'OPERATIONAL');

const hasAnyDiscoveredMine = (state: GameState) =>
  state.mines.some((mine) => mine.discovered && mine.status !== 'LOCKED');

const CATALOG: CityIncidentDefinition[] = [
  {
    id: 'bureau-delay',
    title: 'Bureau Delay',
    description: 'Central filing is slowing your active applications before the next run.',
    trigger: (state) =>
      activePendingPermitCount(state) > 0
        ? `${activePendingPermitCount(state)} pending file${activePendingPermitCount(state) === 1 ? '' : 's'} hit a clerical queue.`
        : 'A clerk warns that your next filing will crawl unless you create pressure.',
    choices: [
      {
        id: 'pay-overtime',
        label: 'Pay Overtime',
        detail: 'Put cash on the desk and make the file worth touching tonight.',
        effectLabel: '-$160, Bureau Pull 10h',
        disabledReason: (state) => (state.money < 160 ? 'Need $160' : undefined),
        apply: (state) => withWorldEffect({ ...state, money: state.money - 160 }, 'bureauPull', 10),
      },
      {
        id: 'call-in-favor',
        label: 'Call In Favor',
        detail: 'Spend Vane leverage instead of cash and let him move the stamp quietly.',
        effectLabel: 'Licensing leverage -12, Influence +2',
        disabledReason: (state) => ((state.npcs.licensing?.leverage ?? 0) < 12 ? 'Need 12 Vane leverage' : undefined),
        apply: (state) =>
          withMeters(
            {
              ...state,
              npcs: {
                ...state.npcs,
                licensing: {
                  ...state.npcs.licensing,
                  leverage: Math.max(0, state.npcs.licensing.leverage - 12),
                },
              },
            },
            { influence: 2 },
          ),
      },
      {
        id: 'accept-delay',
        label: 'Accept Delay',
        detail: 'Do nothing loud. You lose tempo, but the office stays calm.',
        effectLabel: 'Energy +6, Exposure -1',
        apply: (state) =>
          withMeters({ ...state, energy: Math.min(state.maxEnergy, state.energy + 6) }, { exposure: -1 }),
      },
    ],
  },
  {
    id: 'road-protest',
    title: 'Road Protest',
    description: 'Workers have blocked a route between the Bureau and the extraction roads.',
    trigger: (state) =>
      state.weather.current === 'RAIN' || state.weather.current === 'STORM'
        ? 'Wet roads turned a small protest into a serious route problem.'
        : 'A crowd is holding the junction and watching who tries to break it.',
    choices: [
      {
        id: 'negotiate-route',
        label: 'Negotiate Route',
        detail: 'Spend time and supplies keeping the field calm enough to move.',
        effectLabel: '-$80, Trust +4, Community Backing 8h',
        disabledReason: (state) => (state.money < 80 ? 'Need $80' : undefined),
        apply: (state) =>
          withWorldEffect(withMeters({ ...state, money: state.money - 80 }, { trust: 4 }), 'communityBacking', 8),
      },
      {
        id: 'force-through',
        label: 'Force Through',
        detail: 'Clear the road with pressure and accept the political heat.',
        effectLabel: 'Influence +3, Exposure +5',
        apply: (state) => withMeters(state, { influence: 3, exposure: 5 }),
      },
      {
        id: 'wait-out-protest',
        label: 'Wait It Out',
        detail: 'Let the city burn its anger without putting your name on it.',
        effectLabel: 'Energy +10, Influence -1',
        apply: (state) =>
          withMeters({ ...state, energy: Math.min(state.maxEnergy, state.energy + 10) }, { influence: -1 }),
      },
    ],
  },
  {
    id: 'buyer-squeeze',
    title: 'Buyer Squeeze',
    description: 'Export buyers heard about inspection pressure and are trying to cut the next haul price.',
    trigger: (state) =>
      state.ore > 0
        ? `${state.ore} ore on hand gives the buyers leverage right now.`
        : 'A buyer cartel is setting terms before your next shipment exists.',
    isEligible: (state) => state.ore > 0 || state.worldEffects.marketInsight > 0 || state.permits['export-license']?.status === 'APPROVED',
    choices: [
      {
        id: 'take-discount',
        label: 'Take Discount',
        detail: 'Move fast, accept worse terms, and keep exposure low.',
        effectLabel: '+$120, Exposure -2',
        apply: (state) => withMeters({ ...state, money: state.money + 120 }, { exposure: -2 }),
      },
      {
        id: 'hold-shipment',
        label: 'Hold Shipment',
        detail: 'Keep the ore off the books until the market steadies.',
        effectLabel: 'Market Window 12h, Energy -6',
        apply: (state) => withWorldEffect({ ...state, energy: Math.max(0, state.energy - 6) }, 'marketInsight', 12),
      },
      {
        id: 'lean-on-buyers',
        label: 'Lean On Buyers',
        detail: 'Use influence to make the buyers remember who owns the claim.',
        effectLabel: 'Influence -3, +$260, Exposure +3',
        disabledReason: (state) => (state.meters.influence < 3 ? 'Need 3 Influence' : undefined),
        apply: (state) => withMeters({ ...state, money: state.money + 260 }, { influence: -3, exposure: 3 }),
      },
    ],
  },
  {
    id: 'mine-flooding',
    title: 'Mine Flooding',
    description: 'Water is pushing into a lower shaft and crews want a decision before anyone goes down.',
    trigger: (state) =>
      state.weather.current === 'RAIN' || state.weather.current === 'STORM' || state.weather.current === 'ACID_RAIN'
        ? `${state.weather.current.replace('_', ' ').toLowerCase()} made the shaft unstable.`
        : 'A weak seam opened under routine inspection.',
    isEligible: hasAnyDiscoveredMine,
    choices: [
      {
        id: 'pump-shaft',
        label: 'Pump Shaft',
        detail: 'Spend money on pumps and keep the mine productive.',
        effectLabel: '-$140, Energy -4, Trust +1',
        disabledReason: (state) => (state.money < 140 ? 'Need $140' : undefined),
        apply: (state) =>
          withMeters({ ...state, money: state.money - 140, energy: Math.max(0, state.energy - 4) }, { trust: 1 }),
      },
      {
        id: 'send-crew-anyway',
        label: 'Send Crew Anyway',
        detail: 'Keep momentum and accept the ugly safety optics.',
        effectLabel: 'Influence +2, Exposure +6, Trust -4',
        disabledReason: (state) => (!hasOperationalMine(state) ? 'Need operational mine' : undefined),
        apply: (state) => withMeters(state, { influence: 2, exposure: 6, trust: -4 }),
      },
      {
        id: 'pause-mining',
        label: 'Pause Mining',
        detail: 'Lose tempo now so the workers know you are not gambling with them.',
        effectLabel: 'Energy +8, Trust +3',
        apply: (state) =>
          withMeters({ ...state, energy: Math.min(state.maxEnergy, state.energy + 8) }, { trust: 3 }),
      },
    ],
  },
  {
    id: 'press-rumor',
    title: 'Press Rumor',
    description: 'A rumor about your permits is moving through town before the facts catch up.',
    trigger: (state) =>
      state.meters.exposure >= 40
        ? 'Your exposure is high enough that the rumor has teeth.'
        : 'The story is weak, but it is early enough to shape.',
    choices: [
      {
        id: 'spend-evidence',
        label: 'Spend Evidence',
        detail: 'Hand over proof that redirects the story toward someone else.',
        effectLabel: '-1 Evidence, Exposure -5',
        disabledReason: (state) => (state.evidence < 1 ? 'Need 1 Evidence' : undefined),
        apply: (state) => withMeters({ ...state, evidence: state.evidence - 1 }, { exposure: -5 }),
      },
      {
        id: 'feed-counterstory',
        label: 'Feed Counterstory',
        detail: 'Give Vox enough material to make the rumor useful.',
        effectLabel: 'Media Heat 10h, Influence +4, Exposure +2',
        apply: (state) => withWorldEffect(withMeters(state, { influence: 4, exposure: 2 }), 'mediaHeat', 10),
      },
      {
        id: 'ignore-rumor',
        label: 'Ignore Rumor',
        detail: 'Let it pass and keep your hands clean.',
        effectLabel: 'Exposure +1, Energy +4',
        apply: (state) =>
          withMeters({ ...state, energy: Math.min(state.maxEnergy, state.energy + 4) }, { exposure: 1 }),
      },
    ],
  },
];

const isPostFtue = (state: GameState) =>
  state.ftuePhase === 'ftue_complete' || state.tutorialStep === 99;

const makeIncidentChoice = (
  choice: CityIncidentDefinition['choices'][number],
  state: GameState,
): CityIncidentChoice => ({
  id: choice.id,
  label: choice.label,
  detail: choice.detail,
  effectLabel: choice.effectLabel,
  disabledReason: choice.disabledReason?.(state),
});

const makeIncident = (definition: CityIncidentDefinition, state: GameState): CityIncident => ({
  id: definition.id,
  title: definition.title,
  description: definition.description,
  trigger: definition.trigger(state),
  choices: definition.choices.map((choice) => makeIncidentChoice(choice, state)),
});

const getEligibleDefinitions = (state: GameState) =>
  CATALOG.filter((definition) => definition.isEligible?.(state) ?? true);

export const maybeSelectCityIncident = (state: GameState, hourKey: number): GameState => {
  if (!isPostFtue(state)) {
    return {
      ...state,
      lastCityEventHour: hourKey,
    };
  }

  if (state.activeCityIncident) {
    return {
      ...state,
      lastCityEventHour: hourKey,
    };
  }

  const eligible = getEligibleDefinitions(state);
  if (eligible.length === 0) {
    return {
      ...state,
      lastCityEventHour: hourKey,
    };
  }

  const selected = eligible[Math.abs(hourKey) % eligible.length];

  return {
    ...state,
    activeCityIncident: makeIncident(selected, state),
    lastCityEventHour: hourKey,
  };
};

export const applyCityIncidentChoice = (
  state: GameState,
  choiceId: string,
): CityIncidentChoiceResult => {
  const incident = state.activeCityIncident;
  if (!incident) {
    return {
      nextState: state,
      notification: {
        title: 'No Incident',
        msg: 'There is no active district incident to resolve.',
      },
    };
  }

  const definition = CATALOG.find((item) => item.id === incident.id);
  const choiceDefinition = definition?.choices.find((choice) => choice.id === choiceId);
  const activeChoice = incident.choices.find((choice) => choice.id === choiceId);

  if (!choiceDefinition || !activeChoice) {
    return {
      nextState: state,
      notification: {
        title: 'Incident Unchanged',
        msg: 'That response is no longer available.',
      },
    };
  }

  const disabledReason = choiceDefinition.disabledReason?.(state) ?? activeChoice.disabledReason;
  if (disabledReason) {
    return {
      nextState: state,
      notification: {
        title: 'Incident Blocked',
        msg: disabledReason,
      },
    };
  }

  const resolved = choiceDefinition.apply(state);

  return {
    nextState: {
      ...resolved,
      activeCityIncident: null,
    },
    notification: {
      title: 'Incident Resolved',
      msg: `${incident.title}: ${activeChoice.effectLabel}`,
    },
  };
};
