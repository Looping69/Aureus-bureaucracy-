/**
 * @module EndingOverlay
 * Full-screen ending reveal overlay shown when an ending is triggered.
 * Displays the ending title, narrative text, and consequences.
 */
import React from 'react';
import { motion } from 'motion/react';
import { Crown, Flag, Skull } from 'lucide-react';
import { getEndingById } from '../game/endings';

interface EndingOverlayProps {
  endingId: string | null;
  onClose: () => void;
}

export const EndingOverlay: React.FC<EndingOverlayProps> = ({ endingId, onClose }) => {
  const ending = getEndingById(endingId);
  if (!ending) return null;

  const icon = ending.id === 'BUREAU_TYCOON'
    ? <Crown size={24} className="text-amber-500" />
    : ending.id === 'PEOPLES_CHAMPION'
      ? <Flag size={24} className="text-emerald-500" />
      : <Skull size={24} className="text-red-500" />;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-black p-6">
        <div className="flex items-center gap-3 mb-3">
          {icon}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Ending Unlocked</p>
            <h2 className="text-xl font-black leading-tight">{ending.title}</h2>
          </div>
        </div>
        <p className="text-sm leading-relaxed italic mb-6">"{ending.description}"</p>
        <div className="mb-6 rounded-xl border border-black/10 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Route</p>
          <p className="text-[11px] leading-tight opacity-80">{ending.routeHint}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-black text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-colors"
        >
          Continue Playing
        </button>
      </div>
    </motion.div>
  );
};
