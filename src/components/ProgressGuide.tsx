import React from 'react';
import { AlertTriangle, CheckCircle2, Compass } from 'lucide-react';
import { GameState } from '../types';
import { getProgressGuidance } from '../game/progressionGuide';

export const ProgressGuide: React.FC<{ state: GameState }> = ({ state }) => {
  const guidance = React.useMemo(() => getProgressGuidance(state), [state]);

  const toneStyles = guidance.tone === 'WARN'
    ? 'bg-amber-100 text-amber-900 border-amber-300'
    : guidance.tone === 'SUCCESS'
      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
      : 'bg-sky-100 text-sky-900 border-sky-300';

  return (
    <div className={`mx-3 mt-2 rounded-xl border px-3 py-2 ${toneStyles}`}>
      <div className="flex items-start gap-2">
        {guidance.tone === 'WARN' ? (
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        ) : guidance.tone === 'SUCCESS' ? (
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
        ) : (
          <Compass size={14} className="mt-0.5 shrink-0" />
        )}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest">{guidance.title}</p>
          <p className="text-[11px] leading-tight opacity-90">{guidance.detail}</p>
        </div>
      </div>
    </div>
  );
};

