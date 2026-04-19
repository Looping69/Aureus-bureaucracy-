import { GameState } from '../types';
import {
  ClientUiState,
  PlayerId,
  RoomId,
  RoomPlayerState,
  RoomSharedState,
  RoomSnapshot,
  RoomState,
} from './types';

const nowIso = () => new Date().toISOString();

export const buildRoomSharedState = (state: GameState): RoomSharedState => ({
  worldProfileId: state.worldProfileId,
  buildings: state.buildings,
  navigationZones: state.navigationZones,
  day: state.day,
  time: state.time,
  weather: state.weather,
  streetPickups: state.streetPickups,
  permits: state.permits,
  npcs: state.npcs,
  knownNpcIds: state.knownNpcIds,
  objectives: state.objectives,
  mines: state.mines,
  worldEffects: state.worldEffects,
  storyFlags: state.storyFlags,
  unlockedEndings: state.unlockedEndings,
});

export const buildRoomPlayerState = (
  state: GameState,
  playerId: PlayerId,
  displayName = 'Player 1',
  timestamp = nowIso(),
): RoomPlayerState => ({
  id: playerId,
  displayName,
  connected: true,
  connectedAt: timestamp,
  lastInputAt: timestamp,
  money: state.money,
  ore: state.ore,
  evidence: state.evidence,
  energy: state.energy,
  maxEnergy: state.maxEnergy,
  movementSpeed: state.movementSpeed,
  upgrades: state.upgrades,
  dirtItems: state.dirtItems,
  leverage: state.leverage,
  meters: state.meters,
  dialogueCooldowns: state.dialogueCooldowns,
  foundOfficeItemIds: state.foundOfficeItemIds,
  explorationActive: state.explorationActive,
  activeMineId: state.activeMineId,
  playerPos: state.playerPos,
  targetPos: state.targetPos,
  path: state.path,
  lastCityEventHour: state.lastCityEventHour,
  ftuePhase: state.ftuePhase,
  tutorialStep: state.tutorialStep,
  activeNpcInteractionId: state.activeNPCId,
  activePermitInteractionId: state.activePermitId,
  activePermitWorkflowId:
    state.activeMiniGame === 'FORM_PROCESSING' || state.pendingPermitAction
      ? state.activePermitId
      : null,
  activeMiniGame: state.activeMiniGame,
  pendingPermitAction: state.pendingPermitAction,
});

export const buildClientUiState = (state: GameState): ClientUiState => ({
  currentScene: state.currentScene,
  activeNPCId: state.activeNPCId,
  activePermitId: state.activePermitId,
  activeBuildingId: state.activeBuildingId,
  activeEndingId: state.activeEndingId,
  tutorialMinimized: state.tutorialMinimized,
});

export const buildRoomSnapshotFromGameState = (
  state: GameState,
  options: {
    roomId?: RoomId;
    playerId?: PlayerId;
    displayName?: string;
    createdAt?: string;
  } = {},
): RoomSnapshot => {
  const roomId = options.roomId ?? 'local-room';
  const playerId = options.playerId ?? 'player-1';
  const timestamp = options.createdAt ?? nowIso();
  const player = buildRoomPlayerState(
    state,
    playerId,
    options.displayName ?? 'Player 1',
    timestamp,
  );

  return {
    room: {
      id: roomId,
      revision: 0,
      hostPlayerId: playerId,
      shared: buildRoomSharedState(state),
      players: {
        [playerId]: player,
      },
      interactionLocks: {},
    },
    playerId,
    ui: buildClientUiState(state),
  };
};

export const buildGameStateFromRoomSnapshot = (snapshot: RoomSnapshot): GameState => {
  const player = snapshot.room.players[snapshot.playerId];
  if (!player) {
    throw new Error(`Player ${snapshot.playerId} is missing from room snapshot ${snapshot.room.id}.`);
  }

  return {
    ...snapshot.room.shared,
    money: player.money,
    ore: player.ore,
    evidence: player.evidence,
    energy: player.energy,
    maxEnergy: player.maxEnergy,
    movementSpeed: player.movementSpeed,
    upgrades: player.upgrades,
    dirtItems: player.dirtItems,
    leverage: player.leverage,
    meters: player.meters,
    dialogueCooldowns: player.dialogueCooldowns,
    foundOfficeItemIds: player.foundOfficeItemIds,
    explorationActive: player.explorationActive,
    activeMineId: player.activeMineId,
    playerPos: player.playerPos,
    targetPos: player.targetPos,
    path: player.path,
    lastCityEventHour: player.lastCityEventHour,
    ftuePhase: player.ftuePhase,
    tutorialStep: player.tutorialStep,
    currentScene: snapshot.ui.currentScene,
    activeNPCId: player.activeNpcInteractionId ?? snapshot.ui.activeNPCId,
    activePermitId:
      player.activePermitInteractionId ??
      player.activePermitWorkflowId ??
      snapshot.ui.activePermitId,
    activeBuildingId: snapshot.ui.activeBuildingId,
    activeMiniGame: player.activeMiniGame,
    pendingPermitAction: player.pendingPermitAction,
    activeEndingId: snapshot.ui.activeEndingId,
    tutorialMinimized: snapshot.ui.tutorialMinimized,
    feedbacks: [],
    playerFeedbacks: [],
  };
};
