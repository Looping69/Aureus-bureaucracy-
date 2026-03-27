import React from 'react';
import { motion } from 'motion/react';
import { Mine } from '../types';
import { X } from 'lucide-react';

interface MinePickerModalProps {
  show: boolean;
  mines: Mine[];
  onClose: () => void;
  onSelectMine: (mineId: string) => void;
}

export const MinePickerModal: React.FC<MinePickerModalProps> = ({
  show,
  mines,
  onClose,
  onSelectMine
}) => {
  if (!show) return null;

  return (
    <motion.div
      key="mine-picker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-5"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-black/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-sm uppercase tracking-widest">Choose Mine</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {mines.filter(m => m.discovered).map(mine => (
            <button
              key={mine.id}
              onClick={() => onSelectMine(mine.id)}
              className="w-full text-left p-3 rounded-xl border border-black/10 hover:border-black/30 hover:bg-slate-50 transition-colors"
            >
              <div className="font-bold text-sm">{mine.name}</div>
              <div className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                {mine.location} • {mine.status} • Travel {mine.travelTime}h
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

