import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  visible: boolean;
}

const LOADING_PHASES: { threshold: number; text: string }[] = [
  { threshold: 0,   text: 'Initializing Bureau Systems…' },
  { threshold: 20,  text: 'Constructing City Grid…' },
  { threshold: 40,  text: 'Deploying Field Personnel…' },
  { threshold: 60,  text: 'Processing Paperwork…' },
  { threshold: 80,  text: 'Finalizing Sector Reports…' },
  { threshold: 100, text: 'Access Granted' },
];

const PROGRESS_DURATION_MS = 3000;
const REVERSED_PHASES = [...LOADING_PHASES].reverse();

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ visible }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(LOADING_PHASES[0].text);

  useEffect(() => {
    if (!visible) return;

    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / PROGRESS_DURATION_MS) * 100), 100);
      setProgress(pct);

      const current = REVERSED_PHASES.find(p => pct >= p.threshold);
      if (current) setPhase(current.text);

      if (pct >= 100) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-slate-950"
        >
          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 paper-texture opacity-5" />
            <motion.div
              className="absolute -top-24 right-[-72px] w-96 h-96 rounded-full bg-amber-500/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-[-96px] left-[-56px] w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl"
              animate={{ scale: [1, 1.15, 1], x: [0, -20, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-8 px-8 w-full max-w-sm">
            {/* Title */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-white/40 mb-2">
                Bureau Archive Interface
              </p>
              <h1 className="font-serif italic font-black text-4xl text-white">
                Aureus: Below
              </h1>
            </motion.div>

            {/* Progress section */}
            <motion.div
              className="w-full flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Progress bar */}
              <div className="w-full">
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.15 }}
                  />
                </div>
                {/* Progress text */}
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[11px] font-mono text-white/50 truncate mr-2">
                    {phase}
                  </p>
                  <p className="text-[11px] font-mono text-amber-400/80 tabular-nums shrink-0">
                    {progress}%
                  </p>
                </div>
              </div>

              {/* Animated dots */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-amber-400/60"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: 'easeInOut'
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Decorative stamp */}
            <motion.div
              className="mt-2 border-2 border-dashed border-white/15 rounded-lg px-5 py-2.5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-white/30 text-center">
                Sector 4 • Extraction Zone
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
