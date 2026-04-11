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
  const staminaPct = Math.max(0, Math.min(100, (state.stamina.current / state.stamina.max) * 100));
  const rescueActive = state.rescueMission.phase !== 'IDLE';

  return (
    <div className="absolute left-4 right-16 top-20 z-30 flex flex-col gap-3 pointer-events-none">
      <div className="rounded-2xl border border-black/10 bg-white/90 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/45">Stamina</p>
            <p className="mt-1 text-xl font-black text-black">{Math.round(state.stamina.current)} / {state.stamina.max}</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
            state.playerStatus.condition === 'ACTIVE'
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-600 text-white'
          }`}>
            {state.playerStatus.condition === 'ACTIVE' ? 'Mobile' : state.playerStatus.condition}
          </div>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              staminaPct < 18 ? 'bg-rose-600' : staminaPct < 40 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${staminaPct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] font-semibold text-black/55">
          Running drains stamina. Hold still or rest at home to regenerate.
        </p>
      </div>

      {rescueActive && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50/95 p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-700">Medical Rescue</p>
              <p className="mt-1 text-sm font-black text-rose-950">{phaseCopy[state.rescueMission.phase]}</p>
            </div>
            <div className="rounded-full bg-rose-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
              {state.rescueMission.assignedMedicIds.length} medics
            </div>
          </div>
          <p className="mt-2 text-xs font-semibold text-rose-900/80">
            Movement is locked until the rescue sequence finishes.
          </p>
        </div>
      )}
    </div>
  );
};
