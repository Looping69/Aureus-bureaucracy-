import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Flame, Gem, Pickaxe } from 'lucide-react';
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
  UndergroundResourceType,
} from '../undergroundData';

const EMPTY_NAVIGATION_ZONES: NavigationZone[] = [];
const EMPTY_NPCS: Record<string, NPC> = {};
const EMPTY_PATH: WorldPosition[] = [];
const UNDERGROUND_WEATHER: WeatherState = { current: 'CLEAR', timeLeft: 1, intensity: 0 };
const AUTO_MINE_RANGE = 4;
const RESOURCE_REVEAL_RANGE = 8;
const MAX_CARRIED_CHUNKS = 20;
const LANTERN_MAX = 100;
const noopStateChange = (_state: AppState) => {};
const noopCountChange = (_count: number) => {};

type FlyingOre = {
  id: string;
  type: UndergroundResourceType;
  fromX: number;
  fromY: number;
  stackIndex: number;
};

type WallHit = {
  id: string;
  fromX: number;
  fromY: number;
};

const clampUndergroundPosition = (pos: WorldPosition): WorldPosition => ({
  x: Math.max(0, Math.min(UNDERGROUND_SIZE - 1, Math.round(pos.x))),
  y: Math.max(0, Math.min(UNDERGROUND_SIZE - 1, Math.round(pos.y))),
});

const clampUndergroundPrecisePosition = (pos: WorldPosition): WorldPosition => ({
  x: Math.max(0, Math.min(UNDERGROUND_SIZE - 1, pos.x)),
  y: Math.max(0, Math.min(UNDERGROUND_SIZE - 1, pos.y)),
});

const distanceBetween = (from: WorldPosition, to: WorldPosition) =>
  Math.hypot(from.x - to.x, from.y - to.y);

const isNear = (from: WorldPosition, to: WorldPosition, distance: number) =>
  distanceBetween(from, to) <= distance;

const getResourceTone = (type: UndergroundResourceState['type']) => {
  if (type === 'gem') return 'border-cyan-200/80 bg-cyan-50/95 text-cyan-800';
  if (type === 'coal') return 'border-zinc-300/80 bg-zinc-950/88 text-white';
  if (type === 'rubble') return 'border-stone-300/70 bg-stone-900/92 text-stone-100';
  return 'border-amber-200/80 bg-amber-50/95 text-amber-800';
};

const getOreColorClassName = (type: UndergroundResourceType) => {
  if (type === 'gem') return 'border-cyan-100 bg-cyan-300 shadow-cyan-200/70';
  if (type === 'coal') return 'border-zinc-400 bg-zinc-900 shadow-zinc-900/70';
  if (type === 'rubble') return 'border-stone-300 bg-stone-600 shadow-stone-950/70';
  return 'border-amber-100 bg-amber-500 shadow-amber-300/70';
};

const getScreenOffset = (node: UndergroundResourceState, player: WorldPosition) => {
  const dx = node.pos.x - player.x;
  const dy = node.pos.y - player.y;

  return {
    fromX: Math.max(-130, Math.min(130, (dx - dy) * 7)),
    fromY: Math.max(-70, Math.min(120, (dx + dy) * 3 + 32)),
  };
};

const getPickTier = (state: GameState) => {
  const upgrades = state.upgrades ?? [];
  if (upgrades.some((id) => ['hydraulic_pick', 'power_pick', 'mining_drill', 'deep_pick'].includes(id))) return 3;
  if (upgrades.some((id) => ['reinforced_pick', 'iron_pick', 'mining_pick'].includes(id)) || (state.movementSpeed ?? 1) > 1.15) return 2;
  return 1;
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
  const [flyingOres, setFlyingOres] = React.useState<FlyingOre[]>([]);
  const [wallHits, setWallHits] = React.useState<WallHit[]>([]);
  const [lanternFuel, setLanternFuel] = React.useState(LANTERN_MAX);
  const [miningResourceId, setMiningResourceId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('Dig through walls and search the dark for hidden ore.');
  const mineTimeoutRef = React.useRef<number | null>(null);
  const flightTimeoutRefs = React.useRef<number[]>([]);
  const pressureWarningShownRef = React.useRef(false);
  const lanternFailedRef = React.useRef(false);

  const pickTier = React.useMemo(() => getPickTier(state), [state]);
  const miningDuration = pickTier === 3 ? 340 : pickTier === 2 ? 470 : 620;
  const lanternStrength = Math.max(0.18, lanternFuel / LANTERN_MAX);

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

  const handleMotionEnd = React.useCallback((roundedPos: WorldPosition, precisePos?: WorldPosition) => {
    setPlayerPos(clampUndergroundPrecisePosition(precisePos ?? roundedPos));
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
    onMotionEnd: handleMotionEnd,
  });
  const usingAnalogMovement = analogController.hasDirectionalInput || analogController.isMoving;
  const renderPlayerPos = usingAnalogMovement ? analogController.position : playerPos;
  const roundedPlayerPos = React.useMemo(
    () => clampUndergroundPosition(renderPlayerPos),
    [renderPlayerPos]
  );
  const lightAngle = React.useMemo(() => {
    const headingAngle = Math.atan2(analogController.heading.y, analogController.heading.x);
    return (headingAngle * 180) / Math.PI + 180;
  }, [analogController.heading.x, analogController.heading.y]);

  const nearestMineableResource = React.useMemo(() => {
    let nearest: { node: UndergroundResourceState; distance: number } | null = null;

    resources.forEach((node) => {
      if (node.remaining <= 0 || !node.discovered) return;
      const distance = distanceBetween(roundedPlayerPos, node.pos);
      if (distance > AUTO_MINE_RANGE) return;
      if (!nearest || distance < nearest.distance) {
        nearest = { node, distance };
      }
    });

    return nearest?.node ?? null;
  }, [resources, roundedPlayerPos]);

  const activeResource = React.useMemo(
    () => nearestMineableResource ?? (hoverInfo?.id ? resources.find((node) => node.id === hoverInfo.id && node.discovered) ?? null : null),
    [hoverInfo?.id, nearestMineableResource, resources]
  );
  const visibleDigTargets = resources.reduce((total, node) => total + (node.discovered ? node.remaining : 0), 0);
  const hiddenResourceCount = resources.filter((node) => !node.discovered && node.remaining > 0).length;

  const startMining = React.useCallback((node: UndergroundResourceState, options?: { automatic?: boolean }) => {
    if (miningResourceId || node.remaining <= 0 || !node.discovered) return;

    if (lanternFuel <= 0) {
      setMessage('Your lantern is out. Leave the underground before digging deeper.');
      return;
    }

    if (!isNear(roundedPlayerPos, node.pos, AUTO_MINE_RANGE)) {
      setMessage(`Move closer to ${node.name}.`);
      return;
    }

    setMiningResourceId(node.id);
    setMessage(`${options?.automatic ? 'Auto-mining' : 'Mining'} ${node.name}...`);

    mineTimeoutRef.current = window.setTimeout(() => {
      setResources((current) => current.map((candidate) =>
        candidate.id === node.id
          ? { ...candidate, remaining: Math.max(0, candidate.remaining - 1) }
          : candidate
      ));
      setLanternFuel((current) => Math.max(0, current - (node.type === 'rubble' ? 2 : 1)));

      if (node.type === 'rubble' || node.yield <= 0) {
        const hitStart = getScreenOffset(node, roundedPlayerPos);
        const hitId = `${node.id}-hit-${Date.now()}`;
        setWallHits((current) => [...current, { id: hitId, fromX: hitStart.fromX, fromY: hitStart.fromY }]);
        setMiningResourceId(null);
        setMessage(node.remaining <= 1 ? 'The wall gives way.' : `${node.name} breaks down.`);

        const removeHitTimeout = window.setTimeout(() => {
          setWallHits((current) => current.filter((hit) => hit.id !== hitId));
        }, 520);
        flightTimeoutRefs.current.push(removeHitTimeout);
        return;
      }

      const stackIndex = Math.min(carriedCount + 1, MAX_CARRIED_CHUNKS);
      const flightStart = getScreenOffset(node, roundedPlayerPos);
      const flightId = `${node.id}-${Date.now()}`;

      onCollectResource(node.yield);
      setFlyingOres((current) => [...current, {
        id: flightId,
        type: node.type,
        fromX: flightStart.fromX,
        fromY: flightStart.fromY,
        stackIndex,
      }]);
      setMessage(`${node.name} jumping onto your back.`);

      const landTimeout = window.setTimeout(() => {
        setCarriedCount((current) => Math.min(current + 1, MAX_CARRIED_CHUNKS));
        setMiningResourceId(null);
      }, 420);
      const removeTimeout = window.setTimeout(() => {
        setFlyingOres((current) => current.filter((ore) => ore.id !== flightId));
      }, 760);
      flightTimeoutRefs.current.push(landTimeout, removeTimeout);
    }, miningDuration);
  }, [carriedCount, lanternFuel, miningDuration, miningResourceId, onCollectResource, roundedPlayerPos]);

  const handleSelect = React.useCallback((target: WorldHoverInfo) => {
    setHoverInfo(target);

    if (target.kind === 'GROUND') {
      setPlayerPos(clampUndergroundPosition({ x: target.x, y: target.y }));
      setMessage('Moved through the underground chamber.');
      return;
    }

    if (target.kind === 'BUILDING' && target.id) {
      const node = resources.find((candidate) => candidate.id === target.id && candidate.discovered);
      if (node) {
        startMining(node);
      }
    }
  }, [resources, startMining]);

  React.useEffect(() => {
    const revealableResources = resources.filter((node) => (
      !node.discovered &&
      node.remaining > 0 &&
      distanceBetween(roundedPlayerPos, node.pos) <= RESOURCE_REVEAL_RANGE
    ));

    if (revealableResources.length === 0) return;

    setResources((current) => current.map((node) => (
      revealableResources.some((candidate) => candidate.id === node.id)
        ? { ...node, discovered: true }
        : node
    )));
    setMessage(`${revealableResources[0].name} revealed in the dark.`);
  }, [resources, roundedPlayerPos]);

  React.useEffect(() => {
    if (!nearestMineableResource || miningResourceId || lanternFuel <= 0) return;
    startMining(nearestMineableResource, { automatic: true });
  }, [lanternFuel, miningResourceId, nearestMineableResource, startMining]);

  React.useEffect(() => {
    const pressureId = window.setInterval(() => {
      setLanternFuel((current) => Math.max(0, current - 1));
    }, 1400);

    return () => window.clearInterval(pressureId);
  }, []);

  React.useEffect(() => {
    if (lanternFuel <= 20 && lanternFuel > 0 && !pressureWarningShownRef.current) {
      pressureWarningShownRef.current = true;
      setMessage('Lantern is running low. Find what you can and leave soon.');
    }
  }, [lanternFuel]);

  React.useEffect(() => {
    if (lanternFuel > 0 || lanternFailedRef.current) return;

    lanternFailedRef.current = true;
    if (mineTimeoutRef.current !== null) {
      window.clearTimeout(mineTimeoutRef.current);
      mineTimeoutRef.current = null;
    }
    setMiningResourceId(null);
    setMessage('The lantern goes out. You retreat to the surface.');

    const exitTimeout = window.setTimeout(onExit, 1200);
    flightTimeoutRefs.current.push(exitTimeout);
  }, [lanternFuel, onExit]);

  React.useEffect(() => {
    return () => {
      if (mineTimeoutRef.current !== null) {
        window.clearTimeout(mineTimeoutRef.current);
      }
      flightTimeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
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

      <div
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.25)_18%,rgba(0,0,0,0.74)_48%,rgba(0,0,0,0.92)_100%)]"
        style={{ opacity: 0.82 + (1 - lanternStrength) * 0.18 }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[360px] w-[360px] origin-center"
        style={{
          transform: `translate(-50%, -50%) rotate(${lightAngle}deg) scale(${0.72 + lanternStrength * 0.28})`,
          opacity: lanternStrength,
          clipPath: 'polygon(50% 50%, 100% 12%, 100% 88%)',
          background: 'linear-gradient(90deg, rgba(255,241,188,0.34), rgba(255,241,188,0.13) 58%, rgba(255,241,188,0))',
          mixBlendMode: 'screen',
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100/12 blur-xl"
        style={{ opacity: lanternStrength }}
      />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-40">
        <AnimatePresence>
          {wallHits.map((hit) => (
            <React.Fragment key={hit.id}>
              {[0, 1, 2, 3, 4, 5].map((piece) => (
                <motion.div
                  key={`${hit.id}-${piece}`}
                  initial={{ x: hit.fromX, y: hit.fromY, scale: 1, opacity: 0.8 }}
                  animate={{
                    x: hit.fromX + (piece - 2.5) * 12,
                    y: hit.fromY - 16 - (piece % 3) * 8,
                    scale: 0.3,
                    opacity: 0,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.46, ease: 'easeOut' }}
                  className="absolute h-2 w-2 rounded-sm bg-stone-300 shadow-lg shadow-stone-900/70"
                />
              ))}
            </React.Fragment>
          ))}

          {flyingOres.map((ore) => (
            <motion.div
              key={ore.id}
              initial={{ x: ore.fromX, y: ore.fromY, scale: 1.35, opacity: 0.96, rotate: -18 }}
              animate={{
                x: 18,
                y: -95 - Math.min(ore.stackIndex, MAX_CARRIED_CHUNKS) * 8,
                scale: 0.92,
                opacity: 1,
                rotate: 18,
              }}
              exit={{ opacity: 0, scale: 0.65 }}
              transition={{ duration: 0.52, ease: [0.2, 0.85, 0.22, 1] }}
              className={`absolute h-6 w-7 rounded-md border-2 shadow-xl ${getOreColorClassName(ore.type)}`}
              style={{ transformOrigin: 'center' }}
            />
          ))}
        </AnimatePresence>
      </div>

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
            Mk {pickTier} · {visibleDigTargets} visible
          </div>
          <div className="mt-1 flex items-center justify-end gap-2 text-[10px] font-black text-amber-100/90">
            <Flame size={12} />
            Lantern {lanternFuel}% · {hiddenResourceCount} hidden
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
              {activeResource.type === 'rubble'
                ? `${activeResource.remaining} wall frames left`
                : `${activeResource.remaining} left · +${activeResource.yield} ore`}
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 right-4 z-30 rounded-full border border-white/15 bg-black/72 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-sm">
        Carry {carriedCount}/{MAX_CARRIED_CHUNKS}
      </div>

      <AnalogStick onChange={setAnalogInput} isNight />
    </div>
  );
};