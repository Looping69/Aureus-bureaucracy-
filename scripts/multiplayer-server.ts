import { WebSocketServer, WebSocket } from 'ws';
import { advanceSharedWorldTick } from '../src/game/ticks/sharedWorldTick.ts';
import { ClientToServerMessage, ServerToClientMessage } from '../src/multiplayer/protocol.ts';
import { RoomState } from '../src/multiplayer/types.ts';
import {
  advanceRoomCityEventTick,
  advanceRoomMovementTick,
  advanceRoomPermitTick,
  applyRoomCommand,
} from '../src/multiplayer/serverRoom.ts';
import { MovementTickRuntimeState } from '../src/game/ticks/movementTick.ts';

type RoomSession = {
  room: RoomState;
  clients: Map<string, WebSocket>;
  movementRuntimes: Map<string, MovementTickRuntimeState>;
};

const PORT = Number(process.env.MULTIPLAYER_PORT ?? 3010);
const rooms = new Map<string, RoomSession>();

const nowIso = () => new Date().toISOString();

const send = (socket: WebSocket, message: ServerToClientMessage) => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
};

const normalizeRoomState = (room: RoomState): RoomState => ({
  ...room,
  revision: room.revision ?? 0,
  interactionLocks: room.interactionLocks ?? {},
});

const resolveHostPlayerId = (room: RoomState): string => {
  const connectedIds = Object.entries(room.players)
    .filter(([, player]) => player.connected)
    .map(([playerId]) => playerId);

  if (room.hostPlayerId && connectedIds.includes(room.hostPlayerId)) {
    return room.hostPlayerId;
  }

  return connectedIds[0] ?? room.hostPlayerId;
};

const commitRoom = (session: RoomSession, nextRoom: RoomState) => {
  const normalized = normalizeRoomState(nextRoom);
  session.room = {
    ...normalized,
    hostPlayerId: resolveHostPlayerId(normalized),
    revision: session.room.revision + 1,
  };
};

const broadcastRoomState = (session: RoomSession) => {
  const message: ServerToClientMessage = {
    type: 'room_state',
    room: session.room,
  };
  session.clients.forEach((socket) => send(socket, message));
};

const getOrCreateRoomSession = (roomId: string, templateRoom: RoomState): RoomSession => {
  const existing = rooms.get(roomId);
  if (existing) return existing;

  const created: RoomSession = {
    room: normalizeRoomState(templateRoom),
    clients: new Map(),
    movementRuntimes: new Map(),
  };
  rooms.set(roomId, created);
  return created;
};

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (socket) => {
  let activeRoomId: string | null = null;
  let activePlayerId: string | null = null;

  socket.on('message', (buffer) => {
    let message: ClientToServerMessage;

    try {
      message = JSON.parse(buffer.toString()) as ClientToServerMessage;
    } catch {
      return;
    }

    if (message.type === 'join_room') {
      const session = getOrCreateRoomSession(message.roomId, message.room);
      activeRoomId = message.roomId;
      activePlayerId = message.playerId;

      session.clients.set(message.playerId, socket);
      commitRoom(session, {
        ...session.room,
        hostPlayerId: session.room.hostPlayerId || message.playerId,
        players: {
          ...session.room.players,
          [message.playerId]: {
            ...message.player,
            displayName: message.displayName,
            connected: true,
            lastInputAt: nowIso(),
          },
        },
      });

      broadcastRoomState(session);
      return;
    }

    if (!activeRoomId || !activePlayerId) return;
    const session = rooms.get(activeRoomId);
    if (!session) return;

    if (message.type === 'player_sync') {
      const current = session.room.players[message.playerId];
      if (!current) return;

      commitRoom(session, {
        ...session.room,
        players: {
          ...session.room.players,
          [message.playerId]: {
            ...current,
            ...message.player,
            connected: true,
            lastInputAt: nowIso(),
          },
        },
      });

      broadcastRoomState(session);
      return;
    }

    if (message.type === 'room_command') {
      const result = applyRoomCommand(session.room, message.playerId, message.command);
      commitRoom(session, result.room);
      broadcastRoomState(session);
      if (result.effects) {
        const target = session.clients.get(message.playerId);
        if (target) {
          send(target, {
            type: 'room_effects',
            effects: result.effects,
          });
        }
      }
      result.notifications.forEach((notice) => {
        const target = session.clients.get(message.playerId);
        if (!target) return;
        send(target, {
          type: 'server_notice',
          notice,
        });
      });
      return;
    }
  });

  socket.on('close', () => {
    if (!activeRoomId || !activePlayerId) return;
    const session = rooms.get(activeRoomId);
    if (!session) return;

    session.clients.delete(activePlayerId);
    const existing = session.room.players[activePlayerId];
    if (existing) {
      const interactionLocks = Object.fromEntries(
        Object.entries(session.room.interactionLocks).filter(([, lock]) => lock.ownerPlayerId !== activePlayerId),
      );
      commitRoom(session, {
        ...session.room,
        interactionLocks,
        players: {
          ...session.room.players,
          [activePlayerId]: {
            ...existing,
            activeNpcInteractionId: null,
            activePermitInteractionId: null,
            connected: false,
            lastInputAt: nowIso(),
          },
        },
      });
      broadcastRoomState(session);
    }
  });
});

setInterval(() => {
  rooms.forEach((session) => {
    if (session.clients.size === 0) return;

    const tick = advanceSharedWorldTick(session.room.shared);
    commitRoom(session, {
      ...session.room,
      shared: tick.nextShared,
    });

    broadcastRoomState(session);

    tick.notifications.forEach((notice) => {
      const message: ServerToClientMessage = {
        type: 'server_notice',
        notice,
      };
      session.clients.forEach((socket) => send(socket, message));
    });
  });
}, 1000);

setInterval(() => {
  rooms.forEach((session) => {
    if (session.clients.size === 0) return;

    const result = advanceRoomMovementTick(session.room, session.movementRuntimes);
    commitRoom(session, result.room);
    broadcastRoomState(session);

    Object.entries(result.notificationsByPlayerId).forEach(([playerId, notices]) => {
      const target = session.clients.get(playerId);
      if (!target) return;
      notices.forEach((notice) => {
        send(target, {
          type: 'server_notice',
          notice,
        });
      });
    });
  });
}, 70);

setInterval(() => {
  rooms.forEach((session) => {
    if (session.clients.size === 0) return;

    const result = advanceRoomPermitTick(session.room);
    commitRoom(session, result.room);
    broadcastRoomState(session);

    result.notifications.forEach((notice) => {
      const message: ServerToClientMessage = { type: 'server_notice', notice };
      session.clients.forEach((socket) => send(socket, message));
    });
  });
}, 3000);

setInterval(() => {
  rooms.forEach((session) => {
    if (session.clients.size === 0) return;

    const result = advanceRoomCityEventTick(session.room);
    commitRoom(session, result.room);
    broadcastRoomState(session);

    Object.entries(result.notificationsByPlayerId).forEach(([playerId, notices]) => {
      const target = session.clients.get(playerId);
      if (!target) return;
      notices.forEach((notice) => {
        send(target, {
          type: 'server_notice',
          notice,
        });
      });
    });
  });
}, 2500);

console.log(`Aureus multiplayer room server listening on ws://127.0.0.1:${PORT}`);
