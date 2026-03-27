import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, FolderClock, Pickaxe, Save } from 'lucide-react';
import { GameState } from '../types';

interface StartScreenProps {
  hasSave: boolean;
  savePreview: GameState | null;
  onNewGame: () => void;
  onContinue: () => void;
}

const formatTime = (time: number) => {
  const hour = Math.floor(time) % 24;
  const minutes = Math.floor((time % 1) * 60);
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const StartScreen: React.FC<StartScreenProps> = ({
  hasSave,
  savePreview,
  onNewGame,
  onContinue
}) => {
  return (
    <div className="min-h-[100dvh] bg-[#d7dbdf] text-slate-950 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 paper-texture opacity-20" />
        <div className="absolute -top-24 right-[-72px] w-72 h-72 rounded-full bg-[#7b554c]/20 blur-3xl" />
        <div className="absolute bottom-[-96px] left-[-56px] w-80 h-80 rounded-full bg-[#8fa1ad]/25 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/65 to-transparent" />
      </div>

      <div className="relative z-10 min-h-[100dvh] max-w-md mx-auto px-5 py-8 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 flex flex-col justify-center gap-6"
        >
          <div className="rounded-[28px] border border-black/10 bg-white/70 backdrop-blur-md shadow-[0_20px_80px_rgba(15,23,42,0.12)] overflow-hidden">
            <div className="px-6 pt-6 pb-5 border-b border-black/10 bg-gradient-to-r from-slate-950 via-slate-800 to-[#334155] text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-white/55 mb-2">
                    Bureau Archive Interface
                  </p>
                  <h1 className="font-serif italic font-black text-[2.2rem] leading-none">
                    Aureus: Below
                  </h1>
                </div>
                <div className="stamp !border-[#f3c46d] !text-[#f3c46d] !rotate-[11deg] text-[9px]">
                  Licensed Entry
                </div>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-snug text-white/72">
                Prospect, bribe, comply, or burn the whole system down. Pick up a run or start a fresh file.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
                    <FolderClock size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-slate-500">
                      Archive Status
                    </p>
                    {hasSave && savePreview ? (
                      <>
                        <p className="mt-1 text-sm font-black text-slate-900">
                          Save file found
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          Day {savePreview.day} at {formatTime(savePreview.time)}. Funds ${Math.round(savePreview.money)}. Ore {savePreview.ore}. Exposure {Math.round(savePreview.meters.exposure)}%.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-sm font-black text-slate-900">
                          No previous run on file
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          Start a new case file and we will begin from your house at the center of the basin.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={onNewGame}
                  className="w-full rounded-2xl border-2 border-slate-950 bg-slate-950 text-white px-4 py-4 shadow-lg flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                      <Pickaxe size={18} />
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-black uppercase tracking-widest">New Game</span>
                      <span className="block text-[11px] text-white/65">
                        Open a fresh file and overwrite the old run.
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0" />
                </button>

                <button
                  onClick={onContinue}
                  disabled={!hasSave}
                  className={`w-full rounded-2xl border px-4 py-4 flex items-center justify-between gap-3 transition-all ${
                    hasSave
                      ? 'border-[#8fa1ad] bg-[#edf2f5] text-slate-900 shadow-md active:scale-[0.99]'
                      : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${hasSave ? 'bg-white text-slate-800' : 'bg-slate-200 text-slate-400'}`}>
                      <Save size={18} />
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-black uppercase tracking-widest">Continue</span>
                      <span className="block text-[11px] opacity-70">
                        {hasSave ? 'Resume your last saved run.' : 'No save available yet.'}
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-2 text-center text-[10px] font-mono uppercase tracking-[0.26em] text-slate-500">
            Extraction rights are temporary. Consequences are not.
          </div>
        </motion.div>
      </div>
    </div>
  );
};
