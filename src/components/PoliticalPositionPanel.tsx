import React from 'react';
import { Landmark, ShieldBan, ChevronDown, ChevronUp, ScrollText, Telescope } from 'lucide-react';
import { GameState } from '../types';
import { getClosedRouteWarnings, getPoliticalPosition, getRunLedger } from '../game/dialogue/storyFlags';
import { getEndingForecast } from '../game/endings';

export const PoliticalPositionPanel: React.FC<{ state: GameState }> = ({ state }) => {
  const [expanded, setExpanded] = React.useState(false);
  const positions = React.useMemo(() => getPoliticalPosition(state), [state]);
  const warnings = React.useMemo(() => getClosedRouteWarnings(state), [state]);
  const ledger = React.useMemo(() => getRunLedger(state), [state]);
  const forecast = React.useMemo(() => getEndingForecast(state), [state]);

  if (positions.length === 0 && warnings.length === 0 && ledger.length === 0 && forecast.length === 0) {
    return null;
  }

  return (
    <div className="mx-3 mt-2 rounded-xl border border-black/10 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-md">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Landmark size={14} className="text-slate-700" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Political Position</p>
            <p className="text-[11px] leading-tight text-slate-700">
              {positions.length} deals, {warnings.length} locked routes, {ledger.length} ledger entries
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {forecast.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <Telescope size={12} />
                <p className="text-[10px] font-black uppercase tracking-widest">Ending Forecast</p>
              </div>
              {forecast.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border px-2 py-2 ${
                    item.status === 'ALIVE'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : item.status === 'THREATENED'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest">{item.title}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest">{item.status}</p>
                  </div>
                  <p className="text-[11px] leading-tight opacity-90">{item.detail}</p>
                </div>
              ))}
            </div>
          )}

          {positions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Deals</p>
              {positions.map((item) => (
                <div key={item.id} className={`rounded-lg border px-2 py-2 ${item.toneClassName}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest">{item.label}</p>
                  <p className="text-[11px] leading-tight opacity-90">{item.detail}</p>
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldBan size={12} />
                <p className="text-[10px] font-black uppercase tracking-widest">Locked Routes</p>
              </div>
              {warnings.map((item) => (
                <div key={item.id} className={`rounded-lg border px-2 py-2 ${item.toneClassName}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest">{item.label}</p>
                  <p className="text-[11px] leading-tight opacity-90">{item.detail}</p>
                  {item.causedBy && item.causedBy.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {item.causedBy.map((cause) => (
                        <p key={cause} className="text-[10px] leading-tight opacity-80">
                          Caused by: {cause}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {ledger.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <ScrollText size={12} />
                <p className="text-[10px] font-black uppercase tracking-widest">Run Ledger</p>
              </div>
              {ledger.map((item) => (
                <div key={item.id} className={`rounded-lg border px-2 py-2 ${item.toneClassName}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest">{item.decision}</p>
                  <p className="text-[11px] leading-tight opacity-90">{item.consequence}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
