/**
 * MineWorldScene - a walkable 3-D shaft level.
 *
 * The shaft is an extraction run: choose a deposit, stand still to work it,
 * manage carry load and shaft integrity, then return to the warehouse before
 * hazards or a full pack slow the loop down.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Hammer, Package, Flame, Boxes, Zap, Weight } from 'lucide-react';
import { GameState, WorldHoverInfo, WorldPosition } from '../types';
import { WORLD_CAMERA_AZIMUTH } from '../VoxelEngine';
import { VoxelWorldContainer } from './VoxelWorldContainer';
import { AnalogStick, AnalogStickVector } from './AnalogStick';
import { HudActionButton, HudIconTile, HudPanel } from './HudFrame';
import { buildWorldTerrainVoxels } from '../utils/worldSurface';
import { WORLD_SIZE } from '../utils/voxelConstants';
import { findPath } from '../utils/pathfinding';
import { useContinuousAnalogMovement } from '../hooks/game/useContinuousAnalogMovement';
import { VoxelCharacter } from '../VoxelCharacter';
import {
  MINE_WORLD_BUILDINGS,
  MINE_WORLD_ENTRANCE_POS,
  MINE_NODE_YIELDS,
  MINE_INTERACTION_RADIUS,
  NODE_HARVEST_COOLDOWN_MS,
} from '../mineWorldData';

type MineResourceType = 'rawOre' | 'coal' | 'gems';
type MineZone = 'LOADING' | 'UNLOADING' | 'DELIVERY';

interface NodeState {
  unitsRemaining: number;
  cooldownUntil: number;
  lastHarvested: number;
}

interface MineInventory {
  rawOre: number;
  coal: number;
  gems: number;
  refinedMetal: number;
}

interface ResourceParticle {
  id: number;
  label: string;
  color: string;
}

const SMELT_COST = { rawOre: 2, coal: 1 } as const;
const SMELT_OUTPUT = 3;
const SMELT_CHECK_INTERVAL_MS = 2500;
const DEPOSIT_CHECK_INTERVAL_MS = 1500;
const WORK_MINE_INTERVAL_MS = 1250;
const MAX_CARRY = VoxelCharacter.MAX_CARRY;
const UNLOAD_BLOCK_INTERVAL_MS = 220;
const NODE_CAPACITY: Record<string, number> = {
  ore_node: 36,
  coal_node: 30,
  gem_node: 16,
};
const NODE_PRESSURE_DAMAGE: Record<string, number> = {
  ore_node: 2,
  coal_node: 3,
  gem_node: 5,
};
const MAX_SHAFT_INTEGRITY = 100;
const BRACE_REPAIR = 35;
const MAX_BRACES = 3;
const CAMERA_COMMIT_INTERVAL_MS = 120;
const CAMERA_COMMIT_DELTA = 0.03;
const NOOP = () => {};

const isNear = (a: WorldPosition, b: WorldPosition, radius: number) =>
  Math.abs(a.x - b.x) <= radius && Math.abs(a.y - b.y) <= radius;

const nodeToResourceType = (nodeId: string): MineResourceType =>
  nodeId === 'ore_node' ? 'rawOre' : nodeId === 'coal_node' ? 'coal' : 'gems';

const MINE_BUILDINGS_LIST = Object.values(MINE_WORLD_BUILDINGS);

const getNodeCapacity = (nodeId: string) => NODE_CAPACITY[nodeId] ?? 20;

const createInitialNodeStates = (): Record<string, NodeState> =>
  Object.keys(MINE_NODE_YIELDS).reduce<Record<string, NodeState>>((acc, id) => {
    acc[id] = { unitsRemaining: getNodeCapacity(id), cooldownUntil: 0, lastHarvested: 0 };
    return acc;
  }, {});

const refreshExpiredNodeStates = (states: Record<string, NodeState>, now: number) => {
  let changed = false;
  const next = { ...states };

  for (const [id, node] of Object.entries(states)) {
    if (node.unitsRemaining <= 0 && node.cooldownUntil > 0 && node.cooldownUntil <= now) {
      next[id] = { unitsRemaining: getNodeCapacity(id), cooldownUntil: 0, lastHarvested: node.lastHarvested };
      changed = true;
    }
  }

  return changed ? next : states;
};

let _particleId = 0;

export const MineWorldScene = ({
  state,
  onCollectResource,
  onExit,
}: {
  state: GameState;
  onCollectResource: (amount: number) => void;
  onExit: () => void;
}) => {
  const [playerPos, setPlayerPos] = React.useState<WorldPosition>(MINE_WORLD_ENTRANCE_POS);
  const [path, setPath] = React.useState<WorldPosition[]>([]);
  const [targetPos, setTargetPos] = React.useState<WorldPosition | null>(null);

  const [inventory, setInventory] = React.useState<MineInventory>({ rawOre: 0, coal: 0, gems: 0, refinedMetal: 0 });
  const [particles, setParticles] = React.useState<ResourceParticle[]>([]);
  const [nodeStates, setNodeStates] = React.useState<Record<string, NodeState>>(createInitialNodeStates);
  const [nearNode, setNearNode] = React.useState<string | null>(null);
  const [nearZone, setNearZone] = React.useState<MineZone | null>(null);

  const [carried, setCarried] = React.useState(0);
  const [isWorking, setIsWorking] = React.useState(false);
  const [isUnloading, setIsUnloading] = React.useState(false);
  const [unloadProgress, setUnloadProgress] = React.useState(0);
  const [unloadTotal, setUnloadTotal] = React.useState(0);
  const [carryType, setCarryType] = React.useState<MineResourceType | null>(null);
  const [shaftIntegrity, setShaftIntegrity] = React.useState(MAX_SHAFT_INTEGRITY);
  const [braceCharges, setBraceCharges] = React.useState(MAX_BRACES);
  const [mineClock, setMineClock] = React.useState(() => Date.now());

  const [analogInput, setAnalogInput] = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const [recenterTrigger, setRecenterTrigger] = React.useState(0);
  const [cameraAzimuth, setCameraAzimuth] = React.useState(WORLD_CAMERA_AZIMUTH);
  const [hoverInfo, setHoverInfo] = React.useState<WorldHoverInfo | null>(null);

  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<WorldHoverInfo | null>(null);
  const playerPosRef = React.useRef(playerPos);
  const nearNodeRef = React.useRef<string | null>(nearNode);
  const nearZoneRef = React.useRef<MineZone | null>(nearZone);
  const carriedRef = React.useRef(carried);
  const carryTypeRef = React.useRef<MineResourceType | null>(carryType);
  const nodeStatesRef = React.useRef(nodeStates);
  const shaftIntegrityRef = React.useRef(shaftIntegrity);
  const braceChargesRef = React.useRef(braceCharges);
  const playerIsMovingRef = React.useRef(false);
  const isUnloadingRef = React.useRef(false);
  const unloadTimerRef = React.useRef<number | null>(null);
  const committedCameraAzimuthRef = React.useRef(WORLD_CAMERA_AZIMUTH);
  const lastCameraCommitRef = React.useRef(0);

  React.useEffect(() => { playerPosRef.current = playerPos; }, [playerPos]);
  React.useEffect(() => { nearNodeRef.current = nearNode; }, [nearNode]);
  React.useEffect(() => { nearZoneRef.current = nearZone; }, [nearZone]);
  React.useEffect(() => { carriedRef.current = carried; }, [carried]);
  React.useEffect(() => { carryTypeRef.current = carryType; }, [carryType]);
  React.useEffect(() => { nodeStatesRef.current = nodeStates; }, [nodeStates]);
  React.useEffect(() => { shaftIntegrityRef.current = shaftIntegrity; }, [shaftIntegrity]);
  React.useEffect(() => { braceChargesRef.current = braceCharges; }, [braceCharges]);
  React.useEffect(() => { isUnloadingRef.current = isUnloading; }, [isUnloading]);

  const terrainData = React.useMemo(
    () => buildWorldTerrainVoxels(MINE_WORLD_BUILDINGS, WORLD_SIZE),
    []
  );
  const allVoxels = terrainData.voxels;

  const handleAnalogInputStart = React.useCallback((roundedPos: WorldPosition) => {
    setPath([]);
    setTargetPos(null);
    setPlayerPos(roundedPos);
  }, []);

  const analogController = useContinuousAnalogMovement({
    input: analogInput,
    authoritativePosition: playerPos,
    movementSpeed: state.movementSpeed ?? 1,
    surfaceMap: terrainData.surfaceMap,
    cameraAzimuth,
    bounds: { min: 0, max: WORLD_SIZE - 1 },
    onInputStart: handleAnalogInputStart,
    onRoundedPositionChange: setPlayerPos,
    onMotionEnd: setPlayerPos,
  });

  const usingAnalogMovement = analogController.hasDirectionalInput || analogController.isMoving;
  const currentPlayerPos = usingAnalogMovement ? analogController.position : playerPos;
  const currentTile = usingAnalogMovement ? analogController.roundedPosition : playerPos;
  const playerIsMoving = usingAnalogMovement || path.length > 0;

  React.useEffect(() => {
    playerIsMovingRef.current = playerIsMoving;
  }, [playerIsMoving]);

  const spawnParticle = React.useCallback((label: string, color: string) => {
    const id = ++_particleId;
    setParticles(prev => [...prev, { id, label, color }]);
    window.setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 900);
  }, []);

  const nodeInfo = React.useCallback((id: string) => {
    switch (id) {
      case 'ore_node': return { icon: <Hammer size={10} />, label: 'Ore', color: 'bg-amber-500', hex: '#f59e0b' };
      case 'coal_node': return { icon: <Hammer size={10} />, label: 'Coal', color: 'bg-gray-700', hex: '#374151' };
      case 'gem_node': return { icon: <Hammer size={10} />, label: 'Gems', color: 'bg-purple-600', hex: '#9333ea' };
      default: return { icon: <Hammer size={10} />, label: 'Resource', color: 'bg-stone-500', hex: '#78716c' };
    }
  }, []);

  const triggerCaveIn = React.useCallback(() => {
    const currentLoad = carriedRef.current;
    const lost = Math.ceil(currentLoad * 0.35);
    if (lost > 0) {
      const nextLoad = Math.max(0, currentLoad - lost);
      carriedRef.current = nextLoad;
      setCarried(nextLoad);
      spawnParticle(`-${lost} load shaken loose`, '#ef4444');
    } else {
      spawnParticle('shaft collapse warning', '#ef4444');
    }
    shaftIntegrityRef.current = 45;
    setShaftIntegrity(45);
    setIsWorking(false);
  }, [spawnParticle]);

  const applyBrace = React.useCallback(() => {
    if (braceChargesRef.current <= 0 || shaftIntegrityRef.current >= MAX_SHAFT_INTEGRITY) return;
    const nextBraceCharges = braceChargesRef.current - 1;
    const nextIntegrity = Math.min(MAX_SHAFT_INTEGRITY, shaftIntegrityRef.current + BRACE_REPAIR);
    braceChargesRef.current = nextBraceCharges;
    shaftIntegrityRef.current = nextIntegrity;
    setBraceCharges(nextBraceCharges);
    setShaftIntegrity(nextIntegrity);
    spawnParticle('+brace set', '#38bdf8');
  }, [spawnParticle]);

  React.useEffect(() => {
    let budget = 0;
    const id = window.setInterval(() => {
      setPath(prev => {
        if (usingAnalogMovement) {
          budget = 0;
          return prev;
        }
        if (prev.length === 0) {
          budget = 0;
          return prev;
        }

        budget += Math.max(0.75, (state.movementSpeed ?? 1) * 0.75);
        let cur = playerPosRef.current;
        let remaining = prev;
        let advanced = false;

        while (remaining.length > 0) {
          const next = remaining[0];
          const dist = Math.hypot(next.x - cur.x, next.y - cur.y);
          if (dist <= 0 || budget < dist) break;
          budget -= dist;
          cur = next;
          remaining = remaining.slice(1);
          advanced = true;
        }

        if (!advanced) return prev;
        playerPosRef.current = cur;
        setPlayerPos(cur);
        if (remaining.length === 0) setTargetPos(null);
        return remaining;
      });
    }, 70);

    return () => window.clearInterval(id);
  }, [state.movementSpeed, usingAnalogMovement]);

  React.useEffect(() => {
    const r = MINE_INTERACTION_RADIUS;
    let foundNode: string | null = null;

    for (const id of Object.keys(MINE_NODE_YIELDS)) {
      const b = MINE_WORLD_BUILDINGS[id];
      if (b && isNear(currentTile, b.pos, r)) {
        foundNode = id;
        break;
      }
    }

    const loadB = MINE_WORLD_BUILDINGS.loading_zone;
    const unloadB = MINE_WORLD_BUILDINGS.unloading_zone;
    const deliverB = MINE_WORLD_BUILDINGS.delivery_zone;
    let foundZone: MineZone | null = null;

    if (loadB && isNear(currentTile, loadB.pos, r)) foundZone = 'LOADING';
    else if (unloadB && isNear(currentTile, unloadB.pos, r)) foundZone = 'UNLOADING';
    else if (deliverB && isNear(currentTile, deliverB.pos, r)) foundZone = 'DELIVERY';

    setNearNode(prev => (prev === foundNode ? prev : foundNode));
    setNearZone(prev => (prev === foundZone ? prev : foundZone));
  }, [currentTile.x, currentTile.y]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setMineClock(now);
      setNodeStates(prev => refreshExpiredNodeStates(prev, now));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    const mineTick = () => {
      const nodeId = nearNodeRef.current;
      const currentCarry = carriedRef.current;
      const currentCarryType = carryTypeRef.current;

      if (!nodeId || playerIsMovingRef.current || currentCarry >= MAX_CARRY) {
        setIsWorking(false);
        return;
      }

      const resourceType = nodeToResourceType(nodeId);
      if (currentCarryType && currentCarryType !== resourceType && currentCarry > 0) {
        setIsWorking(false);
        return;
      }

      const now = Date.now();
      const refreshed = refreshExpiredNodeStates(nodeStatesRef.current, now);
      if (refreshed !== nodeStatesRef.current) {
        nodeStatesRef.current = refreshed;
        setNodeStates(refreshed);
      }

      const nodeState = nodeStatesRef.current[nodeId] ?? {
        unitsRemaining: getNodeCapacity(nodeId),
        cooldownUntil: 0,
        lastHarvested: 0,
      };

      if (nodeState.unitsRemaining <= 0) {
        setIsWorking(false);
        return;
      }

      setIsWorking(true);
      const info = nodeInfo(nodeId);
      const nextLoad = Math.min(MAX_CARRY, currentCarry + 1);
      carriedRef.current = nextLoad;
      carryTypeRef.current = resourceType;
      setCarried(nextLoad);
      setCarryType(resourceType);
      spawnParticle(`+1 ${info.label}`, info.hex);

      const remaining = nodeState.unitsRemaining - 1;
      const nextNodeState: NodeState = {
        unitsRemaining: remaining,
        cooldownUntil: remaining <= 0 ? now + NODE_HARVEST_COOLDOWN_MS : 0,
        lastHarvested: now,
      };
      const nextNodeStates = { ...nodeStatesRef.current, [nodeId]: nextNodeState };
      nodeStatesRef.current = nextNodeStates;
      setNodeStates(nextNodeStates);

      if (remaining <= 0) {
        spawnParticle(`${info.label} face exhausted`, '#94a3b8');
      }

      const pressureDamage = NODE_PRESSURE_DAMAGE[nodeId] ?? 2;
      const nextIntegrity = Math.max(0, shaftIntegrityRef.current - pressureDamage);
      shaftIntegrityRef.current = nextIntegrity;
      setShaftIntegrity(nextIntegrity);
      if (nextIntegrity <= 0) {
        triggerCaveIn();
      }
    };

    const id = window.setInterval(mineTick, WORK_MINE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [nodeInfo, spawnParticle, triggerCaveIn]);

  React.useEffect(() => {
    if (nearZone === 'LOADING') {
      const nextCharges = MAX_BRACES;
      if (braceChargesRef.current !== nextCharges) {
        braceChargesRef.current = nextCharges;
        setBraceCharges(nextCharges);
        spawnParticle('braces restocked', '#38bdf8');
      }
    }
  }, [nearZone, spawnParticle]);

  const startUnload = React.useCallback(() => {
    if (nearZoneRef.current !== 'DELIVERY' || carriedRef.current <= 0 || isUnloadingRef.current) return;

    const totalToUnload = carriedRef.current;
    const resourceType = carryTypeRef.current;
    if (!resourceType) return;

    isUnloadingRef.current = true;
    setIsUnloading(true);
    setUnloadProgress(0);
    setUnloadTotal(totalToUnload);
    let unloaded = 0;

    unloadTimerRef.current = window.setInterval(() => {
      unloaded += 1;
      const nextLoad = Math.max(0, carriedRef.current - 1);
      carriedRef.current = nextLoad;
      setCarried(nextLoad);
      setUnloadProgress(unloaded);
      spawnParticle('-1 unloaded', '#10b981');

      if (unloaded >= totalToUnload) {
        if (unloadTimerRef.current !== null) {
          window.clearInterval(unloadTimerRef.current);
          unloadTimerRef.current = null;
        }
        setInventory(prev => ({ ...prev, [resourceType]: prev[resourceType] + totalToUnload }));
        onCollectResource(totalToUnload);
        spawnParticle(`+${totalToUnload} ${resourceType === 'rawOre' ? 'ore' : resourceType} stored`, resourceType === 'coal' ? '#374151' : resourceType === 'gems' ? '#9333ea' : '#f59e0b');
        carryTypeRef.current = null;
        setCarryType(null);
        isUnloadingRef.current = false;
        setIsUnloading(false);
        setUnloadProgress(0);
      }
    }, UNLOAD_BLOCK_INTERVAL_MS);
  }, [onCollectResource, spawnParticle]);

  React.useEffect(() => {
    startUnload();
  }, [nearZone, startUnload]);

  React.useEffect(() => {
    return () => {
      if (unloadTimerRef.current !== null) {
        window.clearInterval(unloadTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (nearZone !== 'UNLOADING') return;
    const trySmelt = () => {
      setInventory(prev => {
        if (prev.rawOre >= SMELT_COST.rawOre && prev.coal >= SMELT_COST.coal) {
          spawnParticle(`+${SMELT_OUTPUT} Refined`, '#f59e0b');
          return {
            ...prev,
            rawOre: prev.rawOre - SMELT_COST.rawOre,
            coal: prev.coal - SMELT_COST.coal,
            refinedMetal: prev.refinedMetal + SMELT_OUTPUT,
          };
        }
        return prev;
      });
    };
    trySmelt();
    const id = window.setInterval(trySmelt, SMELT_CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [nearZone, spawnParticle]);

  React.useEffect(() => {
    if (nearZone !== 'DELIVERY') return;
    const tryDeposit = () => {
      setInventory(prev => {
        if (prev.refinedMetal > 0) {
          onCollectResource(prev.refinedMetal);
          spawnParticle(`+${prev.refinedMetal} metal stored`, '#10b981');
          return { ...prev, refinedMetal: 0 };
        }
        return prev;
      });
    };
    const id = window.setInterval(tryDeposit, DEPOSIT_CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [nearZone, spawnParticle, onCollectResource]);

  const handleWorldSelect = React.useCallback((target: WorldHoverInfo) => {
    if (target.kind === 'GROUND') {
      const p = findPath(currentPlayerPos, { x: target.x, y: target.y }, MINE_WORLD_BUILDINGS, WORLD_SIZE);
      setPath(p);
      setTargetPos({ x: target.x, y: target.y });
      return;
    }
    if (target.kind === 'BUILDING' && target.id) {
      const building = MINE_WORLD_BUILDINGS[target.id];
      if (building) {
        const dest = { x: building.pos.x, y: building.pos.y + 6 };
        const p = findPath(currentPlayerPos, dest, MINE_WORLD_BUILDINGS, WORLD_SIZE);
        setPath(p);
        setTargetPos(dest);
      }
    }
  }, [currentPlayerPos]);

  const flushHover = React.useCallback(() => {
    hoverRafRef.current = null;
    const pending = pendingHoverRef.current;
    setHoverInfo(prev => {
      if (!pending && !prev) return prev;
      if (!pending || !prev) return pending;
      if (pending.x === prev.x && pending.y === prev.y && pending.kind === prev.kind && pending.id === prev.id) return prev;
      return pending;
    });
  }, []);

  const handleHoverPosition = React.useCallback((pos: WorldHoverInfo | null) => {
    pendingHoverRef.current = pos;
    if (hoverRafRef.current !== null) return;
    hoverRafRef.current = requestAnimationFrame(flushHover);
  }, [flushHover]);

  React.useEffect(() => {
    return () => { if (hoverRafRef.current !== null) cancelAnimationFrame(hoverRafRef.current); };
  }, []);

  const handleCameraAzimuthChange = React.useCallback((azimuth: number) => {
    const now = performance.now();
    if (
      now - lastCameraCommitRef.current < CAMERA_COMMIT_INTERVAL_MS &&
      Math.abs(azimuth - committedCameraAzimuthRef.current) < CAMERA_COMMIT_DELTA
    ) {
      return;
    }

    lastCameraCommitRef.current = now;
    committedCameraAzimuthRef.current = azimuth;
    setCameraAzimuth(azimuth);
  }, []);

  const objectiveTarget = React.useMemo<WorldHoverInfo | null>(() => {
    let id = 'ore_node';
    let label = 'Mine ore deposit';

    if (carried > 0 || inventory.refinedMetal > 0) {
      id = 'delivery_zone';
      label = 'Return to warehouse';
    } else if (shaftIntegrity < 35 && braceCharges > 0) {
      id = 'loading_zone';
      label = 'Set braces or restock';
    } else {
      const availableNode = Object.keys(MINE_NODE_YIELDS).find(nodeId => {
        const node = nodeStates[nodeId];
        return node && (node.unitsRemaining > 0 || node.cooldownUntil <= mineClock);
      });
      if (availableNode) {
        id = availableNode;
        label = `Mine ${nodeInfo(availableNode).label}`;
      } else {
        id = 'loading_zone';
        label = 'Wait for deposits to recover';
      }
    }

    const building = MINE_WORLD_BUILDINGS[id];
    if (!building) return null;
    return { x: building.pos.x, y: building.pos.y, z: 0, kind: 'BUILDING', id, label };
  }, [braceCharges, carried, inventory.refinedMetal, mineClock, nodeInfo, nodeStates, shaftIntegrity]);

  const activeInstruction = React.useMemo(() => {
    if (isUnloading) return 'Hold position while the warehouse clears your pack.';
    if (carried >= MAX_CARRY) return 'Pack is full. Return to the warehouse.';
    if (carried > 0) return 'Deliver the load or keep mining the same material.';
    if (shaftIntegrity < 35) return braceCharges > 0 ? 'Set a brace before the next extraction.' : 'Restock braces at the loading bay.';
    if (nearNode && playerIsMoving) return 'Stop in the work zone to start mining.';
    if (nearNode && isWorking) return 'Mining. Watch load and shaft integrity.';
    return 'Pick a deposit, enter its work zone, then stand still to mine.';
  }, [braceCharges, carried, isUnloading, isWorking, nearNode, playerIsMoving, shaftIntegrity]);

  const isNight = state.time >= 20 || state.time < 6;
  const integrityTone = shaftIntegrity < 30 ? 'border-rose-600/80' : shaftIntegrity < 60 ? 'border-amber-600/80' : 'border-sky-600/80';
  const currentNodeState = nearNode ? nodeStates[nearNode] : null;
  const currentNodeCooldown = currentNodeState?.cooldownUntil && currentNodeState.cooldownUntil > mineClock
    ? Math.ceil((currentNodeState.cooldownUntil - mineClock) / 1000)
    : 0;
  const hoverLabel = hoverInfo?.label ?? (hoverInfo?.id ? MINE_WORLD_BUILDINGS[hoverInfo.id]?.name : null);

  return (
    <div className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${isNight ? 'bg-slate-950' : 'bg-stone-800'}`}>
      <VoxelWorldContainer
        voxels={allVoxels}
        buildings={MINE_BUILDINGS_LIST}
        navigationZones={[]}
        npcs={state.npcs}
        time={state.time}
        weather={state.weather}
        playerPos={currentPlayerPos}
        isMoving={playerIsMoving}
        targetPos={usingAnalogMovement ? null : targetPos}
        path={usingAnalogMovement ? [] : path}
        recenterTrigger={recenterTrigger}
        onStateChange={NOOP}
        onCountChange={NOOP}
        onHoverPosition={handleHoverPosition}
        onSelect={handleWorldSelect}
        onCameraAzimuthChange={handleCameraAzimuthChange}
        objectiveTarget={objectiveTarget}
        showLoadingOverlay={false}
        playerWorking={isWorking}
        playerCarried={carried}
      />

      <AnalogStick onChange={setAnalogInput} isNight={isNight} />

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <HudActionButton
          onClick={() => { setRecenterTrigger(t => t + 1); }}
          icon={Package}
          label="Center"
          detail="Recenter camera"
          className="w-11 justify-center px-2"
          title="Recenter"
        />
      </div>

      <HudActionButton
        onClick={onExit}
        icon={ArrowLeft}
        label="Leave"
        detail="Exit shaft"
        className="absolute left-3 top-3 z-[200] min-w-[112px]"
      />

      <div className="absolute left-3 top-20 z-[200] flex max-w-[250px] flex-col gap-1.5">
        <HudPanel toneBorderClass="border-amber-600/80" className="px-3 py-2">
          <div className="flex items-start gap-2">
            <HudIconTile icon={Hammer} toneClass="bg-amber-400" />
            <div className="min-w-0">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Shaft Objective</div>
              <div className="mt-1 text-[11px] font-bold leading-snug text-white">{activeInstruction}</div>
              {objectiveTarget?.label && (
                <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.16em] text-amber-300">{objectiveTarget.label}</div>
              )}
              {hoverLabel && (
                <div className="mt-1 truncate text-[9px] font-bold text-slate-400">Hover: {hoverLabel}</div>
              )}
            </div>
          </div>
        </HudPanel>
        <HudPanel toneBorderClass={integrityTone} className="px-3 py-2">
          <div className="flex items-center gap-2">
            <HudIconTile icon={Zap} toneClass={shaftIntegrity < 30 ? 'bg-rose-400' : shaftIntegrity < 60 ? 'bg-amber-400' : 'bg-sky-400'} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Shaft Integrity</span>
              <span className="mt-1 text-sm font-black text-sky-100">{shaftIntegrity}%</span>
            </div>
            <button
              type="button"
              onClick={applyBrace}
              disabled={braceCharges <= 0 || shaftIntegrity >= MAX_SHAFT_INTEGRITY}
              className="rounded border border-sky-400/40 bg-sky-500/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-sky-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
            >
              Brace {braceCharges}
            </button>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${shaftIntegrity < 30 ? 'bg-rose-400' : shaftIntegrity < 60 ? 'bg-amber-400' : 'bg-sky-400'}`}
              style={{ width: `${shaftIntegrity}%` }}
            />
          </div>
        </HudPanel>
      </div>

      <div className="absolute top-3 right-3 z-[200] flex flex-col gap-1.5 items-end">
        <HudPanel toneBorderClass={carried >= MAX_CARRY ? 'border-rose-600/80' : 'border-amber-600/80'} className="min-w-[172px] px-3 py-2">
          <div className="flex items-center gap-2">
            <HudIconTile icon={Weight} toneClass={carried >= MAX_CARRY ? 'bg-rose-400' : 'bg-amber-400'} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Carry Load</span>
              <span className="mt-1 text-sm font-black text-amber-200">{carried}/{MAX_CARRY}</span>
            </div>
            {carryType && (
              <span className="text-[8px] font-mono uppercase tracking-[0.16em] text-slate-400">
                {carryType === 'rawOre' ? 'ore' : carryType}
              </span>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${carried >= MAX_CARRY ? 'bg-rose-400' : 'bg-amber-400'}`}
              style={{ width: `${(carried / MAX_CARRY) * 100}%` }}
            />
          </div>
        </HudPanel>
        <HudPanel toneBorderClass="border-emerald-600/80" className="px-3 py-2">
          <div className="flex items-center gap-2">
            <HudIconTile icon={Boxes} toneClass="bg-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Mine Stores</span>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold text-white">
                <span className="flex items-center gap-1 text-amber-300"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />{inventory.rawOre}</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500" />{inventory.coal}</span>
                <span className="flex items-center gap-1 text-purple-300"><span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />{inventory.gems}</span>
                <span className="flex items-center gap-1 text-yellow-200"><Zap size={10} />{inventory.refinedMetal}</span>
                <span className="text-slate-600">/</span>
                <span className="flex items-center gap-1 text-emerald-300"><Boxes size={10} />{state.ore}</span>
              </div>
            </div>
          </div>
        </HudPanel>
      </div>

      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            animate={{ opacity: 0, y: -60, x: 30, scale: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute z-[300] pointer-events-none"
            style={{ bottom: '50%', left: '50%' }}
          >
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-lg"
              style={{ backgroundColor: p.color }}
            >
              {p.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {nearNode && (
          <motion.div
            key="node-tag"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-36 z-[110] pointer-events-none"
          >
            {(() => {
              const info = nodeInfo(nearNode);
              const capacity = getNodeCapacity(nearNode);
              return (
                <div className="flex items-center gap-1.5 rounded-full bg-black/80 pl-1.5 pr-2.5 py-1 shadow-lg backdrop-blur-sm">
                  <div className={`rounded-full ${info.color} p-1 text-white`}>{info.icon}</div>
                  <span className="text-[10px] font-bold text-white">{MINE_WORLD_BUILDINGS[nearNode]?.name ?? info.label}</span>
                  {currentNodeCooldown > 0 ? (
                    <span className="text-[9px] text-slate-300 font-medium ml-1">recovering {currentNodeCooldown}s</span>
                  ) : currentNodeState ? (
                    <span className="text-[9px] text-slate-300 font-medium ml-1">{currentNodeState.unitsRemaining}/{capacity}</span>
                  ) : null}
                  {isWorking ? (
                    <span className="text-[9px] text-emerald-300 font-medium ml-1">mining</span>
                  ) : carried >= MAX_CARRY ? (
                    <span className="text-[9px] text-red-300 font-medium ml-1">full - unload</span>
                  ) : playerIsMoving ? (
                    <span className="text-[9px] text-amber-300 font-medium ml-1">stop to mine</span>
                  ) : carryType && carryType !== nodeToResourceType(nearNode) ? (
                    <span className="text-[9px] text-red-300 font-medium ml-1">unload first</span>
                  ) : (
                    <span className="text-[9px] text-amber-300 font-medium ml-1">ready</span>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}

        {nearZone === 'LOADING' && (
          <motion.div
            key="load-tag"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-36 z-[110] pointer-events-none"
          >
            <div className="flex items-center gap-1.5 rounded-full bg-black/80 pl-1.5 pr-2.5 py-1 shadow-lg backdrop-blur-sm">
              <div className="rounded-full bg-blue-600 p-1 text-white"><Package size={10} /></div>
              <span className="text-[10px] font-bold text-white">Loading Bay</span>
              <span className="text-[9px] text-sky-300 font-medium ml-1">brace supplies</span>
            </div>
          </motion.div>
        )}

        {nearZone === 'UNLOADING' && (
          <motion.div
            key="smelt-tag"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-36 z-[110] pointer-events-none"
          >
            <div className="flex items-center gap-1.5 rounded-full bg-black/80 pl-1.5 pr-2.5 py-1 shadow-lg backdrop-blur-sm">
              <div className="rounded-full bg-orange-600 p-1 text-white"><Flame size={10} /></div>
              <span className="text-[10px] font-bold text-white">Smelter</span>
              {inventory.rawOre >= SMELT_COST.rawOre && inventory.coal >= SMELT_COST.coal ? (
                <span className="text-[9px] text-emerald-300 font-medium ml-1">smelting</span>
              ) : (
                <span className="text-[9px] text-amber-300 font-medium ml-1">
                  need {SMELT_COST.rawOre} ore + {SMELT_COST.coal} coal
                </span>
              )}
            </div>
          </motion.div>
        )}

        {nearZone === 'DELIVERY' && (
          <motion.div
            key="deliver-tag"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-36 z-[110] pointer-events-none"
          >
            <div className="flex items-center gap-1.5 rounded-full bg-black/80 pl-1.5 pr-2.5 py-1 shadow-lg backdrop-blur-sm">
              <div className="rounded-full bg-emerald-600 p-1 text-white"><Boxes size={10} /></div>
              <span className="text-[10px] font-bold text-white">Warehouse</span>
              {isUnloading ? (
                <span className="text-[9px] text-emerald-300 font-medium ml-1 flex items-center gap-1">
                  unloading
                  <span className="w-8 h-1 rounded-full bg-white/20 overflow-hidden inline-block">
                    <span className="block h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${unloadTotal > 0 ? (unloadProgress / unloadTotal) * 100 : 0}%` }} />
                  </span>
                </span>
              ) : carried > 0 ? (
                <span className="text-[9px] text-emerald-300 font-medium ml-1">ready to unload</span>
              ) : inventory.refinedMetal > 0 ? (
                <span className="text-[9px] text-emerald-300 font-medium ml-1">storing metal</span>
              ) : (
                <span className="text-[9px] text-white/40 font-medium ml-1">nothing to deposit</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-10 inset-x-4 z-[100] flex justify-center pointer-events-none">
        <HudPanel toneBorderClass="border-slate-700/80" className="pointer-events-none flex gap-1.5 flex-wrap justify-center px-2 py-1.5">
          {[
            { color: 'bg-amber-500', label: 'Ore' },
            { color: 'bg-gray-700', label: 'Coal' },
            { color: 'bg-purple-600', label: 'Gems' },
            { color: 'bg-blue-600', label: 'Braces' },
            { color: 'bg-orange-600', label: 'Smelter' },
            { color: 'bg-emerald-600', label: 'Storage' },
          ].map(({ color, label }) => (
            <span key={label} className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider ${color}/80`}>
              <span className="inline-block h-1 w-1 rounded-full bg-white/80" />
              {label}
            </span>
          ))}
        </HudPanel>
      </div>
    </div>
  );
};