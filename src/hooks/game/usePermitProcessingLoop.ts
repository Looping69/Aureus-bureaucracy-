import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { advancePermitProcessingTick } from '../../game/ticks/permitTick';

interface UsePermitProcessingLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  enabled?: boolean;
}

export const usePermitProcessingLoop = ({ setState, setNotification, enabled = true }: UsePermitProcessingLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setState(prev => {
        const result = advancePermitProcessingTick(prev);
        result.notifications.forEach((notification) => setNotification(notification));
        return result.nextState;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [enabled, setNotification, setState]);
};
