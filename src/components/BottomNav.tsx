import React from 'react';
import { Briefcase, Pickaxe, Store, Users } from 'lucide-react';
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
        title="Open the market. You can always sell ore here, with or without a license."
        className={`flex flex-col items-center gap-1 active:scale-90 transition-all ${
          state.ore > 0 ? 'text-emerald-700' : 'text-black/35 hover:text-black/60'
        }`}
      >
        <Store size={22} />
        <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
      </button>
    </nav>
  );
};
