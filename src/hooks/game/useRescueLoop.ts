import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { advanceRescueMission } from '../../game/staminaRescue';

interface UseRescueLoopArgs {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; msg: string } | null>>;
  enabled?: boolean;
}

export const useRescueLoop = ({
  setState,
  setNotification,
  enabled = true,
}: UseRescueLoopArgs) => {
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      setState((prev) => {
        const { nextState, notifications } = advanceRescueMission(prev, 0.2);
        if (notifications.length > 0) {
          const nextNotification = notifications[notifications.length - 1];
          setNotification(nextNotification);
        }
        return nextState;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [enabled, setNotification, setState]);
};
