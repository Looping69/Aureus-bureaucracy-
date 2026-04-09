/**
 * @module RunCyclePanel
 * Side-panel showing the current run-cycle phase and available operation actions
 * (Pressure Clerks, Scout Buyers, Community Cover, Leak to Press).
 * Driven by getRunCycleSummary and getOperationActions from the runCycle module.
 */
import React from 'react';
import { BriefcaseBusiness, ChevronRight, Flame, Gavel, Package, Pickaxe } from 'lucide-react';
import { GameState } from '../types';
import { getOperationActions, getRunCycleSummary, OperationActionId, RunCyclePhaseId } from '../game/runCycle';

const PHASE_ICONS: Record<RunCyclePhaseId, React.ComponentType<{ size?: number; className?: string }>> = {
  SECURE: Gavel,
  PREPARE: BriefcaseBusiness,
  EXECUTE: Pickaxe,
  RESOLVE: Package,
  POLITICAL: Flame
};

interface RunCyclePanelProps {
  state: GameState;
  onOperationAction?: (actionId: OperationActionId) => void;
}

export const RunCyclePanel: React.FC<RunCyclePanelProps> = ({ state, onOperationAction }) => {
  const summary = React.useMemo(() => getRunCycleSummary(state), [state]);
  const actions = React.useMemo(() => getOperationActions(state), [state]);
  const ActiveIcon = PHASE_ICONS[summary.phase];

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
            <ActiveIcon size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] opacity-45">Run Cycle</p>
            <h3 className="text-base font-black leading-tight">{summary.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-black/70">{summary.detail}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {summary.steps.map((step) => (
          <div
            key={step.id}
            className={`rounded-xl border px-2 py-2 text-center text-[9px] font-black uppercase tracking-[0.18em] ${
              step.state === 'ACTIVE'
                ? 'border-black bg-black text-white'
                : step.state === 'READY'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-black/10 bg-slate-50 text-black/35'
            }`}
          >
            {step.label}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-900">Next Tension</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-900/80">{summary.nextDecision}</p>
      </div>

      {onOperationAction && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-45">Operations Desk</p>
            <p className="text-[10px] font-mono uppercase opacity-35">Prep from the office</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={!!action.disabledReason}
                onClick={() => onOperationAction(action.id)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-slate-50 px-3 py-3 text-left transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:text-black"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em]">{action.label}</span>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em]">
                      {action.costLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-tight opacity-75">{action.detail}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-55">
                    {action.disabledReason ?? action.effectLabel}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 opacity-45" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
