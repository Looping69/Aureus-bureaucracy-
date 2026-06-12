import React from 'react';
import { motion } from 'motion/react';
import { Pickaxe, Database, Users, ArrowLeft, Search, Lock, ShieldCheck, Radar, PackageCheck, Gauge } from 'lucide-react';
import { GameState, Mine } from '../types';
import { ProgressGuide } from './ProgressGuide';
import { RunCyclePanel } from './RunCyclePanel';
import { HudActionButton, HudIconTile, HudPanel, HUD_BUTTON_BASE_CLASS } from './HudFrame';
import { getSceneMetaVisibility } from '../game/shellView';

type MineRunState = Mine & {
  carriedOre?: number;
  carryLimit?: number;
  shaftStability?: number;
  braceCharges?: number;
};

const getRunMine = (mine: Mine): MineRunState => mine as MineRunState;

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
  const baseMine = state.mines.find(m => m.id === state.activeMineId);
  const metaVisibility = React.useMemo(() => getSceneMetaVisibility(state), [state]);

  if (!baseMine) return null;

  const currentMine = getRunMine(baseMine);
  const isProspecting = currentMine.status === 'PROSPECTING';
  const isOperational = currentMine.status === 'OPERATIONAL';
  const carriedOre = currentMine.carriedOre ?? 0;
  const carryLimit = currentMine.carryLimit ?? 80;
  const shaftStability = currentMine.shaftStability ?? 100;
  const braceCharges = currentMine.braceCharges ?? (state.upgrades.includes('mine-safety-kit') ? 2 : 0);
  const loadPercent = Math.min(100, Math.round((carriedOre / carryLimit) * 100));

  const hasExportLicense = state.permits['export-license']?.status === 'APPROVED';
  const hasWashPlant = state.permits['wash-plant-permit']?.status === 'APPROVED';
  const hasClaimExpansion = state.permits['claim-expansion']?.status === 'APPROVED';
  const hasSafetyKit = state.upgrades.includes('mine-safety-kit');
  const hasOreScanner = state.upgrades.includes('mine-ore-scanner');
  const canTriggerActions = Boolean(onAction);

  return (
    <div className="flex-1 overflow-auto p-4 grid-pattern flex flex-col">
      {metaVisibility.showProgressGuide && <ProgressGuide state={state} />}
      {metaVisibility.showMetaPanels && (
        <div className="mt-3">
          <RunCyclePanel state={state} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-start gap-2">
        <HudActionButton
          icon={ArrowLeft}
          label="Leave"
          detail={carriedOre > 0 ? 'Unsecured load stays in the shaft' : 'Return to route'}
          onClick={onReturn}
          className="w-11 justify-center px-2"
        />
        <HudPanel toneBorderClass="border-stone-600/80" className="flex min-w-[220px] flex-1 items-center gap-2 px-3 py-2">
          <HudIconTile icon={Pickaxe} toneClass="bg-stone-300" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-serif text-xl font-black italic leading-tight text-white">{currentMine.name}</h2>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
              {currentMine.location} / {currentMine.status}
            </p>
          </div>
        </HudPanel>
        <HudPanel toneBorderClass="border-amber-600/80" className="ml-auto flex items-center gap-2 px-3 py-2">
          <HudIconTile icon={Database} toneClass="bg-amber-400" />
          <div className="flex flex-col leading-none">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Stockpile</span>
            <span className="mt-1 text-sm font-black text-amber-200">{state.ore.toLocaleString()}</span>
          </div>
        </HudPanel>
      </div>

      {isOperational && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HudPanel toneBorderClass="border-amber-600/80" className="px-3 py-2">
            <div className="flex items-center gap-2">
              <HudIconTile icon={PackageCheck} toneClass="bg-amber-400" />
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Carried</p>
                <p className="text-sm font-black text-amber-200">{carriedOre}/{carryLimit}</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
              <div className="h-full bg-amber-400" style={{ width: `${loadPercent}%` }} />
            </div>
          </HudPanel>
          <HudPanel toneBorderClass={shaftStability <= 25 ? 'border-rose-600/80' : 'border-emerald-600/80'} className="px-3 py-2">
            <div className="flex items-center gap-2">
              <HudIconTile icon={Gauge} toneClass={shaftStability <= 25 ? 'bg-rose-400' : 'bg-emerald-400'} />
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Shaft</p>
                <p className="text-sm font-black text-white">{Math.round(shaftStability)}%</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
              <div className={shaftStability <= 25 ? 'h-full bg-rose-400' : 'h-full bg-emerald-400'} style={{ width: `${Math.max(0, shaftStability)}%` }} />
            </div>
          </HudPanel>
          <HudPanel toneBorderClass="border-sky-600/80" className="px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Braces</p>
            <p className="mt-1 text-sm font-black text-sky-200">{braceCharges}</p>
          </HudPanel>
          <button
            onClick={() => onAction?.('SECURE_LOAD')}
            disabled={carriedOre <= 0 || !canTriggerActions}
            className={`${HUD_BUTTON_BASE_CLASS} min-h-[58px] border-amber-600/80 px-3 py-2 text-left`}
            title="Return to the lift and move carried ore into your stockpile."
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white">Secure Load</div>
            <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.14em] text-slate-400">
              {carriedOre > 0 ? 'Bank carried ore' : 'No carried ore'}
            </div>
          </button>
        </div>
      )}

      {isProspecting && (
        <HudPanel toneBorderClass="border-sky-600/80" className="mb-4 flex items-center justify-between gap-3 px-3 py-3">
          <div className="flex items-center gap-2 text-sky-100">
            <HudIconTile icon={Search} toneClass="bg-sky-400" />
            <span className="text-xs font-black uppercase tracking-[0.22em]">Prospecting Mode</span>
          </div>
          <div className="text-xs font-mono font-bold text-sky-200">
            Samples: {currentMine.prospectingCount}/10
          </div>
        </HudPanel>
      )}

      {isOperational && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button 
            onClick={() => onAction?.('EXPORT_ORE')}
            title="Sell all secured ore. Payout depends on license and market influence; increases exposure."
            disabled={!hasExportLicense || !canTriggerActions}
            className={`${HUD_BUTTON_BASE_CLASS} w-full min-h-[64px] border-emerald-600/80 px-3 py-3 text-left`}
          >
            <div className="flex items-center gap-2">
              <HudIconTile icon={Database} toneClass={hasExportLicense ? 'bg-emerald-400' : 'bg-slate-500'} />
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white">Export Ore</div>
                <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.16em] text-slate-400">
                  {hasExportLicense ? 'Sells secured stockpile' : 'Needs export permit'}
                </div>
              </div>
              {!hasExportLicense && <Lock size={12} className="ml-auto text-slate-500" />}
            </div>
          </button>
          <button 
            onClick={() => onAction?.('WASH_PLANT')}
            title="Activate wash processing bonus for better ore yield on extraction."
            disabled={!hasWashPlant || !canTriggerActions}
            className={`${HUD_BUTTON_BASE_CLASS} w-full min-h-[64px] border-sky-600/80 px-3 py-3 text-left`}
          >
            <div className="flex items-center gap-2">
              <HudIconTile icon={Search} toneClass={hasWashPlant ? 'bg-sky-400' : 'bg-slate-500'} />
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white">Wash Plant</div>
                <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.16em] text-slate-400">
                  {hasWashPlant ? 'Boost extraction yield' : 'Needs wash permit'}
                </div>
              </div>
              {!hasWashPlant && <Lock size={12} className="ml-auto text-slate-500" />}
            </div>
          </button>
          <button 
            onClick={() => onAction?.('EXPAND_CLAIM')}
            title="Add a new mine row. Useful after current tiles are depleted."
            disabled={!hasClaimExpansion || !canTriggerActions}
            className={`${HUD_BUTTON_BASE_CLASS} w-full min-h-[64px] border-fuchsia-600/80 px-3 py-3 text-left`}
          >
            <div className="flex items-center gap-2">
              <HudIconTile icon={Pickaxe} toneClass={hasClaimExpansion ? 'bg-fuchsia-400' : 'bg-slate-500'} />
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white">Expand Claim</div>
                <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.16em] text-slate-400">
                  {hasClaimExpansion ? 'Open another extraction lane' : 'Needs claim expansion permit'}
                </div>
              </div>
              {!hasClaimExpansion && <Lock size={12} className="ml-auto text-slate-500" />}
            </div>
          </button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={() => onAction?.('BUY_SAFETY_KIT')}
          title="Cost: $450. Reduces mining energy strain and adds two brace charges."
          disabled={hasSafetyKit || !canTriggerActions}
          className={`${HUD_BUTTON_BASE_CLASS} w-full min-h-[64px] border-emerald-600/80 px-3 py-3 text-left`}
        >
          <div className="flex items-center gap-2">
            <HudIconTile icon={ShieldCheck} toneClass={hasSafetyKit ? 'bg-emerald-400' : 'bg-emerald-300'} />
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                {hasSafetyKit ? 'Safety Kit Installed' : 'Buy Safety Kit'}
              </div>
              <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.16em] text-slate-400">
                {hasSafetyKit ? 'Brace support online' : '$450 / adds braces'}
              </div>
            </div>
          </div>
        </button>
        <button
          onClick={() => onAction?.('BUY_ORE_SCANNER')}
          title="Cost: $700. Reveals nearby tiles during prospecting and boosts rich-vein finds."
          disabled={hasOreScanner || !canTriggerActions}
          className={`${HUD_BUTTON_BASE_CLASS} w-full min-h-[64px] border-sky-600/80 px-3 py-3 text-left`}
        >
          <div className="flex items-center gap-2">
            <HudIconTile icon={Radar} toneClass={hasOreScanner ? 'bg-sky-400' : 'bg-sky-300'} />
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                {hasOreScanner ? 'Ore Scanner Installed' : 'Buy Ore Scanner'}
              </div>
              <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.16em] text-slate-400">
                {hasOreScanner ? 'Survey support active' : '$700 / reveals nearby tiles'}
              </div>
            </div>
          </div>
        </button>
      </div>

      <div 
        className="grid gap-1 mx-auto w-full select-none touch-none"
        style={{ 
          gridTemplateColumns: `repeat(${currentMine.gridWidth}, 1fr)`,
          maxWidth: `${currentMine.gridWidth * 50}px`
        }}
      >
        {currentMine.grid.map((tile) => {
          const isCollapsed = tile.stability <= 0;
          return (
            <motion.button
              key={tile.id}
              onClick={() => !tile.mined && !isCollapsed && onMine(tile.id)}
              title={isCollapsed ? 'Collapsed rubble blocks this tile.' : isProspecting ? 'Survey tile (cost: 1 energy).' : 'Extract tile. Ore goes into carried load until secured.'}
              className={`aspect-square rounded-sm border flex items-center justify-center transition-colors relative overflow-hidden
                ${isCollapsed ? 'bg-slate-950 border-rose-900 cursor-not-allowed' : tile.mined ? 'bg-black/5 border-black/5' : 
                  tile.revealed
                    ? (tile.stability < 55 ? 'bg-red-100 border-red-300' : 'bg-amber-100 border-amber-200')
                    :
                  'bg-stone-700 border-stone-800 shadow-inner hover:bg-stone-600 active:scale-95'}
              `}
            >
              {isCollapsed ? (
                <span className="text-[7px] font-black text-rose-300">RUBBLE</span>
              ) : tile.revealed ? (
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
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-[9px] font-mono uppercase tracking-wider">
        <HudPanel toneBorderClass="border-amber-600/80" className="px-2 py-1.5 text-center text-amber-200">Ore / Rich</HudPanel>
        <HudPanel toneBorderClass="border-rose-600/80" className="px-2 py-1.5 text-center text-rose-200">Unstable</HudPanel>
        <HudPanel toneBorderClass="border-slate-600/80" className="px-2 py-1.5 text-center text-slate-200">Rock</HudPanel>
        <HudPanel toneBorderClass="border-red-900/80" className="px-2 py-1.5 text-center text-red-200">Rubble</HudPanel>
      </div>

      <div className="mt-8 space-y-4">
        {currentMine.hasLocals && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => currentMine.chiefId && onInteract(currentMine.chiefId)}
            className={`${HUD_BUTTON_BASE_CLASS} w-full border-amber-600/80 p-4`}
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-black/20 bg-amber-400">
                <Users size={24} className="text-slate-950" />
              </span>
              <div className="text-left">
                <h4 className="text-sm font-black uppercase tracking-tight text-white">Talk to Local Chief</h4>
                <p className="text-[10px] text-slate-400">"This land has been ours since the first dust fell."</p>
              </div>
            </div>
          </motion.button>
        )}

        <HudPanel toneBorderClass="border-slate-600/80" className="p-4 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            {currentMine.id}: Active Claim
          </p>
        </HudPanel>
      </div>
    </div>
  );
};