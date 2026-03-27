import React from 'react';
import { motion } from 'motion/react';
import { Pickaxe, Database, Users, ArrowLeft, Search, Lock, ShieldCheck, Radar } from 'lucide-react';
import { GameState } from '../types';
import { ProgressGuide } from './ProgressGuide';

export const MineScene = ({ 
  state, 
  onMine, 
  onInteract, 
  onReturn,
  onAction
}: { 
  state: GameState, 
  onMine: (tileId: string) => void,
  onInteract: (npcId: string) => void,
  onReturn: () => void,
  onAction?: (action: string) => void
}) => {
  const currentMine = state.mines.find(m => m.id === state.activeMineId);

  if (!currentMine) return null;

  const isProspecting = currentMine.status === 'PROSPECTING';
  const isOperational = currentMine.status === 'OPERATIONAL';

  const hasExportLicense = state.permits['export-license']?.status === 'APPROVED';
  const hasWashPlant = state.permits['wash-plant-permit']?.status === 'APPROVED';
  const hasClaimExpansion = state.permits['claim-expansion']?.status === 'APPROVED';
  const hasSafetyKit = state.upgrades.includes('mine-safety-kit');
  const hasOreScanner = state.upgrades.includes('mine-ore-scanner');

  return (
    <div className="flex-1 overflow-auto p-4 grid-pattern flex flex-col">
      <ProgressGuide state={state} />

      <div className="mb-6 flex justify-between items-start">
        <button 
          onClick={onReturn}
          className="p-2 bg-white border-2 border-black rounded-xl shadow-sm active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <h2 className="font-serif italic font-black text-xl leading-tight">{currentMine.name}</h2>
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">
            {currentMine.location} • {currentMine.status}
          </p>
        </div>
      </div>

      {isProspecting && (
        <div className="mb-4 bg-blue-50 border-2 border-blue-200 p-3 rounded-xl flex justify-between items-center">
          <div className="flex items-center gap-2 text-blue-800">
            <Search size={16} />
            <span className="text-xs font-black uppercase tracking-wider">Prospecting Mode</span>
          </div>
          <div className="text-xs font-mono font-bold">
            Samples: {currentMine.prospectingCount}/10
          </div>
        </div>
      )}

      {isOperational && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button 
            onClick={() => onAction?.('EXPORT_ORE')}
            title="Sell all ore. Payout depends on license and market influence; increases exposure."
            className={`w-full min-h-[56px] px-3 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all text-center
              ${hasExportLicense ? 'bg-emerald-100 border-emerald-300 text-emerald-800 active:scale-95' : 'bg-slate-100 border-slate-300 text-slate-400 opacity-50'}`}
          >
            {hasExportLicense ? 'Export Ore' : <span className="flex items-center justify-center gap-1"><Lock size={10} /> Needs Permit</span>}
          </button>
          <button 
            onClick={() => onAction?.('WASH_PLANT')}
            title="Activate wash processing bonus for better ore yield on extraction."
            className={`w-full min-h-[56px] px-3 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all text-center
              ${hasWashPlant ? 'bg-blue-100 border-blue-300 text-blue-800 active:scale-95' : 'bg-slate-100 border-slate-300 text-slate-400 opacity-50'}`}
          >
            {hasWashPlant ? 'Use Wash Plant' : <span className="flex items-center justify-center gap-1"><Lock size={10} /> Needs Permit</span>}
          </button>
          <button 
            onClick={() => onAction?.('EXPAND_CLAIM')}
            title="Add a new mine row. Useful after current tiles are depleted."
            className={`w-full min-h-[56px] px-3 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all text-center
              ${hasClaimExpansion ? 'bg-purple-100 border-purple-300 text-purple-800 active:scale-95' : 'bg-slate-100 border-slate-300 text-slate-400 opacity-50'}`}
          >
            {hasClaimExpansion ? 'Expand Claim' : <span className="flex items-center justify-center gap-1"><Lock size={10} /> Needs Permit</span>}
          </button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={() => onAction?.('BUY_SAFETY_KIT')}
          title="Cost: $450. Reduces mining energy strain and hazard penalties."
          className={`w-full min-h-[56px] px-3 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 text-center
            ${hasSafetyKit ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-slate-100 border-slate-300 text-slate-700 active:scale-95'}`}
        >
          <ShieldCheck size={12} />
          {hasSafetyKit ? 'Safety Kit Installed' : 'Buy Safety Kit ($450)'}
        </button>
        <button
          onClick={() => onAction?.('BUY_ORE_SCANNER')}
          title="Cost: $700. Reveals nearby tiles during prospecting and boosts rich-vein finds."
          className={`w-full min-h-[56px] px-3 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 text-center
            ${hasOreScanner ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-slate-100 border-slate-300 text-slate-700 active:scale-95'}`}
        >
          <Radar size={12} />
          {hasOreScanner ? 'Ore Scanner Installed' : 'Buy Ore Scanner ($700)'}
        </button>
      </div>

      <div 
        className="grid gap-1 mx-auto w-full select-none touch-none"
        style={{ 
          gridTemplateColumns: `repeat(${currentMine.gridWidth}, 1fr)`,
          maxWidth: `${currentMine.gridWidth * 50}px`
        }}
      >
        {currentMine.grid.map((tile) => (
          <motion.button
            key={tile.id}
            onClick={() => !tile.mined && onMine(tile.id)}
            title={isProspecting ? 'Survey tile (cost: 1 energy).' : 'Extract tile (cost: 4-5+ energy, hazard risk varies by stability).'}
            className={`aspect-square rounded-sm border flex items-center justify-center transition-colors relative overflow-hidden
              ${tile.mined ? 'bg-black/5 border-black/5' : 
                tile.revealed
                  ? (tile.stability < 55 ? 'bg-red-100 border-red-300' : 'bg-amber-100 border-amber-200')
                  :
                'bg-stone-700 border-stone-800 shadow-inner hover:bg-stone-600 active:scale-95'}
            `}
          >
            {tile.revealed ? (
              tile.type === 'ORE' ? (
                <div className="flex flex-col items-center animate-pulse">
                  <Database size={16} className="text-amber-600" />
                  <span className="text-[8px] font-black text-amber-800">
                    {tile.stability >= 85 ? 'RICH' : 'GOLD'}
                  </span>
                </div>
              ) : tile.type === 'ROCK' ? (
                <div className="w-full h-full bg-stone-500 opacity-50" />
              ) : (
                <span className="text-[8px] opacity-50">{tile.stability < 55 ? 'WEAK' : 'DIRT'}</span>
              )
            ) : tile.mined ? (
              <div className="opacity-10">
                <div className="w-2 h-2 rounded-full bg-black" />
              </div>
            ) : (
              <div className="flex flex-col items-center opacity-30 pointer-events-none">
                <Pickaxe size={12} className="mb-1" />
                <span className="text-[6px] uppercase tracking-widest">Click</span>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[9px] font-mono uppercase tracking-wider opacity-70">
        <div className="p-1.5 rounded-md bg-amber-100 border border-amber-200 text-center">Ore / Rich Vein</div>
        <div className="p-1.5 rounded-md bg-red-100 border border-red-200 text-center">Unstable Tile</div>
        <div className="p-1.5 rounded-md bg-slate-200 border border-slate-300 text-center">Rock / Hard Layer</div>
      </div>

      <div className="mt-8 space-y-4">
        {currentMine.hasLocals && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => currentMine.chiefId && onInteract(currentMine.chiefId)}
            className="w-full p-4 bg-amber-50 border-2 border-black rounded-2xl flex items-center gap-4 shadow-md hover:bg-amber-100 active:scale-95 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-black/10 flex items-center justify-center">
              <Users size={24} className="text-amber-600" />
            </div>
            <div className="text-left">
              <h4 className="font-black text-sm uppercase tracking-tight">Talk to Local Chief</h4>
              <p className="text-[10px] opacity-60">"This land has been ours since the first dust fell."</p>
            </div>
          </motion.button>
        )}

        <div className="p-4 border border-dashed border-black/20 rounded-lg bg-white/30 text-center">
          <p className="text-xs font-mono opacity-50 uppercase tracking-widest">
            {currentMine.id}: Active Claim
          </p>
        </div>
      </div>
    </div>
  );
};
