/**
 * @module TutorialOverlay
 * Collapsible tutorial guide shown during the early game.
 * Positioned at the top-left of the screen.  When minimised it collapses into
 * a small icon button on the left edge that the player can tap to reopen.
 */
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, ChevronLeft, X } from 'lucide-react';

interface TutorialOverlayProps {
  tutorialStep: number;
  tutorialMinimized: boolean;
  onToggleMinimized: () => void;
  onClose: () => void;
  onStartJourney: () => void;
}

const STEP_TEXT: Record<number, string> = {
  0: "You need a mining permit before you can extract anything. The Bureau of Extraction is east — head over there.",
  1: 'The Bureau is right there. Go.',
  2: 'Officer Vane controls the permits. Talk to him.',
  3: "Vane authorized Form 17-B. Open the 'Active Filings' list.",
  4: "Select 'Extraction Intent' and Submit Filing.",
  5: 'Processing…',
  6: 'Rejected. Of course. Talk to Vane again — find his angle.',
  7: "Use your knowledge of Vane's desire for status to get approved.",
};

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  tutorialStep,
  tutorialMinimized,
  onToggleMinimized,
  onClose,
  onStartJourney,
}) => {
  if (tutorialStep < 0 || tutorialStep >= 8) return null;

  const text = STEP_TEXT[tutorialStep] ?? '';

  return (
    <AnimatePresence mode="wait">
      {tutorialMinimized ? (
        /* ── Collapsed: icon button on the left edge ──────────────── */
        <motion.button
          key="tutorial-icon"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          onClick={onToggleMinimized}
          className="fixed top-28 left-2 z-50 w-9 h-9 rounded-full bg-blue-600 text-white shadow-lg border-2 border-white/20 flex items-center justify-center pointer-events-auto hover:bg-blue-700 transition-colors"
          title={`Tutorial: Step ${tutorialStep + 1}`}
        >
          <BookOpen size={16} />
        </motion.button>
      ) : (
        /* ── Expanded: compact banner at the top-left ─────────────── */
        <motion.div
          key="tutorial-panel"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-28 left-2 z-50 pointer-events-auto"
          style={{ maxWidth: 'min(20rem, calc(100vw - 4rem))' }}
        >
          <div className="bg-blue-600 text-white rounded-xl shadow-lg border-2 border-white/20 px-3 py-2.5 flex flex-col gap-1.5">
            {/* Header row */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-[9px]">
                {tutorialStep + 1}
              </div>
              <span className="flex-1 font-black uppercase tracking-widest text-[9px] text-blue-200">
                Guide
              </span>
              <button
                onClick={onToggleMinimized}
                className="p-0.5 hover:bg-white/10 rounded transition-colors"
                title="Collapse"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={onClose}
                className="p-0.5 hover:bg-white/10 rounded transition-colors"
                title="Dismiss tutorial"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <p className="text-[11px] font-semibold leading-snug">{text}</p>

            {tutorialStep === 0 && (
              <button
                onClick={onStartJourney}
                className="self-start mt-0.5 px-3 py-1 bg-white text-blue-600 rounded-lg font-black text-[10px] uppercase hover:bg-blue-50 transition-colors"
              >
                Go
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

