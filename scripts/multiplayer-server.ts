import { WebSocketServer, WebSocket } from 'ws';
import { advanceSharedWorldTick } from '../src/game/ticks/sharedWorldTick.ts';
import { ClientToServerMessage, ServerToClientMessage } from '../src/multiplayer/protocol.ts';
import { RoomState } from '../src/multiplayer/types.ts';

type RoomSession = {
  room: RoomState;
  clients: Map<string, WebSocket>;
};

const PORT = Number(process.env.MULTIPLAYER_PORT ?? 3010);
const rooms = new Map<string, RoomSession>();

const nowIso = () => new Date().toISOString();

const send = (socket: WebSocket, message: ServerToClientMessage) => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
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
    room: templateRoom,
    clients: new Map(),
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
      session.room = {
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
      };

      broadcastRoomState(session);
      return;
    }

    if (!activeRoomId || !activePlayerId) return;
    const session = rooms.get(activeRoomId);
    if (!session) return;

    if (message.type === 'player_sync') {
      const current = session.room.players[message.playerId];
      if (!current) return;

      session.room = {
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
      };

      broadcastRoomState(session);
      return;
    }

    if (message.type === 'host_shared_sync') {
      if (session.room.hostPlayerId !== message.playerId) return;

      session.room = {
        ...session.room,
        shared: {
          ...session.room.shared,
          ...message.shared,
        },
      };

      broadcastRoomState(session);
    }
  });

  socket.on('close', () => {
    if (!activeRoomId || !activePlayerId) return;
    const session = rooms.get(activeRoomId);
    if (!session) return;

    session.clients.delete(activePlayerId);
    const existing = session.room.players[activePlayerId];
    if (existing) {
      session.room = {
        ...session.room,
        players: {
          ...session.room.players,
          [activePlayerId]: {
            ...existing,
            connected: false,
            lastInputAt: nowIso(),
          },
        },
      };
      broadcastRoomState(session);
    }
  });
});

setInterval(() => {
  rooms.forEach((session) => {
    if (session.clients.size === 0) return;

    const tick = advanceSharedWorldTick(session.room.shared);
    session.room = {
      ...session.room,
      shared: tick.nextShared,
    };

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

console.log(`Aureus multiplayer room server listening on ws://127.0.0.1:${PORT}`);
