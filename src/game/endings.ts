import { GameState } from '../types';
import { hasStoryFlag } from './dialogue/storyFlags';

export interface EndingDefinition {
  id: string;
  title: string;
  description: string;
  condition: (state: GameState) => boolean;
  routeHint: string;
}

export interface EndingForecast {
  id: string;
  title: string;
  status: 'ALIVE' | 'THREATENED' | 'DEAD';
  detail: string;
}

const totalNpcLeverage = (state: GameState) =>
  Object.values(state.npcs).reduce((sum, npc) => sum + npc.leverage, 0);

export const ENDINGS: EndingDefinition[] = [
  {
    id: 'BUREAU_TYCOON',
    title: 'Bureau Tycoon',
    description: 'You protected your quiet channels, kept the press manageable, and turned permits into a private empire.',
    routeHint: 'Leans toward Vane backchannels and press control. Public scandal and deputized reform work against it.',
    condition: (s) =>
      s.money >= 12000 &&
      (hasStoryFlag(s, 'vane_backchannel') || hasStoryFlag(s, 'vox_embargo')) &&
      !hasStoryFlag(s, 'vox_exclusive') &&
      !hasStoryFlag(s, 'inspector_deputized')
  },
  {
    id: 'PEOPLES_CHAMPION',
    title: "People's Champion",
    description: 'You chose reform over side deals and built a legitimate coalition strong enough to change the city.',
    routeHint: 'Requires civic alignment: community backing, Krell reform, and no inspector blacklist.',
    condition: (s) =>
      s.meters.trust >= 85 &&
      s.meters.influence >= 70 &&
      s.meters.exposure < 35 &&
      hasStoryFlag(s, 'community_pact') &&
      (hasStoryFlag(s, 'reform_alliance') || hasStoryFlag(s, 'inspector_deputized')) &&
      !hasStoryFlag(s, 'inspector_blacklist') &&
      !hasStoryFlag(s, 'fixer_smuggling_tie')
  },
  {
    id: 'SHADOW_BROKER',
    title: 'Shadow Broker',
    description: 'You embraced the dirty network, burned your compliance bridges, and came out owning the city\'s shadows.',
    routeHint: 'Needs the fixer lane or blacklist route. Clean reform alignment will lock this away.',
    condition: (s) =>
      s.meters.influence >= 75 &&
      s.meters.exposure >= 85 &&
      totalNpcLeverage(s) >= 120 &&
      (hasStoryFlag(s, 'fixer_smuggling_tie') || hasStoryFlag(s, 'inspector_blacklist')) &&
      !hasStoryFlag(s, 'community_pact') &&
      !hasStoryFlag(s, 'inspector_deputized')
  }
];

export const getUnlockedEnding = (state: GameState) =>
  ENDINGS.find((ending) => ending.condition(state) && !state.unlockedEndings.includes(ending.id)) ?? null;

export const getEndingById = (id: string | null) =>
  ENDINGS.find((ending) => ending.id === id) ?? null;

export const getEndingForecast = (state: GameState): EndingForecast[] => {
  const forecasts: EndingForecast[] = [];

  const bureauRouteAlive = !hasStoryFlag(state, 'vox_exclusive') && !hasStoryFlag(state, 'inspector_deputized');
  if (!bureauRouteAlive) {
    forecasts.push({
      id: 'BUREAU_TYCOON',
      title: 'Bureau Tycoon',
      status: 'DEAD',
      detail: 'Loud press exposure or Krell\'s witness route burned the quiet empire lane.'
    });
  } else if ((hasStoryFlag(state, 'vane_backchannel') || hasStoryFlag(state, 'vox_embargo')) && state.money >= 8000) {
    forecasts.push({
      id: 'BUREAU_TYCOON',
      title: 'Bureau Tycoon',
      status: 'ALIVE',
      detail: 'Your quiet political lane is intact. Keep stacking money and control.'
    });
  } else {
    forecasts.push({
      id: 'BUREAU_TYCOON',
      title: 'Bureau Tycoon',
      status: 'THREATENED',
      detail: 'You still need a protected Bureau route and a much larger bankroll.'
    });
  }

  const championRouteDead = hasStoryFlag(state, 'inspector_blacklist') || hasStoryFlag(state, 'fixer_smuggling_tie');
  if (championRouteDead) {
    forecasts.push({
      id: 'PEOPLES_CHAMPION',
      title: "People's Champion",
      status: 'DEAD',
      detail: 'Blacklist or smuggling alignment killed the clean reform ending.'
    });
  } else if (
    hasStoryFlag(state, 'community_pact') &&
    (hasStoryFlag(state, 'reform_alliance') || hasStoryFlag(state, 'inspector_deputized')) &&
    state.meters.trust >= 70 &&
    state.meters.influence >= 55
  ) {
    forecasts.push({
      id: 'PEOPLES_CHAMPION',
      title: "People's Champion",
      status: 'ALIVE',
      detail: 'Your civic coalition is real. Keep trust high and exposure low.'
    });
  } else {
    forecasts.push({
      id: 'PEOPLES_CHAMPION',
      title: "People's Champion",
      status: 'THREATENED',
      detail: 'You need Okon\'s backing plus Krell reform alignment to keep this path open.'
    });
  }

  const shadowRouteDead = hasStoryFlag(state, 'community_pact') || hasStoryFlag(state, 'inspector_deputized');
  if (shadowRouteDead) {
    forecasts.push({
      id: 'SHADOW_BROKER',
      title: 'Shadow Broker',
      status: 'DEAD',
      detail: 'Community or deputized reform alignment cut off the shadow ending.'
    });
  } else if (
    (hasStoryFlag(state, 'fixer_smuggling_tie') || hasStoryFlag(state, 'inspector_blacklist')) &&
    state.meters.exposure >= 65 &&
    state.meters.influence >= 60
  ) {
    forecasts.push({
      id: 'SHADOW_BROKER',
      title: 'Shadow Broker',
      status: 'ALIVE',
      detail: 'Dirty leverage is growing. More exposure and deeper black-network control will finish it.'
    });
  } else {
    forecasts.push({
      id: 'SHADOW_BROKER',
      title: 'Shadow Broker',
      status: 'THREATENED',
      detail: 'You need a stronger dirty-network commitment and much more heat.'
    });
  }

  return forecasts;
};
