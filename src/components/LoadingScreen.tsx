import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  visible: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ visible }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950"
        >
          {/* Background texture */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 paper-texture opacity-5" />
            <div className="absolute -top-24 right-[-72px] w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute bottom-[-96px] left-[-56px] w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-6 px-8">
            {/* Title */}
            <div className="text-center">
              <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-white/40 mb-2">
                Bureau Archive Interface
              </p>
              <h1 className="font-serif italic font-black text-3xl text-white">
                Aureus: Below
              </h1>
            </div>

            {/* Loading bar container */}
            <div className="w-56 flex flex-col items-center gap-3">
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: 'easeInOut' }}
                />
              </div>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/50">
                Building world…
              </p>
            </div>

            {/* Decorative stamp */}
            <div className="mt-4 border-2 border-dashed border-white/15 rounded-lg px-4 py-2">
              <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-white/30">
                Sector 4 • Extraction Zone
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
