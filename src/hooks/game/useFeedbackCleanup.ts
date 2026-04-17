import { useEffect } from 'react';
import React from 'react';
import { GameState } from '../../types';

export const useFeedbackCleanup = (
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setState(prev => {
        const expiredRelationshipFeedback = prev.feedbacks.some(f => now - f.timestamp > 3000);
        const expiredPlayerFeedback = prev.playerFeedbacks.some(f => now - f.timestamp > 1200);
        if (!expiredRelationshipFeedback && !expiredPlayerFeedback) return prev;
        return {
          ...prev,
          feedbacks: prev.feedbacks.filter(f => now - f.timestamp <= 3000),
          playerFeedbacks: prev.playerFeedbacks.filter(f => now - f.timestamp <= 1200)
        };
      });
    }, 500);
    return () => clearInterval(timer);
  }, [enabled, setState]);
};
