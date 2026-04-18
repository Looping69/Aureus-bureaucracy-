import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Pickaxe, Save } from 'lucide-react';
import { WorldProfileId } from '../types';
import { WorldProfileSummary } from '../game/worldProfiles';

interface StartScreenProps {
  hasSave: boolean;
  worldProfiles: WorldProfileSummary[];
  onStartWorld: (worldProfileId: WorldProfileId) => void;
  onContinue: () => void;
  onOpenPlanner?: () => void;
  showPlannerAccess?: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  hasSave,
  worldProfiles,
  onStartWorld,
  onContinue,
  onOpenPlanner,
  showPlannerAccess = false,
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
          key="menu"
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
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-slate-500">
                            World Files
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {worldProfiles.map((profile) => (
                          <button
                            key={profile.id}
                            onClick={() => onStartWorld(profile.id)}
                            className="w-full rounded-[18px] border-2 border-slate-950 bg-slate-950 text-white px-3 py-2.5 shadow-lg flex items-center justify-between gap-2 active:scale-[0.99] transition-transform"
                          >
                            <span className="flex items-start gap-2">
                              <span className="mt-0.5 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <Pickaxe size={12} />
                              </span>
                              <span className="text-left leading-none">
                                <span className="block text-[11px] font-black uppercase tracking-[0.14em]">{profile.tag}</span>
                                <span className="mt-0.5 block text-[9px] uppercase tracking-[0.14em] text-white/75">{profile.title}</span>
                              </span>
                            </span>
                            <ChevronRight size={14} className="shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={onContinue}
                      disabled={!hasSave}
                      className={`w-full rounded-[18px] border px-3 py-2.5 flex items-center justify-between gap-2 transition-all ${
                        hasSave
                          ? 'border-[#8fa1ad] bg-[#edf2f5] text-slate-900 shadow-md active:scale-[0.99]'
                          : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasSave ? 'bg-white text-slate-800' : 'bg-slate-200 text-slate-400'}`}>
                          <Save size={14} />
                        </span>
                        <span className="text-left leading-none">
                          <span className="block text-[11px] font-black uppercase tracking-[0.14em]">Continue</span>
                          <span className="mt-0.5 block text-[9px] opacity-70">
                            {hasSave ? 'Choose which archive file to restore.' : 'No save available yet.'}
                          </span>
                        </span>
                      </span>
                      <ChevronRight size={14} className="shrink-0" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-2 text-center text-[10px] font-mono uppercase tracking-[0.26em] text-slate-500">
                Extraction rights are temporary. Consequences are not.
              </div>

              {showPlannerAccess && onOpenPlanner && (
                <button
                  type="button"
                  onClick={onOpenPlanner}
                  className="self-end mr-2 text-[9px] font-mono uppercase tracking-[0.24em] text-slate-500/55 hover:text-slate-700/80 transition-colors"
                  aria-label="Open world editor"
                  title="Open world editor"
                >
                  editor
                </button>
              )}
        </motion.div>
      </div>
    </div>
  );
};
