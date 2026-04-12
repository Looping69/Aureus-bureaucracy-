import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DoorOpen, MapPin, MoveDiagonal2, X } from 'lucide-react';
import { GameState, WorldHoverInfo, WorldPosition } from '../types';
import { WORLD_CAMERA_AZIMUTH } from '../VoxelEngine';
import { VoxelWorldContainer } from './VoxelWorldContainer';
import { AnalogStick, AnalogStickVector } from './AnalogStick';
import { WorldSceneDebugOverlay } from './WorldSceneDebugOverlay';
import { getBuildingAccessPosition } from '../utils/buildingAccess';
import { getBuildingFootprint } from '../utils/worldNavigation';
import { buildWorldTerrainVoxels } from '../utils/worldSurface';
import { WORLD_SIZE } from '../utils/voxelConstants';
import { useContinuousAnalogMovement } from '../hooks/game/useContinuousAnalogMovement';
import { BUREAU_BUILDING_ID, getFtueCopy, isFtueWorldFunnelPhase } from '../game/ftue';
import { buildStreetPickupVoxels } from '../game/streetPickups';

const BUILDING_ENTRY_TYPES = new Set(['OFFICE', 'HOME', 'MINE_ENTRANCE', 'PUB', 'HOTLINE']);

const isWithinRange = (from: WorldPosition, to: WorldPosition, distance: number) =>
  Math.abs(from.x - to.x) <= distance && Math.abs(from.y - to.y) <= distance;

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
  const bureauAutoEnterRef = React.useRef(false);
  const isNight = state.time >= 20 || state.time < 6;
  const ftueCopy = React.useMemo(() => getFtueCopy(state.ftuePhase), [state.ftuePhase]);
  const isBureauFunnelActive = isFtueWorldFunnelPhase(state.ftuePhase);
  const bureauBuilding = state.buildings[BUREAU_BUILDING_ID] ?? null;
  const bureauAccessPos = React.useMemo(
    () => (bureauBuilding ? getBuildingAccessPosition(bureauBuilding) : null),
    [bureauBuilding]
  );
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
    if (mapItems.length === 0) return null;

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

  const terrainData = React.useMemo(
    () => buildWorldTerrainVoxels(state.buildings, WORLD_SIZE, state.navigationZones),
    [state.buildings, state.navigationZones]
  );
  const pickupVoxels = React.useMemo(
    () => buildStreetPickupVoxels(state.streetPickups, terrainData.surfaceMap),
    [state.streetPickups, terrainData.surfaceMap]
  );
  const allVoxels = React.useMemo(
    () => [...terrainData.voxels, ...pickupVoxels],
    [pickupVoxels, terrainData.voxels]
  );

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
  const routeToBureau = React.useCallback(() => {
    if (bureauAccessPos) {
      onMove(bureauAccessPos);
    }
  }, [bureauAccessPos, onMove]);
  const handleNpcSelection = React.useCallback((target: WorldHoverInfo) => {
    if (!target.id) return;

    if (isBureauFunnelActive && target.id !== bureauBuilding?.npcId) {
      routeToBureau();
      return;
    }

    if (isWithinRange(state.playerPos, { x: target.x, y: target.y }, 3)) {
      onInteract(target.id, 'none');
      return;
    }

    onMove({ x: target.x, y: target.y });
  }, [bureauBuilding?.npcId, isBureauFunnelActive, onInteract, onMove, routeToBureau, state.playerPos]);
  const handleBuildingSelection = React.useCallback((target: WorldHoverInfo) => {
    if (!target.id) return;

    const building = state.buildings[target.id];
    if (!building) return;

    if (isBureauFunnelActive) {
      if (building.id !== BUREAU_BUILDING_ID) {
        routeToBureau();
        return;
      }

      const accessPos = getBuildingAccessPosition(building);
      if (isWithinRange(state.playerPos, accessPos, 2)) {
        onInteract('none', building.id);
        return;
      }

      onMove(accessPos);
      return;
    }

    if (BUILDING_ENTRY_TYPES.has(building.type)) {
      setBuildingPromptId(target.id);
      return;
    }

    onMove(getBuildingAccessPosition(building));
  }, [isBureauFunnelActive, onInteract, onMove, routeToBureau, state.buildings, state.playerPos]);
  const handleWorldSelect = React.useCallback((target: WorldHoverInfo) => {
    setPendingSelection(target);

    if (target.kind === 'GROUND') {
      confirmGroundMove(target);
      return;
    }

    if (target.kind === 'NPC') {
      handleNpcSelection(target);
      return;
    }

    if (target.kind === 'BUILDING') {
      handleBuildingSelection(target);
    }
  }, [confirmGroundMove, handleBuildingSelection, handleNpcSelection]);
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
  const bureauDistance = React.useMemo(() => {
    if (!bureauAccessPos) return Number.POSITIVE_INFINITY;
    return Math.hypot(state.playerPos.x - bureauAccessPos.x, state.playerPos.y - bureauAccessPos.y);
  }, [bureauAccessPos, state.playerPos.x, state.playerPos.y]);
  const isPlayerNearBureau = bureauDistance <= 2;
  const bureauDirection = React.useMemo(() => {
    if (!bureauAccessPos) return '';
    const dx = bureauAccessPos.x - state.playerPos.x;
    const dy = bureauAccessPos.y - state.playerPos.y;
    const horizontal = dx > 0 ? 'east' : dx < 0 ? 'west' : '';
    const vertical = dy > 0 ? 'south' : dy < 0 ? 'north' : '';
    return [vertical, horizontal].filter(Boolean).join('-') || 'here';
  }, [bureauAccessPos, state.playerPos.x, state.playerPos.y]);
  const objectiveTarget = React.useMemo<WorldHoverInfo | null>(() => {
    if (!isBureauFunnelActive || !bureauAccessPos) return null;
    return {
      x: bureauAccessPos.x,
      y: bureauAccessPos.y,
      z: 1,
      kind: 'BUILDING',
      id: BUREAU_BUILDING_ID,
      label: bureauBuilding?.name
    };
  }, [bureauAccessPos, bureauBuilding?.name, isBureauFunnelActive]);

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

  React.useEffect(() => {
    if (!buildingPromptId) return;
    if (!state.buildings[buildingPromptId] || isBureauFunnelActive) {
      setBuildingPromptId(null);
    }
  }, [buildingPromptId, isBureauFunnelActive, state.buildings]);

  React.useEffect(() => {
    if (!isBureauFunnelActive || !bureauBuilding || !isPlayerNearBureau) {
      bureauAutoEnterRef.current = false;
      return;
    }

    if (bureauAutoEnterRef.current) return;
    bureauAutoEnterRef.current = true;
    onInteract('none', bureauBuilding.id);
  }, [bureauBuilding, isBureauFunnelActive, isPlayerNearBureau, onInteract]);

  return (
    <div className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${isNight ? 'bg-slate-950' : 'bg-slate-200'}`}>
      <VoxelWorldContainer
        voxels={allVoxels}
        buildings={worldBuildings}
        navigationZones={state.navigationZones}
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
        objectiveTarget={objectiveTarget}
        showLoadingOverlay={showInitialLoadingOverlay}
        onReady={onInitialSceneReady}
        onProgress={onInitialLoadingProgress}
      />

      {showDebug && (
        <WorldSceneDebugOverlay
          isNight={isNight}
          hoverInfo={hoverInfo}
          pendingSelection={pendingSelection}
          playerGridPos={playerGridPos}
          homeFootprint={homeFootprint}
          mapItems={mapItems}
          cityBounds={cityBounds}
        />
      )}

      {/* UI Overlay */}
      <AnalogStick onChange={setAnalogInput} isNight={isNight} />

      {isBureauFunnelActive && bureauBuilding && (
        <>
          <div className="absolute left-4 right-16 top-4 z-30 rounded-2xl border border-amber-300 bg-amber-100/95 px-4 py-3 shadow-xl backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-800">Primary Target</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-amber-950">{bureauBuilding.name}</p>
                <p className="text-xs font-semibold text-amber-900/80">{ftueCopy.body}</p>
              </div>
              <div className="shrink-0 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                {isPlayerNearBureau ? 'Enter Now' : bureauDirection}
              </div>
            </div>
          </div>

          <div className="absolute left-4 right-4 bottom-28 z-30 flex justify-center pointer-events-none">
            <div className="rounded-full bg-black/80 px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-xl">
              {hoverInfo?.id === BUREAU_BUILDING_ID
                ? (isPlayerNearBureau ? 'Release Hesitation. Entry is happening.' : 'Tap the Bureau. We will move you in.')
                : 'Tap the Bureau building to move there and enter.'}
            </div>
          </div>
        </>
      )}

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
        {promptedBuilding && !isBureauFunnelActive && (
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
