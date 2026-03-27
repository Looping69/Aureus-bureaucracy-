import React from 'react';

interface MineSceneFallbackProps {
  onChooseMine: () => void;
  onBackToWorld: () => void;
}

export const MineSceneFallback: React.FC<MineSceneFallbackProps> = ({ onChooseMine, onBackToWorld }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-100">
      <div className="max-w-sm w-full bg-white border border-black/10 rounded-2xl p-5 shadow-xl text-center">
        <h3 className="font-black text-base">Select A Mine</h3>
        <p className="text-xs opacity-60 mt-1">Choose a discovered location to continue.</p>
        <button
          onClick={onChooseMine}
          className="mt-4 w-full bg-black text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800"
        >
          Choose Mine
        </button>
        <button
          onClick={onBackToWorld}
          className="mt-2 w-full py-2 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100"
        >
          Back To World
        </button>
      </div>
    </div>
  );
};

