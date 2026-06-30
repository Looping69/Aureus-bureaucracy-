import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Coins,
  FileText,
  LockKeyhole,
  Route,
  ShieldCheck,
  Stamp,
  X,
  Zap,
} from 'lucide-react';
import { Permit } from '../types';
import {
  PERMIT_CATEGORY_LABELS,
  canFilePermitFromBoard,
  getPermitBoardDefinition,
  getPermitBoardEntries,
  getPermitMissingRequirements,
  getPermitStatusClassName,
  getPermitStatusLabel,
  getRequirementLabel,
} from '../game/permitBoard';

const statusIcon = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 size={13} />;
    case 'PENDING':
      return <Clock3 size={13} />;
    case 'REJECTED':
      return <AlertTriangle size={13} />;
    case 'BLOCKED':
    case 'LOCKED':
      return <LockKeyhole size={13} />;
    default:
      return <Stamp size={13} />;
  }
};

export const PermitOverlay: React.FC<{
  permit: Permit,
  permits: Record<string, Permit>,
  onClose: () => void,
  onAction: (id: string, action: 'SUBMIT' | 'PAY' | 'FAST_TRACK') => void,
  tutorialStep?: number
}> = ({
  permit,
  permits,
  onClose,
  onAction,
  tutorialStep
}) => {
  const [selectedPermitId, setSelectedPermitId] = React.useState(permit.id);

  React.useEffect(() => {
    setSelectedPermitId(permit.id);
  }, [permit.id]);

  const boardEntries = React.useMemo(() => getPermitBoardEntries(permits), [permits]);
  const selectedPermit = permits[selectedPermitId] ?? permit;
  const selectedDefinition = getPermitBoardDefinition(selectedPermit.id);
  const selectedMissingRequirements = getPermitMissingRequirements(selectedPermit.id, permits);
  const selectedStatusLabel = getPermitStatusLabel(selectedPermit, selectedMissingRequirements);
  const selectedStatusClassName = getPermitStatusClassName(selectedPermit, selectedMissingRequirements);
  const canFileSelected = canFilePermitFromBoard(selectedPermit.id, permits);
  const standardCost = selectedPermit.status === 'REJECTED' ? 100 : selectedPermit.cost;
  const showFilingActions = selectedPermit.status === 'AVAILABLE' || selectedPermit.status === 'REJECTED';
  const disabledFilingTitle = selectedMissingRequirements.length > 0
    ? `Approve ${selectedMissingRequirements.map((requirementId) => getRequirementLabel(requirementId, permits)).join(', ')} first.`
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-2 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border-2 border-black bg-[#f6f1e8] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b-2 border-black bg-[#181613] px-4 py-3 text-white sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-400 text-black shadow-sm">
              <Stamp size={22} />
            </div>
            <div>
              <h2 className="text-base font-black leading-tight sm:text-lg">Permit Board</h2>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
                Plan access, action, and profit filings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close permit board"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[18.5rem,1fr]">
          <aside className="min-h-0 overflow-auto border-b-2 border-black bg-[#e7dccb] p-3 md:border-b-0 md:border-r-2">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Progression</p>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                {boardEntries.filter((entry) => entry.permit.status === 'APPROVED').length}/{boardEntries.length}
              </p>
            </div>

            <div className="space-y-2">
              {boardEntries.map(({ permit: boardPermit, definition, missingRequirements, isRecommended }) => {
                const statusLabel = getPermitStatusLabel(boardPermit, missingRequirements);
                const isSelected = boardPermit.id === selectedPermit.id;

                return (
                  <button
                    key={boardPermit.id}
                    type="button"
                    onClick={() => setSelectedPermitId(boardPermit.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'border-black bg-white shadow-md'
                        : 'border-black/10 bg-white/65 hover:border-black/25 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded border border-black/10 bg-black/5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-black/55">
                            {PERMIT_CATEGORY_LABELS[definition.category]}
                          </span>
                          {isRecommended && (
                            <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-amber-800">
                              Next
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-black leading-snug text-slate-950">{boardPermit.name}</h3>
                        <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.14em] text-black/40">{boardPermit.formNumber}</p>
                      </div>
                      <span className={`flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${getPermitStatusClassName(boardPermit, missingRequirements)}`}>
                        {statusIcon(statusLabel)}
                        {statusLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="min-h-0 overflow-auto bg-[#fbf8f0] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-black/10 bg-black/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-black/55">
                    {PERMIT_CATEGORY_LABELS[selectedDefinition.category]}
                  </span>
                  <span className={`flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${selectedStatusClassName}`}>
                    {statusIcon(selectedStatusLabel)}
                    {selectedStatusLabel}
                  </span>
                </div>
                <h3 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">{selectedPermit.name}</h3>
                <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Form {selectedPermit.formNumber}</p>
              </div>
              <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-right shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/35">Fee</p>
                <p className="text-lg font-black text-slate-950">${standardCost}</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr,16rem]">
              <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <FileText size={16} />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Why This Exists</h4>
                </div>
                <p className="text-sm font-semibold leading-relaxed text-slate-700">{selectedDefinition.summary}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{selectedPermit.description}</p>
              </section>

              <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <Coins size={16} />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Unlocks</h4>
                </div>
                <p className="text-sm font-bold leading-relaxed text-slate-800">{selectedDefinition.unlocks}</p>
              </section>
            </div>

            <section className="mt-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-slate-900">
                <ShieldCheck size={16} />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Requirements</h4>
              </div>

              {(selectedDefinition.requires ?? []).length === 0 ? (
                <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                  No prior permit required. This is an entry point.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(selectedDefinition.requires ?? []).map((requirementId) => {
                    const requirement = permits[requirementId];
                    const approved = requirement?.status === 'APPROVED';
                    return (
                      <div
                        key={requirementId}
                        className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs font-bold ${
                          approved
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span>{getRequirementLabel(requirementId, permits)}</span>
                        <span className="flex shrink-0 items-center gap-1 text-[9px] uppercase tracking-[0.14em]">
                          {approved ? <CheckCircle2 size={12} /> : <LockKeyhole size={12} />}
                          {approved ? 'Approved' : 'Needed'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-slate-900">
                <Route size={16} />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Routes</h4>
              </div>
              <div className="grid gap-2 lg:grid-cols-3">
                {selectedDefinition.routeHints.map((route) => (
                  <div key={route.id} className="rounded-md border border-black/10 bg-slate-50 p-3">
                    <p className="text-xs font-black text-slate-950">{route.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{route.description}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-black/40">{route.effect}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-slate-900">
                <ArrowRight size={16} />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Recommended Use</h4>
              </div>
              <p className="text-sm font-semibold leading-relaxed text-slate-700">{selectedDefinition.strategy}</p>
            </section>

            {selectedPermit.rejectionReason && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                <div className="mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Rejection Reason</p>
                </div>
                <p className="text-xs font-bold italic">"{selectedPermit.rejectionReason}"</p>
              </div>
            )}

            <div className="sticky bottom-0 -mx-4 mt-4 border-t-2 border-black bg-[#fbf8f0]/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
              {showFilingActions ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => onAction(selectedPermit.id, 'SUBMIT')}
                    disabled={!canFileSelected}
                    title={disabledFilingTitle ?? (selectedPermit.status === 'REJECTED' ? 'Resubmit: costs $100 and starts bureau review.' : `Standard filing: costs $${selectedPermit.cost} and starts bureau review.`)}
                    className={`relative z-50 flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 ${
                      tutorialStep === 4 && selectedPermit.id === permit.id ? 'ring-4 ring-blue-500 ring-offset-2' : ''
                    }`}
                    type="button"
                  >
                    {tutorialStep === 4 && selectedPermit.id === permit.id && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-blue-600 px-3 py-1 text-[10px] font-bold text-white shadow-md">
                        File this
                      </div>
                    )}
                    <Stamp size={15} />
                    {selectedPermit.status === 'REJECTED' ? 'Resubmit ($100)' : `Standard ($${selectedPermit.cost})`}
                  </button>
                  <button
                    onClick={() => onAction(selectedPermit.id, 'FAST_TRACK')}
                    disabled={!canFileSelected}
                    title={disabledFilingTitle ?? `Fast-track filing: costs $${standardCost * 2}. Higher immediate approval chance.`}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    type="button"
                  >
                    <Zap size={15} />
                    Fast Track (${standardCost * 2})
                  </button>
                </div>
              ) : selectedPermit.status === 'PENDING' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-amber-800">
                  Processing by Central Bureau...
                </div>
              ) : selectedPermit.status === 'APPROVED' ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-emerald-800">
                  Approved and active
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  {selectedMissingRequirements.length > 0 ? 'Approve requirements first' : 'Not available yet'}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </motion.div>
  );
};
