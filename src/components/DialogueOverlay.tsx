/**
 * @module DialogueOverlay
 * Full-screen dialogue overlay rendered when an NPC conversation is active.
 * Displays the NPC's avatar, name, current dialogue node text, and response options.
 * Handles conditional option visibility (trust/leverage requirements) and applies
 * state changes when an option is selected.
 */
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Heart, ChevronRight, FileText, Scale, Zap, MessageSquare, ArrowLeft, Clock, Smile, Frown } from 'lucide-react';
import { GameState, NPC, DialogueNode, DialogueOption } from '../types';
import { DIALOGUE_TREES } from '../data';
import { buildSpecialDialogueOptions } from '../game/dialogue/specialOptions';
import { getDefaultDialogueText, getNpcMoodInfluence, isNpcAvailableAtTime } from '../game/dialogue/status';

export const DialogueOverlay: React.FC<{ 
  npc: NPC, 
  state: GameState,
  onClose: () => void,
  onAction: (action: (s: GameState) => Partial<GameState>) => void,
  triggerFeedback: (npcId: string, amount: number, type: 'TRUST' | 'LEVERAGE') => void
}> = ({ 
  npc, 
  state,
  onClose,
  onAction,
  triggerFeedback
}) => {
  const [currentNodeId, setCurrentNodeId] = React.useState('root');
  const [showSpecialActions, setShowSpecialActions] = React.useState(false);

  const tree = DIALOGUE_TREES[npc.id];
  const currentNode = tree ? tree[currentNodeId] : null;

  const isAvailable = useMemo(() => {
    return isNpcAvailableAtTime(npc, state.time);
  }, [npc.workHours, state.time]);

  const moodInfluence = useMemo(() => {
    return getNpcMoodInfluence(npc, state.time);
  }, [npc.workHours, npc.moodShiftType, state.time]);

  const baseOptions = useMemo(() => {
    return buildSpecialDialogueOptions({
      npc,
      state,
      moodInfluence,
      triggerFeedback
    });
  }, [npc, state, triggerFeedback, moodInfluence]);

  const handleOptionClick = (opt: DialogueOption) => {
    if (opt.action) onAction(opt.action);
    if (opt.nextNodeId) setCurrentNodeId(opt.nextNodeId);
    else onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end p-4"
    >
      <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-6 flex flex-col gap-6 paper-texture shadow-2xl border-t-4 border-black">
        <div className="flex justify-between items-start">
          <div className="flex gap-4 items-center relative">
            <img src={npc.avatar} alt={npc.name} className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-black" referrerPolicy="no-referrer" />
            <div className="flex-1">
              <h2 className="font-serif italic font-black text-2xl leading-tight">{npc.name}</h2>
              <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">{npc.role}</p>
              
              <div className="flex gap-4 mt-2">
                <div className="flex-1">
                  <div className="flex justify-between text-[8px] font-mono uppercase opacity-50 mb-0.5">
                    <span>Trust</span>
                    <span>{npc.trustLevel}%</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden border border-black/5">
                    <motion.div 
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${npc.trustLevel}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[8px] font-mono uppercase opacity-50 mb-0.5">
                    <span>Leverage</span>
                    <span>{npc.leverage}%</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden border border-black/5">
                    <motion.div 
                      className="h-full bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${npc.leverage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Vulnerability Indicator */}
              {npc.vulnerability && npc.vulnerability.discovered && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-600 mb-1">
                    <ShieldAlert size={10} />
                    <span>Known Vulnerability</span>
                  </div>
                  <p className="text-[10px] leading-tight text-red-800 italic">
                    "{npc.vulnerability.description}"
                  </p>
                </div>
              )}

              {/* Social Dynamics */}
              <div className="flex gap-2 mt-2">
                {npc.rivals.length > 0 && (
                  <div className="flex -space-x-1">
                    {npc.rivals.map(id => (
                      <div key={id} className="w-4 h-4 rounded-full border border-red-500 bg-red-100 flex items-center justify-center overflow-hidden" title={`Rival: ${state.npcs[id]?.name}`}>
                        <img src={state.npcs[id]?.avatar} alt="" className="w-full h-full object-cover grayscale" />
                      </div>
                    ))}
                    <span className="text-[6px] font-black text-red-600 ml-1 uppercase self-center">Rivals</span>
                  </div>
                )}
                {npc.allies.length > 0 && (
                  <div className="flex -space-x-1">
                    {npc.allies.map(id => (
                      <div key={id} className="w-4 h-4 rounded-full border border-emerald-500 bg-emerald-100 flex items-center justify-center overflow-hidden" title={`Ally: ${state.npcs[id]?.name}`}>
                        <img src={state.npcs[id]?.avatar} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <span className="text-[6px] font-black text-emerald-600 ml-1 uppercase self-center">Allies</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Floating Feedback */}
            <div className="absolute -top-10 left-0 w-full flex flex-col items-center gap-1 pointer-events-none">
              <AnimatePresence>
                {state.feedbacks.filter(f => f.npcId === npc.id).map(f => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 20, scale: 0.5 }}
                    animate={{ opacity: 1, y: -20, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    className={`font-black text-xs flex items-center gap-1 px-2 py-1 rounded-full shadow-lg bg-white border border-black/10
                      ${f.amount > 0 ? 'text-emerald-600' : 'text-red-600'}
                    `}
                  >
                    {f.type === 'TRUST' ? <Heart size={12} className="fill-current" /> : <ShieldAlert size={12} />}
                    {f.amount > 0 ? '+' : ''}{f.amount}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X size={20}/></button>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-black/5 relative">
          <div className="absolute -top-2 left-6 w-4 h-4 bg-slate-50 rotate-45 border-l border-t border-black/5" />
          {!isAvailable ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <Clock size={48} className="text-slate-300" />
              <div>
                <p className="font-black text-lg uppercase tracking-tight">Currently Closed</p>
                <p className="text-xs opacity-60 mt-1 italic">
                  {npc.name} is not available right now. <br/>
                  Hours: {npc.workHours.start}:00 - {npc.workHours.end}:00
                </p>
              </div>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-black text-white rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                Leave
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm italic leading-relaxed">
                {currentNode ? currentNode.text : getDefaultDialogueText(npc)}
              </p>
              {moodInfluence !== 0 && (
                <div className={`mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${moodInfluence > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {moodInfluence > 0 ? <Smile size={14} /> : <Frown size={14} />}
                  <span>{moodInfluence > 0 ? "Closing Time Bonus" : "End of Shift Fatigue"}</span>
                </div>
              )}
            </>
          )}
        </div>

        {isAvailable && (
          <div className="flex flex-col gap-2">
            {showSpecialActions ? (
              <>
                <button 
                  onClick={() => setShowSpecialActions(false)}
                  className="w-full p-2 text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2"
                >
                  <ArrowLeft size={12} /> Back to Conversation
                </button>
                {baseOptions.map((opt, i) => (
                  <button 
                    key={i}
                    disabled={opt.condition && !opt.condition(state)}
                    onClick={() => {
                      onAction(opt.action);
                      onClose();
                    }}
                    className="w-full p-3 text-left text-sm font-bold border border-black rounded-xl hover:bg-black hover:text-white transition-colors flex justify-between items-center disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
                  >
                    <span>{opt.text}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </>
            ) : (
              <>
                {(currentNode?.options || []).map((opt, i) => (
                  <button 
                    key={i}
                    disabled={(opt.condition && !opt.condition(state)) || (opt.trustRequired && npc.trustLevel < opt.trustRequired) || (opt.leverageRequired && npc.leverage < opt.leverageRequired)}
                    onClick={() => handleOptionClick(opt)}
                    className="w-full p-3 text-left text-sm font-bold border border-black rounded-xl hover:bg-black hover:text-white transition-colors flex justify-between items-center disabled:opacity-30"
                  >
                    <div className="flex flex-col">
                      <span>{opt.text}</span>
                      {(opt.trustRequired || opt.leverageRequired) && (
                        <span className="text-[8px] uppercase opacity-50 mt-1">
                          {opt.trustRequired ? `Trust ${opt.trustRequired}+ ` : ''}
                          {opt.leverageRequired ? `Leverage ${opt.leverageRequired}+` : ''}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
                
                {/* Fallback or Special Actions trigger */}
                {(!currentNode || currentNodeId === 'root') && (
                  <button 
                    onClick={() => setShowSpecialActions(true)}
                    className="w-full p-3 text-left text-sm font-bold border border-dashed border-black rounded-xl hover:bg-slate-50 transition-colors flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" />
                      <span>Special Actions (Bribes, Negotiation...)</span>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
