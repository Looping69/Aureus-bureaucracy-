import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Gem, Pickaxe } from 'lucide-react';
import { AppState, GameState, NPC, NavigationZone, WeatherState, WorldHoverInfo, WorldPosition } from '../types';
import { WORLD_CAMERA_AZIMUTH } from '../VoxelEngine';
import { VoxelWorldContainer } from './VoxelWorldContainer';
import { AnalogStick, AnalogStickVector } from './AnalogStick';
import { buildWorldTerrainVoxels } from '../utils/worldSurface';
import { useContinuousAnalogMovement } from '../hooks/game/useContinuousAnalogMovement';
import {
  buildUndergroundResourceBuildings,
  createInitialUndergroundResources,
  UNDERGROUND_SIZE,
  UNDERGROUND_START_POS,
  UndergroundResourceState,
} from '../undergroundData';

const EMPTY_NAVIGATION_ZONES: NavigationZone[] = [];
const EMPTY_NPCS: Record<string, NPC> = {};
const EMPTY_PATH: WorldPosition[] = [];
const UNDERGROUND_WEATHER: WeatherState = { current: 'CLEAR', timeLeft: 1, intensity: 0 };
const noopStateChange = (_state: AppState) => {};
const noopCountChange = (_count: number) => {};

const clampUndergroundPosition = (pos: WorldPosition): WorldPosition => ({
  x: Math.max(0, Math.min(UNDERGROUND_SIZE - 1, Math.round(pos.x))),
  y: Math.max(0, Math.min(UNDERGROUND_SIZE - 1, Math.round(pos.y))),
});

const isNear = (from: WorldPosition, to: WorldPosition, distance: number) =>
  Math.hypot(from.x - to.x, from.y - to.y) <= distance;

const getResourceTone = (type: UndergroundResourceState['type']) => {
  if (type === 'gem') return 'border-cyan-200/80 bg-cyan-50/95 text-cyan-800';
  if (type === 'coal') return 'border-zinc-300/80 bg-zinc-950/88 text-white';
  return 'border-amber-200/80 bg-amber-50/95 text-amber-800';
};

export const UndergroundScene = ({
  state,
  onCollectResource,
  onExit,
}: {
  state: GameState;
  onCollectResource: (amount: number) => void;
  onExit: () => void;
}) => {
  const [resources, setResources] = React.useState(() => createInitialUndergroundResources());
  const [playerPos, setPlayerPos] = React.useState<WorldPosition>(UNDERGROUND_START_POS);
  const [hoverInfo, setHoverInfo] = React.useState<WorldHoverInfo | null>(null);
  const [analogInput, setAnalogInput] = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const [cameraAzimuth, setCameraAzimuth] = React.useState(WORLD_CAMERA_AZIMUTH);
  const [carriedCount, setCarriedCount] = React.useState(0);
  const [miningResourceId, setMiningResourceId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('Tap a deposit when close enough to mine.');
  const mineTimeoutRef = React.useRef<number | null>(null);

  const resourceBuildings = React.useMemo(
    () => buildUndergroundResourceBuildings(resources),
    [resources]
  );
  const terrainData = React.useMemo(
    () => buildWorldTerrainVoxels(resourceBuildings, UNDERGROUND_SIZE, EMPTY_NAVIGATION_ZONES),
    [resourceBuildings]
  );

  const handleDirectMove = React.useCallback((pos: WorldPosition) => {
    setPlayerPos(clampUndergroundPosition(pos));
  }, []);

  const analogController = useContinuousAnalogMovement({
    input: analogInput,
    authoritativePosition: playerPos,
    movementSpeed: (state.movementSpeed ?? 1) * 1.08,
    surfaceMap: terrainData.surfaceMap,
    cameraAzimuth,
    bounds: { min: 0, max: UNDERGROUND_SIZE - 1 },
    onInputStart: handleDirectMove,
    onRoundedPositionChange: handleDirectMove,
    onMotionEnd: handleDirectMove,
  });
  const usingAnalogMovement = analogController.hasDirectionalInput || analogController.isMoving;
  const renderPlayerPos = usingAnalogMovement ? analogController.position : playerPos;

  const activeResource = React.useMemo(
    () => (hoverInfo?.id ? resources.find((node) => node.id === hoverInfo.id) ?? null : null),
    [hoverInfo?.id, resources]
  );
  const remainingChunks = resources.reduce((total, node) => total + node.remaining, 0);

  const startMining = React.useCallback((node: UndergroundResourceState) => {
    if (miningResourceId || node.remaining <= 0) return;

    const currentPlayerPos = clampUndergroundPosition(renderPlayerPos);
    if (!isNear(currentPlayerPos, node.pos, 4)) {
      setMessage(`Move closer to ${node.name}.`);
      return;
    }

    setMiningResourceId(node.id);
    setMessage(`Mining ${node.name}...`);

    mineTimeoutRef.current = window.setTimeout(() => {
      setResources((current) => current.map((candidate) =>
        candidate.id === node.id
          ? { ...candidate, remaining: Math.max(0, candidate.remaining - 1) }
          : candidate
      ));
      setCarriedCount((current) => Math.min(current + 1, 6));
      onCollectResource(node.yield);
      setMiningResourceId(null);
      setMessage(`${node.name} loaded onto your back.`);
    }, 620);
  }, [miningResourceId, onCollectResource, renderPlayerPos]);

  const handleSelect = React.useCallback((target: WorldHoverInfo) => {
    setHoverInfo(target);

    if (target.kind === 'GROUND') {
      setPlayerPos(clampUndergroundPosition({ x: target.x, y: target.y }));
      setMessage('Moved through the underground chamber.');
      return;
    }

    if (target.kind === 'BUILDING' && target.id) {
      const node = resources.find((candidate) => candidate.id === target.id);
      if (node) {
        startMining(node);
      }
    }
  }, [resources, startMining]);

  React.useEffect(() => {
    return () => {
      if (mineTimeoutRef.current !== null) {
        window.clearTimeout(mineTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex-1 relative overflow-hidden bg-stone-950">
      <VoxelWorldContainer
        voxels={terrainData.voxels}
        buildings={resourceBuildings}
        navigationZones={EMPTY_NAVIGATION_ZONES}
        npcs={EMPTY_NPCS}
        time={22}
        weather={UNDERGROUND_WEATHER}
        playerPos={renderPlayerPos}
        isMoving={usingAnalogMovement}
        targetPos={null}
        path={EMPTY_PATH}
        onStateChange={noopStateChange}
        onCountChange={noopCountChange}
        onHoverPosition={setHoverInfo}
        onSelect={handleSelect}
        onCameraAzimuthChange={setCameraAzimuth}
        showLoadingOverlay={false}
        surfaceMapOverride={terrainData.surfaceMap}
        playerWorking={miningResourceId !== null}
        playerCarried={carriedCount}
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-sm active:scale-95"
        >
          <ArrowLeft size={14} />
          Exit
        </button>

        <div className="rounded-2xl border border-white/15 bg-black/70 px-3 py-2 text-right text-white shadow-lg backdrop-blur-sm">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/50">Underground</div>
          <div className="mt-1 flex items-center justify-end gap-2 text-xs font-black">
            <Pickaxe size={14} />
            {remainingChunks} chunks left
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-28 left-3 right-3 z-30">
        <AnimatePresence mode="wait">
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto max-w-[330px] rounded-2xl border border-white/15 bg-black/72 px-4 py-3 text-center text-xs font-bold text-white shadow-xl backdrop-blur-sm"
          >
            {message}
          </motion.div>
        </AnimatePresence>
      </div>

      {activeResource && (
        <div className="pointer-events-none absolute left-3 top-20 z-30 max-w-[210px]">
          <div className={`rounded-2xl border px-3 py-2 text-xs font-black shadow-lg backdrop-blur-sm ${getResourceTone(activeResource.type)}`}>
            <div className="flex items-center gap-2">
              <Gem size={14} />
              {activeResource.name}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-70">
              {activeResource.remaining} left · +{activeResource.yield} ore
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 right-4 z-30 rounded-full border border-white/15 bg-black/72 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-sm">
        Carry {carriedCount}/6
      </div>

      <AnalogStick onChange={setAnalogInput} isNight />
    </div>
  );
};
