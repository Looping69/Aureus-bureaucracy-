import { DialogueCommand, GameState, NPC } from '../../types';
import { WORLD_EFFECTS } from './worldEffects';
import { hasStoryFlag } from './storyFlags';

export type SpecialDialogueOption = {
  text: string;
  action: (s: GameState) => DialogueCommand[];
  condition?: (s: GameState) => boolean;
  trustRequired?: number;
  leverageRequired?: number;
};

interface BuildSpecialDialogueOptionsArgs {
  npc: NPC;
  state: GameState;
  moodInfluence: number;
}

interface NpcSocialProfile {
  bribeCostMultiplier: number;
  negotiateBonus: number;
  trustVolatility: number;
  exposureSensitivity: number;
}

const SOCIAL_PROFILES: Record<string, NpcSocialProfile> = {
  licensing: { bribeCostMultiplier: 1.2, negotiateBonus: 8, trustVolatility: 1.1, exposureSensitivity: 1.2 },
  union: { bribeCostMultiplier: 0.9, negotiateBonus: 3, trustVolatility: 0.9, exposureSensitivity: 0.8 },
  inspector: { bribeCostMultiplier: 1.4, negotiateBonus: -6, trustVolatility: 1.2, exposureSensitivity: 1.4 },
  fixer: { bribeCostMultiplier: 0.8, negotiateBonus: 6, trustVolatility: 0.8, exposureSensitivity: 0.7 },
  journalist: { bribeCostMultiplier: 1, negotiateBonus: 2, trustVolatility: 1, exposureSensitivity: 1.3 },
  chief: { bribeCostMultiplier: 1.3, negotiateBonus: -2, trustVolatility: 1, exposureSensitivity: 1 },
};

const DEFAULT_PROFILE: NpcSocialProfile = {
  bribeCostMultiplier: 1,
  negotiateBonus: 0,
  trustVolatility: 1,
  exposureSensitivity: 1
};

const currentHour = (s: GameState) => (s.day * 24) + s.time;

const cooldownKey = (npcId: string, action: string) => `${npcId}:${action}`;

const cooldownRemaining = (s: GameState, key: string) => {
  const expiry = s.dialogueCooldowns[key] ?? 0;
  return Math.max(0, Math.ceil(expiry - currentHour(s)));
};

const isCoolingDown = (s: GameState, key: string) => cooldownRemaining(s, key) > 0;

const addCooldownLabel = (base: string, s: GameState, key: string) => {
  const remaining = cooldownRemaining(s, key);
  if (remaining <= 0) return base;
  return `${base} [Cooldown ${remaining}h]`;
};

const effectLabel = (effectId: keyof typeof WORLD_EFFECTS, hours: number) =>
  `, +${WORLD_EFFECTS[effectId].label} ${hours}h`;

export const buildSpecialDialogueOptions = ({
  npc,
  state,
  moodInfluence,
}: BuildSpecialDialogueOptionsArgs): SpecialDialogueOption[] => {
  const profile = SOCIAL_PROFILES[npc.id] ?? DEFAULT_PROFILE;
  const applyMood = (val: number) => Math.round(val * (1 + moodInfluence));

  const options: SpecialDialogueOption[] = [
    {
      text: `Small Talk: Compliment their work (+Trust / minor risk)`,
      action: (s: GameState) => {
        const success = Math.random() > 0.3;
        const baseGain = success ? 5 : -2;
        const gain = applyMood(Math.round(baseGain * profile.trustVolatility));
        return [
          { type: 'QUEUE_FEEDBACK', npcId: npc.id, amount: gain, feedbackType: 'TRUST' },
          { type: 'ADJUST_NPC_TRUST', npcId: npc.id, delta: gain },
        ];
      }
    }
  ];

  if (npc.vulnerability && npc.vulnerability.discovered) {
    const key = cooldownKey(npc.id, 'vulnerability-play');
    options.push({
      text: addCooldownLabel(`Target Vulnerability: ${npc.vulnerability.description} (+Trust, +Leverage${npc.id === 'licensing' || npc.id === 'inspector' ? effectLabel('bureauPull', 10) : npc.id === 'chief' || npc.id === 'union' ? effectLabel('communityBacking', 12) : npc.id === 'fixer' ? effectLabel('marketInsight', 12) : ''})`, state, key),
      condition: (s: GameState) => npc.trustLevel >= 20 && !isCoolingDown(s, key),
      action: (s: GameState) => {
        const gain = applyMood(Math.round(25 * profile.trustVolatility));
        const effect =
          npc.id === 'licensing' || npc.id === 'inspector'
            ? { id: 'bureauPull' as const, hours: 10 }
            : npc.id === 'chief' || npc.id === 'union'
              ? { id: 'communityBacking' as const, hours: 12 }
              : npc.id === 'fixer'
                ? { id: 'marketInsight' as const, hours: 12 }
                : null;
        return [{
          type: 'APPLY_NPC_VULNERABILITY',
          npcId: npc.id,
          trustDelta: gain,
          leverageGain: 10,
          cooldownHours: 8,
          effectId: effect?.id,
          effectHours: effect?.hours,
        }];
      }
    });
  }

  if (npc.id === 'licensing' || npc.id === 'union') {
    const key = cooldownKey(npc.id, 'bribe');
    const bribeCost = Math.round(Math.max(100, 500 - npc.leverage * 5) * profile.bribeCostMultiplier);
    options.push({
      text: npc.id === 'licensing' && (hasStoryFlag(state, 'vane_exposed') || hasStoryFlag(state, 'vox_exclusive') || hasStoryFlag(state, 'inspector_deputized'))
        ? 'Bribe: quiet licensing route is burned by scandal or reform'
        : addCooldownLabel(`Bribe: "Grease the Wheels" (-$${bribeCost}, +Trust, +Exposure)`, state, key),
      condition: (s: GameState) =>
        !(npc.id === 'licensing' && (hasStoryFlag(s, 'vane_exposed') || hasStoryFlag(s, 'vox_exclusive') || hasStoryFlag(s, 'inspector_deputized'))) &&
        s.money >= bribeCost &&
        !isCoolingDown(s, key),
      action: (s: GameState) => {
        const gain = applyMood(Math.round(14 * profile.trustVolatility));
        return [{
          type: 'BRIBE_NPC',
          npcId: npc.id,
          cost: bribeCost,
          trustDelta: gain,
          exposureDelta: Math.ceil(2 * profile.exposureSensitivity),
          cooldownHours: 6,
        }];
      }
    });
  }

  if (npc.id !== 'journalist' && npc.id !== 'fixer') {
    const key = cooldownKey(npc.id, 'permit-negotiation');
    options.push({
      text: npc.id === 'licensing' && (hasStoryFlag(state, 'vane_exposed') || hasStoryFlag(state, 'vox_exclusive') || hasStoryFlag(state, 'inspector_deputized'))
        ? 'Negotiate: quiet permit movement is closed by scandal or reform'
        : npc.id === 'inspector' && hasStoryFlag(state, 'inspector_blacklist')
          ? 'Negotiate: Krell has blacklisted your operation'
        : addCooldownLabel(`Negotiate: Request Permit Approval (high variance${effectLabel('bureauPull', 10)}, sets cooldown)`, state, key),
      condition: (s: GameState) =>
        !(npc.id === 'licensing' && (hasStoryFlag(s, 'vane_exposed') || hasStoryFlag(s, 'vox_exclusive') || hasStoryFlag(s, 'inspector_deputized'))) &&
        !(npc.id === 'inspector' && hasStoryFlag(s, 'inspector_blacklist')) &&
        Object.values(s.permits).some(p => p.status === 'PENDING') &&
        !isCoolingDown(s, key),
      action: (s: GameState) => {
        const freshNpc = s.npcs[npc.id];
        const successRate = Math.min(95, Math.max(10, (freshNpc.trustLevel / 2) + (freshNpc.leverage * 1.5) + profile.negotiateBonus));
        const trustPenalty = Math.round(8 * profile.trustVolatility);
        return [{
          type: 'NEGOTIATE_PENDING_PERMITS',
          npcId: npc.id,
          successThreshold: successRate,
          successTrustDelta: 10,
          failureTrustDelta: trustPenalty,
          failureExposureDelta: Math.ceil(3 * profile.exposureSensitivity),
          cooldownHours: 8,
        }];
      }
    });
  }

  if (npc.id === 'licensing' && hasStoryFlag(state, 'vane_backchannel')) {
    const key = cooldownKey(npc.id, 'backchannel');
    options.push({
      text: addCooldownLabel('Use Vane Backchannel (approve one pending permit, +Exposure)', state, key),
      condition: (s: GameState) =>
        !hasStoryFlag(s, 'vane_exposed') &&
        !hasStoryFlag(s, 'vox_exclusive') &&
        !hasStoryFlag(s, 'inspector_deputized') &&
        Object.values(s.permits).some(p => p.status === 'PENDING') &&
        !isCoolingDown(s, key),
      action: (s: GameState) => {
        const pendingPermit = Object.values(s.permits).find(p => p.status === 'PENDING');
        if (!pendingPermit) return [];
        return [{ type: 'USE_BACKCHANNEL_APPROVAL', npcId: npc.id, exposureDelta: 8, cooldownHours: 14 }];
      }
    });
  }

  if (npc.id === 'fixer') {
    options.push({
      text: 'Buy Movement Upgrade: Sturdy Boots (-$200, +Speed)',
      condition: (s: GameState) => s.money >= 200 && !s.upgrades.includes('boots'),
      action: () => [{ type: 'BUY_MOVEMENT_UPGRADE', npcId: npc.id, upgradeId: 'boots', cost: 200, speed: 2, trustDelta: 5 }]
    });
    options.push({
      text: 'Buy Movement Upgrade: Used Scooter (-$1000, ++Speed)',
      condition: (s: GameState) => s.money >= 1000 && s.upgrades.includes('boots') && !s.upgrades.includes('scooter'),
      action: () => [{ type: 'BUY_MOVEMENT_UPGRADE', npcId: npc.id, upgradeId: 'scooter', cost: 1000, speed: 4, trustDelta: 10 }]
    });
    options.push({
      text: 'Buy Movement Upgrade: Rusty Truck (-$5000, +++Speed)',
      condition: (s: GameState) => s.money >= 5000 && s.upgrades.includes('scooter') && !s.upgrades.includes('truck'),
      action: () => [{ type: 'BUY_MOVEMENT_UPGRADE', npcId: npc.id, upgradeId: 'truck', cost: 5000, speed: 8, trustDelta: 20 }]
    });

    if (state.evidence > 0) {
      const key = cooldownKey(npc.id, 'evidence-processing');
      options.push({
        text: addCooldownLabel(`Process Evidence into Dirt (${state.evidence} items${effectLabel('marketInsight', 8)}, sets cooldown)`, state, key),
        condition: (s: GameState) => !isCoolingDown(s, key),
        action: () => [{ type: 'PROCESS_FIXER_EVIDENCE', npcId: npc.id, cooldownHours: 6, effectHours: 8 }]
      });
    }

    if (hasStoryFlag(state, 'fixer_smuggling_tie')) {
      const key = cooldownKey(npc.id, 'convoy');
      options.push({
        text: hasStoryFlag(state, 'community_pact')
          ? 'Smuggling Convoy: locked by your clean-water pact with Okon'
          : hasStoryFlag(state, 'inspector_deputized')
            ? 'Smuggling Convoy: closed while you are working with Krell'
          : addCooldownLabel(`Smuggling Convoy (+$500${effectLabel('marketInsight', 18)}, +Exposure)`, state, key),
        condition: (s: GameState) =>
          !hasStoryFlag(s, 'community_pact') &&
          !hasStoryFlag(s, 'inspector_deputized') &&
          !isCoolingDown(s, key),
        action: () => [{ type: 'RUN_SMUGGLING_CONVOY', cooldownHours: 18, effectHours: 18, moneyGain: 500, exposureDelta: 10, influenceDelta: 4 }]
      });
    }
  }

  if (npc.id === 'journalist' && state.dirtItems.length > 0) {
    const key = cooldownKey(npc.id, 'hotline-leak');
    options.push({
      text: hasStoryFlag(state, 'vox_embargo')
        ? 'Leak Dirt to Hotline: closed while Vox is under embargo'
        : addCooldownLabel(`Leak Dirt to Hotline (${state.dirtItems.length} items, +Influence, +Exposure${effectLabel('mediaHeat', 18)})`, state, key),
      condition: (s: GameState) => !hasStoryFlag(s, 'vox_embargo') && !isCoolingDown(s, key),
      action: () => [{ type: 'LEAK_DIRT_TO_HOTLINE', cooldownHours: 10, effectHours: 18 }]
    });
  }

  if ((npc.id === 'inspector' || npc.id === 'licensing') && state.dirtItems.length > 0) {
    const key = cooldownKey(npc.id, 'authority-report');
    options.push({
      text: npc.id === 'inspector' && hasStoryFlag(state, 'inspector_blacklist')
        ? 'Report a Violation: Krell will not touch your evidence anymore'
        : addCooldownLabel(`Report a Violation (major trust swing${effectLabel('bureauPull', 10)}${effectLabel('mediaHeat', 10)}, sets cooldown)`, state, key),
      condition: (s: GameState) => !(npc.id === 'inspector' && hasStoryFlag(s, 'inspector_blacklist')) && !isCoolingDown(s, key),
      action: () => [{ type: 'REPORT_FIRST_DIRT_TO_AUTHORITY', reporterNpcId: npc.id, cooldownHours: 12 }]
    });
  }

  if (npc.leverage >= 20) {
    const key = cooldownKey(npc.id, 'fast-track');
    options.push({
      text: addCooldownLabel('Use Leverage to Fast-Track Permit (-20 Leverage, instant approval)', state, key),
      condition: (s: GameState) => !isCoolingDown(s, key),
      action: () => [{ type: 'FAST_TRACK_PENDING_PERMITS', npcId: npc.id, leverageCost: 20, cooldownHours: 12 }]
    });
  }

  return options;
};
