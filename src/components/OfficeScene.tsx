import React from 'react';
import { GameState } from '../types';
import { ArrowRight, Building2, CheckCircle2, ChevronRight, LockKeyhole, MapPin, Stamp } from 'lucide-react';
import { OfficeExploration } from './OfficeExploration';
import { PoliticalPositionPanel } from './PoliticalPositionPanel';
import { ProgressGuide } from './ProgressGuide';
import { RunCyclePanel } from './RunCyclePanel';
import { OperationActionId } from '../game/runCycle';
import { deriveOfficeViewModel } from '../game/officeViewModel';
import { getSceneMetaVisibility } from '../game/shellView';
import {
  getPermitBoardEntries,
  getPermitStatusClassName,
  getPermitStatusLabel,
  getRequirementLabel,
} from '../game/permitBoard';

export const OfficeScene = ({
  state,
  onSelectNPC,
  onSelectPermit,
  onFoundItem,
  onTakePhoto,
  onExplorationComplete,
  onStartExploration,
  onTravelTo,
  onBackToDirectory,
  onOperationAction
}: {
  state: GameState,
  onSelectNPC: (id: string) => void,
  onSelectPermit: (id: string) => void,
  onFoundItem: (id: string) => void,
  onTakePhoto: (id: string) => void,
  onExplorationComplete: () => void,
  onStartExploration: () => void,
  onTravelTo: (buildingId: string) => void,
  onBackToDirectory: () => void,
  onOperationAction: (actionId: OperationActionId) => void
}) => {
  const view = React.useMemo(() => deriveOfficeViewModel(state), [state]);
  const metaVisibility = React.useMemo(() => getSceneMetaVisibility(state), [state]);
  const permitBoardEntries = React.useMemo(() => getPermitBoardEntries(state.permits), [state.permits]);
  const recommendedPermitEntry = permitBoardEntries.find((entry) => entry.isRecommended);
  const visiblePermitEntries = permitBoardEntries.filter((entry) =>
    entry.permit.status !== 'LOCKED' || entry.isRecommended || entry.missingRequirements.length > 0,
  );

  const renderMetaPanels = () => (
    <>
      {metaVisibility.showProgressGuide && <ProgressGuide state={state} />}
      {metaVisibility.showMetaPanels && <RunCyclePanel state={state} onOperationAction={onOperationAction} />}
      {metaVisibility.showMetaPanels && <PoliticalPositionPanel state={state} />}
    </>
  );

  const renderPermitStatusBadge = (entry: (typeof permitBoardEntries)[number]) => {
    const label = getPermitStatusLabel(entry.permit, entry.missingRequirements);
    return (
      <div className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${getPermitStatusClassName(entry.permit, entry.missingRequirements)}`}>
        {label === 'APPROVED' ? <CheckCircle2 size={11} /> : label === 'LOCKED' || label === 'BLOCKED' ? <LockKeyhole size={11} /> : <Stamp size={11} />}
        {label}
      </div>
    );
  };

  if (view.mode === 'EXPLORATION') {
    return (
      <OfficeExploration
        state={state}
        onFoundItem={onFoundItem}
        onTakePhoto={onTakePhoto}
        onComplete={onExplorationComplete}
      />
    );
  }

  if (view.mode === 'BUILDING') {
    const building = view.building;
    if (!building) return null;

    return (
      <div className="flex-1 overflow-auto bg-slate-50 p-4 flex flex-col gap-6">
        {renderMetaPanels()}

        <div className="flex items-center justify-between mb-2">
          {view.lockDirectory ? (
            <div className="text-xs font-bold uppercase tracking-widest text-blue-700 flex items-center gap-1">
              Hold The Line
            </div>
          ) : (
            <button
              onClick={onBackToDirectory}
              className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 flex items-center gap-1"
            >
              ← Directory
            </button>
          )}
          <div className="text-[10px] font-mono uppercase opacity-30">
            {building.name}
          </div>
        </div>

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-black mb-3 opacity-40">Personnel</h2>
          {building.npcId !== 'none' && state.npcs[building.npcId] ? (
            <button
              onClick={() => onSelectNPC(building.npcId)}
              className={`w-full flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all text-left group relative overflow-hidden
                ${view.highlightVane && building.npcId === 'licensing' ? 'border-blue-500 ring-4 ring-blue-500/20 z-10' : 'border-black/5'}
              `}
            >
              {view.highlightVane && building.npcId === 'licensing' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 animate-bounce font-black text-xs uppercase tracking-widest">
                  Vane. Now.
                </div>
              )}
              <div className="relative">
                <img src={state.npcs[building.npcId].avatar} alt={state.npcs[building.npcId].name} className="w-10 h-10 rounded-full bg-slate-100" referrerPolicy="no-referrer" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border border-black/10 flex items-center justify-center text-[8px] font-bold">
                  {state.npcs[building.npcId].trustLevel}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm leading-tight">{state.npcs[building.npcId].name}</h3>
                <p className="text-[10px] font-mono opacity-50 uppercase tracking-wider">{state.npcs[building.npcId].role}</p>
              </div>
              <ChevronRight size={14} className="opacity-20 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <div className="p-4 text-center opacity-30 text-xs italic">No personnel available.</div>
          )}
        </section>

        {view.canInspectBuilding && (
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-black mb-3 opacity-40">Actions</h2>
            <button
              onClick={onStartExploration}
              className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 text-white rounded-xl shadow-sm hover:bg-slate-700 transition-all text-sm font-bold"
            >
              Inspect Premises
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center italic">
              There might be something useful hidden here.
            </p>
          </section>
        )}

        {building.id === 'licensing_office' && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40">Permit Board</h2>
              {recommendedPermitEntry && (
                <button
                  onClick={() => onSelectPermit(recommendedPermitEntry.permit.id)}
                  className="flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-sm active:scale-[0.98]"
                  type="button"
                >
                  Next: {recommendedPermitEntry.permit.formNumber}
                  <ArrowRight size={11} />
                </button>
              )}
            </div>

            {recommendedPermitEntry && (
              <button
                onClick={() => onSelectPermit(recommendedPermitEntry.permit.id)}
                className={`mb-3 w-full rounded-xl border p-3 text-left shadow-sm transition-all hover:shadow-md ${
                  view.highlightForm17B && recommendedPermitEntry.permit.id === 'extraction-intent'
                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/20'
                    : 'border-amber-200 bg-amber-50'
                }`}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Recommended Next</p>
                    <h3 className="mt-1 text-sm font-black leading-tight text-slate-950">{recommendedPermitEntry.permit.name}</h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{recommendedPermitEntry.definition.strategy}</p>
                  </div>
                  {renderPermitStatusBadge(recommendedPermitEntry)}
                </div>
              </button>
            )}

            <div className="grid grid-cols-1 gap-2">
              {visiblePermitEntries.map((entry) => {
                const missingLabel = entry.missingRequirements.length > 0
                  ? entry.missingRequirements.map((requirementId) => getRequirementLabel(requirementId, state.permits)).join(', ')
                  : '';

                return (
                  <button
                    key={entry.permit.id}
                    onClick={() => onSelectPermit(entry.permit.id)}
                    title={missingLabel ? `Requires ${missingLabel}` : `Open ${entry.permit.formNumber}. Fee: $${entry.permit.status === 'REJECTED' ? 100 : entry.permit.cost}.`}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left shadow-sm transition-all hover:shadow-md relative overflow-hidden
                      ${entry.permit.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-black/5'}
                      ${view.highlightForm17B && entry.permit.id === 'extraction-intent' ? 'border-blue-500 ring-4 ring-blue-500/20 z-10' : ''}
                    `}
                    type="button"
                  >
                    {view.highlightForm17B && entry.permit.id === 'extraction-intent' && (
                      <div className="absolute right-12 top-1/2 -translate-y-1/2 text-blue-600 animate-bounce font-black text-xs uppercase tracking-widest">
                        Open 17-B
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                      ${entry.permit.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}
                    `}>
                      <Stamp size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-black/5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-black/45">
                          {entry.definition.category}
                        </span>
                        {entry.isRecommended && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-700">
                            Next
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm leading-tight">{entry.permit.name}</h3>
                      <p className="text-[10px] font-mono opacity-50 uppercase tracking-wider">{entry.permit.formNumber}</p>
                      {missingLabel && (
                        <p className="mt-1 text-[10px] font-bold leading-snug text-slate-500">Requires: {missingLabel}</p>
                      )}
                    </div>
                    {renderPermitStatusBadge(entry)}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-100 p-4 flex flex-col gap-6">
      {renderMetaPanels()}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black italic font-serif">Directory</h2>
        <div className="text-[10px] font-mono uppercase opacity-40">
          {view.discoveredBuildings.length} Locations Found
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100/50 mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-emerald-900">
            <Stamp size={14} className="text-emerald-600" /> Permit Strategy
          </h3>

          {recommendedPermitEntry ? (
            <button
              onClick={() => onSelectPermit(recommendedPermitEntry.permit.id)}
              title={`Open ${recommendedPermitEntry.permit.formNumber}. Current status: ${recommendedPermitEntry.permit.status}.`}
              className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-left transition-all hover:border-amber-300 hover:bg-amber-100/70 active:scale-[0.99]"
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Recommended Next</div>
                  <div className="mt-1 text-sm font-black text-slate-900">{recommendedPermitEntry.permit.name}</div>
                  <div className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{recommendedPermitEntry.definition.unlocks}</div>
                </div>
                {renderPermitStatusBadge(recommendedPermitEntry)}
              </div>
            </button>
          ) : (
            <div className="text-center py-4 text-[10px] text-slate-400 italic">
              No active permit path. Visit the Licensing Office.
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2">
            {['APPROVED', 'PENDING', 'AVAILABLE'].map((status) => (
              <div key={status} className="rounded-lg bg-slate-50 p-2 text-center">
                <div className="text-base font-black text-slate-900">
                  {permitBoardEntries.filter((entry) => entry.permit.status === status).length}
                </div>
                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">{status}</div>
              </div>
            ))}
          </div>
        </div>

        {view.discoveredBuildings.map(building => (
          <div
            key={building.id}
            className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{building.name}</h3>
                  <p className="text-[10px] font-mono uppercase opacity-50 tracking-wider">{building.type}</p>
                </div>
              </div>
              {building.npcId !== 'none' && state.npcs[building.npcId] && (
                <div className="flex -space-x-2">
                  <img
                    src={state.npcs[building.npcId].avatar}
                    alt="NPC"
                    className="w-6 h-6 rounded-full border-2 border-white bg-slate-200"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onTravelTo(building.id)}
                title="Travel to this location. Travel consumes time and may consume energy."
                className="flex-1 bg-black text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <MapPin size={12} /> Travel To
              </button>
            </div>
          </div>
        ))}

        {view.discoveredBuildings.length === 0 && (
          <div className="p-8 text-center opacity-40">
            <p className="text-xs italic">Explore the world to find locations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
