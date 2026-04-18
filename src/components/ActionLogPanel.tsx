import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookText, Clock3 } from 'lucide-react';

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  title: string;
  msg: string;
  unread?: boolean;
}

interface ActionLogPanelProps {
  entries: ActionLogEntry[];
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
  showToggle?: boolean;
}

export const ActionLogPanel: React.FC<ActionLogPanelProps> = ({
  entries,
  unreadCount,
  isOpen,
  onToggle,
  onClear,
  showToggle = true,
}) => {
  return (
    <div className="fixed left-4 top-[58%] z-[92] flex max-w-[calc(100vw-2rem)] items-start gap-3">
      <button
        onClick={onToggle}
        className={`relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] border-2 border-black bg-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition-transform active:scale-[0.97] ${
          showToggle ? 'hover:-translate-y-0.5' : ''
        }`}
        title="Open story ledger"
        aria-label={isOpen ? 'Close story ledger' : 'Open story ledger'}
      >
        <BookText size={20} className="text-[#6b86b6]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#ef4444] px-1 text-[9px] font-black text-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -12, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-[min(18rem,calc(100vw-6.75rem))] overflow-hidden rounded-[24px] border border-black/10 bg-white/96 shadow-[0_22px_44px_rgba(15,23,42,0.2)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.24em] text-black/40">Story</div>
                <div className="text-sm font-black tracking-tight text-black">Ledger</div>
              </div>
              <button
                onClick={onClear}
                className="text-[10px] font-black uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-black"
              >
                Clear
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {entries.length === 0 ? (
                <div className="px-4 py-5 text-xs italic text-black/45">Nothing logged yet.</div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`border-b border-black/5 px-4 py-3 last:border-b-0 ${
                      entry.unread ? 'bg-amber-50/70' : 'bg-transparent'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase text-black/45">
                      <Clock3 size={10} />
                      <span>{entry.timestamp}</span>
                      {entry.unread && <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" />}
                    </div>
                    <div className="text-[11px] font-black leading-tight text-black">{entry.title}</div>
                    <div className="mt-1 text-[11px] leading-tight text-black/70">{entry.msg}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
