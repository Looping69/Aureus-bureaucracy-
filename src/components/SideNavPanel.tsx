import React from 'react';
import { Briefcase, ChevronLeft, ChevronRight, Pickaxe, Store, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { GameState } from '../types';
import { getVisibleSceneNavItems, isSceneActive, SceneNavItem } from '../game/scenePolicy';

interface SideNavPanelProps {
  state: GameState;
  isOpen: boolean;
  onToggle: () => void;
  onOpenMine: () => void;
  onOpenMineWorld: () => void;
  onOpenWorld: () => void;
  onOpenOffice: () => void;
  onExport: () => void;
}

interface NavAction extends SceneNavItem {
  active?: boolean;
  accentClassName?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
}

export const SideNavPanel: React.FC<SideNavPanelProps> = ({
  state,
  isOpen,
  onToggle,
  onOpenMine,
  onOpenWorld,
  onOpenOffice,
  onExport
}) => {
  const iconMap: Record<SceneNavItem['scene'], NavAction['icon']> = {
    MINE: Pickaxe,
    WORLD: Users,
    OFFICE: Briefcase,
  };

  const clickMap: Record<SceneNavItem['scene'], () => void> = {
    MINE: onOpenMine,
    WORLD: onOpenWorld,
    OFFICE: onOpenOffice,
  };

  const actions: NavAction[] = [
    ...getVisibleSceneNavItems(state.currentScene).map((item) => ({
      ...item,
      active: isSceneActive(state.currentScene, item.scene),
      icon: iconMap[item.scene],
      onClick: clickMap[item.scene],
    })),
    {
      key: 'market',
      label: 'Market',
      scene: 'WORLD',
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
    <div className="pointer-events-none absolute inset-y-0 right-0 z-40 flex items-center pr-2 sm:pr-3">
      <motion.aside
        animate={{ x: isOpen ? 0 : 90 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="pointer-events-auto w-[7.25rem] overflow-hidden rounded-[24px] border border-black/10 bg-white/88 shadow-[0_18px_46px_rgba(15,23,42,0.24)] backdrop-blur-xl"
      >
        <div className="flex min-h-[210px]">
          <button
            type="button"
            aria-label={isOpen ? 'Collapse navigation panel' : 'Expand navigation panel'}
            onClick={onToggle}
            className="flex w-10 shrink-0 flex-col items-center justify-center gap-2 border-r border-black/10 bg-black/5 text-black/70 transition-colors hover:bg-black/10"
          >
            {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            <span className="[writing-mode:vertical-rl] text-[8px] font-black uppercase tracking-[0.2em]">
              Menu
            </span>
          </button>

          <div className="flex flex-1 flex-col justify-center gap-2 p-1.5">
            {actions.map((action) => {
              const { key, label, icon: Icon, active, accentClassName, title } = action;
              return (
              <button
                key={key}
                type="button"
                onClick={() => handleAction(action)}
                title={title}
                className={`flex items-center gap-2 rounded-2xl border px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.16em] transition-all active:scale-[0.98] ${
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
