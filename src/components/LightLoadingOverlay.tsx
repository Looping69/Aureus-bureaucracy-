import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface LightLoadingOverlayProps {
  visible?: boolean;
  message?: string;
}

export const LightLoadingOverlay: React.FC<LightLoadingOverlayProps> = ({
  visible = true,
  message = 'Loading Scene...',
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="light-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-0 z-[180] flex items-center justify-center bg-[#eef2f6]/96 backdrop-blur-sm"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 paper-texture opacity-10" />
            <motion.div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/80 to-transparent"
              animate={{ x: ['-25%', '125%'] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex flex-col items-center gap-4"
          >
            <div className="w-40 h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-300 via-slate-400 to-slate-300"
                animate={{ x: ['-55%', '155%'] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '40%' }}
              />
            </div>
            <p className="text-center text-[12px] font-mono uppercase tracking-[0.26em] text-slate-500">
              {message}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
