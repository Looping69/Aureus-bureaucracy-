import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bug, Map, ScrollText, SlidersHorizontal, X } from 'lucide-react';

interface UtilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenActionLog: () => void;
  onOpenDebug: () => void;
  onOpenPlanner?: () => void;
  showPlanner?: boolean;
}

export const UtilityDrawer: React.FC<UtilityDrawerProps> = ({
  isOpen,
  onClose,
  onOpenActionLog,
  onOpenDebug,
  onOpenPlanner,
  showPlanner = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close utilities"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[105] bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-4 bottom-24 z-[110] rounded-[28px] border border-white/10 bg-slate-950/95 text-white shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-amber-300" />
                <div className="text-[11px] font-black uppercase tracking-[0.24em]">Config</div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
                title="Close config"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-3 grid grid-cols-1 gap-2">
              <button
                onClick={onOpenActionLog}
                className="flex items-center gap-3 rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-left"
              >
                <ScrollText size={16} className="text-sky-300" />
                <div>
                  <div className="text-sm font-black uppercase tracking-wider">Action Log</div>
                  <div className="text-[11px] opacity-65">Open the run history and recent notifications.</div>
                </div>
              </button>

              <button
                onClick={onOpenDebug}
                className="flex items-center gap-3 rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-left"
              >
                <Bug size={16} className="text-lime-300" />
                <div>
                  <div className="text-sm font-black uppercase tracking-wider">Debug</div>
                  <div className="text-[11px] opacity-65">Open telemetry, FPS, and state timing details.</div>
                </div>
              </button>

              {showPlanner && onOpenPlanner && (
                <button
                  onClick={onOpenPlanner}
                  className="flex items-center gap-3 rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-left"
                >
                  <Map size={16} className="text-amber-300" />
                  <div>
                    <div className="text-sm font-black uppercase tracking-wider">World Editor</div>
                    <div className="text-[11px] opacity-65">Open the overhead authoring layer for buildings, NPC anchors, and blocked pathing zones.</div>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
