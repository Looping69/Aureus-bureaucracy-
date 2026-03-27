import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin } from 'lucide-react';
import { GameState, WorldPosition, VoxelData } from '../types';
import { COLORS, CONFIG } from '../utils/voxelConstants';
import { VoxelWorldContainer } from './VoxelWorldContainer';

export const WorldScene = ({ 
  state, 
  onMove, 
  onInteract,
  onEnterHome,
  onEnterMine,
  onRecenter,
  onTravel
}: { 
  state: GameState, 
  onMove: (pos: WorldPosition) => void,
  onInteract: (npcId: string, buildingId: string) => void,
  onEnterHome: () => void,
  onEnterMine: () => void,
  onRecenter: () => void,
  onTravel: (mineId: string) => void
}) => {
  const [showTravelMenu, setShowTravelMenu] = React.useState(false);
  const [hoverPos, setHoverPos] = React.useState<{ x: number, y: number, z: number } | null>(null);
  const [recenterTrigger, setRecenterTrigger] = React.useState(0);
  const pendingHoverPosRef = React.useRef<{ x: number, y: number, z: number } | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const isNight = state.time >= 20 || state.time < 6;
  const WORLD_GRID_SIZE = 160;
  const playerGridPos = React.useMemo(
    () => ({
      x: Math.round(state.playerPos.x),
      y: Math.round(state.playerPos.y)
    }),
    [state.playerPos.x, state.playerPos.y]
  );
  const displayedGridPos = React.useMemo(() => {
    if (!hoverPos) return null;
    return {
      x: hoverPos.x + WORLD_GRID_SIZE / 2,
      y: hoverPos.z + WORLD_GRID_SIZE / 2,
      z: hoverPos.y
    };
  }, [hoverPos]);

  const allVoxels = React.useMemo(() => {
    const voxels: VoxelData[] = [];
    const size = 160; // Increased to match data.ts
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        const worldX = x - size / 2;
        const worldZ = z - size / 2;
        
        // Grass Layer
        voxels.push({
          x: worldX,
          y: CONFIG.FLOOR_Y,
          z: worldZ,
          color: COLORS.GRASS
        });

        // Layers Underneath
        // y = -1, -2: Dirt
        for (let y = CONFIG.FLOOR_Y - 1; y >= CONFIG.FLOOR_Y - 2; y--) {
          voxels.push({
            x: worldX,
            y: y,
            z: worldZ,
            color: COLORS.DARK // Using DARK as dirt
          });
        }

        // y = -3, -4: Stone
        for (let y = CONFIG.FLOOR_Y - 3; y >= CONFIG.FLOOR_Y - 4; y--) {
          voxels.push({
            x: worldX,
            y: y,
            z: worldZ,
            color: COLORS.GREY // Using GREY as stone
          });
        }

        // y = -5: Sand
        voxels.push({
          x: worldX,
          y: CONFIG.FLOOR_Y - 5,
          z: worldZ,
          color: COLORS.SAND
        });
      }
    }
    
    return voxels;
  }, []);

  const worldBuildings = React.useMemo(() => Object.values(state.buildings), [state.buildings]);
  const noopStateChange = React.useCallback(() => {}, []);
  const noopCountChange = React.useCallback(() => {}, []);
  const handleVoxelClick = React.useCallback((x: number, z: number) => {
    onMove({ x, y: z });
  }, [onMove]);
  const handleVoxelInteract = React.useCallback((type: 'NPC' | 'BUILDING', id: string) => {
    if (type === 'NPC') onInteract(id, 'none');
    else onInteract('none', id);
  }, [onInteract]);
  const flushHoverPosition = React.useCallback(() => {
    hoverRafRef.current = null;
    const pending = pendingHoverPosRef.current;
    setHoverPos(prev => {
      if (!pending && !prev) return prev;
      if (!pending || !prev) return pending;
      if (pending.x === prev.x && pending.y === prev.y && pending.z === prev.z) return prev;
      return pending;
    });
  }, []);
  const handleHoverPosition = React.useCallback((pos: { x: number, y: number, z: number } | null) => {
    pendingHoverPosRef.current = pos;
    if (hoverRafRef.current !== null) return;
    hoverRafRef.current = requestAnimationFrame(flushHoverPosition);
  }, [flushHoverPosition]);

  React.useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null) {
        cancelAnimationFrame(hoverRafRef.current);
      }
    };
  }, []);

  return (
    <div className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${isNight ? 'bg-slate-950' : 'bg-slate-200'} cursor-crosshair`}>
      <VoxelWorldContainer 
        voxels={allVoxels}
        buildings={worldBuildings}
        npcs={state.npcs}
        time={state.time}
        playerPos={state.playerPos}
        isMoving={state.path.length > 0}
        targetPos={state.targetPos}
        path={state.path}
        recenterTrigger={recenterTrigger}
        onStateChange={noopStateChange}
        onCountChange={noopCountChange}
        onHoverPosition={handleHoverPosition}
        onClick={handleVoxelClick}
        onInteract={handleVoxelInteract}
      />

      {/* Coordinate Display */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className={`backdrop-blur-md px-3 py-1.5 border border-black/10 rounded-lg shadow-sm transition-all ${isNight ? 'bg-slate-900/40 text-slate-400' : 'bg-white/40 text-slate-600'}`}>
          <p className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-2">
            <span className="opacity-50">Grid Position</span>
            {hoverPos ? (
              <span className={`font-bold ${isNight ? 'text-white' : 'text-black'}`}>
                X: {displayedGridPos?.x} Y: {displayedGridPos?.y} Z: {displayedGridPos?.z}
              </span>
            ) : (
              <span className="italic opacity-50">
                Player X: {playerGridPos.x} Y: {playerGridPos.y}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* UI Overlay */}
      <div className="absolute bottom-4 right-4">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setRecenterTrigger(prev => prev + 1);
            onRecenter();
          }}
          className="bg-black text-white p-2 rounded-full active:scale-95 transition-all flex items-center justify-center shadow-lg"
          title="Recenter"
        >
          <MapPin size={16} />
        </button>
      </div>
      
      {/* Travel Menu Overlay (simplified for now) */}
      <AnimatePresence>
        {showTravelMenu && (
          <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowTravelMenu(false)}>
            <div className="bg-white p-4 rounded-2xl">Travel Menu</div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
