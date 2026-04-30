import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { CityIncident } from '../types';

interface CityIncidentOverlayProps {
  incident: CityIncident;
  onChoose: (choiceId: string) => void;
}

export const CityIncidentOverlay: React.FC<CityIncidentOverlayProps> = ({
  incident,
  onChoose,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.97 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
    className="fixed inset-0 z-[98] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
  >
    <div className="w-full max-w-md overflow-hidden rounded-[28px] border-[3px] border-black bg-white shadow-2xl">
      <div className="border-b-[3px] border-black bg-amber-300 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-amber-300 shadow-sm">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/55">District Incident</p>
            <h2 className="mt-1 text-xl font-black leading-none tracking-tight text-black">{incident.title}</h2>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold leading-snug text-slate-900">{incident.description}</p>
          <p className="mt-2 text-xs font-semibold leading-snug text-slate-600">{incident.trigger}</p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {incident.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={!!choice.disabledReason}
              onClick={() => onChoose(choice.id)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-45 disabled:hover:text-black"
            >
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em]">{choice.label}</div>
                <p className="mt-1 text-[11px] font-semibold leading-snug opacity-75">{choice.detail}</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] opacity-55">
                  {choice.disabledReason ?? choice.effectLabel}
                </p>
              </div>
              <ChevronRight size={16} className="shrink-0 opacity-45" />
            </button>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);
