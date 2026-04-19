import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { advanceTimeTick } from '../../game/ticks/timeTick';

interface UseTimeAndCurfewLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  homePos: { x: number; y: number };
  enabled?: boolean;
}

export const useTimeAndCurfewLoop = ({ setState, setNotification, homePos, enabled = true }: UseTimeAndCurfewLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setState(prev => {
        const result = advanceTimeTick(prev, homePos);
        result.notifications.forEach((notification) => setNotification(notification));
        return result.nextState;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [enabled, homePos.x, homePos.y, setNotification, setState]);
};
