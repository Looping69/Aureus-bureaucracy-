import { RoomPlayerState, RoomSharedState, RoomState } from './types';

export type ClientToServerMessage =
  | {
      type: 'join_room';
      roomId: string;
      playerId: string;
      displayName: string;
      room: RoomState;
      player: RoomPlayerState;
    }
  | {
      type: 'player_sync';
      roomId: string;
      playerId: string;
      player: RoomPlayerState;
    }
  | {
      type: 'host_shared_sync';
      roomId: string;
      playerId: string;
      shared: RoomSharedState;
    };

export type ServerToClientMessage =
  | {
      type: 'room_state';
      room: RoomState;
    }
  | {
      type: 'server_notice';
      notice: {
        title: string;
        msg: string;
      };
    };
