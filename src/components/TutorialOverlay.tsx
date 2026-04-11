import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { FtuePhase } from '../types';
import { getFtueCopy, getFtueStepNumber } from '../game/ftue';

interface TutorialOverlayProps {
  ftuePhase: FtuePhase;
  tutorialStep: number;
  tutorialMinimized: boolean;
  onToggleMinimized: () => void;
  onClose: () => void;
  onStartJourney: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  ftuePhase,
  tutorialStep,
  tutorialMinimized,
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
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-50 pointer-events-none flex justify-center"
        >
          <div className={`bg-blue-700 text-white rounded-xl shadow-2xl border-2 border-white/20 flex flex-col pointer-events-auto transition-all duration-300 w-full max-w-sm overflow-hidden ${tutorialMinimized ? 'h-10' : 'p-4'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-[10px] ${tutorialMinimized ? 'ml-2' : ''}`}>
                {stepNumber}
              </div>

              <div className="flex-1 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-widest text-[10px] text-blue-200">
                  {tutorialMinimized ? `Directive ${stepNumber}` : ftueCopy.title}
                </h3>

                <div className="flex items-center gap-1">
                  <button onClick={onToggleMinimized} className="p-1 hover:bg-white/10 rounded transition-colors">
                    {tutorialMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            {!tutorialMinimized && (
              <div className="mt-3 flex gap-4 items-start">
                <div className="flex-1">
                  <p className="text-xs font-bold leading-tight">
                    {ftueCopy.body}
                  </p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/90">
                    {ftueCopy.hint}
                  </p>

                  {ftuePhase === 'intro' && (
                    <button
                      onClick={onStartJourney}
                      className="mt-3 px-3 py-1.5 bg-white text-blue-600 rounded-lg font-black text-[10px] uppercase hover:bg-blue-50 transition-colors"
                    >
                      Start Journey
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
