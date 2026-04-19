import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { advanceBuildingDiscoveryTick } from '../../game/ticks/buildingDiscoveryTick';

interface UseBuildingDiscoveryArgs {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  enabled?: boolean;
}

export const useBuildingDiscovery = ({ state, setState, setNotification, enabled = true }: UseBuildingDiscoveryArgs) => {
  useEffect(() => {
    if (!enabled) return;
    setState(prev => {
      const result = advanceBuildingDiscoveryTick(prev);
      result.notifications.forEach((notification) => setNotification(notification));
      return result.nextState;
    });
  }, [enabled, state.playerPos, state.activeNPCId, state.permits, state.buildings, setNotification, setState]);
};
