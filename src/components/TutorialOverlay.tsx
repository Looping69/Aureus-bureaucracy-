/**
 * @module TutorialOverlay
 * Collapsible tutorial overlay shown during the early game.
 * Steps through guided instructions matched to tutorialStep in GameState.
 * Can be minimised to a tab by the player.
 */
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface TutorialOverlayProps {
  tutorialStep: number;
  tutorialMinimized: boolean;
  onToggleMinimized: () => void;
  onClose: () => void;
  onStartJourney: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  tutorialStep,
  tutorialMinimized,
  onToggleMinimized,
  onClose,
  onStartJourney
}) => {
  return (
    <AnimatePresence>
      {tutorialStep < 8 && tutorialStep >= 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-50 pointer-events-none flex justify-center"
        >
          <div className={`bg-blue-600 text-white rounded-xl shadow-2xl border-2 border-white/20 flex flex-col pointer-events-auto transition-all duration-300 w-full max-w-sm overflow-hidden ${tutorialMinimized ? 'h-10' : 'p-4'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-[10px] ${tutorialMinimized ? 'ml-2' : ''}`}>
                {tutorialStep + 1}
              </div>

              <div className="flex-1 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-widest text-[10px] text-blue-200">
                  {tutorialMinimized ? `Tutorial: Step ${tutorialStep + 1}` : 'Onboarding'}
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
                    {tutorialStep === 0 && "They won't process anything until you step inside. Head east."}
                    {tutorialStep === 1 && 'The Bureau is right there. Go.'}
                    {tutorialStep === 2 && 'Officer Vane controls the permits. Talk to him.'}
                    {tutorialStep === 3 && "Vane authorized Form 17-B. Open the 'Active Filings' list."}
                    {tutorialStep === 4 && "Select 'Extraction Intent' and Submit Filing."}
                    {tutorialStep === 5 && 'Processing...'}
                    {tutorialStep === 6 && 'Rejected. Of course. Talk to Vane again — find his angle.'}
                    {tutorialStep === 7 && "Use your knowledge of Vane's desire for status to get approved."}
                  </p>

                  {tutorialStep === 0 && (
                    <button
                      onClick={onStartJourney}
                      className="mt-3 px-3 py-1.5 bg-white text-blue-600 rounded-lg font-black text-[10px] uppercase hover:bg-blue-50 transition-colors"
                    >
                      Go
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

