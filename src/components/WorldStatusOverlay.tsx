import React from 'react';
import { GameState } from '../types';

const phaseCopy: Record<GameState['rescueMission']['phase'], string> = {
  IDLE: 'Field stable',
  DISPATCHED: 'Dispatch live',
  TEAM_STAGING: 'Medics en route',
  REVIVING: 'Revival in progress',
  TRANSPORTING: 'Transport underway',
  RECOVERING: 'Recovery window',
};

export const WorldStatusOverlay = ({ state }: { state: GameState }) => {
  const rescueActive = state.rescueMission.phase !== 'IDLE';

  return (
    <>
      {rescueActive && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">
              {phaseCopy[state.rescueMission.phase]}
            </span>
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-white">
              {state.rescueMission.assignedMedicIds.length} medics
            </span>
          </div>
        </div>
      )}
    </>
  );
};
