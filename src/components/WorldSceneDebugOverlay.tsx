import React from 'react';
import { WorldHoverInfo } from '../types';
import { WORLD_SIZE } from '../utils/voxelConstants';

type MiniMapItem = {
  id: string;
  type: string;
  pos: { x: number; y: number };
  footprint: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;
};

interface WorldSceneDebugOverlayProps {
  isNight: boolean;
  hoverInfo: WorldHoverInfo | null;
  pendingSelection: WorldHoverInfo | null;
  playerGridPos: { x: number; y: number };
  homeFootprint: MiniMapItem['footprint'];
  mapItems: MiniMapItem[];
  cityBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;
}

export const WorldSceneDebugOverlay: React.FC<WorldSceneDebugOverlayProps> = ({
  isNight,
  hoverInfo,
  pendingSelection,
  playerGridPos,
  homeFootprint,
  mapItems,
  cityBounds,
}) => {
  const miniMapScale = 144 / WORLD_SIZE;
  const toMiniMapStyle = (x: number, y: number, width: number = 1, height: number = 1) => ({
    left: `${x * miniMapScale}px`,
    top: `${y * miniMapScale}px`,
    width: `${Math.max(width * miniMapScale, 2)}px`,
    height: `${Math.max(height * miniMapScale, 2)}px`,
  });

  return (
    <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-3">
      <div className={`backdrop-blur-md px-3 py-1.5 border border-black/10 rounded-lg shadow-sm transition-all ${isNight ? 'bg-slate-900/40 text-slate-400' : 'bg-white/40 text-slate-600'}`}>
        <p className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-2">
          <span className="opacity-50">Grid Position</span>
          {hoverInfo ? (
            <span className={`font-bold ${isNight ? 'text-white' : 'text-black'}`}>
              X: {hoverInfo.x} Y: {hoverInfo.y} Z: {hoverInfo.z}
            </span>
          ) : (
            <span className="italic opacity-50">
              Player X: {playerGridPos.x} Y: {playerGridPos.y}
            </span>
          )}
        </p>
        {hoverInfo && (
          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest opacity-55">
            {hoverInfo.kind}{hoverInfo.id ? ` • ${hoverInfo.id}` : ''}
          </p>
        )}
        {pendingSelection && (
          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest opacity-55">
            Selected: {pendingSelection.kind}{pendingSelection.id ? ` • ${pendingSelection.id}` : ` • ${pendingSelection.x},${pendingSelection.y}`}
          </p>
        )}
      </div>

      <div className={`w-[176px] rounded-xl border border-black/10 shadow-sm backdrop-blur-md p-3 ${isNight ? 'bg-slate-900/45 text-slate-300' : 'bg-white/45 text-slate-700'}`}>
        <p className="text-[10px] font-mono uppercase tracking-widest opacity-60">World Debug Grid</p>
        <div className="mt-2 flex items-start gap-3">
          <div
            className="relative h-36 w-36 overflow-hidden rounded-lg border border-black/10"
            style={{
              backgroundColor: isNight ? 'rgba(15,23,42,0.45)' : 'rgba(248,250,252,0.55)',
              backgroundImage: `
                linear-gradient(to right, rgba(100,116,139,0.18) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(100,116,139,0.18) 1px, transparent 1px)
              `,
              backgroundSize: `${Math.max(4 * miniMapScale, 2)}px ${Math.max(4 * miniMapScale, 2)}px`
            }}
          >
            {homeFootprint && (
              <div
                className="absolute rounded-sm border border-amber-500/80 bg-amber-400/25"
                style={toMiniMapStyle(
                  homeFootprint.minX,
                  homeFootprint.minY,
                  homeFootprint.maxX - homeFootprint.minX + 1,
                  homeFootprint.maxY - homeFootprint.minY + 1
                )}
              />
            )}
            {mapItems.map((item) => {
              if (item.id === 'player_home') return null;
              if (item.footprint) {
                return (
                  <div
                    key={item.id}
                    className={`absolute rounded-sm border ${
                      item.type === 'ROAD'
                        ? 'border-slate-600/80 bg-slate-700/35'
                        : item.type === 'PARK'
                          ? 'border-emerald-500/70 bg-emerald-500/25'
                          : 'border-sky-500/70 bg-sky-500/20'
                    }`}
                    style={toMiniMapStyle(
                      item.footprint.minX,
                      item.footprint.minY,
                      item.footprint.maxX - item.footprint.minX + 1,
                      item.footprint.maxY - item.footprint.minY + 1
                    )}
                  />
                );
              }

              return (
                <div
                  key={item.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-500 bg-sky-400"
                  style={{
                    left: `${item.pos.x * miniMapScale}px`,
                    top: `${item.pos.y * miniMapScale}px`,
                    width: '4px',
                    height: '4px',
                  }}
                />
              );
            })}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-sky-500 shadow"
              style={{
                left: `${playerGridPos.x * miniMapScale}px`,
                top: `${playerGridPos.y * miniMapScale}px`,
                width: '8px',
                height: '8px'
              }}
            />
            {hoverInfo && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-sm border border-emerald-300 bg-emerald-400/55"
                style={{
                  left: `${hoverInfo.x * miniMapScale}px`,
                  top: `${hoverInfo.y * miniMapScale}px`,
                  width: '7px',
                  height: '7px'
                }}
              />
            )}
          </div>
          <div className="space-y-1 text-[10px] font-mono uppercase tracking-widest opacity-70">
            <p>World {WORLD_SIZE} x {WORLD_SIZE}</p>
            <p>Player {playerGridPos.x},{playerGridPos.y}</p>
            <p>Hover {hoverInfo ? `${hoverInfo.x},${hoverInfo.y},${hoverInfo.z}` : '--'}</p>
            <p>House {homeFootprint ? `${homeFootprint.minX}-${homeFootprint.maxX} / ${homeFootprint.minY}-${homeFootprint.maxY}` : '--'}</p>
            <p>City {cityBounds ? `${cityBounds.minX}-${cityBounds.maxX} / ${cityBounds.minY}-${cityBounds.maxY}` : '--'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
