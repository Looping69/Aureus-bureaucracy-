import React from 'react';
import { NotificationMessage } from './useNotificationCenter';
import { RoomSharedState, RoomSnapshot, RoomState } from '../../multiplayer/types';
import { ClientToServerMessage, ServerToClientMessage } from '../../multiplayer/protocol';

type MultiplayerStatus = 'disabled' | 'connecting' | 'connected' | 'error';

interface UseMultiplayerTransportOptions {
  enabled: boolean;
  wsUrl: string;
  roomId: string;
  roomSnapshot: RoomSnapshot;
  applyServerRoomState: (room: RoomState) => void;
  pushNotification: (notification: NotificationMessage | null) => void;
}

const SYNC_INTERVAL_MS = 180;

const safeParse = (raw: string): ServerToClientMessage | null => {
  try {
    return JSON.parse(raw) as ServerToClientMessage;
  } catch {
    return null;
  }
};

export const useMultiplayerTransport = ({
  enabled,
  wsUrl,
  roomId,
  roomSnapshot,
  applyServerRoomState,
  pushNotification,
}: UseMultiplayerTransportOptions) => {
  const socketRef = React.useRef<WebSocket | null>(null);
  const snapshotRef = React.useRef(roomSnapshot);
  const [status, setStatus] = React.useState<MultiplayerStatus>(enabled ? 'connecting' : 'disabled');
  const [lastError, setLastError] = React.useState<string | null>(null);

  React.useEffect(() => {
    snapshotRef.current = roomSnapshot;
  }, [roomSnapshot]);

  React.useEffect(() => {
    if (!enabled) {
      setStatus('disabled');
      setLastError(null);
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    setStatus('connecting');
    setLastError(null);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setStatus('connected');
      const snapshot = snapshotRef.current;
      const player = snapshot.room.players[snapshot.playerId];
      if (!player) return;

      const joinMessage: ClientToServerMessage = {
        type: 'join_room',
        roomId,
        playerId: snapshot.playerId,
        displayName: player.displayName,
        room: snapshot.room,
        player,
      };
      socket.send(JSON.stringify(joinMessage));
      pushNotification({ title: 'Multiplayer Linked', msg: `Connected to room ${roomId}.` });
    });

    socket.addEventListener('message', (event) => {
      const message = safeParse(String(event.data));
      if (!message) return;

      if (message.type === 'room_state') {
        applyServerRoomState(message.room);
        return;
      }

      if (message.type === 'server_notice') {
        pushNotification(message.notice);
      }
    });

    socket.addEventListener('error', () => {
      setStatus('error');
      setLastError('Failed to reach the multiplayer room server.');
    });

    socket.addEventListener('close', () => {
      setStatus((current) => (current === 'disabled' ? current : 'error'));
      if (enabled) {
        setLastError('Multiplayer connection closed.');
      }
    });

    return () => {
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [applyServerRoomState, enabled, pushNotification, roomId, wsUrl]);

  React.useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      const snapshot = snapshotRef.current;
      const player = snapshot.room.players[snapshot.playerId];
      if (!player) return;

      const playerSync: ClientToServerMessage = {
        type: 'player_sync',
        roomId,
        playerId: snapshot.playerId,
        player,
      };
      socket.send(JSON.stringify(playerSync));

      if (snapshot.room.hostPlayerId === snapshot.playerId) {
        const hostSharedSync: ClientToServerMessage = {
          type: 'host_shared_sync',
          roomId,
          playerId: snapshot.playerId,
          shared: snapshot.room.shared,
        };
        socket.send(JSON.stringify(hostSharedSync));
      }
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, roomId]);

  const isConnected = status === 'connected';
  const isHost = roomSnapshot.room.hostPlayerId === roomSnapshot.playerId;
  const peerCount = Math.max(0, Object.keys(roomSnapshot.room.players).length - 1);

  return {
    enabled,
    status,
    lastError,
    isConnected,
    isHost,
    peerCount,
  };
};
