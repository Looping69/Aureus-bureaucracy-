import { Permit } from '../types';

export type PermitBoardCategory = 'ACCESS' | 'ACTION' | 'PROFIT' | 'DEEP';

export interface PermitRouteHint {
  id: string;
  label: string;
  description: string;
  effect: string;
}

export interface PermitBoardDefinition {
  id: string;
  tier: number;
  category: PermitBoardCategory;
  summary: string;
  unlocks: string;
  strategy: string;
  requires?: string[];
  routeHints: PermitRouteHint[];
}

export interface PermitBoardEntry {
  permit: Permit;
  definition: PermitBoardDefinition;
  missingRequirements: string[];
  isRecommended: boolean;
}

export const PERMIT_CATEGORY_LABELS: Record<PermitBoardCategory, string> = {
  ACCESS: 'Access',
  ACTION: 'Action',
  PROFIT: 'Profit',
  DEEP: 'Deep Work',
};

export const PERMIT_BOARD_DEFINITIONS: Record<string, PermitBoardDefinition> = {
  'extraction-intent': {
    id: 'extraction-intent',
    tier: 1,
    category: 'ACCESS',
    summary: 'The first stamp. It proves you are allowed to ask for real mining rights.',
    unlocks: 'Opens the Prospecting License path and starts the bureau loop.',
    strategy: 'File this first. There is no meaningful mining career without it.',
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'Cheap, slow, and vulnerable to rejection if your form work is sloppy.',
        effect: 'Low risk, normal review.',
      },
      {
        id: 'vane',
        label: 'Vane pressure',
        description: 'Talk to Officer Vane and use his ambition to force an early stamp.',
        effect: '+Trust or +Influence, faster approval.',
      },
      {
        id: 'bribe',
        label: 'Processing fee',
        description: 'Pay under the table when the Bureau rejects your paperwork.',
        effect: '+Exposure, fast approval.',
      },
    ],
  },
  'prospecting-license': {
    id: 'prospecting-license',
    tier: 2,
    category: 'ACTION',
    summary: 'Lets you legally search for workable deposits before full extraction.',
    unlocks: 'Makes Iron Vein extraction available and gives prospecting a purpose.',
    strategy: 'Take this after Form 17-B so your first mine trips start feeding the permit ladder.',
    requires: ['extraction-intent'],
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'A normal prospecting application through the Bureau.',
        effect: 'Low risk, normal review.',
      },
      {
        id: 'fast',
        label: 'Fast-track filing',
        description: 'Pay double and perform a clean filing to try for immediate approval.',
        effect: 'Costs more, saves time.',
      },
      {
        id: 'inspector',
        label: 'Inspector hint',
        description: 'Build leverage with Compliance to learn where safer samples are likely.',
        effect: '+Information, safer route.',
      },
    ],
  },
  'mining-permit-iron': {
    id: 'mining-permit-iron',
    tier: 3,
    category: 'ACCESS',
    summary: 'Turns the first mine from a sampling site into a legal extraction operation.',
    unlocks: 'Iron Vein becomes operational and Deep Hollow survey work opens up.',
    strategy: 'This is the first real money gate. Get it before chasing expensive upgrades.',
    requires: ['prospecting-license'],
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'Pay the full fee and wait for the Bureau to process extraction rights.',
        effect: 'Stable legal route.',
      },
      {
        id: 'union',
        label: 'Union discount',
        description: 'Win Big Sal over to soften labor objections and reduce the sting.',
        effect: 'Cheaper route, favors labor.',
      },
      {
        id: 'fixer',
        label: 'Backroom stamp',
        description: 'Use Slink to skip the queue if you can tolerate scrutiny later.',
        effect: '+Exposure, fast route.',
      },
    ],
  },
  'export-license': {
    id: 'export-license',
    tier: 4,
    category: 'PROFIT',
    summary: 'Lets you sell ore openly instead of relying on messy off-book deals.',
    unlocks: 'Higher legal ore sale price and cleaner market access.',
    strategy: 'Buy this once Iron Vein is running so each trip pays better.',
    requires: ['mining-permit-iron'],
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'Register your ore movement through official channels.',
        effect: 'Better sale price, low risk.',
      },
      {
        id: 'market',
        label: 'Market tip',
        description: 'Use Slink or Elena to time sales during a market window.',
        effect: 'Bigger payouts, route dependent.',
      },
      {
        id: 'smuggle',
        label: 'Smuggling tie',
        description: 'Skip the license and sell dirty if you need fast cash.',
        effect: '+Exposure, short-term money.',
      },
    ],
  },
  'wash-plant-permit': {
    id: 'wash-plant-permit',
    tier: 5,
    category: 'PROFIT',
    summary: 'Authorizes heavier processing equipment for better yield.',
    unlocks: 'Doubles ore yield per tile once installed.',
    strategy: 'Strong after export is solved. Weak too early because you cannot profit cleanly yet.',
    requires: ['mining-permit-iron'],
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'Clean equipment authorization with the usual inspection drag.',
        effect: 'Low risk, expensive.',
      },
      {
        id: 'inspector',
        label: 'Compliance proof',
        description: 'Earn Krell support to make the installation look safer.',
        effect: 'Safer approval path.',
      },
      {
        id: 'union',
        label: 'Crew pressure',
        description: 'Use Big Sal to argue the plant protects worker hours.',
        effect: 'Political favor, possible discount.',
      },
    ],
  },
  'prospecting-permit-deep': {
    id: 'prospecting-permit-deep',
    tier: 6,
    category: 'DEEP',
    summary: 'A survey request for Deep Hollow before anyone admits it is worth mining.',
    unlocks: 'Opens Deep Hollow excavation rights and deeper resource planning.',
    strategy: 'Choose this when Iron Vein income is stable and you want a harder, richer zone.',
    requires: ['mining-permit-iron'],
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'Pay inspectors to certify the first Deep Hollow survey.',
        effect: 'Legal but pricey.',
      },
      {
        id: 'chief',
        label: 'Community route',
        description: 'Work with Chief Okon to learn where the land is already scarred.',
        effect: '+Trust, slower but cleaner.',
      },
      {
        id: 'media',
        label: 'Public pressure',
        description: 'Use Elena to shame the Bureau into approving a safer survey.',
        effect: '+Influence, +Exposure.',
      },
    ],
  },
  'mining-permit-deep': {
    id: 'mining-permit-deep',
    tier: 7,
    category: 'DEEP',
    summary: 'Full Deep Hollow mining rights. Better yield, harsher danger, more scrutiny.',
    unlocks: 'Deep Hollow becomes operational and Abyssal survey work appears.',
    strategy: 'A midgame commitment: more profit, more risk, and stronger route identity.',
    requires: ['prospecting-permit-deep'],
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'A complete excavation package with liability waivers.',
        effect: 'Expensive, stable.',
      },
      {
        id: 'community',
        label: 'Community pact',
        description: 'Promise safer practices and share benefits with locals.',
        effect: '+Trust, possible overhead relief.',
      },
      {
        id: 'shadow',
        label: 'Shadow contract',
        description: 'Let Slink arrange unofficial crews and equipment.',
        effect: '+Exposure, fast money route.',
      },
    ],
  },
  'claim-expansion': {
    id: 'claim-expansion',
    tier: 8,
    category: 'PROFIT',
    summary: 'Expands the legal boundary of your operation instead of only improving one shaft.',
    unlocks: 'More claim room and future multi-site scaling.',
    strategy: 'Best after Deep Hollow is profitable. Too early, it drains cash that should unlock access.',
    requires: ['mining-permit-deep'],
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'Buy the larger claim through the Bureau.',
        effect: 'Large cost, clean expansion.',
      },
      {
        id: 'influence',
        label: 'Influence push',
        description: 'Spend political capital to make the claim look inevitable.',
        effect: '+Influence route payoff.',
      },
      {
        id: 'locals',
        label: 'Land bargain',
        description: 'Negotiate with local leadership before the Bureau redraws the line.',
        effect: '+Trust route payoff.',
      },
    ],
  },
  'prospecting-permit-abyss': {
    id: 'prospecting-permit-abyss',
    tier: 9,
    category: 'DEEP',
    summary: 'Probe authorization for the most dangerous known reach.',
    unlocks: 'Opens the final exploitation grant path.',
    strategy: 'Late game scouting. Do not chase this before your economy and route are clear.',
    requires: ['mining-permit-deep'],
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'A formal probe request with extreme caution language.',
        effect: 'Slow, expensive, legal.',
      },
      {
        id: 'inspector',
        label: 'Hazard dossier',
        description: 'Use Krell data to argue the probe is controlled rather than reckless.',
        effect: 'Safer late-game route.',
      },
      {
        id: 'fixer',
        label: 'Unauthorized probe',
        description: 'Send equipment first and ask permission after results exist.',
        effect: '+Exposure, faster unlock.',
      },
    ],
  },
  'mining-permit-abyss': {
    id: 'mining-permit-abyss',
    tier: 10,
    category: 'DEEP',
    summary: 'The final grant: huge returns, extreme danger, and no plausible innocence left.',
    unlocks: 'Abyssal Reach becomes the endgame extraction site.',
    strategy: 'Only pursue this when you are ready to commit to an ending direction.',
    requires: ['prospecting-permit-abyss'],
    routeHints: [
      {
        id: 'standard',
        label: 'Standard filing',
        description: 'Pay the Bureau for formal exploitation rights.',
        effect: 'Very expensive, cleanest route.',
      },
      {
        id: 'tycoon',
        label: 'Corporate backing',
        description: 'Use influence to become too profitable to deny.',
        effect: 'Bureau Tycoon pressure.',
      },
      {
        id: 'shadow',
        label: 'Black grant',
        description: 'Run the Abyss through unofficial channels.',
        effect: 'Shadow Broker pressure, high Exposure.',
      },
    ],
  },
};

export const getPermitBoardDefinition = (permitId: string): PermitBoardDefinition =>
  PERMIT_BOARD_DEFINITIONS[permitId] ?? {
    id: permitId,
    tier: 99,
    category: 'ACTION',
    summary: 'A Bureau filing with unclear strategic value.',
    unlocks: 'Unknown unlock. This permit needs design metadata.',
    strategy: 'Review this permit and decide where it belongs in the progression.',
    routeHints: [],
  };

export const getPermitMissingRequirements = (
  permitId: string,
  permits: Record<string, Permit>,
): string[] => {
  const definition = getPermitBoardDefinition(permitId);
  return (definition.requires ?? []).filter((requiredId) => permits[requiredId]?.status !== 'APPROVED');
};

export const canFilePermitFromBoard = (
  permitId: string,
  permits: Record<string, Permit>,
): boolean => getPermitMissingRequirements(permitId, permits).length === 0;

export const getRecommendedPermitId = (permits: Record<string, Permit>): string | null => {
  const entries = Object.values(permits)
    .map((permit) => ({
      permit,
      definition: getPermitBoardDefinition(permit.id),
      missingRequirements: getPermitMissingRequirements(permit.id, permits),
    }))
    .sort((a, b) => a.definition.tier - b.definition.tier);

  const available = entries.find(({ permit, missingRequirements }) =>
    (permit.status === 'AVAILABLE' || permit.status === 'REJECTED') && missingRequirements.length === 0,
  );
  if (available) return available.permit.id;

  const pending = entries.find(({ permit }) => permit.status === 'PENDING');
  if (pending) return pending.permit.id;

  const nextLocked = entries.find(({ permit }) => permit.status === 'LOCKED');
  return nextLocked?.permit.id ?? null;
};

export const getPermitBoardEntries = (permits: Record<string, Permit>): PermitBoardEntry[] => {
  const recommendedId = getRecommendedPermitId(permits);

  return Object.values(permits)
    .map((permit) => {
      const definition = getPermitBoardDefinition(permit.id);
      return {
        permit,
        definition,
        missingRequirements: getPermitMissingRequirements(permit.id, permits),
        isRecommended: permit.id === recommendedId,
      };
    })
    .sort((a, b) => a.definition.tier - b.definition.tier || a.permit.name.localeCompare(b.permit.name));
};

export const getPermitStatusLabel = (permit: Permit, missingRequirements: string[] = []) => {
  if (permit.status === 'AVAILABLE' && missingRequirements.length > 0) return 'BLOCKED';
  return permit.status;
};

export const getPermitStatusClassName = (permit: Permit, missingRequirements: string[] = []) => {
  const label = getPermitStatusLabel(permit, missingRequirements);

  switch (label) {
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'BLOCKED':
    case 'LOCKED':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'AVAILABLE':
    default:
      return 'bg-sky-100 text-sky-800 border-sky-200';
  }
};

export const getRequirementLabel = (permitId: string, permits: Record<string, Permit>) =>
  permits[permitId]?.name ?? getPermitBoardDefinition(permitId).id;
