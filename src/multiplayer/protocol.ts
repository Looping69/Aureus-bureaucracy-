import { MultiplayerCommand, RoomPlayerState, RoomState, RoomTransientEffects } from './types';

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
      type: 'room_command';
      roomId: string;
      playerId: string;
      command: MultiplayerCommand;
    };

export type ServerToClientMessage =
  | {
      type: 'room_state';
      room: RoomState;
    }
  | {
      type: 'room_effects';
      effects: RoomTransientEffects;
    }
  | {
      type: 'server_notice';
      notice: {
        title: string;
        msg: string;
      };
    };
