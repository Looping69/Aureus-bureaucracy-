import { GameState, StoryFlag } from '../../types';

export const hasStoryFlag = (state: GameState, flag: StoryFlag) =>
  state.storyFlags.includes(flag);

export const addStoryFlag = (state: GameState, flag: StoryFlag) =>
  hasStoryFlag(state, flag) ? state.storyFlags : [...state.storyFlags, flag];

export const addStoryFlags = (state: GameState, ...flags: StoryFlag[]) =>
  flags.reduce((acc, flag) => (acc.includes(flag) ? acc : [...acc, flag]), state.storyFlags);

export interface StoryStatusItem {
  id: string;
  label: string;
  detail: string;
  toneClassName: string;
  causedBy?: string[];
}

export const getPoliticalPosition = (state: GameState): StoryStatusItem[] => {
  const items: StoryStatusItem[] = [];

  if (hasStoryFlag(state, 'community_pact')) {
    items.push({
      id: 'community_pact',
      label: 'Community Aligned',
      detail: 'Okon and the village back clean-water operations.',
      toneClassName: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    });
  }
  if (hasStoryFlag(state, 'fixer_smuggling_tie')) {
    items.push({
      id: 'fixer_smuggling_tie',
      label: 'Smuggling Ties',
      detail: 'Slink can open dirty lanes, but clean allies trust you less.',
      toneClassName: 'bg-amber-100 text-amber-700 border-amber-200'
    });
  }
  if (hasStoryFlag(state, 'reform_alliance')) {
    items.push({
      id: 'reform_alliance',
      label: 'Reform Bloc',
      detail: 'Krell will support clean approvals and internal pressure.',
      toneClassName: 'bg-sky-100 text-sky-700 border-sky-200'
    });
  }
  if (hasStoryFlag(state, 'vane_backchannel')) {
    items.push({
      id: 'vane_backchannel',
      label: 'Backchannel Broker',
      detail: 'Vane can move permits quietly, as long as the scandal stays buried.',
      toneClassName: 'bg-violet-100 text-violet-700 border-violet-200'
    });
  }
  if (hasStoryFlag(state, 'public_scandal')) {
    items.push({
      id: 'public_scandal',
      label: 'Public Pressure',
      detail: 'The press and public are now active actors in your run.',
      toneClassName: 'bg-rose-100 text-rose-700 border-rose-200'
    });
  }
  if (hasStoryFlag(state, 'vox_exclusive')) {
    items.push({
      id: 'vox_exclusive',
      label: 'Vox Exclusive',
      detail: 'You fed Elena the big story and burned quiet options.',
      toneClassName: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200'
    });
  }
  if (hasStoryFlag(state, 'vox_embargo')) {
    items.push({
      id: 'vox_embargo',
      label: 'Press Embargo',
      detail: 'You bought silence. Scandal routes are colder for now.',
      toneClassName: 'bg-slate-200 text-slate-700 border-slate-300'
    });
  }
  if (hasStoryFlag(state, 'inspector_deputized')) {
    items.push({
      id: 'inspector_deputized',
      label: 'Internal Witness',
      detail: 'Krell treats you as part of the cleanup, not another operator.',
      toneClassName: 'bg-cyan-100 text-cyan-700 border-cyan-200'
    });
  }
  if (hasStoryFlag(state, 'inspector_blacklist')) {
    items.push({
      id: 'inspector_blacklist',
      label: 'Inspector Blacklist',
      detail: 'Krell is done with you. Compliance favors are off the table.',
      toneClassName: 'bg-red-100 text-red-700 border-red-200'
    });
  }

  return items;
};

export const getClosedRouteWarnings = (state: GameState): StoryStatusItem[] => {
  const items: StoryStatusItem[] = [];

  if (hasStoryFlag(state, 'community_pact')) {
    items.push({
      id: 'closed-smuggling',
      label: 'Smuggling Closed',
      detail: 'Community pact locks Slink courier and convoy routes.',
      toneClassName: 'bg-red-50 text-red-700 border-red-200',
      causedBy: ['You signed the clean-water pact with Chief Okon.']
    });
  }
  if (hasStoryFlag(state, 'fixer_smuggling_tie')) {
    items.push({
      id: 'closed-clean-support',
      label: 'Clean Support Strained',
      detail: 'Smuggling ties block some Chief and Inspector routes until reform.',
      toneClassName: 'bg-red-50 text-red-700 border-red-200',
      causedBy: ['You accepted Slink\'s courier work and entered his smuggling lane.']
    });
  }
  if (hasStoryFlag(state, 'vane_exposed') || hasStoryFlag(state, 'vox_exclusive')) {
    items.push({
      id: 'closed-vane-backchannel',
      label: 'Quiet Bureau Routes Closed',
      detail: 'Bribes, backchannels, and soft approvals with Vane are largely gone.',
      toneClassName: 'bg-red-50 text-red-700 border-red-200',
      causedBy: [
        hasStoryFlag(state, 'vane_exposed') ? 'You exposed Vane over the contamination reports.' : 'You gave Vox the exclusive and went public.'
      ]
    });
  }
  if (hasStoryFlag(state, 'vox_embargo')) {
    items.push({
      id: 'closed-press-escalation',
      label: 'Press Escalation Cooled',
      detail: 'Big public-leak routes are harder while Vox is under embargo.',
      toneClassName: 'bg-red-50 text-red-700 border-red-200',
      causedBy: ['You paid Elena Vox to sit on the story for a week.']
    });
  }
  if (hasStoryFlag(state, 'inspector_blacklist')) {
    items.push({
      id: 'closed-inspector-favors',
      label: 'Inspector Favors Closed',
      detail: 'Safety sweeps and clean-approval routes with Krell are burned.',
      toneClassName: 'bg-red-50 text-red-700 border-red-200',
      causedBy: ['You told Krell to stay out of your business and accepted the blacklist.']
    });
  }

  return items;
};

export interface RunLedgerItem {
  id: string;
  decision: string;
  consequence: string;
  toneClassName: string;
}

export const getRunLedger = (state: GameState): RunLedgerItem[] => {
  const items: RunLedgerItem[] = [];

  if (hasStoryFlag(state, 'chief_water_quest')) {
    items.push({
      id: 'ledger-chief-water',
      decision: 'Took Okon\'s water case',
      consequence: 'Unlocked the contamination route against Vane.',
      toneClassName: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    });
  }
  if (hasStoryFlag(state, 'vane_backchannel')) {
    items.push({
      id: 'ledger-vane-backchannel',
      decision: 'Cut a quiet deal with Vane',
      consequence: 'Opened hidden permit movement, but made scandal more dangerous.',
      toneClassName: 'bg-violet-50 text-violet-800 border-violet-200'
    });
  }
  if (hasStoryFlag(state, 'vane_exposed')) {
    items.push({
      id: 'ledger-vane-exposed',
      decision: 'Exposed Vane publicly',
      consequence: 'Closed quiet Bureau routes and pushed the city toward reform or chaos.',
      toneClassName: 'bg-rose-50 text-rose-800 border-rose-200'
    });
  }
  if (hasStoryFlag(state, 'community_pact')) {
    items.push({
      id: 'ledger-community-pact',
      decision: 'Signed Okon\'s clean-water pact',
      consequence: 'Unlocked village support and locked smuggling access.',
      toneClassName: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    });
  }
  if (hasStoryFlag(state, 'fixer_smuggling_tie')) {
    items.push({
      id: 'ledger-fixer-tie',
      decision: 'Joined Slink\'s courier lane',
      consequence: 'Opened dirty profit routes and strained clean-alignment allies.',
      toneClassName: 'bg-amber-50 text-amber-800 border-amber-200'
    });
  }
  if (hasStoryFlag(state, 'vox_exclusive')) {
    items.push({
      id: 'ledger-vox-exclusive',
      decision: 'Gave Vox the exclusive',
      consequence: 'Amplified scandal, burned quiet routes, and pushed louder endings.',
      toneClassName: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200'
    });
  }
  if (hasStoryFlag(state, 'vox_embargo')) {
    items.push({
      id: 'ledger-vox-embargo',
      decision: 'Bought a press embargo',
      consequence: 'Cooled scandal pressure and protected quiet Bureau routes.',
      toneClassName: 'bg-slate-100 text-slate-800 border-slate-300'
    });
  }
  if (hasStoryFlag(state, 'reform_alliance')) {
    items.push({
      id: 'ledger-reform-alliance',
      decision: 'Built Krell\'s reform bloc',
      consequence: 'Unlocked clean approval pressure and stronger civic endings.',
      toneClassName: 'bg-sky-50 text-sky-800 border-sky-200'
    });
  }
  if (hasStoryFlag(state, 'inspector_deputized')) {
    items.push({
      id: 'ledger-inspector-deputized',
      decision: 'Became Krell\'s internal witness',
      consequence: 'Strengthened reform endings and closed dirty compromise paths.',
      toneClassName: 'bg-cyan-50 text-cyan-800 border-cyan-200'
    });
  }
  if (hasStoryFlag(state, 'inspector_blacklist')) {
    items.push({
      id: 'ledger-inspector-blacklist',
      decision: 'Accepted Krell\'s blacklist',
      consequence: 'Burned compliance help and tilted the run toward shadow outcomes.',
      toneClassName: 'bg-red-50 text-red-800 border-red-200'
    });
  }

  return items;
};
