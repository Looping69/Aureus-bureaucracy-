import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Coins, Flame, Pickaxe } from 'lucide-react';
import {
  AppState,
  GameState,
  NPC,
  NavigationZone,
  UndergroundGoldDrop,
  UndergroundMineState,
  UndergroundResourceState,
  VoxelData,
  WeatherState,
  WorldHoverInfo,
  WorldPosition,
} from '../types';
import { WORLD_CAMERA_AZIMUTH } from '../VoxelEngine';
import { VoxelWorldContainer } from './VoxelWorldContainer';
import { AnalogStick, AnalogStickVector } from './AnalogStick';
import { buildWorldTerrainVoxels } from '../utils/worldSurface';
import { WORLD_HALF_SIZE } from '../utils/voxelConstants';
import { useContinuousAnalogMovement } from '../hooks/game/useContinuousAnalogMovement';
import {
  buildUndergroundElevatorBuilding,
  buildUndergroundResourceBuildings,
  buildUndergroundTerrainBuildings,
  createInitialUndergroundMineState,
  getGoldOreYieldForCell,
  getUndergroundCellKey,
  isUndergroundTerrainSolid,
  UNDERGROUND_DROPOFF_POS,
  UNDERGROUND_SIZE,
  UNDERGROUND_START_POS,
  UNDERGROUND_TERRAIN_CHUNK_SIZE,
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
const GOLD_PICKUP_RANGE = 1.35;
const DROPOFF_RANGE = 4.5;
const noopStateChange = (_state: AppState) => {};
const noopCountChange = (_count: number) => {};

let savedUndergroundSnapshot: UndergroundMineState | null = null;

type FlyingOre = {
  id: string;
  fromX: number;
  fromY: number;
  toX?: number;
  toY?: number;
  stackIndex: number;
  mode: 'pickup' | 'dropoff';
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

const getPositionScreenOffset = (pos: WorldPosition, player: WorldPosition) => {
  const dx = pos.x - player.x;
  const dy = pos.y - player.y;

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

const getTerrainHitsRequired = (pickTier: number) => Math.max(2, TERRAIN_BASE_HITS - (pickTier - 1));

const getOreColorClassName = () => 'border-yellow-100 bg-yellow-400 shadow-yellow-200/70';

const makeGoldPickupVoxels = (droppedGold: UndergroundGoldDrop[], depositedGold: number): VoxelData[] => {
  const voxels: VoxelData[] = [];
  const goldColors = [0xfacc15, 0xf59e0b, 0xfde68a, 0xd97706];

  droppedGold.forEach((drop) => {
    for (let i = 0; i < drop.amount; i += 1) {
      voxels.push({
        x: drop.pos.x - WORLD_HALF_SIZE + (i % 2) * 0.34,
        y: 0.74 + Math.floor(i / 2) * 0.22,
        z: drop.pos.y - WORLD_HALF_SIZE + Math.floor(i / 2) * 0.34,
        color: goldColors[i % goldColors.length],
      });
    }
  });

  for (let i = 0; i < Math.min(depositedGold, 24); i += 1) {
    voxels.push({
      x: UNDERGROUND_DROPOFF_POS.x - WORLD_HALF_SIZE + 1.8 + (i % 3) * 0.42,
      y: 0.74 + Math.floor(i / 6) * 0.28,
      z: UNDERGROUND_DROPOFF_POS.y - WORLD_HALF_SIZE + 1.8 + Math.floor((i % 6) / 3) * 0.42,
      color: goldColors[i % goldColors.length],
    });
  }

  return voxels;
};

const getInitialUndergroundSnapshot = (state: GameState) =>
  savedUndergroundSnapshot ?? state.underground ?? createInitialUndergroundMineState();

export const UndergroundScene = ({
  state,
  onCollectResource,
  onUndergroundChange,
  onExit,
}: {
  state: GameState;
  onCollectResource: (amount: number) => void;
  onUndergroundChange?: (underground: UndergroundMineState) => void;
  onExit: () => void;
}) => {
  const initialUndergroundRef = React.useRef(getInitialUndergroundSnapshot(state));
  const [resources, setResources] = React.useState<UndergroundResourceState[]>(() => initialUndergroundRef.current.resources);
  const [clearedTerrainCells, setClearedTerrainCells] = React.useState(() => new Set(initialUndergroundRef.current.clearedTerrainCells));
  const [playerPos, setPlayerPos] = React.useState<WorldPosition>(initialUndergroundRef.current.playerPos ?? UNDERGROUND_START_POS);
  const [hoverInfo, setHoverInfo] = React.useState<WorldHoverInfo | null>(null);
  const [analogInput, setAnalogInput] = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const [cameraAzimuth, setCameraAzimuth] = React.useState(WORLD_CAMERA_AZIMUTH);
  const [carriedCount, setCarriedCount] = React.useState(initialUndergroundRef.current.carriedGold ?? 0);
  const [depositedGold, setDepositedGold] = React.useState(initialUndergroundRef.current.depositedGold ?? 0);
  const [droppedGold, setDroppedGold] = React.useState<UndergroundGoldDrop[]>(() => initialUndergroundRef.current.droppedGold ?? []);
  const [flyingOres, setFlyingOres] = React.useState<FlyingOre[]>([]);
  const [wallHits, setWallHits] = React.useState<WallHit[]>([]);
  const [lanternFuel, setLanternFuel] = React.useState(initialUndergroundRef.current.lanternFuel ?? LANTERN_MAX);
  const [miningMode, setMiningMode] = React.useState(false);
  const [terrainMiningCell, setTerrainMiningCell] = React.useState<WorldPosition | null>(null);
  const [terrainHitProgress, setTerrainHitProgress] = React.useState<Record<string, number>>(() => initialUndergroundRef.current.terrainHitProgress ?? {});
  const [miningResourceId, setMiningResourceId] = React.useState<string | null>(null);
  const [unloadingGold, setUnloadingGold] = React.useState(false);
  const [message, setMessage] = React.useState('Dig through walls and haul gold back to the elevator.');
  const mineTimeoutRef = React.useRef<number | null>(null);
  const unloadTimeoutRef = React.useRef<number | null>(null);
  const flightTimeoutRefs = React.useRef<number[]>([]);
  const pressureWarningShownRef = React.useRef(false);
  const lanternFailedRef = React.useRef(false);

  React.useEffect(() => {
    const nextUnderground: UndergroundMineState = {
      resources,
      clearedTerrainCells: Array.from(clearedTerrainCells),
      playerPos: clampUndergroundPrecisePosition(playerPos),
      carriedGold: carriedCount,
      depositedGold,
      droppedGold,
      lanternFuel,
      terrainHitProgress,
    };
    savedUndergroundSnapshot = nextUnderground;
    onUndergroundChange?.(nextUnderground);
  }, [carriedCount, clearedTerrainCells, depositedGold, droppedGold, lanternFuel, onUndergroundChange, playerPos, resources, terrainHitProgress]);

  const pickTier = React.useMemo(() => getPickTier(state), [state]);
  const terrainHitsRequired = getTerrainHitsRequired(pickTier);
  const carrySlowdown = Math.max(0.45, 1 - carriedCount * 0.025);
  const workLoadMultiplier = 1 + carriedCount * 0.055;
  const baseMiningDuration = pickTier === 3 ? 340 : pickTier === 2 ? 470 : 620;
  const miningDuration = Math.round(baseMiningDuration * workLoadMultiplier);
  const lanternStrength = Math.max(0.18, lanternFuel / LANTERN_MAX);
  const resourceBuildings = React.useMemo(
    () => buildUndergroundResourceBuildings(resources),
    [resources]
  );
  const terrainData = React.useMemo(
    () => buildWorldTerrainVoxels(resourceBuildings, UNDERGROUND_SIZE, EMPTY_NAVIGATION_ZONES),
    [resourceBuildings]
  );
  const goldPickupVoxels = React.useMemo(
    () => makeGoldPickupVoxels(droppedGold, depositedGold),
    [depositedGold, droppedGold]
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

    return { ...terrainData.surfaceMap, tiles };
  }, [clearedTerrainCells, terrainData.surfaceMap]);

  const handleDirectMove = React.useCallback((pos: WorldPosition) => {
    setPlayerPos(clampUndergroundPosition(pos));
  }, []);

  const handleMotionEnd = React.useCallback((roundedPos: WorldPosition, precisePos?: WorldPosition) => {
    setPlayerPos(clampUndergroundPrecisePosition(precisePos ?? roundedPos));
  }, []);

  const analogController = useContinuousAnalogMovement({
    input: analogInput,
    authoritativePosition: playerPos,
    movementSpeed: (state.movementSpeed ?? 1) * 1.08 * carrySlowdown,
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
  const nearDropoff = isNear(roundedPlayerPos, UNDERGROUND_DROPOFF_POS, DROPOFF_RANGE);
  const terrainRenderChunkX = Math.floor(playerPos.x / UNDERGROUND_TERRAIN_CHUNK_SIZE);
  const terrainRenderChunkY = Math.floor(playerPos.y / UNDERGROUND_TERRAIN_CHUNK_SIZE);
  const terrainRenderCenter = React.useMemo(() => ({
    x: terrainRenderChunkX * UNDERGROUND_TERRAIN_CHUNK_SIZE + UNDERGROUND_TERRAIN_CHUNK_SIZE / 2,
    y: terrainRenderChunkY * UNDERGROUND_TERRAIN_CHUNK_SIZE + UNDERGROUND_TERRAIN_CHUNK_SIZE / 2,
  }), [terrainRenderChunkX, terrainRenderChunkY]);
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
  const highlightedTerrainCells = React.useMemo(() => {
    if (!targetTerrainCell) return new Map<string, number>();
    const key = getUndergroundCellKey(targetTerrainCell);
    const progress = terrainMiningCell ? (terrainHitProgress[key] ?? 0) + 1 : 0;
    return new Map([[key, progress]]);
  }, [terrainHitProgress, terrainMiningCell, targetTerrainCell]);
  const terrainBuildings = React.useMemo(
    () => buildUndergroundTerrainBuildings(clearedTerrainCells, terrainRenderCenter, undefined, highlightedTerrainCells),
    [clearedTerrainCells, highlightedTerrainCells, terrainRenderCenter]
  );
  const elevatorBuilding = React.useMemo(
    () => buildUndergroundElevatorBuilding(depositedGold),
    [depositedGold]
  );
  const allBuildings = React.useMemo(
    () => [...terrainBuildings, elevatorBuilding, ...resourceBuildings],
    [elevatorBuilding, resourceBuildings, terrainBuildings]
  );
  const terrainBlockCount = Math.max(0, UNDERGROUND_SIZE * UNDERGROUND_SIZE - clearedTerrainCells.size);
  const hiddenResourceCount = resources.filter((node) => !node.discovered && node.remaining > 0).length;
  const lightAngle = React.useMemo(() => {
    const screenX = analogController.heading.x - analogController.heading.y;
    const screenY = analogController.heading.x + analogController.heading.y;
    return (Math.atan2(screenY, screenX) * 180) / Math.PI;
  }, [analogController.heading.x, analogController.heading.y]);

  const addGoldDrop = React.useCallback((target: WorldPosition, amount: number) => {
    if (amount <= 0) return;

    setDroppedGold((current) => [...current, {
      id: `gold-${getUndergroundCellKey(target)}-${Date.now()}`,
      pos: { ...target },
      amount,
    }]);
  }, []);

  const startTerrainMining = React.useCallback((target: WorldPosition) => {
    if (terrainMiningCell || miningResourceId || lanternFuel <= 0 || unloadingGold) return;
    if (!isUndergroundTerrainSolid(target, clearedTerrainCells)) return;

    const targetKey = getUndergroundCellKey(target);
    const currentHits = terrainHitProgress[targetKey] ?? 0;
    setTerrainMiningCell(target);
    setMessage(`Striking highlighted face (${currentHits}/${terrainHitsRequired})...`);

    mineTimeoutRef.current = window.setTimeout(() => {
      const nextHits = currentHits + 1;
      const hitStart = getPositionScreenOffset(target, roundedPlayerPos);
      const hitId = `terrain-${targetKey}-hit-${Date.now()}`;
      setWallHits((current) => [...current, { id: hitId, fromX: hitStart.fromX, fromY: hitStart.fromY }]);

      if (nextHits >= terrainHitsRequired) {
        const goldYield = getGoldOreYieldForCell(target, pickTier);
        setClearedTerrainCells((current) => {
          const next = new Set(current);
          next.add(targetKey);
          return next;
        });
        setTerrainHitProgress((current) => {
          const { [targetKey]: _cleared, ...rest } = current;
          return rest;
        });
        addGoldDrop(target, goldYield);
        setMessage(goldYield > 0 ? `${goldYield} gold ore dropped from the vein.` : 'Earth cleared. No gold in this cut.');
      } else {
        setTerrainHitProgress((current) => ({
          ...current,
          [targetKey]: Math.max(current[targetKey] ?? 0, nextHits),
        }));
        setMessage(`Face cracked (${nextHits}/${terrainHitsRequired}). Keep swinging.`);
      }

      setTerrainMiningCell(null);

      const removeHitTimeout = window.setTimeout(() => {
        setWallHits((current) => current.filter((hit) => hit.id !== hitId));
      }, 520);
      flightTimeoutRefs.current.push(removeHitTimeout);
    }, miningDuration);
  }, [addGoldDrop, clearedTerrainCells, lanternFuel, miningDuration, miningResourceId, pickTier, roundedPlayerPos, terrainHitProgress, terrainHitsRequired, terrainMiningCell, unloadingGold]);

  const startResourceMining = React.useCallback((node: UndergroundResourceState) => {
    if (miningResourceId || terrainMiningCell || node.remaining <= 0 || !node.discovered || unloadingGold) return;
    if (isUndergroundTerrainSolid(node.pos, clearedTerrainCells)) return;
    if (!isNear(roundedPlayerPos, node.pos, AUTO_MINE_RANGE)) return;

    setMiningResourceId(node.id);
    setMessage(`Mining ${node.name}...`);
    mineTimeoutRef.current = window.setTimeout(() => {
      setResources((current) => current.map((candidate) =>
        candidate.id === node.id
          ? { ...candidate, remaining: Math.max(0, candidate.remaining - 1) }
          : candidate
      ));
      addGoldDrop(node.pos, 1);
      setMiningResourceId(null);
      setMessage(`${node.name} dropped loose gold ore.`);
    }, miningDuration);
  }, [addGoldDrop, clearedTerrainCells, miningDuration, miningResourceId, roundedPlayerPos, terrainMiningCell, unloadingGold]);

  const handleSelect = React.useCallback((target: WorldHoverInfo) => {
    setHoverInfo(target);

    if (target.id === 'underground_elevator_dropoff') {
      setMessage(carriedCount > 0 ? 'Stand by the elevator to unload gold ore.' : 'Ore elevator ready. Bring gold here to bank it.');
      return;
    }

    if (miningMode) {
      if (targetTerrainCell) {
        startTerrainMining(targetTerrainCell);
      } else {
        setMessage('No solid earth in mining range. Move up to the green face.');
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
      if (node) startResourceMining(node);
    }
  }, [carriedCount, miningMode, resources, startResourceMining, startTerrainMining, targetTerrainCell]);

  React.useEffect(() => {
    if (droppedGold.length === 0 || carriedCount >= MAX_CARRIED_CHUNKS) return;
    if (flyingOres.some((ore) => ore.mode === 'pickup')) return;

    const drop = droppedGold.find((candidate) => isNear(candidate.pos, roundedPlayerPos, GOLD_PICKUP_RANGE));
    if (!drop) return;

    const pickupAmount = Math.min(drop.amount, MAX_CARRIED_CHUNKS - carriedCount);
    const flightStart = getPositionScreenOffset(drop.pos, roundedPlayerPos);
    const flightId = `${drop.id}-pickup-${Date.now()}`;

    setDroppedGold((current) => current.flatMap((candidate) => {
      if (candidate.id !== drop.id) return [candidate];
      const remaining = candidate.amount - pickupAmount;
      return remaining > 0 ? [{ ...candidate, amount: remaining }] : [];
    }));
    setFlyingOres((current) => [...current, {
      id: flightId,
      fromX: flightStart.fromX,
      fromY: flightStart.fromY,
      stackIndex: carriedCount + pickupAmount,
      mode: 'pickup',
    }]);
    setMessage('Gold ore jumping onto your back.');

    const landTimeout = window.setTimeout(() => {
      setCarriedCount((current) => Math.min(current + pickupAmount, MAX_CARRIED_CHUNKS));
    }, 360);
    const removeTimeout = window.setTimeout(() => {
      setFlyingOres((current) => current.filter((ore) => ore.id !== flightId));
    }, 720);
    flightTimeoutRefs.current.push(landTimeout, removeTimeout);
  }, [carriedCount, droppedGold, flyingOres, roundedPlayerPos]);

  React.useEffect(() => {
    if (!nearDropoff || carriedCount <= 0 || unloadingGold || miningResourceId || terrainMiningCell) return;

    setUnloadingGold(true);
    setMessage('Unloading gold at the elevator.');

    const unloadOne = () => {
      setCarriedCount((current) => {
        if (current <= 0) {
          setUnloadingGold(false);
          return 0;
        }

        const flightStart = getPositionScreenOffset(roundedPlayerPos, roundedPlayerPos);
        const flightEnd = getPositionScreenOffset(UNDERGROUND_DROPOFF_POS, roundedPlayerPos);
        const flightId = `dropoff-${Date.now()}-${current}`;
        setFlyingOres((existing) => [...existing, {
          id: flightId,
          fromX: flightStart.fromX + 20,
          fromY: flightStart.fromY - 80 - current * 4,
          toX: flightEnd.fromX,
          toY: flightEnd.fromY,
          stackIndex: current,
          mode: 'dropoff',
        }]);
        setDepositedGold((total) => total + 1);
        onCollectResource(1);

        const removeTimeout = window.setTimeout(() => {
          setFlyingOres((existing) => existing.filter((ore) => ore.id !== flightId));
        }, 620);
        flightTimeoutRefs.current.push(removeTimeout);

        const next = current - 1;
        if (next <= 0) {
          setMessage('Gold banked. Head back into the cut lighter.');
          setUnloadingGold(false);
          return 0;
        }

        unloadTimeoutRef.current = window.setTimeout(unloadOne, 180);
        return next;
      });
    };

    unloadTimeoutRef.current = window.setTimeout(unloadOne, 160);
  }, [carriedCount, miningResourceId, nearDropoff, onCollectResource, roundedPlayerPos, terrainMiningCell, unloadingGold]);

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
    if (!miningMode || !targetTerrainCell || terrainMiningCell || miningResourceId || lanternFuel <= 0 || unloadingGold) return;
    startTerrainMining(targetTerrainCell);
  }, [lanternFuel, miningMode, miningResourceId, startTerrainMining, targetTerrainCell, terrainMiningCell, unloadingGold]);

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
    if (carriedCount >= 16 && !unloadingGold) {
      setMessage('Heavy load. Mining is slower. Return to the elevator to bank gold.');
    }
  }, [carriedCount, unloadingGold]);

  React.useEffect(() => {
    if (lanternFuel > 0 || lanternFailedRef.current) return;

    lanternFailedRef.current = true;
    if (mineTimeoutRef.current !== null) window.clearTimeout(mineTimeoutRef.current);
    if (unloadTimeoutRef.current !== null) window.clearTimeout(unloadTimeoutRef.current);
    setMiningResourceId(null);
    setTerrainMiningCell(null);
    setUnloadingGold(false);
    setMessage('The lantern goes out. You retreat to the surface.');

    const exitTimeout = window.setTimeout(onExit, 1200);
    flightTimeoutRefs.current.push(exitTimeout);
  }, [lanternFuel, onExit]);

  React.useEffect(() => {
    return () => {
      if (mineTimeoutRef.current !== null) window.clearTimeout(mineTimeoutRef.current);
      if (unloadTimeoutRef.current !== null) window.clearTimeout(unloadTimeoutRef.current);
      flightTimeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  return (
    <div className="flex-1 relative overflow-hidden bg-stone-950">
      <VoxelWorldContainer
        voxels={terrainData.voxels}
        pickupVoxels={goldPickupVoxels}
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
        playerWorking={miningResourceId !== null || terrainMiningCell !== null || (miningMode && targetTerrainCell !== null)}
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
                  animate={{ x: hit.fromX + (piece - 2.5) * 12, y: hit.fromY - 16 - (piece % 3) * 8, scale: 0.3, opacity: 0 }}
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
                x: ore.mode === 'dropoff' ? ore.toX ?? ore.fromX : 18,
                y: ore.mode === 'dropoff' ? ore.toY ?? ore.fromY : -95 - Math.min(ore.stackIndex, MAX_CARRIED_CHUNKS) * 8,
                scale: 0.92,
                opacity: 1,
                rotate: 18,
              }}
              exit={{ opacity: 0, scale: 0.65 }}
              transition={{ duration: ore.mode === 'dropoff' ? 0.42 : 0.52, ease: [0.2, 0.85, 0.22, 1] }}
              className={`absolute h-6 w-7 rounded-md border-2 shadow-xl ${getOreColorClassName()}`}
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
              miningMode ? 'border-lime-300/70 bg-lime-300 text-black' : 'border-white/15 bg-black/70 text-white'
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
            Mk {pickTier} · {terrainBlockCount} earth
          </div>
          <div className="mt-1 flex items-center justify-end gap-2 text-[10px] font-black text-amber-100/90">
            <Flame size={12} />
            Lantern {lanternFuel}% · {hiddenResourceCount} hidden
          </div>
          <div className="mt-1 flex items-center justify-end gap-2 text-[10px] font-black text-yellow-100/95">
            <Coins size={12} />
            Gold {carriedCount}/{MAX_CARRIED_CHUNKS} · Banked {depositedGold}
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

      {nearDropoff && (
        <div className="pointer-events-none absolute left-3 top-20 z-30 max-w-[230px]">
          <div className="rounded-2xl border border-yellow-200/70 bg-yellow-950/88 px-3 py-2 text-xs font-black text-yellow-100 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2"><Coins size={14} />Ore Elevator</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-75">
              {carriedCount > 0 ? 'unloading gold' : `${depositedGold} gold banked`}
            </div>
          </div>
        </div>
      )}

      {miningMode && targetTerrainCell && !nearDropoff && (
        <div className="pointer-events-none absolute left-3 top-20 z-30 max-w-[210px]">
          <div className="rounded-2xl border border-lime-300/80 bg-lime-950/90 px-3 py-2 text-xs font-black text-lime-100 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2"><Pickaxe size={14} />Selected Face</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-70">
              {terrainMiningCell ? 'swinging pickaxe' : `${targetTerrainHits}/${terrainHitsRequired} cracks`}
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