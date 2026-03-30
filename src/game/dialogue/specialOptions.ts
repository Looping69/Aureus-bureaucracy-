import { DirtItem, DirtType, GameState, NPC } from '../../types';
import { extendWorldEffect, WORLD_EFFECTS } from './worldEffects';
import { addStoryFlag, addStoryFlags, hasStoryFlag } from './storyFlags';

type TriggerFeedback = (npcId: string, amount: number, type: 'TRUST' | 'LEVERAGE') => void;

export type SpecialDialogueOption = {
  text: string;
  action: (s: GameState) => Partial<GameState>;
  condition?: (s: GameState) => boolean;
  trustRequired?: number;
  leverageRequired?: number;
};

interface BuildSpecialDialogueOptionsArgs {
  npc: NPC;
  state: GameState;
  moodInfluence: number;
  triggerFeedback: TriggerFeedback;
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

const withCooldown = (s: GameState, key: string, hours: number): Record<string, number> => ({
  ...s.dialogueCooldowns,
  [key]: currentHour(s) + hours
});

const addCooldownLabel = (base: string, s: GameState, key: string) => {
  const remaining = cooldownRemaining(s, key);
  if (remaining <= 0) return base;
  return `${base} [Cooldown ${remaining}h]`;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));
const effectLabel = (effectId: keyof typeof WORLD_EFFECTS, hours: number) =>
  `, +${WORLD_EFFECTS[effectId].label} ${hours}h`;

export const buildSpecialDialogueOptions = ({
  npc,
  state,
  moodInfluence,
  triggerFeedback
}: BuildSpecialDialogueOptionsArgs): SpecialDialogueOption[] => {
  const profile = SOCIAL_PROFILES[npc.id] ?? DEFAULT_PROFILE;
  const applyMood = (val: number) => Math.round(val * (1 + moodInfluence));

  const options: SpecialDialogueOption[] = [
    {
      text: `Small Talk: Compliment their work (+Trust / minor risk)`,
      action: (s: GameState) => {
        const freshNpc = s.npcs[npc.id];
        const success = Math.random() > 0.3;
        const baseGain = success ? 5 : -2;
        const gain = applyMood(Math.round(baseGain * profile.trustVolatility));
        triggerFeedback(npc.id, gain, 'TRUST');
        return {
          npcs: {
            ...s.npcs,
            [npc.id]: { ...freshNpc, trustLevel: clampPercent(freshNpc.trustLevel + gain) }
          }
        };
      }
    }
  ];

  if (npc.vulnerability && npc.vulnerability.discovered) {
    const key = cooldownKey(npc.id, 'vulnerability-play');
    options.push({
      text: addCooldownLabel(`Target Vulnerability: ${npc.vulnerability.description} (+Trust, +Leverage${npc.id === 'licensing' || npc.id === 'inspector' ? effectLabel('bureauPull', 10) : npc.id === 'chief' || npc.id === 'union' ? effectLabel('communityBacking', 12) : npc.id === 'fixer' ? effectLabel('marketInsight', 12) : ''})`, state, key),
      condition: (s: GameState) => npc.trustLevel >= 20 && !isCoolingDown(s, key),
      action: (s: GameState) => {
        const freshNpc = s.npcs[npc.id];
        const gain = applyMood(Math.round(25 * profile.trustVolatility));
        const worldEffects =
          npc.id === 'licensing' || npc.id === 'inspector'
            ? extendWorldEffect(s, 'bureauPull', 10)
            : npc.id === 'chief' || npc.id === 'union'
              ? extendWorldEffect(s, 'communityBacking', 12)
              : npc.id === 'fixer'
                ? extendWorldEffect(s, 'marketInsight', 12)
                : s.worldEffects;
        triggerFeedback(npc.id, gain, 'TRUST');
        triggerFeedback(npc.id, 10, 'LEVERAGE');
        return {
          dialogueCooldowns: withCooldown(s, key, 8),
          worldEffects,
          npcs: {
            ...s.npcs,
            [npc.id]: { ...freshNpc, trustLevel: clampPercent(freshNpc.trustLevel + gain) }
          }
        };
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
        const freshNpc = s.npcs[npc.id];
        const gain = applyMood(Math.round(14 * profile.trustVolatility));
        triggerFeedback(npc.id, gain, 'TRUST');
        return {
          money: s.money - bribeCost,
          dialogueCooldowns: withCooldown(s, key, 6),
          meters: {
            ...s.meters,
            exposure: Math.min(100, s.meters.exposure + Math.ceil(2 * profile.exposureSensitivity))
          },
          npcs: {
            ...s.npcs,
            [npc.id]: { ...freshNpc, trustLevel: clampPercent(freshNpc.trustLevel + gain) }
          }
        };
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
        const roll = Math.random() * 100;

        if (roll < successRate) {
          triggerFeedback(npc.id, 10, 'TRUST');
          return {
            dialogueCooldowns: withCooldown(s, key, 8),
            worldEffects: extendWorldEffect(s, 'bureauPull', 10),
            permits: Object.fromEntries(
              Object.entries(s.permits).map(([id, p]) =>
                p.status === 'PENDING' ? [id, { ...p, status: 'APPROVED' as const }] : [id, p]
              )
            )
          };
        }

        const trustPenalty = Math.round(8 * profile.trustVolatility);
        triggerFeedback(npc.id, -trustPenalty, 'TRUST');
        return {
          dialogueCooldowns: withCooldown(s, key, 8),
          meters: {
            ...s.meters,
            exposure: Math.min(100, s.meters.exposure + Math.ceil(3 * profile.exposureSensitivity))
          },
          npcs: {
            ...s.npcs,
            [npc.id]: { ...freshNpc, trustLevel: Math.max(0, freshNpc.trustLevel - trustPenalty) }
          }
        };
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
        if (!pendingPermit) return {};
        return {
          dialogueCooldowns: withCooldown(s, key, 14),
          permits: {
            ...s.permits,
            [pendingPermit.id]: { ...pendingPermit, status: 'APPROVED' as const }
          },
          meters: {
            ...s.meters,
            exposure: Math.min(100, s.meters.exposure + 8)
          }
        };
      }
    });
  }

  if (npc.id === 'fixer') {
    options.push({
      text: 'Buy Movement Upgrade: Sturdy Boots (-$200, +Speed)',
      condition: (s: GameState) => s.money >= 200 && !s.upgrades.includes('boots'),
      action: (s: GameState) => {
        const freshNpc = s.npcs[npc.id];
        triggerFeedback(npc.id, 5, 'TRUST');
        return {
          money: s.money - 200,
          movementSpeed: 2,
          upgrades: [...s.upgrades, 'boots'],
          npcs: {
            ...s.npcs,
            [npc.id]: { ...freshNpc, trustLevel: clampPercent(freshNpc.trustLevel + 5) }
          }
        };
      }
    });
    options.push({
      text: 'Buy Movement Upgrade: Used Scooter (-$1000, ++Speed)',
      condition: (s: GameState) => s.money >= 1000 && s.upgrades.includes('boots') && !s.upgrades.includes('scooter'),
      action: (s: GameState) => {
        const freshNpc = s.npcs[npc.id];
        triggerFeedback(npc.id, 10, 'TRUST');
        return {
          money: s.money - 1000,
          movementSpeed: 4,
          upgrades: [...s.upgrades, 'scooter'],
          npcs: {
            ...s.npcs,
            [npc.id]: { ...freshNpc, trustLevel: clampPercent(freshNpc.trustLevel + 10) }
          }
        };
      }
    });
    options.push({
      text: 'Buy Movement Upgrade: Rusty Truck (-$5000, +++Speed)',
      condition: (s: GameState) => s.money >= 5000 && s.upgrades.includes('scooter') && !s.upgrades.includes('truck'),
      action: (s: GameState) => {
        const freshNpc = s.npcs[npc.id];
        triggerFeedback(npc.id, 20, 'TRUST');
        return {
          money: s.money - 5000,
          movementSpeed: 8,
          upgrades: [...s.upgrades, 'truck'],
          npcs: {
            ...s.npcs,
            [npc.id]: { ...freshNpc, trustLevel: clampPercent(freshNpc.trustLevel + 20) }
          }
        };
      }
    });

    if (state.evidence > 0) {
      const key = cooldownKey(npc.id, 'evidence-processing');
      options.push({
        text: addCooldownLabel(`Process Evidence into Dirt (${state.evidence} items${effectLabel('marketInsight', 8)}, sets cooldown)`, state, key),
        condition: (s: GameState) => !isCoolingDown(s, key),
        action: (s: GameState) => {
          const dirtTypes: DirtType[] = ['PERMIT_VIOLATION', 'BACKROOM_DEAL', 'PERSONAL_SECRET'];
          const targetIds = Object.keys(s.npcs).filter(id => id !== 'fixer' && id !== 'journalist');

          if (targetIds.length === 0) return { evidence: 0 };

          const newDirt: DirtItem[] = Array.from({ length: s.evidence }).map((_, i) => {
            const type = dirtTypes[Math.floor(Math.random() * dirtTypes.length)];
            const targetNpcId = targetIds[Math.floor(Math.random() * targetIds.length)];
            const targetName = s.npcs[targetNpcId].name;

            let description = '';
            let value = 20;

            if (type === 'PERMIT_VIOLATION') {
              description = `Evidence of ${targetName} bypassing Form 12-C.`;
              value = 15;
            } else if (type === 'BACKROOM_DEAL') {
              description = `Recorded conversation of ${targetName} taking a bribe.`;
              value = 25;
            } else {
              description = `Photos of ${targetName} at an unauthorized 'Joy Seminar'.`;
              value = 30;
            }

            return {
              id: `dirt-${Date.now()}-${i}`,
              type,
              description,
              targetNpcId,
              value
            };
          });
          return {
            evidence: 0,
            dialogueCooldowns: withCooldown(s, key, 6),
            worldEffects: extendWorldEffect(s, 'marketInsight', 8),
            dirtItems: [...s.dirtItems, ...newDirt]
          };
        }
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
        action: (s: GameState) => ({
          dialogueCooldowns: withCooldown(s, key, 18),
          worldEffects: extendWorldEffect(s, 'marketInsight', 18),
          money: s.money + 500,
          meters: {
            ...s.meters,
            exposure: Math.min(100, s.meters.exposure + 10),
            influence: Math.min(100, s.meters.influence + 4)
          }
        })
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
      action: (s: GameState) => {
        let exposureGain = 0;
        let influenceGain = 0;
        let trustLoss = 0;
        const npcUpdates: Record<string, NPC> = {};

        s.dirtItems.forEach(d => {
          exposureGain += Math.ceil(8 * profile.exposureSensitivity);
          if (d.type === 'PERMIT_VIOLATION') {
            trustLoss += 5;
          } else if (d.type === 'BACKROOM_DEAL') {
            influenceGain += 10;
          } else {
            influenceGain += 5;
          }

          const target = s.npcs[d.targetNpcId];
          triggerFeedback(d.targetNpcId, d.value, 'LEVERAGE');
          triggerFeedback(d.targetNpcId, -15, 'TRUST');
          npcUpdates[d.targetNpcId] = {
            ...target,
            leverage: target.leverage + d.value,
            trustLevel: Math.max(0, target.trustLevel - 15)
          };
        });

        return {
          dirtItems: [],
          dialogueCooldowns: withCooldown(s, key, 10),
          worldEffects: extendWorldEffect(s, 'mediaHeat', 18),
          storyFlags: addStoryFlag(s, 'public_scandal'),
          meters: {
            ...s.meters,
            exposure: Math.min(100, s.meters.exposure + exposureGain),
            trust: Math.max(0, s.meters.trust - trustLoss),
            influence: Math.min(100, s.meters.influence + influenceGain)
          },
          npcs: { ...s.npcs, ...npcUpdates }
        };
      }
    });
  }

  if ((npc.id === 'inspector' || npc.id === 'licensing') && state.dirtItems.length > 0) {
    const key = cooldownKey(npc.id, 'authority-report');
    options.push({
      text: npc.id === 'inspector' && hasStoryFlag(state, 'inspector_blacklist')
        ? 'Report a Violation: Krell will not touch your evidence anymore'
        : addCooldownLabel(`Report a Violation (major trust swing${effectLabel('bureauPull', 10)}${effectLabel('mediaHeat', 10)}, sets cooldown)`, state, key),
      condition: (s: GameState) => !(npc.id === 'inspector' && hasStoryFlag(s, 'inspector_blacklist')) && !isCoolingDown(s, key),
      action: (s: GameState) => {
        const item = s.dirtItems[0];
        const remainingDirt = s.dirtItems.slice(1);
        const freshNpc = s.npcs[npc.id];

        if (item.targetNpcId === npc.id) {
          triggerFeedback(npc.id, -freshNpc.trustLevel, 'TRUST');
          triggerFeedback(npc.id, -freshNpc.leverage, 'LEVERAGE');
          return {
            dirtItems: remainingDirt,
            dialogueCooldowns: withCooldown(s, key, 12),
            storyFlags: addStoryFlags(s, 'vane_exposed', 'public_scandal'),
            worldEffects: extendWorldEffect(
              { ...s, worldEffects: extendWorldEffect(s, 'bureauPull', 10) } as GameState,
              'mediaHeat',
              10
            ),
            money: Math.max(0, s.money - 500),
            meters: {
              ...s.meters,
              trust: Math.max(0, s.meters.trust - 20),
              exposure: Math.min(100, s.meters.exposure + 10)
            },
            npcs: {
              ...s.npcs,
              [npc.id]: { ...freshNpc, trustLevel: 0, leverage: 0 }
            }
          };
        }

        const target = s.npcs[item.targetNpcId];
        triggerFeedback(npc.id, 15, 'TRUST');
        triggerFeedback(item.targetNpcId, -30, 'TRUST');
        return {
          dirtItems: remainingDirt,
          dialogueCooldowns: withCooldown(s, key, 12),
          storyFlags: npc.id === 'licensing' ? addStoryFlags(s, 'vane_exposed', 'public_scandal') : s.storyFlags,
          worldEffects: extendWorldEffect(
            { ...s, worldEffects: extendWorldEffect(s, 'bureauPull', 10) } as GameState,
            'mediaHeat',
            10
          ),
          meters: {
            ...s.meters,
            trust: Math.min(100, s.meters.trust + 10),
            influence: Math.min(100, s.meters.influence + 5)
          },
          npcs: {
            ...s.npcs,
            [npc.id]: { ...freshNpc, trustLevel: Math.min(100, freshNpc.trustLevel + 15) },
            [item.targetNpcId]: { ...target, trustLevel: Math.max(0, target.trustLevel - 30) }
          }
        };
      }
    });
  }

  if (npc.leverage >= 20) {
    const key = cooldownKey(npc.id, 'fast-track');
    options.push({
      text: addCooldownLabel('Use Leverage to Fast-Track Permit (-20 Leverage, instant approval)', state, key),
      condition: (s: GameState) => !isCoolingDown(s, key),
      action: (s: GameState) => {
        const freshNpc = s.npcs[npc.id];
        triggerFeedback(npc.id, -20, 'LEVERAGE');
        return {
          dialogueCooldowns: withCooldown(s, key, 12),
          npcs: { ...s.npcs, [npc.id]: { ...freshNpc, leverage: Math.max(0, freshNpc.leverage - 20) } },
          permits: Object.fromEntries(
            Object.entries(s.permits).map(([id, p]) =>
              p.status === 'PENDING' ? [id, { ...p, status: 'APPROVED' as const }] : [id, p]
            )
          )
        };
      }
    });
  }

  return options;
};
