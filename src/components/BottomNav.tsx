import React from 'react';
import { Briefcase, Pickaxe, TrendingUp, Users } from 'lucide-react';
import { GameState } from '../types';

interface BottomNavProps {
  state: GameState;
  onOpenMine: () => void;
  onOpenWorld: () => void;
  onOpenOffice: () => void;
  onExport: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  state,
  onOpenMine,
  onOpenWorld,
  onOpenOffice,
  onExport
}) => {
  return (
    <nav className="shrink-0 pb-[env(safe-area-inset-bottom)] bg-white/80 backdrop-blur-xl border-t border-black/10 flex justify-around items-center p-4 z-40">
      <button
        onClick={onOpenMine}
        className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${state.currentScene === 'MINE' ? 'text-black' : 'text-black/30'}`}
      >
        <Pickaxe size={22} />
        <span className="text-[9px] font-black uppercase tracking-widest">Mine</span>
      </button>
      <button
        onClick={onOpenWorld}
        className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${state.currentScene === 'WORLD' ? 'text-black' : 'text-black/30'}`}
      >
        <Users size={22} />
        <span className="text-[9px] font-black uppercase tracking-widest">World</span>
      </button>
      {state.currentScene === 'OFFICE' && (
        <button
          onClick={onOpenOffice}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${state.currentScene === 'OFFICE' ? 'text-black' : 'text-black/30'}`}
        >
          <Briefcase size={22} />
          <span className="text-[9px] font-black uppercase tracking-widest">Office</span>
        </button>
      )}
      <button
        onClick={onExport}
        title="Export all ore. Price and exposure depend on your license and influence."
        className="flex flex-col items-center gap-1 text-black/30 hover:text-emerald-600 active:scale-90 transition-all"
      >
        <TrendingUp size={22} />
        <span className="text-[9px] font-black uppercase tracking-widest">Export</span>
      </button>
    </nav>
  );
};
