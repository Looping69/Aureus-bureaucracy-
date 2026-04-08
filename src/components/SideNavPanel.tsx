import React from 'react';
import { Briefcase, ChevronLeft, ChevronRight, FlaskConical, GitBranch, Mountain, Pickaxe, Store, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { GameState } from '../types';

interface SideNavPanelProps {
  state: GameState;
  isOpen: boolean;
  onToggle: () => void;
  onOpenMine: () => void;
  onOpenMineWorld: () => void;
  onOpenTesting: () => void;
  onOpenWorld: () => void;
  onOpenOffice: () => void;
  onExport: () => void;
  onOpenProgression: () => void;
}

interface NavAction {
  key: string;
  label: string;
  active?: boolean;
  accentClassName?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  title?: string;
}

export const SideNavPanel: React.FC<SideNavPanelProps> = ({
  state,
  isOpen,
  onToggle,
  onOpenMine,
  onOpenMineWorld,
  onOpenTesting,
  onOpenWorld,
  onOpenOffice,
  onExport,
  onOpenProgression
}) => {
  const actions: NavAction[] = [
    {
      key: 'mine',
      label: 'Mine',
      active: state.currentScene === 'MINE',
      icon: Pickaxe,
      onClick: onOpenMine
    },
    {
      key: 'mine_world',
      label: 'Shaft',
      active: state.currentScene === 'MINE_WORLD',
      icon: Mountain,
      onClick: onOpenMineWorld,
      title: 'Enter the 3-D mine shaft.'
    },
    {
      key: 'testing',
      label: 'Testing',
      active: state.currentScene === 'TESTING',
      icon: FlaskConical,
      onClick: onOpenTesting,
      title: 'Enter the testing world.'
    },
    {
      key: 'world',
      label: 'World',
      active: state.currentScene === 'WORLD',
      icon: Users,
      onClick: onOpenWorld
    },
    ...(state.currentScene === 'OFFICE'
      ? [{
          key: 'office',
          label: 'Office',
          active: state.currentScene === 'OFFICE',
          icon: Briefcase,
          onClick: onOpenOffice
        }]
      : []),
    {
      key: 'progression',
      label: 'Permits',
      icon: GitBranch,
      onClick: onOpenProgression,
      title: 'View the permit progression map.'
    },
    {
      key: 'market',
      label: 'Market',
      icon: Store,
      accentClassName: state.ore > 0 ? 'text-emerald-700' : 'text-black/45',
      onClick: onExport,
      title: 'Open the market.'
    }
  ];

  const handleAction = (action: NavAction) => {
    action.onClick();
    if (isOpen) onToggle();
  };

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-40 flex items-center">
      <motion.aside
        animate={{ x: isOpen ? 0 : 96 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="pointer-events-auto w-32 overflow-hidden rounded-l-[20px] border border-black/10 bg-white/82 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex min-h-[180px]">
          <button
            type="button"
            aria-label={isOpen ? 'Collapse navigation panel' : 'Expand navigation panel'}
            onClick={onToggle}
            className="flex w-9 shrink-0 flex-col items-center justify-center gap-2 border-r border-black/10 bg-black/5 text-black/70 transition-colors hover:bg-black/10"
          >
            {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            <span className="[writing-mode:vertical-rl] text-[8px] font-black uppercase tracking-[0.2em]">
              Menu
            </span>
          </button>

          <div className="flex flex-1 flex-col justify-center gap-1.5 p-1.5">
            {actions.map((action) => {
              const { key, label, icon: Icon, active, accentClassName, title } = action;
              return (
              <button
                key={key}
                type="button"
                onClick={() => handleAction(action)}
                title={title}
                className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-[0.18em] transition-all active:scale-[0.98] ${
                  active
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-black/10 bg-white/80 text-black hover:bg-black/5'
                } ${accentClassName ?? ''}`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
              );
            })}
          </div>
        </div>
      </motion.aside>
    </div>
  );
};
