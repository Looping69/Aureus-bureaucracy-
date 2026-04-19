import React from 'react';
import { GameState, RelationshipFeedback } from '../../types';
import {
  buildGameStateFromRoomSnapshot,
  buildRoomSnapshotFromGameState,
} from '../../multiplayer/adapters';
import { PlayerId, RemotePlayerView, RoomSnapshot, RoomState } from '../../multiplayer/types';

interface UseRoomSessionOptions {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  playerId?: PlayerId;
  displayName?: string;
  roomId?: string;
}

const buildRemotePlayerViews = (snapshot: RoomSnapshot): RemotePlayerView[] =>
  Object.values(snapshot.room.players)
    .filter((player) => player.id !== snapshot.playerId)
    .map((player) => ({
      id: player.id,
      displayName: player.displayName,
      playerPos: player.playerPos,
      targetPos: player.targetPos,
      path: player.path,
      isMoving: player.path.length > 0 || player.targetPos !== null,
      carriedOre: player.ore,
      connected: player.connected,
    }));

export const useRoomSession = ({
  state,
  setState,
  playerId = 'player-1',
  displayName = 'Player 1',
  roomId = 'local-room',
}: UseRoomSessionOptions) => {
  const [snapshot, setSnapshot] = React.useState<RoomSnapshot>(() =>
    buildRoomSnapshotFromGameState(state, {
      roomId,
      playerId,
      displayName,
    }),
  );

  React.useEffect(() => {
    setSnapshot((prev) => {
      const next = buildRoomSnapshotFromGameState(state, {
        roomId: prev.room.id,
        playerId: prev.playerId,
        displayName: prev.room.players[prev.playerId]?.displayName ?? displayName,
        createdAt: prev.room.players[prev.playerId]?.connectedAt,
      });

      // Preserve any remote players that may have been injected by a transport layer.
      return {
        ...next,
        room: {
          ...next.room,
          revision: prev.room.revision,
          interactionLocks: prev.room.interactionLocks,
          players: {
            ...prev.room.players,
            [next.playerId]: next.room.players[next.playerId],
          },
        },
      };
    });
  }, [displayName, roomId, playerId, state]);

  const applyRoomSnapshot = React.useCallback((nextSnapshot: RoomSnapshot) => {
    setSnapshot(nextSnapshot);
    setState((prevState) => ({
      ...buildGameStateFromRoomSnapshot(nextSnapshot),
      feedbacks: prevState.feedbacks,
      playerFeedbacks: prevState.playerFeedbacks,
    }));
  }, [setState]);

  const applyServerRoomState = React.useCallback((room: RoomState) => {
    setSnapshot((prev) => {
      const nextSnapshot: RoomSnapshot = {
        ...prev,
        room,
      };
      setState((prevState) => ({
        ...buildGameStateFromRoomSnapshot(nextSnapshot),
        feedbacks: prevState.feedbacks,
        playerFeedbacks: prevState.playerFeedbacks,
      }));
      return nextSnapshot;
    });
  }, [setState]);

  const appendRelationshipFeedbacks = React.useCallback((feedbacks: RelationshipFeedback[]) => {
    if (feedbacks.length === 0) return;
    setState((prevState) => ({
      ...prevState,
      feedbacks: [...prevState.feedbacks, ...feedbacks],
    }));
  }, [setState]);

  const upsertRemoteSnapshot = React.useCallback((nextSnapshot: RoomSnapshot) => {
    setSnapshot((prev) => ({
      ...nextSnapshot,
      room: {
        ...nextSnapshot.room,
        players: {
          ...prev.room.players,
          ...nextSnapshot.room.players,
        },
      },
    }));
  }, []);

  const remotePlayers = React.useMemo(
    () => buildRemotePlayerViews(snapshot),
    [snapshot],
  );

  return {
    roomSnapshot: snapshot,
    remotePlayers,
    applyRoomSnapshot,
    applyServerRoomState,
    appendRelationshipFeedbacks,
    upsertRemoteSnapshot,
  };
};
