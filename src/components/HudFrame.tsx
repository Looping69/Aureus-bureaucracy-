import React from 'react';
import { LucideIcon } from 'lucide-react';

const joinClasses = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

export const HUD_PANEL_BASE_CLASS =
  'rounded-[6px] border-2 bg-slate-950/88 text-white shadow-[4px_4px_0_rgba(15,23,42,0.3)] backdrop-blur-md';

export const HUD_BUTTON_BASE_CLASS = joinClasses(
  HUD_PANEL_BASE_CLASS,
  'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(15,23,42,0.26)] active:scale-[0.98] disabled:translate-y-0 disabled:shadow-[4px_4px_0_rgba(15,23,42,0.3)] disabled:opacity-45'
);

export const HudPanel = ({
  children,
  className,
  toneBorderClass = 'border-slate-700',
}: {
  children: React.ReactNode;
  className?: string;
  toneBorderClass?: string;
}) => (
  <div className={joinClasses(HUD_PANEL_BASE_CLASS, toneBorderClass, className)}>
    {children}
  </div>
);

export const HudIconTile = ({
  icon: Icon,
  toneClass = 'bg-slate-300',
  iconClassName = 'text-slate-950',
}: {
  icon: LucideIcon;
  toneClass?: string;
  iconClassName?: string;
}) => (
  <span className={joinClasses('flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-black/20', toneClass)}>
    <Icon size={14} strokeWidth={2.4} className={iconClassName} />
  </span>
);

export const HudActionButton = ({
  icon: Icon,
  label,
  detail,
  className,
  toneBorderClass = 'border-slate-700',
  toneIconClass = 'bg-slate-300',
  iconClassName = 'text-slate-950',
  ...buttonProps
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  detail?: string;
  className?: string;
  toneBorderClass?: string;
  toneIconClass?: string;
  iconClassName?: string;
}) => (
  <button
    type="button"
    {...buttonProps}
    className={joinClasses(
      HUD_BUTTON_BASE_CLASS,
      toneBorderClass,
      'flex items-center gap-2 px-2 py-1.5 text-left',
      className
    )}
  >
    <HudIconTile icon={Icon} toneClass={toneIconClass} iconClassName={iconClassName} />
    <span className="flex min-w-0 flex-1 flex-col leading-none">
      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-200">{label}</span>
      {detail && (
        <span className="mt-1 text-[8px] font-mono uppercase tracking-[0.16em] text-slate-500">{detail}</span>
      )}
    </span>
  </button>
);
