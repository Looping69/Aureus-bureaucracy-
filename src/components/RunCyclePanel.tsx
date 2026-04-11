/**
 * @module RunCyclePanel
 * Compact run-cycle indicator shown as small phase circles.
 * Tap or hover to expand the full detail panel with title, description,
 * next tension, and operation actions.
 */
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
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

const PHASE_COLORS: Record<'ACTIVE' | 'READY' | 'LOCKED', { bg: string; ring: string; icon: string }> = {
  ACTIVE: { bg: 'bg-black', ring: 'ring-black/20', icon: 'text-white' },
  READY: { bg: 'bg-emerald-500', ring: 'ring-emerald-200', icon: 'text-white' },
  LOCKED: { bg: 'bg-slate-200', ring: 'ring-transparent', icon: 'text-slate-400' }
};

interface RunCyclePanelProps {
  state: GameState;
  onOperationAction?: (actionId: OperationActionId) => void;
}

export const RunCyclePanel: React.FC<RunCyclePanelProps> = ({ state, onOperationAction }) => {
  const [expanded, setExpanded] = React.useState(false);
  const collapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const summary = React.useMemo(() => getRunCycleSummary(state), [state]);
  const actions = React.useMemo(() => getOperationActions(state), [state]);
  const ActiveIcon = PHASE_ICONS[summary.phase];

  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setExpanded(true);
  };

  const handleMouseLeave = () => {
    collapseTimerRef.current = setTimeout(() => setExpanded(false), 300);
  };

  const handleToggle = () => setExpanded((prev) => !prev);

  React.useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  return (
    <section
      className="rounded-2xl border border-black/10 bg-white shadow-sm transition-shadow hover:shadow-md"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Collapsed: circle row ── */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-3 px-4 py-3"
        aria-expanded={expanded}
        aria-label="Toggle run cycle details"
      >
        {/* Phase circles */}
        <div className="flex items-center gap-2">
          {summary.steps.map((step) => {
            const colors = PHASE_COLORS[step.state];
            const Icon = PHASE_ICONS[step.id];
            const isActive = step.state === 'ACTIVE';

            return (
              <div
                key={step.id}
                title={step.label}
                className={`relative flex items-center justify-center rounded-full ring-2 transition-all ${colors.bg} ${colors.ring} ${
                  isActive ? 'h-9 w-9' : 'h-6 w-6'
                }`}
              >
                <Icon size={isActive ? 16 : 10} className={colors.icon} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-black" />
                )}
              </div>
            );
          })}
        </div>

        {/* Compact label */}
        <div className="flex flex-1 flex-col items-start">
          <span className="text-[9px] font-black uppercase tracking-[0.22em] opacity-40">Run Cycle</span>
          <span className="text-xs font-black leading-tight">{summary.title}</span>
        </div>

        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-black/30"
        >
          <ChevronRight size={16} />
        </motion.span>
      </button>

      {/* ── Expanded: full detail ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-black/5 px-4 pb-4 pt-3">
              {/* Header with icon */}
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                  <ActiveIcon size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black leading-tight">{summary.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-black/70">{summary.detail}</p>
                </div>
              </div>

              {/* Step pills */}
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

              {/* Next tension */}
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-900">Next Tension</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/80">{summary.nextDecision}</p>
              </div>

              {/* Operations desk */}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onOperationAction(action.id);
                        }}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
