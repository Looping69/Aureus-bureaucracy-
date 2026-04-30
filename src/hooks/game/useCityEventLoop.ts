import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';
import { maybeSelectCityIncident } from '../../game/cityIncidents';

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
        const hourKey = (prev.day * 24) + Math.floor(prev.time);
        if (hourKey === prev.lastCityEventHour) return prev;

        const roll = Math.random();
        const chance = 0.22;
        if (roll > chance) {
          return { ...prev, lastCityEventHour: hourKey };
        }

        const next = maybeSelectCityIncident(prev, hourKey);
        if (next.activeCityIncident && next.activeCityIncident !== prev.activeCityIncident) {
          setNotification({
            title: 'District Incident',
            msg: next.activeCityIncident.title,
          });
        }
        return next;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [enabled, setNotification, setState]);
};
