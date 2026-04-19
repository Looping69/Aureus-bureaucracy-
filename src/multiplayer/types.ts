import { ExportStrategy } from '../game/economy';
import { GameState, PendingPermitAction, PermitStatus, WorldPosition } from '../types';

export type RoomId = string;
export type PlayerId = string;

export type RoomSharedState = Pick<
  GameState,
  | 'worldProfileId'
  | 'buildings'
  | 'navigationZones'
  | 'day'
  | 'time'
  | 'weather'
  | 'streetPickups'
  | 'permits'
  | 'npcs'
  | 'knownNpcIds'
  | 'objectives'
  | 'mines'
  | 'worldEffects'
  | 'storyFlags'
  | 'lastCityEventHour'
  | 'unlockedEndings'
>;

export type PlayerProgressState = Pick<
  GameState,
  | 'money'
  | 'ore'
  | 'evidence'
  | 'energy'
  | 'maxEnergy'
  | 'movementSpeed'
  | 'upgrades'
  | 'dirtItems'
  | 'leverage'
  | 'meters'
  | 'dialogueCooldowns'
  | 'foundOfficeItemIds'
  | 'explorationActive'
  | 'activeMineId'
  | 'playerPos'
  | 'targetPos'
  | 'path'
  | 'ftuePhase'
  | 'tutorialStep'
>;

export type ClientUiState = Pick<
  GameState,
  | 'currentScene'
  | 'activeNPCId'
  | 'activePermitId'
  | 'activeBuildingId'
  | 'activeMiniGame'
  | 'pendingPermitAction'
  | 'activeEndingId'
  | 'tutorialMinimized'
>;

export interface RoomPlayerState extends PlayerProgressState {
  id: PlayerId;
  displayName: string;
  connected: boolean;
  connectedAt: string;
  lastInputAt: string;
}

export interface RoomState {
  id: RoomId;
  hostPlayerId: PlayerId;
  shared: RoomSharedState;
  players: Record<PlayerId, RoomPlayerState>;
}

export interface RoomSnapshot {
  room: RoomState;
  playerId: PlayerId;
  ui: ClientUiState;
}

export interface RemotePlayerView {
  id: PlayerId;
  displayName: string;
  playerPos: WorldPosition;
  targetPos: WorldPosition | null;
  path: WorldPosition[];
  isMoving: boolean;
  carriedOre: number;
  connected: boolean;
}

export type MultiplayerCommand =
  | { type: 'MOVE_TO'; destination: WorldPosition }
  | { type: 'DIRECT_MOVE'; destination: WorldPosition }
  | { type: 'REST' }
  | { type: 'TRAVEL_TO_MINE'; mineId: string }
  | { type: 'ENTER_BUILDING'; buildingId: string }
  | { type: 'INTERACT_NPC'; npcId: string }
  | { type: 'SET_SCENE'; scene: ClientUiState['currentScene'] }
  | { type: 'SELECT_PERMIT'; permitId: string | null }
  | { type: 'SET_PENDING_PERMIT_ACTION'; action: PendingPermitAction }
  | {
      type: 'RESOLVE_PERMIT';
      permitId: string;
      action: 'SUBMIT' | 'PAY' | 'FAST_TRACK';
      nextStatus?: PermitStatus;
    }
  | { type: 'MINE_TILE'; tileId: string }
  | { type: 'MINE_ACTION'; actionId: string }
  | { type: 'EXPORT_ORE'; strategy: ExportStrategy }
  | { type: 'DISMISS_UI'; target: keyof ClientUiState };
