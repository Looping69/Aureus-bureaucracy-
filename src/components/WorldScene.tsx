import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DoorOpen, MapPin, MoveDiagonal2, X } from 'lucide-react';
import { GameState, WorldHoverInfo, WorldPosition } from '../types';
import { WORLD_CAMERA_AZIMUTH } from '../VoxelEngine';
import { VoxelWorldContainer } from './VoxelWorldContainer';
import { AnalogStick, AnalogStickVector } from './AnalogStick';
import { getBuildingAccessPosition } from '../utils/buildingAccess';
import { getBuildingFootprint } from '../utils/worldNavigation';
import { buildWorldTerrainVoxels } from '../utils/worldSurface';
import { isDaytimeHours } from '../utils/dayNightCycle';
import { WORLD_SIZE } from '../utils/voxelConstants';
import { useContinuousAnalogMovement } from '../hooks/game/useContinuousAnalogMovement';

export const WorldScene = ({ 
  state, 
  onMove, 
  onDirectMove,
  onInteract,
  onRecenter,
  showDebug = false,
  showInitialLoadingOverlay = true,
  onInitialSceneReady,
  onInitialLoadingProgress
}: { 
  state: GameState, 
  onMove: (pos: WorldPosition, options?: { ignoreDrag?: boolean }) => void,
  onDirectMove: (pos: WorldPosition) => void,
  onInteract: (npcId: string, buildingId: string) => void,
  onRecenter: () => void,
  showDebug?: boolean,
  showInitialLoadingOverlay?: boolean,
  onInitialSceneReady?: () => void,
  onInitialLoadingProgress?: (progress: number, phase: string) => void
}) => {
  const [hoverInfo, setHoverInfo] = React.useState<WorldHoverInfo | null>(null);
  const [pendingSelection, setPendingSelection] = React.useState<WorldHoverInfo | null>(null);
  const [buildingPromptId, setBuildingPromptId] = React.useState<string | null>(null);
  const [recenterTrigger, setRecenterTrigger] = React.useState(0);
  const [analogInput, setAnalogInput] = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const pendingHoverPosRef = React.useRef<WorldHoverInfo | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const isNight = !isDaytimeHours(state.time);
  const homeFootprint = React.useMemo(
    () => state.buildings.player_home ? getBuildingFootprint(state.buildings.player_home) : null,
    [state.buildings]
  );
  const mapItems = React.useMemo(
    () => Object.values(state.buildings).map((building) => ({
      id: building.id,
      type: building.type,
      pos: building.pos,
      footprint: getBuildingFootprint(building),
    })),
    [state.buildings]
  );
  const cityBounds = React.useMemo(() => {
    const entries = mapItems.flatMap((item) => {
      if (item.footprint) {
        return [item.footprint.minX, item.footprint.maxX, item.footprint.minY, item.footprint.maxY];
      }
      return [item.pos.x, item.pos.y];
    });

    if (entries.length === 0) return null;

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    mapItems.forEach((item) => {
      if (item.footprint) {
        minX = Math.min(minX, item.footprint.minX);
        maxX = Math.max(maxX, item.footprint.maxX);
        minY = Math.min(minY, item.footprint.minY);
        maxY = Math.max(maxY, item.footprint.maxY);
      } else {
        minX = Math.min(minX, item.pos.x);
        maxX = Math.max(maxX, item.pos.x);
        minY = Math.min(minY, item.pos.y);
        maxY = Math.max(maxY, item.pos.y);
      }
    });

    return { minX, maxX, minY, maxY };
  }, [mapItems]);
  const miniMapScale = 144 / WORLD_SIZE;
  const toMiniMapStyle = React.useCallback(
    (x: number, y: number, width: number = 1, height: number = 1) => ({
      left: `${x * miniMapScale}px`,
      top: `${y * miniMapScale}px`,
      width: `${Math.max(width * miniMapScale, 2)}px`,
      height: `${Math.max(height * miniMapScale, 2)}px`,
    }),
    [miniMapScale]
  );

  const terrainData = React.useMemo(
    () => buildWorldTerrainVoxels(state.buildings, WORLD_SIZE),
    [state.buildings]
  );
  const allVoxels = terrainData.voxels;

  const analogController = useContinuousAnalogMovement({
    input: analogInput,
    authoritativePosition: state.playerPos,
    movementSpeed: state.movementSpeed ?? 1,
    surfaceMap: terrainData.surfaceMap,
    cameraAzimuth: WORLD_CAMERA_AZIMUTH,
    bounds: { min: 0, max: WORLD_SIZE - 1 },
    onInputStart: onDirectMove,
    onRoundedPositionChange: onDirectMove,
    onMotionEnd: onDirectMove,
  });
  const usingAnalogMovement = analogController.hasDirectionalInput || analogController.isMoving;
  const renderPlayerPos = usingAnalogMovement ? analogController.position : state.playerPos;
  const playerGridPos = React.useMemo(
    () => ({
      x: Math.round(renderPlayerPos.x),
      y: Math.round(renderPlayerPos.y)
    }),
    [renderPlayerPos.x, renderPlayerPos.y]
  );

  const worldBuildings = React.useMemo(
    () => Object.values(state.buildings),
    [state.buildings]
  );
  const noopStateChange = React.useCallback(() => {}, []);
  const noopCountChange = React.useCallback(() => {}, []);
  const confirmGroundMove = React.useCallback((target: WorldHoverInfo) => {
    onMove({ x: target.x, y: target.y });
  }, [onMove]);
  const handleWorldSelect = React.useCallback((target: WorldHoverInfo) => {
    setPendingSelection(target);

    if (target.kind === 'GROUND') {
      confirmGroundMove(target);
      return;
    }

    if (target.kind === 'NPC' && target.id) {
      // Only interact if player is close enough, otherwise move toward them
      const dx = Math.abs(state.playerPos.x - target.x);
      const dy = Math.abs(state.playerPos.y - target.y);
      if (dx <= 3 && dy <= 3) {
        onInteract(target.id, 'none');
      } else {
        onMove({ x: target.x, y: target.y });
      }
      return;
    }

    if (target.kind === 'BUILDING' && target.id) {
      const building = state.buildings[target.id];
      if (!building) return;

      // Show the entry prompt for every interactable building type so
      // the player can choose to move to it or enter it directly.
      const interactableTypes = ['OFFICE', 'HOME', 'MINE_ENTRANCE', 'PUB', 'HOTLINE'];
      if (interactableTypes.includes(building.type)) {
        setBuildingPromptId(target.id);
        return;
      }

      onMove(getBuildingAccessPosition(building));
    }
  }, [confirmGroundMove, onInteract, onMove, state.buildings]);
  const flushHoverPosition = React.useCallback(() => {
    hoverRafRef.current = null;
    const pending = pendingHoverPosRef.current;
    setHoverInfo(prev => {
      if (!pending && !prev) return prev;
      if (!pending || !prev) return pending;
      if (
        pending.x === prev.x &&
        pending.y === prev.y &&
        pending.z === prev.z &&
        pending.kind === prev.kind &&
        pending.id === prev.id
      ) return prev;
      return pending;
    });
  }, []);
  const handleHoverPosition = React.useCallback((pos: WorldHoverInfo | null) => {
    pendingHoverPosRef.current = pos;
    if (hoverRafRef.current !== null) return;
    hoverRafRef.current = requestAnimationFrame(flushHoverPosition);
  }, [flushHoverPosition]);

  const promptedBuilding = buildingPromptId ? state.buildings[buildingPromptId] : null;

  const isPlayerNearBuilding = React.useMemo(() => {
    if (!promptedBuilding) return false;
    const accessPos = getBuildingAccessPosition(promptedBuilding);
    const dx = Math.abs(state.playerPos.x - accessPos.x);
    const dy = Math.abs(state.playerPos.y - accessPos.y);
    return dx <= 2 && dy <= 2;
  }, [promptedBuilding, state.playerPos.x, state.playerPos.y]);

  React.useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null) {
        cancelAnimationFrame(hoverRafRef.current);
      }
    };
  }, []);

  // ── Bureau magnet behavior ──────────────────────────────────────────────
  // Show "This is it." world text and a subtle glow when the player is
  // approaching the Bureau during the early tutorial (before auto-entry at
  // distance 4 triggers scene transition).
  const bureau = state.buildings['licensing_office'];
  const bureauApproachInfo = React.useMemo(() => {
    if (state.tutorialStep !== 0 || !bureau) return null;
    const dx = renderPlayerPos.x - bureau.pos.x;
    const dy = renderPlayerPos.y - bureau.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Show magnet feedback between 4-8 tiles (discovery auto-enters at < 4)
    if (dist >= 8 || dist < 4) return null;
    // Intensity ramps up as player gets closer: 0 at dist=8, 1 at dist=4
    const intensity = 1 - (dist - 4) / 4;
    return { dist, intensity };
  }, [state.tutorialStep, bureau, renderPlayerPos.x, renderPlayerPos.y]);

  return (
    <div className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${isNight ? 'bg-slate-950' : 'bg-slate-200'} cursor-crosshair`}>
      <VoxelWorldContainer 
        voxels={allVoxels}
        buildings={worldBuildings}
        npcs={state.npcs}
        time={state.time}
        playerPos={renderPlayerPos}
        isMoving={usingAnalogMovement || state.path.length > 0}
        targetPos={usingAnalogMovement ? null : state.targetPos}
        path={usingAnalogMovement ? [] : state.path}
        recenterTrigger={recenterTrigger}
        onStateChange={noopStateChange}
        onCountChange={noopCountChange}
        onHoverPosition={handleHoverPosition}
        onSelect={handleWorldSelect}
        showLoadingOverlay={showInitialLoadingOverlay}
        onReady={onInitialSceneReady}
        onProgress={onInitialLoadingProgress}
        highlightBuildingId={bureauApproachInfo ? 'licensing_office' : null}
        highlightIntensity={bureauApproachInfo ? bureauApproachInfo.intensity * 0.18 : 0}
      />

      {/* Bureau magnet: world-space approach feedback */}
      <AnimatePresence>
        {bureauApproachInfo && (
          <motion.div
            key="bureau-magnet"
            initial={{ opacity: 0 }}
            animate={{ opacity: bureauApproachInfo.intensity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center"
          >
            {/* Directional vignette pulling toward Bureau (east) */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 60% 80% at 70% 45%, rgba(234, 179, 8, ${0.06 * bureauApproachInfo.intensity}), transparent 70%)`,
              }}
            />
            {/* Ambient world text — not UI, just presence */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-white/60 text-sm font-black uppercase tracking-[0.35em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] select-none"
              style={{ textShadow: '0 0 20px rgba(234, 179, 8, 0.4)' }}
            >
              This is it.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coordinate Display (debug only) */}
      {showDebug && (
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
      )}

      {/* UI Overlay */}
      <AnalogStick onChange={setAnalogInput} isNight={isNight} />

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
      
      <AnimatePresence>
        {promptedBuilding && (
          <motion.div
            key="building-entry-prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-x-4 bottom-40 z-[110] rounded-3xl border-2 border-black bg-white/95 p-5 shadow-2xl backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/40">Building</p>
                <h3 className="mt-1 text-lg font-black leading-none">{promptedBuilding.name}</h3>
                <p className="mt-2 text-sm font-medium text-black/65">
                  {isPlayerNearBuilding
                    ? 'Enter it, or stay outside and move to the access point.'
                    : 'Move closer to this building before you can enter it.'}
                </p>
              </div>
              <button
                onClick={() => setBuildingPromptId(null)}
                className="rounded-full p-2 transition-colors hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onMove(getBuildingAccessPosition(promptedBuilding));
                  setBuildingPromptId(null);
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-[0.22em] transition-all hover:bg-black hover:text-white active:scale-95"
              >
                <MoveDiagonal2 size={16} />
                Move Here
              </button>
              <button
                onClick={() => {
                  if (!isPlayerNearBuilding) return;
                  onInteract('none', promptedBuilding.id);
                  setBuildingPromptId(null);
                }}
                disabled={!isPlayerNearBuilding}
                className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.22em] transition-all active:scale-95 ${
                  isPlayerNearBuilding
                    ? 'bg-black text-white hover:bg-zinc-800'
                    : 'bg-black/20 text-black/40 cursor-not-allowed'
                }`}
              >
                <DoorOpen size={16} />
                {isPlayerNearBuilding ? 'Enter' : 'Too Far'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
