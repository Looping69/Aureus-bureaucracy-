import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { advanceCityEventTick } from '../../game/ticks/cityEventTick';

interface UseCityEventLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  enabled?: boolean;
}

export const useCityEventLoop = ({ setState, setNotification, enabled = true }: UseCityEventLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setState(prev => {
        const result = advanceCityEventTick(prev);
        if (result.notification) {
          setNotification(result.notification);
        }
        return result.nextState;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [enabled, setNotification, setState]);
};
