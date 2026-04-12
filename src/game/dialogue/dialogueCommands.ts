import {
  DialogueCommand,
  DialogueFeedbackType,
  DirtItem,
  GameMeterState,
  GameState,
  NPC,
  StoryFlag,
  WorldEffectId,
} from '../../types';
import { queueFeedback } from '../actions/dialogueActions';
import { approvePendingPermits, approvePermit } from '../permitProgression';
import { addStoryFlags } from './storyFlags';
import { extendWorldEffect } from './worldEffects';
import {
  adjustMeters,
  adjustNpcLeverage,
  adjustNpcTrust,
  beginDialoguePermitMiniGame,
  patchNpc,
} from './dialogueState';

type DialogueTransitionOptions = {
  flags?: StoryFlag[];
  effect?: { id: WorldEffectId; hours: number };
  meterDelta?: Partial<Record<keyof GameMeterState['meters'], number>>;
  npcTrustDelta?: Record<string, number>;
  npcLeverageDelta?: Record<string, number>;
  npcPatches?: Record<string, Partial<NPC>>;
  moneyDelta?: number;
  evidenceDelta?: number;
  dirtItemsAppend?: DirtItem[];
  feedback?: Array<{ npcId: string; amount: number; feedbackType: DialogueFeedbackType }>;
  tutorialStep?: number;
};

export const buildDialogueTransitionCommands = (
  options: DialogueTransitionOptions,
): DialogueCommand[] => {
  const commands: DialogueCommand[] = [];

  if (options.flags && options.flags.length > 0) {
    commands.push({ type: 'ADD_STORY_FLAGS', flags: options.flags });
  }

  if (options.effect) {
    commands.push({ type: 'EXTEND_WORLD_EFFECT', effectId: options.effect.id, hours: options.effect.hours });
  }

  if (options.meterDelta && Object.keys(options.meterDelta).length > 0) {
    commands.push({ type: 'ADJUST_METERS', delta: options.meterDelta });
  }

  if (options.npcTrustDelta) {
    Object.entries(options.npcTrustDelta).forEach(([npcId, delta]) => {
      if (!delta) return;
      commands.push({ type: 'ADJUST_NPC_TRUST', npcId, delta });
    });
  }

  if (options.npcLeverageDelta) {
    Object.entries(options.npcLeverageDelta).forEach(([npcId, delta]) => {
      if (!delta) return;
      commands.push({ type: 'ADJUST_NPC_LEVERAGE', npcId, delta });
    });
  }

  if (options.npcPatches) {
    Object.entries(options.npcPatches).forEach(([npcId, patch]) => {
      commands.push({ type: 'PATCH_NPC', npcId, patch });
    });
  }

  if (options.moneyDelta) {
    commands.push({ type: 'ADD_MONEY', amount: options.moneyDelta });
  }

  if (options.evidenceDelta) {
    commands.push({ type: 'ADD_EVIDENCE', amount: options.evidenceDelta });
  }

  if (options.dirtItemsAppend && options.dirtItemsAppend.length > 0) {
    commands.push({ type: 'ADD_DIRT_ITEMS', items: options.dirtItemsAppend });
  }

  if (typeof options.tutorialStep === 'number') {
    commands.push({ type: 'SET_TUTORIAL_STEP', step: options.tutorialStep });
  }

  if (options.feedback) {
    options.feedback.forEach(({ npcId, amount, feedbackType }) => {
      commands.push({ type: 'QUEUE_FEEDBACK', npcId, amount, feedbackType });
    });
  }

  return commands;
};

const dialogueCooldownKey = (npcId: string, actionId: string) => `${npcId}:${actionId}`;
const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

export const applyDialogueCommands = (
  state: GameState,
  commands: DialogueCommand[],
  feedbackQueue: Parameters<typeof queueFeedback>[0],
): GameState => {
  return commands.reduce((nextState, command) => {
    switch (command.type) {
      case 'ADD_STORY_FLAGS':
        return {
          ...nextState,
          storyFlags: addStoryFlags(nextState, ...command.flags),
        };
      case 'EXTEND_WORLD_EFFECT':
        return {
          ...nextState,
          worldEffects: extendWorldEffect(nextState, command.effectId, command.hours),
        };
      case 'ADJUST_NPC_TRUST':
        return {
          ...nextState,
          npcs: adjustNpcTrust(nextState, command.npcId, command.delta),
        };
      case 'ADJUST_NPC_LEVERAGE':
        return {
          ...nextState,
          npcs: adjustNpcLeverage(nextState, command.npcId, command.delta),
        };
      case 'PATCH_NPC':
        return {
          ...nextState,
          npcs: patchNpc(nextState, command.npcId, command.patch),
        };
      case 'ADJUST_METERS':
        return {
          ...nextState,
          meters: adjustMeters(nextState, Object.entries(command.delta).reduce((acc, [key, delta]) => {
            if (typeof delta !== 'number' || delta === 0) return acc;
            const meterKey = key as keyof GameMeterState['meters'];
            acc[meterKey] = Math.max(0, Math.min(100, nextState.meters[meterKey] + delta));
            return acc;
          }, {} as Partial<GameMeterState['meters']>)),
        };
      case 'ADD_MONEY':
        return {
          ...nextState,
          money: Math.max(0, nextState.money + command.amount),
        };
      case 'ADD_EVIDENCE':
        return {
          ...nextState,
          evidence: Math.max(0, nextState.evidence + command.amount),
        };
      case 'SET_TUTORIAL_STEP':
        return {
          ...nextState,
          tutorialStep: command.step,
        };
      case 'SET_PERMIT_STATUS': {
        const permit = nextState.permits[command.permitId];
        if (!permit) return nextState;
        return {
          ...nextState,
          permits: {
            ...nextState.permits,
            [command.permitId]: {
              ...permit,
              status: command.status,
              rejectionReason: command.rejectionReason,
              accuracy: command.accuracy,
            },
          },
        };
      }
      case 'START_DIALOGUE_PERMIT_MINIGAME':
        return {
          ...nextState,
          ...beginDialoguePermitMiniGame(nextState, command.permitId, command.cost),
        };
      case 'APPROVE_PERMIT': {
        const approval = approvePermit(command.permitId, nextState.permits, nextState.mines);
        return {
          ...nextState,
          permits: approval.permits,
          mines: approval.mines,
        };
      }
      case 'APPROVE_PENDING_PERMITS': {
        const approval = approvePendingPermits(nextState.permits, nextState.mines);
        return {
          ...nextState,
          permits: approval.permits,
          mines: approval.mines,
        };
      }
      case 'SET_DIALOGUE_COOLDOWN':
        return {
          ...nextState,
          dialogueCooldowns: {
            ...nextState.dialogueCooldowns,
            [command.key]: (nextState.day * 24) + nextState.time + command.hours,
          },
        };
      case 'QUEUE_FEEDBACK':
        queueFeedback(feedbackQueue, command.npcId, command.amount, command.feedbackType);
        return nextState;
      case 'ADD_UPGRADE':
        return nextState.upgrades.includes(command.upgradeId)
          ? nextState
          : {
              ...nextState,
              upgrades: [...nextState.upgrades, command.upgradeId],
            };
      case 'SET_MOVEMENT_SPEED':
        return {
          ...nextState,
          movementSpeed: command.speed,
        };
      case 'ADD_DIRT_ITEMS':
        return {
          ...nextState,
          dirtItems: [...nextState.dirtItems, ...command.items],
        };
      case 'CLEAR_DIRT_ITEMS':
        return {
          ...nextState,
          dirtItems: [],
        };
      case 'REMOVE_FIRST_DIRT_ITEM':
        return {
          ...nextState,
          dirtItems: nextState.dirtItems.slice(1),
        };
      case 'APPLY_NPC_VULNERABILITY': {
        queueFeedback(feedbackQueue, command.npcId, command.trustDelta, 'TRUST');
        queueFeedback(feedbackQueue, command.npcId, command.leverageGain, 'LEVERAGE');
        let updatedState: GameState = {
          ...nextState,
          npcs: adjustNpcTrust(nextState, command.npcId, command.trustDelta),
          dialogueCooldowns: {
            ...nextState.dialogueCooldowns,
            [dialogueCooldownKey(command.npcId, 'vulnerability-play')]: (nextState.day * 24) + nextState.time + command.cooldownHours,
          },
        };
        if (command.effectId && command.effectHours) {
          updatedState = {
            ...updatedState,
            worldEffects: extendWorldEffect(updatedState, command.effectId, command.effectHours),
          };
        }
        return updatedState;
      }
      case 'BRIBE_NPC':
        queueFeedback(feedbackQueue, command.npcId, command.trustDelta, 'TRUST');
        return {
          ...nextState,
          money: Math.max(0, nextState.money - command.cost),
          npcs: adjustNpcTrust(nextState, command.npcId, command.trustDelta),
          meters: adjustMeters(nextState, {
            exposure: clampPercent(nextState.meters.exposure + command.exposureDelta),
          }),
          dialogueCooldowns: {
            ...nextState.dialogueCooldowns,
            [dialogueCooldownKey(command.npcId, 'bribe')]: (nextState.day * 24) + nextState.time + command.cooldownHours,
          },
        };
      case 'NEGOTIATE_PENDING_PERMITS': {
        const freshNpc = nextState.npcs[command.npcId];
        if (!freshNpc) return nextState;
        const roll = Math.random() * 100;
        const baseState = {
          ...nextState,
          dialogueCooldowns: {
            ...nextState.dialogueCooldowns,
            [dialogueCooldownKey(command.npcId, 'permit-negotiation')]: (nextState.day * 24) + nextState.time + command.cooldownHours,
          },
        };
        if (roll < command.successThreshold) {
          queueFeedback(feedbackQueue, command.npcId, command.successTrustDelta, 'TRUST');
          const approval = approvePendingPermits(baseState.permits, baseState.mines);
          return {
            ...baseState,
            permits: approval.permits,
            mines: approval.mines,
            worldEffects: extendWorldEffect(baseState, 'bureauPull', 10),
          };
        }
        queueFeedback(feedbackQueue, command.npcId, -command.failureTrustDelta, 'TRUST');
        return {
          ...baseState,
          npcs: adjustNpcTrust(baseState, command.npcId, -command.failureTrustDelta),
          meters: adjustMeters(baseState, {
            exposure: clampPercent(baseState.meters.exposure + command.failureExposureDelta),
          }),
        };
      }
      case 'USE_BACKCHANNEL_APPROVAL': {
        const pendingPermit = Object.values(nextState.permits).find((permit) => permit.status === 'PENDING');
        if (!pendingPermit) return nextState;
        const approval = approvePermit(pendingPermit.id, nextState.permits, nextState.mines);
        return {
          ...nextState,
          permits: approval.permits,
          mines: approval.mines,
          meters: adjustMeters(nextState, {
            exposure: clampPercent(nextState.meters.exposure + command.exposureDelta),
          }),
          dialogueCooldowns: {
            ...nextState.dialogueCooldowns,
            [dialogueCooldownKey(command.npcId, 'backchannel')]: (nextState.day * 24) + nextState.time + command.cooldownHours,
          },
        };
      }
      case 'BUY_MOVEMENT_UPGRADE':
        queueFeedback(feedbackQueue, command.npcId, command.trustDelta, 'TRUST');
        return {
          ...nextState,
          money: Math.max(0, nextState.money - command.cost),
          movementSpeed: command.speed,
          upgrades: nextState.upgrades.includes(command.upgradeId)
            ? nextState.upgrades
            : [...nextState.upgrades, command.upgradeId],
          npcs: adjustNpcTrust(nextState, command.npcId, command.trustDelta),
        };
      case 'PROCESS_FIXER_EVIDENCE': {
        const dirtTypes: DirtItem['type'][] = ['PERMIT_VIOLATION', 'BACKROOM_DEAL', 'PERSONAL_SECRET'];
        const targetIds = Object.keys(nextState.npcs).filter((id) => id !== 'fixer' && id !== 'journalist');
        if (targetIds.length === 0) {
          return {
            ...nextState,
            evidence: 0,
          };
        }
        const newDirt: DirtItem[] = Array.from({ length: nextState.evidence }).map((_, index) => {
          const type = dirtTypes[Math.floor(Math.random() * dirtTypes.length)];
          const targetNpcId = targetIds[Math.floor(Math.random() * targetIds.length)];
          const targetName = nextState.npcs[targetNpcId].name;
          if (type === 'PERMIT_VIOLATION') {
            return {
              id: `dirt-${Date.now()}-${index}`,
              type,
              description: `Evidence of ${targetName} bypassing Form 12-C.`,
              targetNpcId,
              value: 15,
            };
          }
          if (type === 'BACKROOM_DEAL') {
            return {
              id: `dirt-${Date.now()}-${index}`,
              type,
              description: `Recorded conversation of ${targetName} taking a bribe.`,
              targetNpcId,
              value: 25,
            };
          }
          return {
            id: `dirt-${Date.now()}-${index}`,
            type,
            description: `Photos of ${targetName} at an unauthorized 'Joy Seminar'.`,
            targetNpcId,
            value: 30,
          };
        });
        return {
          ...nextState,
          evidence: 0,
          dirtItems: [...nextState.dirtItems, ...newDirt],
          worldEffects: extendWorldEffect(nextState, 'marketInsight', command.effectHours),
          dialogueCooldowns: {
            ...nextState.dialogueCooldowns,
            [dialogueCooldownKey(command.npcId, 'evidence-processing')]: (nextState.day * 24) + nextState.time + command.cooldownHours,
          },
        };
      }
      case 'RUN_SMUGGLING_CONVOY':
        return {
          ...nextState,
          money: nextState.money + command.moneyGain,
          worldEffects: extendWorldEffect(nextState, 'marketInsight', command.effectHours),
          meters: adjustMeters(nextState, {
            exposure: clampPercent(nextState.meters.exposure + command.exposureDelta),
            influence: clampPercent(nextState.meters.influence + command.influenceDelta),
          }),
          dialogueCooldowns: {
            ...nextState.dialogueCooldowns,
            [dialogueCooldownKey('fixer', 'convoy')]: (nextState.day * 24) + nextState.time + command.cooldownHours,
          },
        };
      case 'LEAK_DIRT_TO_HOTLINE': {
        let exposureGain = 0;
        let influenceGain = 0;
        let trustLoss = 0;
        let updatedState = nextState;
        nextState.dirtItems.forEach((dirt) => {
          exposureGain += Math.ceil(8 * 1.3);
          if (dirt.type === 'PERMIT_VIOLATION') trustLoss += 5;
          else if (dirt.type === 'BACKROOM_DEAL') influenceGain += 10;
          else influenceGain += 5;
          queueFeedback(feedbackQueue, dirt.targetNpcId, dirt.value, 'LEVERAGE');
          queueFeedback(feedbackQueue, dirt.targetNpcId, -15, 'TRUST');
          updatedState = {
            ...updatedState,
            npcs: adjustNpcLeverage(updatedState, dirt.targetNpcId, dirt.value),
          };
          updatedState = {
            ...updatedState,
            npcs: adjustNpcTrust(updatedState, dirt.targetNpcId, -15),
          };
        });
        updatedState = {
          ...updatedState,
          dirtItems: [],
          storyFlags: addStoryFlags(updatedState, 'public_scandal'),
          worldEffects: extendWorldEffect(updatedState, 'mediaHeat', command.effectHours),
          meters: adjustMeters(updatedState, {
            exposure: clampPercent(updatedState.meters.exposure + exposureGain),
            trust: clampPercent(updatedState.meters.trust - trustLoss),
            influence: clampPercent(updatedState.meters.influence + influenceGain),
          }),
          dialogueCooldowns: {
            ...updatedState.dialogueCooldowns,
            [dialogueCooldownKey('journalist', 'hotline-leak')]: (updatedState.day * 24) + updatedState.time + command.cooldownHours,
          },
        };
        return updatedState;
      }
      case 'REPORT_FIRST_DIRT_TO_AUTHORITY': {
        const item = nextState.dirtItems[0];
        const reporter = nextState.npcs[command.reporterNpcId];
        if (!item || !reporter) return nextState;
        let updatedState: GameState = {
          ...nextState,
          dirtItems: nextState.dirtItems.slice(1),
          worldEffects: extendWorldEffect(nextState, 'mediaHeat', 10),
          dialogueCooldowns: {
            ...nextState.dialogueCooldowns,
            [dialogueCooldownKey(command.reporterNpcId, 'authority-report')]: (nextState.day * 24) + nextState.time + command.cooldownHours,
          },
        };
        updatedState = {
          ...updatedState,
          worldEffects: extendWorldEffect(updatedState, 'bureauPull', 10),
        };
        if (item.targetNpcId === command.reporterNpcId) {
          queueFeedback(feedbackQueue, command.reporterNpcId, -reporter.trustLevel, 'TRUST');
          queueFeedback(feedbackQueue, command.reporterNpcId, -reporter.leverage, 'LEVERAGE');
          return {
            ...updatedState,
            storyFlags: addStoryFlags(updatedState, 'vane_exposed', 'public_scandal'),
            money: Math.max(0, updatedState.money - 500),
            meters: adjustMeters(updatedState, {
              trust: clampPercent(updatedState.meters.trust - 20),
              exposure: clampPercent(updatedState.meters.exposure + 10),
            }),
            npcs: patchNpc(updatedState, command.reporterNpcId, { trustLevel: 0, leverage: 0 }),
          };
        }
        queueFeedback(feedbackQueue, command.reporterNpcId, 15, 'TRUST');
        queueFeedback(feedbackQueue, item.targetNpcId, -30, 'TRUST');
        let finalState = updatedState;
        if (command.reporterNpcId === 'licensing') {
          finalState = {
            ...finalState,
            storyFlags: addStoryFlags(finalState, 'vane_exposed', 'public_scandal'),
          };
        }
        finalState = {
          ...finalState,
          meters: adjustMeters(finalState, {
            trust: clampPercent(finalState.meters.trust + 10),
            influence: clampPercent(finalState.meters.influence + 5),
          }),
        };
        finalState = {
          ...finalState,
          npcs: adjustNpcTrust(finalState, command.reporterNpcId, 15),
        };
        return {
          ...finalState,
          npcs: adjustNpcTrust(finalState, item.targetNpcId, -30),
        };
      }
      case 'FAST_TRACK_PENDING_PERMITS': {
        queueFeedback(feedbackQueue, command.npcId, -command.leverageCost, 'LEVERAGE');
        const approved = approvePendingPermits(nextState.permits, nextState.mines);
        return {
          ...nextState,
          permits: approved.permits,
          mines: approved.mines,
          npcs: adjustNpcLeverage(nextState, command.npcId, -command.leverageCost),
          dialogueCooldowns: {
            ...nextState.dialogueCooldowns,
            [dialogueCooldownKey(command.npcId, 'fast-track')]: (nextState.day * 24) + nextState.time + command.cooldownHours,
          },
        };
      }
      default:
        return nextState;
    }
  }, state);
};
