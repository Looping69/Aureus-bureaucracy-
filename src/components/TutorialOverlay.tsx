import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, MapPin, X } from 'lucide-react';
import { FtuePhase } from '../types';
import { getFtueCopy, getFtueStepNumber } from '../game/ftue';

interface TutorialOverlayProps {
  ftuePhase: FtuePhase;
  tutorialStep: number;
  tutorialMinimized: boolean;
  unreadCount?: number;
  onToggleMinimized: () => void;
  onClose: () => void;
  onStartJourney: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  ftuePhase,
  tutorialStep,
  tutorialMinimized,
  unreadCount = 0,
  onToggleMinimized,
  onClose,
  onStartJourney
}) => {
  const ftueCopy = getFtueCopy(ftuePhase);
  const stepNumber = getFtueStepNumber(ftuePhase);

  return (
    <AnimatePresence>
      {tutorialStep !== 99 && ftuePhase !== 'ftue_complete' && (
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          className="fixed left-4 top-[44%] z-50 -translate-y-1/2 pointer-events-none"
        >
          <motion.div
            animate={{ x: tutorialMinimized ? 0 : 6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="pointer-events-auto flex items-start gap-3"
          >
            <button
              onClick={onToggleMinimized}
              className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] border-2 border-black bg-[#f3c46d] text-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
              aria-label={tutorialMinimized ? 'Open objective panel' : 'Minimize objective panel'}
              title={tutorialMinimized ? 'Open objective panel' : 'Minimize objective panel'}
            >
              <MapPin size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-white px-1 text-[9px] font-black text-slate-950">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence initial={false}>
              {!tutorialMinimized && (
                <motion.div
                  key="tutorial-pill"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 224, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="overflow-hidden rounded-[24px] border border-slate-950/15 bg-slate-950/92 text-white shadow-[0_22px_50px_rgba(15,23,42,0.34)] backdrop-blur-md">
                    <div className="flex min-h-[118px] flex-col justify-between px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#f3c46d]">
                            Objective
                          </p>
                          <h3 className="mt-1 text-[12px] font-black leading-tight">
                            {ftueCopy.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1">
                          <div className="rounded-full border border-white/12 bg-white/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/72">
                            Step {stepNumber}
                          </div>
                          <button
                            onClick={onClose}
                            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label="Dismiss objective panel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 space-y-2">
                        <p className="text-[10px] font-semibold leading-snug text-white/92">
                          {ftueCopy.body}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/58">
                          {ftueCopy.hint}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        {ftuePhase === 'intro' ? (
                          <button
                            onClick={onStartJourney}
                            className="rounded-full bg-[#f3c46d] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition-colors hover:bg-[#ffd88e]"
                          >
                            Start Run
                          </button>
                        ) : (
                          <div className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/72">
                            Active now
                          </div>
                        )}

                        <button
                          onClick={onToggleMinimized}
                          className="flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          Minimize
                          <ChevronLeft size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
