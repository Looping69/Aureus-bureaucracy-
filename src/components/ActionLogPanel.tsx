/**
 * @module ActionLogPanel
 * Scrollable log of recent player actions and game events, shown in the side panel.
 */
import React from 'react';
import { Clock3, ScrollText } from 'lucide-react';

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  title: string;
  msg: string;
}

interface ActionLogPanelProps {
  entries: ActionLogEntry[];
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
  showToggle?: boolean;
}

export const ActionLogPanel: React.FC<ActionLogPanelProps> = ({
  entries,
  isOpen,
  onToggle,
  onClear,
  showToggle = true
}) => {
  return (
    <div className="fixed right-3 bottom-24 z-[90] w-72 max-w-[80vw]">
      {showToggle && (
        <button
          onClick={onToggle}
          className="ml-auto mb-2 flex items-center gap-2 bg-black text-white px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-zinc-800"
          title="Open action history"
        >
          <ScrollText size={12} />
          Log ({entries.length})
        </button>
      )}

      {isOpen && (
        <div className="bg-white/95 backdrop-blur-md border border-black/10 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/10">
            <div className="text-[10px] font-black uppercase tracking-widest">Action History</div>
            <button
              onClick={onClear}
              className="text-[10px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100"
            >
              Clear
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="px-3 py-4 text-xs italic opacity-50">No actions logged yet.</div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="px-3 py-2 border-b border-black/5 last:border-b-0">
                  <div className="flex items-center gap-1 text-[10px] font-mono uppercase opacity-50 mb-1">
                    <Clock3 size={10} />
                    <span>{entry.timestamp}</span>
                  </div>
                  <div className="text-[11px] font-black leading-tight">{entry.title}</div>
                  <div className="text-[11px] opacity-75 leading-tight">{entry.msg}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
