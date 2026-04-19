import { applyOreExport } from '../game/economy';
import {
  advanceMovementTick,
  createInitialMovementTickRuntime,
  MovementTickRuntimeState,
} from '../game/ticks/movementTick';
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
import { applyMineTravel } from '../game/navigationActions';
import { ClientUiState, MultiplayerCommand, PlayerId, RoomSnapshot, RoomState, RoomTransientEffects } from './types';
import { GameTickNotification } from '../game/ticks/types';
import { RelationshipFeedback } from '../types';

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

export const applyRoomCommand = (
  room: RoomState,
  playerId: PlayerId,
  command: MultiplayerCommand,
): RoomCommandResult => {
  switch (command.type) {
    case 'DIALOGUE_ACTION': {
      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const feedbackQueue: RelationshipFeedback[] = [];
      const nextState = applyDialogueSocialConsequences(
        state,
        applyDialogueCommands(state, command.commands, feedbackQueue),
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
      const snapshot = buildServerSnapshot(room, playerId);
      const state = buildGameStateFromRoomSnapshot(snapshot);
      const result = applyMiniGameCompletion(state, command.results);
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
    case 'CANCEL_PERMIT_MINIGAME': {
      const nextRoom = withUpdatedGameState(room, playerId, (state) => ({
        ...state,
        activePermitId: null,
        activeMiniGame: null,
        pendingPermitAction: null,
      }));
      return {
        room: nextRoom,
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
    const result = advanceMovementTick(state, runtime, surfaceMap);

    runtimes.set(playerId, result.nextRuntime);
    if (result.nextState === state && result.notifications.length === 0) {
      return;
    }

    notificationsByPlayerId[playerId] = result.notifications;
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
