import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, FolderClock, Save } from 'lucide-react';
import { SaveSlotId, SaveSlotSummary } from '../game/save';
import { getWorldProfile } from '../game/worldProfiles';

interface SaveArchiveScreenProps {
  saveSlots: SaveSlotSummary[];
  onBack: () => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
}

const formatTime = (time: number) => {
  const hour = Math.floor(time) % 24;
  const minutes = Math.floor((time % 1) * 60);
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const formatSavedAt = (savedAt: string) =>
  new Date(savedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const SaveArchiveScreen: React.FC<SaveArchiveScreenProps> = ({
  saveSlots,
  onBack,
  onLoadSlot,
}) => {
  const populatedSlots = saveSlots.filter((slot) => slot.state !== null);

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
          key="archive"
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
                    Save Archive
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-full border border-white/20 bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  aria-label="Back to start screen"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-snug text-white/72">
                Archive status lives here now. Pick the file you want to restore and get back underground.
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
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {populatedSlots.length === 0 ? 'No archive files on record' : `${populatedSlots.length} file${populatedSlots.length === 1 ? '' : 's'} ready to restore`}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {populatedSlots.length === 0
                        ? 'There is nothing to load yet. Start a new world and the archive will populate once autosave lands.'
                        : 'Choose the file you want to restore. Each entry shows the world, day, funds, ore, and last archive timestamp.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                <div className="mb-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-slate-500">
                    Save Files
                  </p>
                </div>

                <div className="space-y-2">
                  {saveSlots.map((slot) => {
                    const saveState = slot.state;
                    const isEmpty = saveState === null;

                    return (
                      <button
                        key={slot.slotId}
                        type="button"
                        onClick={() => !isEmpty && onLoadSlot(slot.slotId)}
                        disabled={isEmpty}
                        className={`w-full rounded-[18px] border px-3 py-3 flex items-center justify-between gap-2 text-left transition-all ${
                          isEmpty
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'border-slate-950 bg-slate-950 text-white shadow-lg active:scale-[0.99]'
                        }`}
                      >
                        <span className="flex items-start gap-2 min-w-0">
                          <span className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isEmpty ? 'bg-slate-200 text-slate-400' : 'bg-white/10 text-white'}`}>
                            <Save size={14} />
                          </span>
                          <span className="min-w-0">
                            <span className={`block text-[11px] font-black uppercase tracking-[0.14em] ${isEmpty ? 'text-slate-500' : 'text-white'}`}>
                              {slot.label}
                            </span>
                            <span className={`mt-0.5 block text-[9px] uppercase tracking-[0.14em] ${isEmpty ? 'text-slate-400' : 'text-white/75'}`}>
                              {isEmpty ? 'Empty archive slot' : getWorldProfile(saveState.worldProfileId).title}
                            </span>
                            <span className={`mt-1 block text-[9px] leading-[1.35] ${isEmpty ? 'text-slate-400' : 'text-white/60'}`}>
                              {isEmpty
                                ? 'No save file stored in this slot yet.'
                                : `${getWorldProfile(saveState.worldProfileId).tag}. Day ${saveState.day} at ${formatTime(saveState.time)}. Funds $${Math.round(saveState.money)}. Ore ${saveState.ore}. Exposure ${Math.round(saveState.meters.exposure)}%. Saved ${slot.savedAt ? formatSavedAt(slot.savedAt) : 'just now'}.`}
                            </span>
                          </span>
                        </span>
                        <ChevronRight size={14} className="shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="px-2 text-center text-[10px] font-mono uppercase tracking-[0.26em] text-slate-500">
            Archive files remember what the Bureau hopes you forget.
          </div>
        </motion.div>
      </div>
    </div>
  );
};
