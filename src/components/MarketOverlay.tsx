import React from 'react';
import { motion } from 'motion/react';
import { Coins, ShieldAlert, TrendingUp, X } from 'lucide-react';
import { ExportOptionPreview, ExportStrategy } from '../game/economy';

interface MarketOverlayProps {
  ore: number;
  unitPrice: number;
  payout: number;
  exposureIncrease: number;
  licensed: boolean;
  options: ExportOptionPreview[];
  onClose: () => void;
  onSellAll: (strategy: ExportStrategy) => void;
}

export const MarketOverlay: React.FC<MarketOverlayProps> = ({
  ore,
  unitPrice,
  payout,
  exposureIncrease,
  licensed,
  options,
  onClose,
  onSellAll
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.96 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
  >
    <div className="w-full max-w-md overflow-hidden rounded-3xl border-4 border-black bg-white shadow-2xl">
      <div className="relative border-b-4 border-black bg-stone-100 p-6">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 transition-colors hover:bg-black/5"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg">
            <Coins size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight leading-none">Ore Market</h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.28em] text-black/45">
              {licensed ? 'Licensed Exchange' : 'Off-Book Buyers'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6">
        <div className="rounded-2xl border border-black/10 bg-stone-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/40">Market Status</p>
          <p className="mt-2 text-sm font-semibold text-black/75">
            {licensed
              ? 'You can sell through the legal channel for a better, safer payout.'
              : 'You can still sell ore right now. It pays out, but it raises more exposure.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/35">Ore On Hand</p>
            <p className="mt-2 text-2xl font-black">{ore}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/35">Unit Price</p>
            <p className="mt-2 text-2xl font-black">${unitPrice}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/35">Sell-All Payout</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">${payout}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/35">Exposure Hit</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-black text-amber-700">
              <ShieldAlert size={18} />
              +{exposureIncrease}
            </p>
          </div>
        </div>

        {ore <= 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-black/10 bg-stone-50 p-6 text-center">
            <p className="text-sm font-semibold text-black/65">No ore to sell yet.</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-black/40">
              Mine first, then come back here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {options.map((option) => (
              <button
                key={option.strategy}
                onClick={() => onSellAll(option.strategy)}
                className="rounded-2xl border border-black/10 bg-white p-4 text-left transition-all hover:border-black hover:bg-black hover:text-white active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} />
                      <span className="text-xs font-black uppercase tracking-[0.22em]">{option.label}</span>
                    </div>
                    <p className="mt-1 text-xs opacity-75">{option.detail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-700">${option.payout}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                      +{option.exposureChange} Heat
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
                  <span>{option.effectLabel ?? 'Immediate payout'}</span>
                  <span>
                    {option.influenceChange === 0
                      ? 'No influence shift'
                      : `${option.influenceChange > 0 ? '+' : ''}${option.influenceChange} Influence`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </motion.div>
);
