import { ExportStrategy } from '../game/economy';
import { GameState, PendingPermitAction, RelationshipFeedback, WorldPosition } from '../types';

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
  | 'lastCityEventHour'
  | 'ftuePhase'
  | 'tutorialStep'
> & {
  activeNpcInteractionId: string | null;
  activePermitInteractionId: string | null;
  activePermitWorkflowId: string | null;
  activeMiniGame: GameState['activeMiniGame'];
  pendingPermitAction: PendingPermitAction;
};

export type ClientUiState = Pick<
  GameState,
  | 'currentScene'
  | 'activeNPCId'
  | 'activePermitId'
  | 'activeBuildingId'
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

export interface InteractionLock {
  resourceType: 'npc' | 'permit';
  resourceId: string;
  ownerPlayerId: PlayerId;
  ownerDisplayName: string;
  acquiredAt: string;
}

export interface RoomState {
  id: RoomId;
  hostPlayerId: PlayerId;
  shared: RoomSharedState;
  players: Record<PlayerId, RoomPlayerState>;
  interactionLocks: Record<string, InteractionLock>;
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

export type RoomTransientEffects = {
  relationshipFeedbacks?: RelationshipFeedback[];
};

export type MultiplayerCommand =
  | { type: 'MOVE_TO'; destination: WorldPosition }
  | { type: 'DIRECT_MOVE'; destination: WorldPosition }
  | { type: 'DIALOGUE_CHOICE'; npcId: string; nodeId: string; optionIndex: number; source: 'tree' | 'special' }
  | { type: 'OPEN_NPC_INTERACTION'; npcId: string }
  | { type: 'OPEN_PERMIT_INTERACTION'; permitId: string }
  | { type: 'RELEASE_INTERACTION'; resourceType: 'npc' | 'permit'; resourceId: string }
  | { type: 'TRAVEL_TO_MINE'; mineId: string }
  | { type: 'ENTER_BUILDING'; buildingId: string }
  | { type: 'INTERACT_NPC'; npcId: string }
  | { type: 'SET_SCENE'; scene: ClientUiState['currentScene'] }
  | { type: 'PERMIT_ACTION'; permitId: string; action: 'SUBMIT' | 'PAY' | 'FAST_TRACK' }
  | { type: 'COMPLETE_PERMIT_MINIGAME'; results: { accuracy: number; time: number } }
  | { type: 'CANCEL_PERMIT_MINIGAME' }
  | { type: 'MINE_TILE'; tileId: string }
  | { type: 'MINE_ACTION'; actionId: string }
  | { type: 'OPERATION_ACTION'; actionId: 'PRESSURE_CLERKS' | 'SCOUT_BUYERS' | 'COMMUNITY_COVER' | 'LEAK_TO_PRESS' }
  | { type: 'EXPORT_ORE'; strategy: ExportStrategy }
  | { type: 'DISMISS_UI'; target: keyof ClientUiState };
