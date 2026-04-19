const PLAYER_ID_STORAGE_KEY = 'aureus-multiplayer-player-id';

const buildGeneratedPlayerId = () =>
  `player-${Math.random().toString(36).slice(2, 10)}`;

const getPersistentPlayerId = () => {
  if (typeof window === 'undefined') return 'player-1';

  const existing = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY);
  if (existing) return existing;

  const next = buildGeneratedPlayerId();
  window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, next);
  return next;
};

export interface MultiplayerClientConfig {
  enabled: boolean;
  wsUrl: string;
  roomId: string;
  playerId: string;
  displayName: string;
}

export const resolveMultiplayerClientConfig = (): MultiplayerClientConfig => {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      wsUrl: '',
      roomId: 'local-room',
      playerId: 'player-1',
      displayName: 'Player 1',
    };
  }

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room')?.trim() || 'local-room';
  const wsUrl = (import.meta.env.VITE_MULTIPLAYER_WS_URL as string | undefined)?.trim() ?? '';
  const playerId = getPersistentPlayerId();
  const displayName = params.get('player')?.trim() || `Operator ${playerId.slice(-4).toUpperCase()}`;

  return {
    enabled: Boolean(wsUrl && params.get('room')),
    wsUrl,
    roomId,
    playerId,
    displayName,
  };
};
