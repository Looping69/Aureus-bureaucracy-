/**
 * @module DebugPanel
 * Developer debug panel showing raw game state values: meters, timers, active
 * effects, and story flags.  Hidden in production builds.
 */
import React from 'react';
import { Activity, Bug, Gauge, TimerReset } from 'lucide-react';
import { GameState } from '../types';
import { useFps } from '../hooks/useFps';

interface DebugPanelProps {
  state: GameState;
  stateUpdates: number;
  lastAction: string;
  lastActionMs: number;
  onResetStateCounter: () => void;
  isOpen: boolean;
  onToggle: () => void;
  showToggle?: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  state,
  stateUpdates,
  lastAction,
  lastActionMs,
  onResetStateCounter,
  isOpen,
  onToggle,
  showToggle = true
}) => {
  const fps = useFps();

  return (
    <div className="fixed left-3 bottom-24 z-[95] w-72 max-w-[80vw]">
      {showToggle && (
        <button
          onClick={onToggle}
          className="mb-2 flex items-center gap-2 bg-slate-900 text-lime-300 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black"
          title="Toggle telemetry panel"
        >
          <Bug size={12} />
          Debug
        </button>
      )}

      {isOpen && (
        <div className="bg-slate-950/95 text-lime-300 border border-lime-500/30 rounded-2xl p-3 shadow-2xl font-mono">
          <div className="text-[10px] uppercase tracking-widest font-black mb-2 opacity-80">Telemetry</div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-black/40 rounded-lg p-2">
              <div className="flex items-center gap-1 opacity-70"><Gauge size={10} /> FPS</div>
              <div className="text-lg font-black">{fps}</div>
            </div>
            <div className="bg-black/40 rounded-lg p-2">
              <div className="flex items-center gap-1 opacity-70"><Activity size={10} /> Updates</div>
              <div className="text-lg font-black">{stateUpdates}</div>
            </div>
          </div>

          <div className="mt-2 bg-black/40 rounded-lg p-2 text-[11px]">
            <div className="opacity-70">Last Action</div>
            <div className="font-black truncate">{lastAction}</div>
            <div className="opacity-80">{lastActionMs.toFixed(2)} ms</div>
          </div>

          <div className="mt-2 bg-black/40 rounded-lg p-2 text-[11px]">
            <div>Scene: <span className="font-black">{state.currentScene}</span></div>
            <div>Day/Time: <span className="font-black">{state.day} / {state.time.toFixed(2)}</span></div>
            <div>Energy: <span className="font-black">{state.energy.toFixed(1)}</span></div>
            <div>Stamina: <span className="font-black">{state.stamina.current.toFixed(1)}</span></div>
            <div>Status: <span className="font-black">{state.playerStatus.condition}</span></div>
            <div>Money: <span className="font-black">${state.money}</span></div>
          </div>

          <button
            onClick={onResetStateCounter}
            className="mt-2 w-full bg-lime-400 text-black rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-lime-300 flex items-center justify-center gap-1"
          >
            <TimerReset size={12} />
            Reset Counter
          </button>
        </div>
      )}
    </div>
  );
};
