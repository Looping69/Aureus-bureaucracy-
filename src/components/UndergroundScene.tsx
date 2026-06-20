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
  buildUndergroundTerrainBuildings,
  createInitialClearedUndergroundCells,
  createInitialUndergroundResources,
  getUndergroundCellKey,
  isUndergroundTerrainSolid,
  UNDERGROUND_SIZE,
  UNDERGROUND_START_POS,
  UNDERGROUND_TERRAIN_CHUNK_SIZE,
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
const TERRAIN_BASE_HITS = 4;
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

const getHeadingStep = (heading: WorldPosition): WorldPosition => {
  if (Math.abs(heading.x) > Math.abs(heading.y)) {
    return { x: Math.sign(heading.x) || 1, y: 0 };
  }

  return { x: 0, y: Math.sign(heading.y) || 1 };
};

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

const getPositionScreenOffset = (pos: WorldPosition, player: WorldPosition) => {
  const dx = pos.x - player.x;
  const dy = pos.y - player.y;

  return {
    fromX: Math.max(-130, Math.min(130, (dx - dy) * 7)),
    fromY: Math.max(-70, Math.min(120, (dx + dy) * 3 + 32)),
  };
};

const getScreenOffset = (node: UndergroundResourceState, player: WorldPosition) =>
  getPositionScreenOffset(node.pos, player);

const getPickTier = (state: GameState) => {
  const upgrades = state.upgrades ?? [];
  if (upgrades.some((id) => ['hydraulic_pick', 'power_pick', 'mining_drill', 'deep_pick'].includes(id))) return 3;
  if (upgrades.some((id) => ['reinforced_pick', 'iron_pick', 'mining_pick'].includes(id)) || (state.movementSpeed ?? 1) > 1.15) return 2;
  return 1;
};

const getTerrainHitsRequired = (pickTier: number) => Math.max(2, TERRAIN_BASE_HITS - (pickTier - 1));

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
  const [clearedTerrainCells, setClearedTerrainCells] = React.useState(() => createInitialClearedUndergroundCells());
  const [playerPos, setPlayerPos] = React.useState<WorldPosition>(UNDERGROUND_START_POS);
  const [hoverInfo, setHoverInfo] = React.useState<WorldHoverInfo | null>(null);
  const [analogInput, setAnalogInput] = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const [cameraAzimuth, setCameraAzimuth] = React.useState(WORLD_CAMERA_AZIMUTH);
  const [carriedCount, setCarriedCount] = React.useState(0);
  const [flyingOres, setFlyingOres] = React.useState<FlyingOre[]>([]);
  const [wallHits, setWallHits] = React.useState<WallHit[]>([]);
  const [lanternFuel, setLanternFuel] = React.useState(LANTERN_MAX);
  const [miningMode, setMiningMode] = React.useState(false);
  const [terrainMiningCell, setTerrainMiningCell] = React.useState<WorldPosition | null>(null);
  const [terrainHitProgress, setTerrainHitProgress] = React.useState<Record<string, number>>({});
  const [miningResourceId, setMiningResourceId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('Dig through walls and search the dark for hidden ore.');
  const mineTimeoutRef = React.useRef<number | null>(null);
  const flightTimeoutRefs = React.useRef<number[]>([]);
  const pressureWarningShownRef = React.useRef(false);
  const lanternFailedRef = React.useRef(false);

  const pickTier = React.useMemo(() => getPickTier(state), [state]);
  const terrainHitsRequired = getTerrainHitsRequired(pickTier);
  const miningDuration = pickTier === 3 ? 340 : pickTier === 2 ? 470 : 620;
  const lanternStrength = Math.max(0.18, lanternFuel / LANTERN_MAX);
  const terrainRenderChunkX = Math.floor(playerPos.x / UNDERGROUND_TERRAIN_CHUNK_SIZE);
  const terrainRenderChunkY = Math.floor(playerPos.y / UNDERGROUND_TERRAIN_CHUNK_SIZE);
  const terrainRenderCenter = React.useMemo(() => ({
    x: terrainRenderChunkX * UNDERGROUND_TERRAIN_CHUNK_SIZE + UNDERGROUND_TERRAIN_CHUNK_SIZE / 2,
    y: terrainRenderChunkY * UNDERGROUND_TERRAIN_CHUNK_SIZE + UNDERGROUND_TERRAIN_CHUNK_SIZE / 2,
  }), [terrainRenderChunkX, terrainRenderChunkY]);

  const resourceBuildings = React.useMemo(
    () => buildUndergroundResourceBuildings(resources),
    [resources]
  );
  const terrainBuildings = React.useMemo(
    () => buildUndergroundTerrainBuildings(clearedTerrainCells, terrainRenderCenter),
    [clearedTerrainCells, terrainRenderCenter]
  );
  const allBuildings = React.useMemo(
    () => [...terrainBuildings, ...resourceBuildings],
    [resourceBuildings, terrainBuildings]
  );
  const terrainData = React.useMemo(
    () => buildWorldTerrainVoxels(resourceBuildings, UNDERGROUND_SIZE, EMPTY_NAVIGATION_ZONES),
    [resourceBuildings]
  );
  const terrainSurfaceMap = React.useMemo(() => {
    const tiles = new Map(terrainData.surfaceMap.tiles);

    for (let x = 0; x < UNDERGROUND_SIZE; x += 1) {
      for (let y = 0; y < UNDERGROUND_SIZE; y += 1) {
        if (!isUndergroundTerrainSolid({ x, y }, clearedTerrainCells)) continue;
        const tile = tiles.get(getUndergroundCellKey({ x, y }));
        if (!tile) continue;

        tiles.set(getUndergroundCellKey({ x, y }), {
          ...tile,
          kind: 'FOUNDATION',
          walkable: false,
          cost: Number.POSITIVE_INFINITY,
          buildingId: 'underground_terrain',
        });
      }
    }

    return {
      ...terrainData.surfaceMap,
      tiles,
    };
  }, [clearedTerrainCells, terrainData.surfaceMap]);
  const terrainBlockCount = Math.max(0, UNDERGROUND_SIZE * UNDERGROUND_SIZE - clearedTerrainCells.size);

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
    surfaceMap: terrainSurfaceMap,
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
    const screenX = analogController.heading.x - analogController.heading.y;
    const screenY = analogController.heading.x + analogController.heading.y;
    return (Math.atan2(screenY, screenX) * 180) / Math.PI;
  }, [analogController.heading.x, analogController.heading.y]);
  const targetTerrainCell = React.useMemo(() => {
    const step = getHeadingStep(analogController.heading);

    for (let distance = 1; distance <= AUTO_MINE_RANGE; distance += 1) {
      const candidate = clampUndergroundPosition({
        x: roundedPlayerPos.x + step.x * distance,
        y: roundedPlayerPos.y + step.y * distance,
      });

      if (isUndergroundTerrainSolid(candidate, clearedTerrainCells)) {
        return candidate;
      }
    }

    return null;
  }, [analogController.heading.x, analogController.heading.y, clearedTerrainCells, roundedPlayerPos]);
  const targetTerrainKey = targetTerrainCell ? getUndergroundCellKey(targetTerrainCell) : null;
  const targetTerrainHits = targetTerrainKey ? terrainHitProgress[targetTerrainKey] ?? 0 : 0;
  const targetBlockOffset = React.useMemo(
    () => targetTerrainCell ? getPositionScreenOffset(targetTerrainCell, roundedPlayerPos) : null,
    [roundedPlayerPos, targetTerrainCell]
  );

  const nearestMineableResource = React.useMemo(() => {
    let nearest: { node: UndergroundResourceState; distance: number } | null = null;

    resources.forEach((node) => {
      if (node.remaining <= 0 || !node.discovered) return;
      if (isUndergroundTerrainSolid(node.pos, clearedTerrainCells)) return;
      const distance = distanceBetween(roundedPlayerPos, node.pos);
      if (distance > AUTO_MINE_RANGE) return;
      if (!nearest || distance < nearest.distance) {
        nearest = { node, distance };
      }
    });

    return nearest?.node ?? null;
  }, [clearedTerrainCells, resources, roundedPlayerPos]);

  const activeResource = React.useMemo(
    () => nearestMineableResource ?? (hoverInfo?.id ? resources.find((node) => node.id === hoverInfo.id && node.discovered) ?? null : null),
    [hoverInfo?.id, nearestMineableResource, resources]
  );
  const hiddenResourceCount = resources.filter((node) => !node.discovered && node.remaining > 0).length;

  const startTerrainMining = React.useCallback((target: WorldPosition) => {
    if (terrainMiningCell || miningResourceId || lanternFuel <= 0) return;
    if (!isUndergroundTerrainSolid(target, clearedTerrainCells)) return;

    const targetKey = getUndergroundCellKey(target);
    const currentHits = terrainHitProgress[targetKey] ?? 0;
    setTerrainMiningCell(target);
    setMessage(`Striking stone face (${currentHits}/${terrainHitsRequired})...`);

    mineTimeoutRef.current = window.setTimeout(() => {
      const nextHits = currentHits + 1;
      const hitStart = getPositionScreenOffset(target, roundedPlayerPos);
      const hitId = `terrain-${targetKey}-hit-${Date.now()}`;
      setWallHits((current) => [...current, { id: hitId, fromX: hitStart.fromX, fromY: hitStart.fromY }]);
      setLanternFuel((current) => Math.max(0, current - 1));

      if (nextHits >= terrainHitsRequired) {
        setClearedTerrainCells((current) => {
          const next = new Set(current);
          next.add(targetKey);
          return next;
        });
        setTerrainHitProgress((current) => {
          const { [targetKey]: _cleared, ...rest } = current;
          return rest;
        });
        setLanternFuel((current) => Math.max(0, current - 1));
        setMessage('Stone cleared. Move into the cut or keep carving.');
      } else {
        setTerrainHitProgress((current) => ({
          ...current,
          [targetKey]: Math.max(current[targetKey] ?? 0, nextHits),
        }));
        setMessage(`Stone cracked (${nextHits}/${terrainHitsRequired}). Keep swinging.`);
      }

      setTerrainMiningCell(null);

      const removeHitTimeout = window.setTimeout(() => {
        setWallHits((current) => current.filter((hit) => hit.id !== hitId));
      }, 520);
      flightTimeoutRefs.current.push(removeHitTimeout);
    }, miningDuration);
  }, [clearedTerrainCells, lanternFuel, miningDuration, miningResourceId, roundedPlayerPos, terrainHitProgress, terrainHitsRequired, terrainMiningCell]);

  const startMining = React.useCallback((node: UndergroundResourceState, options?: { automatic?: boolean }) => {
    if (miningResourceId || terrainMiningCell || node.remaining <= 0 || !node.discovered) return;

    if (lanternFuel <= 0) {
      setMessage('Your lantern is out. Leave the underground before digging deeper.');
      return;
    }

    if (isUndergroundTerrainSolid(node.pos, clearedTerrainCells)) {
      setMessage(`${node.name} is still embedded in the stone.`);
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
  }, [carriedCount, clearedTerrainCells, lanternFuel, miningDuration, miningResourceId, onCollectResource, roundedPlayerPos, terrainMiningCell]);

  const handleSelect = React.useCallback((target: WorldHoverInfo) => {
    setHoverInfo(target);

    if (miningMode) {
      if (targetTerrainCell) {
        startTerrainMining(targetTerrainCell);
      } else {
        setMessage('No solid stone in mining range. Move up to the face.');
      }
      return;
    }

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
  }, [miningMode, resources, startMining, startTerrainMining, targetTerrainCell]);

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
    if (!nearestMineableResource || miningResourceId || terrainMiningCell || lanternFuel <= 0) return;
    startMining(nearestMineableResource, { automatic: true });
  }, [lanternFuel, miningResourceId, nearestMineableResource, startMining, terrainMiningCell]);

  React.useEffect(() => {
    if (!miningMode || !targetTerrainCell || terrainMiningCell || miningResourceId || lanternFuel <= 0) return;
    startTerrainMining(targetTerrainCell);
  }, [lanternFuel, miningMode, miningResourceId, startTerrainMining, targetTerrainCell, terrainMiningCell]);

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
    setTerrainMiningCell(null);
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
        buildings={allBuildings}
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
        surfaceMapOverride={terrainSurfaceMap}
        playerWorking={miningResourceId !== null || terrainMiningCell !== null}
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

      {miningMode && targetTerrainCell && targetBlockOffset && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-30"
          style={{ transform: `translate(calc(-50% + ${targetBlockOffset.fromX}px), calc(-50% + ${targetBlockOffset.fromY - 18}px))` }}
        >
          <motion.div
            key={targetTerrainKey}
            initial={{ opacity: 0, scale: 0.76 }}
            animate={{ opacity: 1, scale: terrainMiningCell ? 1.08 : 1 }}
            exit={{ opacity: 0, scale: 0.76 }}
            transition={{ duration: 0.16 }}
            className="relative h-14 w-14 rotate-45 border-2 border-lime-300 bg-lime-300/8 shadow-[0_0_18px_rgba(190,242,100,0.65)]"
          >
            <div className="absolute -left-1 -top-1 h-3 w-3 border-l-4 border-t-4 border-white" />
            <div className="absolute -right-1 -top-1 h-3 w-3 border-r-4 border-t-4 border-white" />
            <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-4 border-l-4 border-white" />
            <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-4 border-r-4 border-white" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full border border-black/60 bg-lime-300 px-2 py-1 text-[9px] font-black text-black shadow-lg">
              {Math.min(targetTerrainHits + (terrainMiningCell ? 1 : 0), terrainHitsRequired)}/{terrainHitsRequired}
            </div>
          </motion.div>
        </div>
      )}

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-sm active:scale-95"
          >
            <ArrowLeft size={14} />
            Exit
          </button>
          <button
            type="button"
            onClick={() => setMiningMode((current) => !current)}
            className={`pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] shadow-lg backdrop-blur-sm active:scale-95 ${
              miningMode
                ? 'border-lime-300/70 bg-lime-300 text-black'
                : 'border-white/15 bg-black/70 text-white'
            }`}
          >
            <Pickaxe size={14} />
            Mine {miningMode ? 'On' : 'Off'}
          </button>
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/70 px-3 py-2 text-right text-white shadow-lg backdrop-blur-sm">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/50">Underground</div>
          <div className="mt-1 flex items-center justify-end gap-2 text-xs font-black">
            <Pickaxe size={14} />
            Mk {pickTier} · {terrainBlockCount} stone
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

      {miningMode && targetTerrainCell && (
        <div className="pointer-events-none absolute left-3 top-20 z-30 max-w-[210px]">
          <div className="rounded-2xl border border-stone-300/70 bg-stone-900/92 px-3 py-2 text-xs font-black text-stone-100 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Pickaxe size={14} />
              Stone Face
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-70">
              {terrainMiningCell ? 'swinging pickaxe' : `${targetTerrainHits}/${terrainHitsRequired} cracks`}
            </div>
          </div>
        </div>
      )}

      {activeResource && !(miningMode && targetTerrainCell) && (
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