import { applyOreExport } from '../game/economy';
import { applyDailyEconomyTick } from '../game/economy';
import {
  advanceMovementTick,
  createInitialMovementTickRuntime,
  MovementTickRuntimeState,
} from '../game/ticks/movementTick';
import { advanceBuildingDiscoveryTick } from '../game/ticks/buildingDiscoveryTick';
import { advancePermitProcessingTick } from '../game/ticks/permitTick';
import { advanceCityEventTick } from '../game/ticks/cityEventTick';
import {
  buildGameStateFromRoomSnapshot,
  buildRoomPlayerState,
  buildRoomSharedState,
} from './adapters';
import { applyDirectWorldMove, applyPlannedWorldMove } from '../game/navigationActions';
import { findPath } from '../utils/pathfinding';
import { buildWorldSurfaceMap } from '../utils/worldSurface';
import { applyOperationAction } from '../game/runCycle';
import { applyMineSceneAction, applyMineTileInteraction } from '../game/actions/mineActions';
import { applyMiniGameCompletion, applyPermitOverlayAction } from '../game/actions/permitActions';
import { applyDialogueSocialConsequences } from '../game/actions/dialogueActions';
import { applyDialogueCommands } from '../game/dialogue/dialogueCommands';
import { buildSpecialDialogueOptions } from '../game/dialogue/specialOptions';
import { getNpcMoodInfluence, isNpcAvailableAtTime } from '../game/dialogue/status';
import { applyMineTravel, applyRestAction } from '../game/navigationActions';
import { ClientUiState, MultiplayerCommand, PlayerId, RoomSnapshot, RoomState, RoomTransientEffects } from './types';
import { GameTickNotification } from '../game/ticks/types';
import { DialogueCommand, DialogueOption, GameState, RelationshipFeedback } from '../types';
import { DIALOGUE_TREES } from '../data';

const EMPTY_UI_STATE: ClientUiState = {
  currentScene: 'WORLD',
  activeNPCId: null,
  activePermitId: null,
  activeBuildingId: null,
  activeEndingId: null,
  tutorialMinimized: false,
};

const buildServerSnapshot = (room: RoomState, playerId: PlayerId): RoomSnapshot => ({
  room,
  playerId,
  ui: EMPTY_UI_STATE,
});

const mergePlayerStateIntoRoom = (
  room: RoomState,
  playerId: PlayerId,
  snapshot: RoomSnapshot,
): RoomState => {
  const previousPlayer = room.players[playerId];
  const nextPlayer = buildRoomPlayerState(
    buildGameStateFromRoomSnapshot(snapshot),
    playerId,
    previousPlayer?.displayName ?? `Player ${playerId}`,
    previousPlayer?.connectedAt,
  );

  return {
    ...room,
    shared: buildRoomSharedState(buildGameStateFromRoomSnapshot(snapshot)),
    players: {
      ...room.players,
      [playerId]: {
        ...previousPlayer,
        ...nextPlayer,
        connected: previousPlayer?.connected ?? true,
        displayName: previousPlayer?.displayName ?? nextPlayer.displayName,
        connectedAt: previousPlayer?.connectedAt ?? nextPlayer.connectedAt,
        lastInputAt: previousPlayer?.lastInputAt ?? nextPlayer.lastInputAt,
      },
    },
  };
};

const withUpdatedGameState = (
  room: RoomState,
  playerId: PlayerId,
  apply: (state: ReturnType<typeof buildGameStateFromRoomSnapshot>) => ReturnType<typeof buildGameStateFromRoomSnapshot>,
): RoomState => {
  const snapshot = buildServerSnapshot(room, playerId);
  const currentState = buildGameStateFromRoomSnapshot(snapshot);
  const nextState = apply(currentState);
  return mergePlayerStateIntoRoom(room, playerId, {
    ...snapshot,
    room: {
      ...room,
      shared: buildRoomSharedState(nextState),
      players: {
        ...room.players,
        [playerId]: buildRoomPlayerState(
          nextState,
          playerId,
          room.players[playerId]?.displayName,
          room.players[playerId]?.connectedAt,
        ),
      },
    },
  });
};

export interface RoomCommandResult {
  room: RoomState;
  notifications: GameTickNotification[];
  effects?: RoomTransientEffects;
}

const interactionLockKey = (resourceType: 'npc' | 'permit', resourceId: string) =>
  `${resourceType}:${resourceId}`;

const releasePlayerInteractionLocks = (
  room: RoomState,
  playerId: PlayerId,
): RoomState => {
  const player = room.players[playerId];
  if (!player) return room;

  const interactionLocks = Object.fromEntries(
    Object.entries(room.interactionLocks).filter(([, lock]) => lock.ownerPlayerId !== playerId),
  );

  return {
    ...room,
    interactionLocks,
    players: {
      ...room.players,
      [playerId]: {
        ...player,
        activeNpcInteractionId: null,
        activePermitInteractionId: null,
      },
    },
  };
};

const claimInteractionLock = (
  room: RoomState,
  playerId: PlayerId,
  resourceType: 'npc' | 'permit',
  resourceId: string,
): RoomCommandResult => {
  const player = room.players[playerId];
  if (!player) {
    return { room, notifications: [] };
  }

  if (resourceType === 'npc' && !room.shared.npcs[resourceId]) {
    return {
      room,
      notifications: [{
        title: 'Unavailable',
        msg: 'That conversation target no longer exists.',
      }],
    };
  }

  if (resourceType === 'permit' && !room.shared.permits[resourceId]) {
    return {
      room,
      notifications: [{
        title: 'Unavailable',
        msg: 'That filing is no longer available.',
      }],
    };
  }

  const key = interactionLockKey(resourceType, resourceId);
  const currentLock = room.interactionLocks[key];
  if (currentLock && currentLock.ownerPlayerId !== playerId) {
    return {
      room,
      notifications: [{
        title: 'Desk Occupied',
        msg:
          resourceType === 'npc'
            ? `${currentLock.ownerDisplayName} is already working that conversation.`
            : `${currentLock.ownerDisplayName} is already working that filing.`,
      }],
    };
  }

  const clearedRoom = releasePlayerInteractionLocks(room, playerId);
  const nextPlayer = clearedRoom.players[playerId];
  const acquiredAt = new Date().toISOString();

  return {
    room: {
      ...clearedRoom,
      interactionLocks: {
        ...clearedRoom.interactionLocks,
        [key]: {
          resourceType,
          resourceId,
          ownerPlayerId: playerId,
          ownerDisplayName: nextPlayer.displayName,
          acquiredAt,
        },
      },
      players: {
        ...clearedRoom.players,
        [playerId]: {
          ...nextPlayer,
          activeNpcInteractionId: resourceType === 'npc' ? resourceId : null,
          activePermitInteractionId: resourceType === 'permit' ? resourceId : null,
        },
      },
    },
    notifications: [],
  };
};

const releaseInteractionLock = (
  room: RoomState,
  playerId: PlayerId,
  resourceType: 'npc' | 'permit',
  resourceId: string,
): RoomState => {
  const player = room.players[playerId];
  if (!player) return room;

  const key = interactionLockKey(resourceType, resourceId);
  const currentLock = room.interactionLocks[key];
  if (!currentLock || currentLock.ownerPlayerId !== playerId) {
    return room;
  }

  const nextLocks = { ...room.interactionLocks };
  delete nextLocks[key];

  return {
    ...room,
    interactionLocks: nextLocks,
    players: {
      ...room.players,
      [playerId]: {
        ...player,
        activeNpcInteractionId:
          resourceType === 'npc' && player.activeNpcInteractionId === resourceId
            ? null
            : player.activeNpcInteractionId,
        activePermitInteractionId:
          resourceType === 'permit' && player.activePermitInteractionId === resourceId
            ? null
            : player.activePermitInteractionId,
      },
    },
  };
};

const getResolvedDialogueOption = (
  state: GameState,
  command: Extract<MultiplayerCommand, { type: 'DIALOGUE_CHOICE' }>,
): DialogueOption | null => {
  const npc = state.npcs[command.npcId];
  if (!npc) return null;
  if (!isNpcAvailableAtTime(npc, state.time)) return null;

  if (command.source === 'tree') {
    const tree = DIALOGUE_TREES[command.npcId];
    const node = tree?.[command.nodeId];
    if (!node) return null;
    return node.options[command.optionIndex] ?? null;
  }

  const moodInfluence = getNpcMoodInfluence(npc, state.time);
  const options = buildSpecialDialogueOptions({
    npc,
    state,
    moodInfluence,
  });
  return options[command.optionIndex] ?? null;
};

const isDialogueOptionAvailable = (
  state: GameState,
  npcId: string,
  option: DialogueOption,
): boolean => {
  const npc = state.npcs[npcId];
  if (!npc) return false;
  if (option.condition && !option.condition(state)) return false;
  if (option.trustRequired && npc.trustLevel < option.trustRequired) return false;
  if (option.leverageRequired && npc.leverage < option.leverageRequired) return false;
  return true;
};

export const applyRoomCommand = (
  room: RoomState,
  playerId: PlayerId,
  command: MultiplayerCommand,
): RoomCommandResult => {
  switch (command.type) {
    case 'OPEN_NPC_INTERACTION':
      return claimInteractionLock(room, playerId, 'npc', command.npcId);
    case 'OPEN_PERMIT_INTERACTION':
      return claimInteractionLock(room, playerId, 'permit', command.permitId);
    case 'RELEASE_INTERACTION':
      return {
        room: releaseInteractionLock(room, playerId, command.resourceType, command.resourceId),
        notifications: [],
      };
    case 'REST': {
      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const home = state.buildings.player_home;
      if (!home) {
        return {
          room,
          notifications: [{
            title: 'Unavailable',
            msg: 'No home base is available for rest.',
          }],
        };
      }

      const restedState = applyRestAction(state, home.pos);
      const result = applyDailyEconomyTick(restedState);
      return {
        room: mergePlayerStateIntoRoom(room, playerId, {
          ...snapshot,
          room: {
            ...room,
            shared: buildRoomSharedState(result.nextState),
            players: {
              ...room.players,
              [playerId]: buildRoomPlayerState(
                result.nextState,
                playerId,
                room.players[playerId]?.displayName,
                room.players[playerId]?.connectedAt,
              ),
            },
          },
        }),
        notifications: result.notification ? [result.notification] : [{
          title: 'Rested',
          msg: "A good night's sleep. You feel ready for more paperwork.",
        }],
      };
    }
    case 'UNLOCK_ENDING': {
      if (room.shared.unlockedEndings.includes(command.endingId)) {
        return { room, notifications: [] };
      }
      return {
        room: {
          ...room,
          shared: {
            ...room.shared,
            unlockedEndings: [...room.shared.unlockedEndings, command.endingId],
          },
        },
        notifications: [],
      };
    }
    case 'DIALOGUE_CHOICE': {
      const activeNpcId = room.players[playerId]?.activeNpcInteractionId;
      if (activeNpcId !== command.npcId) {
        return {
          room,
          notifications: [{
            title: 'Conversation Lost',
            msg: 'You no longer own that conversation.',
          }],
        };
      }

      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const option = getResolvedDialogueOption(state, command);
      if (!option || !isDialogueOptionAvailable(state, command.npcId, option)) {
        return {
          room,
          notifications: [{
            title: 'Dialogue Stale',
            msg: 'That conversation option is no longer available.',
          }],
        };
      }

      const commands: DialogueCommand[] = option.action ? option.action(state) : [];
      const feedbackQueue: RelationshipFeedback[] = [];
      const nextState = applyDialogueSocialConsequences(
        state,
        applyDialogueCommands(state, commands, feedbackQueue),
        feedbackQueue,
      );
      return {
        room: mergePlayerStateIntoRoom(room, playerId, {
          ...snapshot,
          room: {
            ...room,
            shared: buildRoomSharedState(nextState),
            players: {
              ...room.players,
              [playerId]: buildRoomPlayerState(
                nextState,
                playerId,
                room.players[playerId]?.displayName,
                room.players[playerId]?.connectedAt,
              ),
            },
          },
        }),
        notifications: [],
        effects: feedbackQueue.length > 0 ? { relationshipFeedbacks: feedbackQueue } : undefined,
      };
    }
    case 'PERMIT_ACTION': {
      const activePermitId = room.players[playerId]?.activePermitInteractionId;
      if (activePermitId !== command.permitId) {
        return {
          room,
          notifications: [{
            title: 'Filing Lost',
            msg: 'You no longer own that filing desk.',
          }],
        };
      }

      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const result = applyPermitOverlayAction(
        {
          ...state,
          activePermitId: command.permitId,
        },
        command.permitId,
        command.action,
      );
      return {
        room: mergePlayerStateIntoRoom(room, playerId, {
          ...snapshot,
          room: {
            ...room,
            shared: buildRoomSharedState(result.nextState),
            players: {
              ...room.players,
              [playerId]: buildRoomPlayerState(
                result.nextState,
                playerId,
                room.players[playerId]?.displayName,
                room.players[playerId]?.connectedAt,
              ),
            },
          },
        }),
        notifications: result.notifications,
      };
    }
    case 'COMPLETE_PERMIT_MINIGAME': {
      const activePermitId = room.players[playerId]?.activePermitInteractionId;
      if (!activePermitId) {
        return {
          room,
          notifications: [{
            title: 'Filing Lost',
            msg: 'You no longer own that filing desk.',
          }],
        };
      }

      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const result = applyMiniGameCompletion(state, command.results);
      const mergedRoom = mergePlayerStateIntoRoom(room, playerId, {
        ...snapshot,
        room: {
          ...room,
          shared: buildRoomSharedState(result.nextState),
          players: {
            ...room.players,
            [playerId]: buildRoomPlayerState(
              result.nextState,
              playerId,
              room.players[playerId]?.displayName,
              room.players[playerId]?.connectedAt,
            ),
          },
        },
      });
      return {
        room: releaseInteractionLock(mergedRoom, playerId, 'permit', activePermitId),
        notifications: result.notifications,
      };
    }
    case 'CANCEL_PERMIT_MINIGAME': {
      const activePermitId = room.players[playerId]?.activePermitInteractionId;
      if (!activePermitId) {
        return {
          room,
          notifications: [],
        };
      }

      const nextRoom = withUpdatedGameState(room, playerId, (state) => ({
        ...state,
        activePermitId: null,
        activeMiniGame: null,
        pendingPermitAction: null,
      }));
      return {
        room: releaseInteractionLock(nextRoom, playerId, 'permit', activePermitId),
        notifications: [],
      };
    }
    case 'MOVE_TO': {
      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const path = findPath(
        state.playerPos,
        command.destination,
        state.buildings,
        undefined,
        state.navigationZones,
      );
      const nextState = applyPlannedWorldMove(state, command.destination, path);
      return {
        room: mergePlayerStateIntoRoom(room, playerId, {
          ...snapshot,
          room: {
            ...room,
            shared: buildRoomSharedState(nextState),
            players: {
              ...room.players,
              [playerId]: buildRoomPlayerState(
                nextState,
                playerId,
                room.players[playerId]?.displayName,
                room.players[playerId]?.connectedAt,
              ),
            },
          },
        }),
        notifications: [],
      };
    }
    case 'DIRECT_MOVE': {
      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const surfaceMap = buildWorldSurfaceMap(state.buildings, undefined, state.navigationZones);
      const result = applyDirectWorldMove(state, command.destination, surfaceMap);
      return {
        room: mergePlayerStateIntoRoom(room, playerId, {
          ...snapshot,
          room: {
            ...room,
            shared: buildRoomSharedState(result.nextState),
            players: {
              ...room.players,
              [playerId]: buildRoomPlayerState(
                result.nextState,
                playerId,
                room.players[playerId]?.displayName,
                room.players[playerId]?.connectedAt,
              ),
            },
          },
        }),
        notifications: result.notifications,
      };
    }
    case 'EXPORT_ORE': {
      const nextRoom = withUpdatedGameState(room, playerId, (state) =>
        applyOreExport(state, state.ore, command.strategy).nextState,
      );
      const preview = room.players[playerId];
      return {
        room: nextRoom,
        notifications: preview ? [] : [],
      };
    }
    case 'OPERATION_ACTION': {
      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const result = applyOperationAction(state, command.actionId);
      return {
        room: mergePlayerStateIntoRoom(room, playerId, {
          ...snapshot,
          room: {
            ...room,
            shared: buildRoomSharedState(result.nextState),
            players: {
              ...room.players,
              [playerId]: buildRoomPlayerState(
                result.nextState,
                playerId,
                room.players[playerId]?.displayName,
                room.players[playerId]?.connectedAt,
              ),
            },
          },
        }),
        notifications: [result.notification],
      };
    }
    case 'TRAVEL_TO_MINE': {
      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const result = applyMineTravel(state, command.mineId);
      if (result.kind === 'invalid') {
        return { room, notifications: [] };
      }
      if (result.kind === 'undiscovered' || result.kind === 'too_tired') {
        return { room, notifications: [result.notification] };
      }

      const nextState = result.nextState;
      return {
        room: mergePlayerStateIntoRoom(room, playerId, {
          ...snapshot,
          room: {
            ...room,
            shared: buildRoomSharedState(nextState),
            players: {
              ...room.players,
              [playerId]: buildRoomPlayerState(
                nextState,
                playerId,
                room.players[playerId]?.displayName,
                room.players[playerId]?.connectedAt,
              ),
            },
          },
        }),
        notifications: [result.notification],
      };
    }
    case 'MINE_TILE': {
      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const result = applyMineTileInteraction(state, command.tileId);
      return {
        room: mergePlayerStateIntoRoom(room, playerId, {
          ...snapshot,
          room: {
            ...room,
            shared: buildRoomSharedState(result.nextState),
            players: {
              ...room.players,
              [playerId]: buildRoomPlayerState(
                result.nextState,
                playerId,
                room.players[playerId]?.displayName,
                room.players[playerId]?.connectedAt,
              ),
            },
          },
        }),
        notifications: result.notifications,
      };
    }
    case 'MINE_ACTION': {
      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const result = applyMineSceneAction(state, command.actionId);
      return {
        room: mergePlayerStateIntoRoom(room, playerId, {
          ...snapshot,
          room: {
            ...room,
            shared: buildRoomSharedState(result.nextState),
            players: {
              ...room.players,
              [playerId]: buildRoomPlayerState(
                result.nextState,
                playerId,
                room.players[playerId]?.displayName,
                room.players[playerId]?.connectedAt,
              ),
            },
          },
        }),
        notifications: result.notifications,
      };
    }
    default:
      return { room, notifications: [] };
  }
};

export interface RoomMovementTickResult {
  room: RoomState;
  notificationsByPlayerId: Record<string, GameTickNotification[]>;
}

export const advanceRoomMovementTick = (
  room: RoomState,
  runtimes: Map<string, MovementTickRuntimeState>,
): RoomMovementTickResult => {
  let nextRoom = room;
  const notificationsByPlayerId: Record<string, GameTickNotification[]> = {};

  Object.keys(room.players).forEach((playerId) => {
    const snapshot = buildServerSnapshot(nextRoom, playerId);
    const state = buildGameStateFromRoomSnapshot(snapshot);
    const runtime = runtimes.get(playerId) ?? createInitialMovementTickRuntime();
    const surfaceMap = buildWorldSurfaceMap(state.buildings, undefined, state.navigationZones);
    const movementResult = advanceMovementTick(state, runtime, surfaceMap);
    const discoveryResult = advanceBuildingDiscoveryTick(movementResult.nextState);

    runtimes.set(playerId, movementResult.nextRuntime);
    if (
      discoveryResult.nextState === state &&
      movementResult.notifications.length === 0 &&
      discoveryResult.notifications.length === 0
    ) {
      return;
    }

    notificationsByPlayerId[playerId] = [
      ...movementResult.notifications,
      ...discoveryResult.notifications,
    ];
    nextRoom = mergePlayerStateIntoRoom(nextRoom, playerId, {
      ...snapshot,
      room: {
        ...nextRoom,
        shared: buildRoomSharedState(discoveryResult.nextState),
        players: {
          ...nextRoom.players,
          [playerId]: buildRoomPlayerState(
            discoveryResult.nextState,
            playerId,
            nextRoom.players[playerId]?.displayName,
            nextRoom.players[playerId]?.connectedAt,
          ),
        },
      },
    });
  });

  return {
    room: nextRoom,
    notificationsByPlayerId,
  };
};

export const advanceRoomPermitTick = (
  room: RoomState,
): { room: RoomState; notifications: GameTickNotification[] } => {
  const snapshot = buildServerSnapshot(room, room.hostPlayerId);
  const state = buildGameStateFromRoomSnapshot(snapshot);
  const result = advancePermitProcessingTick(state);

  if (result.nextState === state && result.notifications.length === 0) {
    return { room, notifications: [] };
  }

  return {
    room: {
      ...room,
      shared: buildRoomSharedState(result.nextState),
      players: room.players,
    },
    notifications: result.notifications,
  };
};

export const advanceRoomCityEventTick = (
  room: RoomState,
): RoomMovementTickResult => {
  let nextRoom = room;
  const notificationsByPlayerId: Record<string, GameTickNotification[]> = {};

  Object.keys(room.players).forEach((playerId) => {
    const snapshot = buildServerSnapshot(nextRoom, playerId);
    const state = buildGameStateFromRoomSnapshot(snapshot);
    const result = advanceCityEventTick(state);

    if (result.nextState === state && !result.notification) {
      return;
    }

    nextRoom = mergePlayerStateIntoRoom(nextRoom, playerId, {
      ...snapshot,
      room: {
        ...nextRoom,
        shared: buildRoomSharedState(result.nextState),
        players: {
          ...nextRoom.players,
          [playerId]: buildRoomPlayerState(
            result.nextState,
            playerId,
            nextRoom.players[playerId]?.displayName,
            nextRoom.players[playerId]?.connectedAt,
          ),
        },
      },
    });

    if (result.notification) {
      notificationsByPlayerId[playerId] = [result.notification];
    }
  });

  return {
    room: nextRoom,
    notificationsByPlayerId,
  };
};
