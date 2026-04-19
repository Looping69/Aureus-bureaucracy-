import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Coins,
  Database,
  Hammer,
  Map,
  Megaphone,
  MoonStar,
  Pickaxe,
  ShieldAlert,
  SunMedium,
  Wrench,
} from 'lucide-react';
import { GameScene, GameState } from '../types';
import { getActiveWorldEffects } from '../game/dialogue/worldEffects';
import { getRunCycleSummary } from '../game/runCycle';
import { formatWeatherLabel, getWeatherToneClassName, isSevereWeather } from '../game/weatherSystem';

const formatTime = (time: number) => {
  const hours = Math.floor(time);
  const minutes = Math.floor((time % 1) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const getSceneMeta = (scene: GameScene) => {
  switch (scene) {
    case 'OFFICE':
      return { label: 'Bureau', icon: Briefcase };
    case 'MINE':
      return { label: 'Mine', icon: Pickaxe };
    case 'MINE_WORLD':
      return { label: 'Shaft', icon: Hammer };
    case 'CITY_PLANNER':
      return { label: 'Planner', icon: Map };
    case 'WORLD':
    default:
      return { label: 'City', icon: Map };
  }
};

type ValueBlockProps = {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  toneBorderClass: string;
  toneIconClass: string;
  toneValueClass?: string;
  meterValue?: number;
  numericValue?: number;
  detail?: string;
  compactLabel?: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
};

const clampMeter = (value: number) => Math.max(0, Math.min(100, value));

const HudValueBlock = React.memo(({
  id,
  icon: Icon,
  label,
  value,
  toneBorderClass,
  toneIconClass,
  toneValueClass = 'text-white',
  meterValue,
  numericValue,
  detail,
  compactLabel,
  isExpanded,
  onToggle,
}: ValueBlockProps) => {
  const [popup, setPopup] = useState<{ id: number; text: string; positive: boolean } | null>(null);
  const [hasNew, setHasNew] = useState(false);
  const previousValueRef = useRef(numericValue ?? null);
  const counterRef = useRef(0);

  useEffect(() => {
    if (numericValue === undefined) {
      previousValueRef.current = null;
      return;
    }

    const previous = previousValueRef.current;
    previousValueRef.current = numericValue;

    if (previous === null) {
      return;
    }

    const diff = Math.floor(numericValue) - Math.floor(previous);
    if (diff === 0) {
      return;
    }

    const nextPopup = {
      id: ++counterRef.current,
      text: `${diff > 0 ? '+' : ''}${diff}`,
      positive: diff > 0,
    };

    setPopup(nextPopup);
    if (!isExpanded && diff > 0) {
      setHasNew(true);
    }

    const timer = window.setTimeout(() => {
      setPopup(current => current?.id === nextPopup.id ? null : current);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isExpanded, numericValue]);

  const handleToggle = () => {
    onToggle(id);
    if (!isExpanded) {
      setHasNew(false);
    }
  };

  return (
    <div className="relative pointer-events-auto">
      {popup && isExpanded && (
        <div
          className={`absolute -bottom-6 left-1/2 z-20 -translate-x-1/2 text-[10px] font-black drop-shadow-[0_2px_0_rgba(0,0,0,0.75)] ${
            popup.positive ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {popup.text}
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        className={`relative flex min-h-11 items-center gap-2 rounded-[6px] border-2 bg-slate-950/88 px-2 py-1.5 shadow-[4px_4px_0_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(15,23,42,0.26)] ${
          isExpanded ? 'min-w-[118px] justify-start pr-3' : 'w-11 justify-center'
        } ${toneBorderClass}`}
      >
        {!isExpanded && hasNew && (
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500 animate-pulse" />
        )}

        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-black/20 ${toneIconClass}`}>
          <Icon size={14} strokeWidth={2.4} className="text-slate-950" />
        </span>

        {isExpanded ? (
          <span className="flex min-w-0 flex-1 flex-col items-start leading-none">
            <span className="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</span>
            <span className={`mt-1 text-sm font-black tracking-wide ${toneValueClass}`}>{value}</span>
            {detail && (
              <span className="mt-1 text-[8px] font-mono uppercase tracking-[0.16em] text-slate-400">{detail}</span>
            )}
          </span>
        ) : (
          <span className="sr-only">{compactLabel ?? label}</span>
        )}

        {meterValue !== undefined && (
          <span className="absolute bottom-1.5 left-1.5 right-1.5 h-0.5 overflow-hidden rounded-full bg-slate-800">
            <span
              className={`block h-full ${toneIconClass}`}
              style={{ width: `${clampMeter(meterValue)}%` }}
            />
          </span>
        )}
      </button>
    </div>
  );
});

const StatusBlock = ({
  state,
  isExpanded,
  onToggle,
  cycleTitle,
  weatherLabel,
  weatherToneClassName,
  severeWeather,
  isNight,
}: {
  state: GameState;
  isExpanded: boolean;
  onToggle: () => void;
  cycleTitle: string;
  weatherLabel: string;
  weatherToneClassName: string;
  severeWeather: boolean;
  isNight: boolean;
}) => {
  const sceneMeta = getSceneMeta(state.currentScene);
  const SceneIcon = sceneMeta.icon;
  const dayPeriodIcon = isNight ? MoonStar : SunMedium;
  const DayPeriodIcon = dayPeriodIcon;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`pointer-events-auto relative flex min-h-11 items-center gap-2 rounded-[6px] border-2 border-slate-700 bg-slate-950/92 px-2 py-1.5 text-left shadow-[4px_4px_0_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(15,23,42,0.26)] ${
        isExpanded ? 'min-w-[210px] pr-3' : 'w-11 justify-center'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-black/20 bg-sky-300">
        <SceneIcon size={14} strokeWidth={2.4} className="text-slate-950" />
      </span>

      {isExpanded ? (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">Aureus: Below</span>
            <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
              {sceneMeta.label}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            <span>Day {state.day}</span>
            <span className="text-slate-600">/</span>
            <span className={isNight ? 'text-amber-300' : 'text-sky-300'}>{formatTime(state.time)}</span>
            <span className="text-slate-600">/</span>
            <span className={`rounded-full border px-1.5 py-0.5 ${weatherToneClassName}`}>{weatherLabel}</span>
          </span>
          <span className="mt-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
            <DayPeriodIcon size={10} className={isNight ? 'text-amber-300' : 'text-sky-300'} />
            <span>{cycleTitle}</span>
            {severeWeather && <span className="text-rose-400">Severe Front</span>}
          </span>
        </span>
      ) : (
        <span className="sr-only">World status</span>
      )}
    </button>
  );
};

export const Header = ({
  state,
  onOpenUtilities,
  compactFtueHud = false
}: {
  state: GameState;
  onOpenUtilities: () => void;
  compactFtueHud?: boolean;
}) => {
  const [activeBlock, setActiveBlock] = useState<string | null>(compactFtueHud ? null : 'status');
  const isNight = state.time >= 20 || state.time < 6;
  const activeEffects = getActiveWorldEffects(state);
  const cycle = getRunCycleSummary(state);
  const weatherLabel = formatWeatherLabel(state.weather.current);
  const weatherToneClassName = getWeatherToneClassName(state.weather.current);
  const severeWeather = isSevereWeather(state.weather.current);

  useEffect(() => {
    if (compactFtueHud) {
      if (activeBlock && activeBlock !== 'status' && activeBlock !== 'money' && activeBlock !== 'energy' && activeBlock !== 'ore') {
        setActiveBlock(null);
      }
      return;
    }

    if (activeBlock === null) {
      setActiveBlock('status');
    }
  }, [activeBlock, compactFtueHud]);

  const blocks = useMemo(() => {
    const shared = [
      {
        id: 'money',
        icon: Coins,
        label: 'Funds',
        value: state.money.toLocaleString(),
        toneBorderClass: 'border-amber-600/80',
        toneIconClass: 'bg-amber-400',
        detail: state.money < 150 ? 'Cash is running thin' : 'Operating cash on hand',
        numericValue: state.money,
      },
      {
        id: 'energy',
        icon: AlertTriangle,
        label: 'Energy',
        value: `${Math.floor(state.energy)}%`,
        toneBorderClass: state.energy < 20 ? 'border-rose-600/80' : 'border-sky-600/80',
        toneIconClass: state.energy < 20 ? 'bg-rose-400' : 'bg-sky-400',
        detail: state.energy < 20 ? 'Critical fatigue' : `Cap ${Math.floor(state.maxEnergy)}%`,
        numericValue: state.energy,
        meterValue: state.energy,
      },
      {
        id: 'ore',
        icon: Database,
        label: 'Ore',
        value: state.ore.toLocaleString(),
        toneBorderClass: 'border-stone-500/80',
        toneIconClass: 'bg-stone-300',
        detail: state.ore === 0 ? 'No stockpiled ore' : 'Ready for export or processing',
        numericValue: state.ore,
      },
    ];

    if (compactFtueHud) {
      return shared;
    }

    return [
      ...shared,
      {
        id: 'evidence',
        icon: Megaphone,
        label: 'Evidence',
        value: state.evidence.toLocaleString(),
        toneBorderClass: 'border-rose-600/80',
        toneIconClass: 'bg-rose-400',
        detail: state.evidence === 0 ? 'No leverage filed' : 'Pressure stock for bureau moves',
        numericValue: state.evidence,
      },
      {
        id: 'trust',
        icon: Briefcase,
        label: 'Trust',
        value: `${Math.floor(state.meters.trust)}%`,
        toneBorderClass: 'border-blue-600/80',
        toneIconClass: 'bg-blue-400',
        detail: state.meters.trust >= 60 ? 'Public sentiment is stable' : 'Needs careful handling',
        numericValue: state.meters.trust,
        meterValue: state.meters.trust,
      },
      {
        id: 'influence',
        icon: Hammer,
        label: 'Influence',
        value: `${Math.floor(state.meters.influence)}%`,
        toneBorderClass: 'border-fuchsia-600/80',
        toneIconClass: 'bg-fuchsia-400',
        detail: state.meters.influence >= 60 ? 'Doors are opening' : 'Network still shallow',
        numericValue: state.meters.influence,
        meterValue: state.meters.influence,
      },
      {
        id: 'exposure',
        icon: ShieldAlert,
        label: 'Exposure',
        value: `${Math.floor(state.meters.exposure)}%`,
        toneBorderClass: state.meters.exposure >= 55 ? 'border-rose-600/80' : 'border-orange-500/80',
        toneIconClass: state.meters.exposure >= 55 ? 'bg-rose-400' : 'bg-orange-300',
        detail: state.meters.exposure >= 55 ? 'Heat is climbing' : 'Manageable scrutiny',
        numericValue: state.meters.exposure,
        meterValue: state.meters.exposure,
      },
    ];
  }, [compactFtueHud, state.energy, state.evidence, state.maxEnergy, state.meters.exposure, state.meters.influence, state.meters.trust, state.money, state.ore]);

  const toggleBlock = (id: string) => {
    setActiveBlock(current => current === id ? null : id);
  };

  return (
    <header className={`relative z-20 border-b px-3 pb-3 pt-3 backdrop-blur-md transition-colors duration-500 ${
      isNight
        ? 'border-white/10 bg-slate-950/55 text-white'
        : 'border-black/10 bg-slate-100/60 text-slate-950'
    }`}>
      <div className="flex flex-wrap items-start gap-2">
        <StatusBlock
          state={state}
          isExpanded={activeBlock === 'status'}
          onToggle={() => toggleBlock('status')}
          cycleTitle={cycle.title}
          weatherLabel={weatherLabel}
          weatherToneClassName={weatherToneClassName}
          severeWeather={severeWeather}
          isNight={isNight}
        />

        {blocks.map(block => (
          <HudValueBlock
            key={block.id}
            id={block.id}
            icon={block.icon}
            label={block.label}
            value={block.value}
            toneBorderClass={block.toneBorderClass}
            toneIconClass={block.toneIconClass}
            detail={block.detail}
            numericValue={block.numericValue}
            meterValue={block.meterValue}
            isExpanded={activeBlock === block.id}
            onToggle={toggleBlock}
          />
        ))}

        <button
          type="button"
          onClick={onOpenUtilities}
          className="pointer-events-auto relative flex w-11 min-h-11 items-center justify-center rounded-[6px] border-2 border-slate-700 bg-slate-950/88 px-2 py-1.5 shadow-[4px_4px_0_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(15,23,42,0.26)]"
          title="Open utilities"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-black/20 bg-slate-300">
            <Wrench size={14} strokeWidth={2.4} className="text-slate-950" />
          </span>
          <span className="sr-only">Open utilities</span>
        </button>
      </div>

      {!compactFtueHud && activeEffects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeEffects.map(effect => (
            <div
              key={effect.id}
              title={effect.detail}
              className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${effect.toneClassName}`}
            >
              {effect.label} {effect.remainingHours}h
            </div>
          ))}
        </div>
      )}
    </header>
  );
};
