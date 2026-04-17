/**
 * MineWorldScene – a fully walkable 3-D mine environment.
 *
 * Gameplay loop:
 *   1. Walk to an extraction node (ore / coal / gems) → enter WORK ZONE
 *   2. Stand still in the work zone → character plays pickaxe-swing animation
 *   3. Resources stack up visually on the character (up to MAX_CARRY)
 *   4. Walk to the Storage Warehouse (delivery zone) → visual one-by-one unload
 *   5. After unloading finishes, player is rewarded with that resource
 *   6. Repeat
 *
 * The smelter (unloading zone) still auto-converts raw ore+coal → refined metal
 * when the player deposits matching raw resources there.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Hammer, Package, Flame, Boxes, Zap, Weight } from 'lucide-react';
import { GameState, WorldHoverInfo, WorldPosition } from '../types';
import { WORLD_CAMERA_AZIMUTH } from '../VoxelEngine';
import { VoxelWorldContainer } from './VoxelWorldContainer';
import { AnalogStick, AnalogStickVector } from './AnalogStick';
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

// ─── types ────────────────────────────────────────────────────────────────────
interface NodeState {
  lastHarvested: number;  // timestamp ms
}

/** Local mine inventory – separate resource types tracked in-scene */
interface MineInventory {
  rawOre: number;
  coal: number;
  gems: number;
  refinedMetal: number;
}

/** Floating resource particle */
interface ResourceParticle {
  id: number;
  label: string;
  color: string;
}

/** How many units of each raw resource the smelter consumes per smelt cycle */
const SMELT_COST = { rawOre: 2, coal: 1 } as const;
/** How many refined metal units a single smelt cycle produces */
const SMELT_OUTPUT = 3;
/** Small buffer added to harvest-check interval so it fires just after cooldown ends */
const HARVEST_CHECK_BUFFER_MS = 200;
/** How often (ms) the smelter checks for available raw materials */
const SMELT_CHECK_INTERVAL_MS = 2500;
/** How often (ms) the delivery zone checks for depositable resources */
const DEPOSIT_CHECK_INTERVAL_MS = 1500;

/** How often (ms) the player mines one unit while standing still in a work zone */
const WORK_MINE_INTERVAL_MS = 1800;
/** Maximum number of resource units the player can carry at once */
const MAX_CARRY = VoxelCharacter.MAX_CARRY;
/** How long (ms) each block takes to unload at the delivery zone */
const UNLOAD_BLOCK_INTERVAL_MS = 400;

// ─── helpers ──────────────────────────────────────────────────────────────────
const isNear = (a: WorldPosition, b: WorldPosition, radius: number) =>
  Math.abs(a.x - b.x) <= radius && Math.abs(a.y - b.y) <= radius;

/** Map a node id to its carry resource type */
const nodeToResourceType = (nodeId: string): 'rawOre' | 'coal' | 'gems' =>
  nodeId === 'ore_node' ? 'rawOre' : nodeId === 'coal_node' ? 'coal' : 'gems';

// All buildings in the mine world (stable reference – never changes)
const MINE_BUILDINGS_LIST = Object.values(MINE_WORLD_BUILDINGS);

let _particleId = 0;

// ─── component ────────────────────────────────────────────────────────────────
export const MineWorldScene = ({
  state,
  onCollectResource,
  onExit,
}: {
  state: GameState;
  onCollectResource: (amount: number) => void;
  onExit: () => void;
}) => {
  // ── local movement state (independent from global state.playerPos) ──────
  const [playerPos, setPlayerPos] = React.useState<WorldPosition>(MINE_WORLD_ENTRANCE_POS);
  const [path, setPath]           = React.useState<WorldPosition[]>([]);
  const [targetPos, setTargetPos] = React.useState<WorldPosition | null>(null);

  // ── local mine inventory ───────────────────────────────────────────────
  const [inventory, setInventory] = React.useState<MineInventory>({ rawOre: 0, coal: 0, gems: 0, refinedMetal: 0 });
  const [particles, setParticles] = React.useState<ResourceParticle[]>([]);

  // ── interaction state ───────────────────────────────────────────────────
  const [nodeStates, setNodeStates]     = React.useState<Record<string, NodeState>>({});
  const [nearNode, setNearNode]         = React.useState<string | null>(null);
  const [nearZone, setNearZone]         = React.useState<'LOADING' | 'UNLOADING' | 'DELIVERY' | null>(null);

  // ── carry state ──────────────────────────────────────────────────────────
  const [carried, setCarried]           = React.useState(0);    // blocks on back
  const [isWorking, setIsWorking]       = React.useState(false); // pickaxe animation
  const [isUnloading, setIsUnloading]   = React.useState(false); // unload sequence running
  const [unloadProgress, setUnloadProgress] = React.useState(0); // blocks unloaded so far
  const [unloadTotal, setUnloadTotal]   = React.useState(0);     // total blocks in current unload batch
  /** What resource type the player is currently carrying */
  const [carryType, setCarryType]       = React.useState<'rawOre' | 'coal' | 'gems' | null>(null);

  const [analogInput, setAnalogInput]   = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const [recenterTrigger, setRecenterTrigger] = React.useState(0);
  const [hoverInfo, setHoverInfo]       = React.useState<WorldHoverInfo | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<WorldHoverInfo | null>(null);

  // ── voxels for the mine world terrain ───────────────────────────────────
  const terrainData = React.useMemo(
    () => buildWorldTerrainVoxels(MINE_WORLD_BUILDINGS, WORLD_SIZE),
    []
  );
  const allVoxels = terrainData.voxels;

  const analogController = useContinuousAnalogMovement({
    input: analogInput,
    authoritativePosition: playerPos,
    movementSpeed: state.movementSpeed ?? 1,
    surfaceMap: terrainData.surfaceMap,
    cameraAzimuth: WORLD_CAMERA_AZIMUTH,
    bounds: { min: 0, max: WORLD_SIZE - 1 },
    onInputStart: (roundedPos) => {
      setPath([]);
      setTargetPos(null);
      setPlayerPos(roundedPos);
    },
    onRoundedPositionChange: setPlayerPos,
    onMotionEnd: setPlayerPos,
  });
  const usingAnalogMovement = analogController.hasDirectionalInput || analogController.isMoving;
  const currentPlayerPos = usingAnalogMovement ? analogController.position : playerPos;
  const playerIsMoving = usingAnalogMovement || path.length > 0;

  // ── spawn resource particle animation ──────────────────────────────────
  const spawnParticle = React.useCallback((label: string, color: string) => {
    const id = ++_particleId;
    setParticles(prev => [...prev, { id, label, color }]);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 900);
  }, []);

  // ── movement loop ────────────────────────────────────────────────────────
  React.useEffect(() => {
    let budget = 0;
    const id = setInterval(() => {
      setPath(prev => {
        if (usingAnalogMovement) {
          budget = 0;
          return prev;
        }
        if (prev.length === 0) { budget = 0; return prev; }
        budget += Math.max(0.75, (state.movementSpeed ?? 1) * 0.75);
        let cur = playerPos;
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
        setPlayerPos(cur);
        if (remaining.length === 0) setTargetPos(null);
        return remaining;
      });
    }, 70);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPos, state.movementSpeed, usingAnalogMovement]);

  // ── proximity checks ─────────────────────────────────────────────────────
  React.useEffect(() => {
    const r = MINE_INTERACTION_RADIUS;

    // Extraction nodes
    let found: string | null = null;
    for (const id of Object.keys(MINE_NODE_YIELDS)) {
      const b = MINE_WORLD_BUILDINGS[id];
      if (b && isNear(currentPlayerPos, b.pos, r)) {
        found = id;
        break;
      }
    }
    setNearNode(found);

    // Zones
    const loadB = MINE_WORLD_BUILDINGS['loading_zone'];
    const unloadB = MINE_WORLD_BUILDINGS['unloading_zone'];
    const deliverB = MINE_WORLD_BUILDINGS['delivery_zone'];

    if (loadB && isNear(currentPlayerPos, loadB.pos, r)) {
      setNearZone('LOADING');
    } else if (unloadB && isNear(currentPlayerPos, unloadB.pos, r)) {
      setNearZone('UNLOADING');
    } else if (deliverB && isNear(currentPlayerPos, deliverB.pos, r)) {
      setNearZone('DELIVERY');
    } else {
      setNearZone(null);
    }
  }, [currentPlayerPos]);

  // ── WORK-ZONE MINING: stand near node + not moving → mine one block at a time ─
  React.useEffect(() => {
    // Must be near a node, not moving, and have carry capacity left
    if (!nearNode || playerIsMoving || carried >= MAX_CARRY) {
      setIsWorking(false);
      return;
    }

    // If already carrying a different resource type, can't mix
    const nodeResourceType = nodeToResourceType(nearNode);
    if (carryType && carryType !== nodeResourceType && carried > 0) {
      setIsWorking(false);
      return;
    }

    setIsWorking(true);

    const tryMine = () => {
      setCarried(prev => {
        if (prev >= MAX_CARRY) return prev;
        const info = nodeInfo(nearNode);
        spawnParticle(`+1 ${info.label}`, info.hex);
        setCarryType(nodeResourceType);
        return prev + 1;
      });
    };

    // Mine immediately, then repeat while standing
    tryMine();
    const id = setInterval(tryMine, WORK_MINE_INTERVAL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearNode, playerIsMoving, carried, carryType, spawnParticle]);

  // Stop working when player moves or leaves node
  React.useEffect(() => {
    if (playerIsMoving || !nearNode) {
      setIsWorking(false);
    }
  }, [playerIsMoving, nearNode]);

  // ── DELIVERY ZONE: visual one-by-one unload → reward ────────────────────
  React.useEffect(() => {
    if (nearZone !== 'DELIVERY' || carried <= 0 || isUnloading) return;

    // Start unload sequence
    const totalToUnload = carried;
    setIsUnloading(true);
    setUnloadProgress(0);
    setUnloadTotal(totalToUnload);
    let unloaded = 0;

    const id = setInterval(() => {
      unloaded++;
      setCarried(prev => Math.max(0, prev - 1));
      setUnloadProgress(unloaded);
      spawnParticle(`-1 unloaded`, '#10b981');

      if (unloaded >= totalToUnload) {
        clearInterval(id);
        // Reward: add to local inventory and global ore for all types
        const ct = carryType;
        if (ct) {
          setInventory(prev => ({ ...prev, [ct]: prev[ct] + totalToUnload }));
        }
        // Reward global ore for every resource type
        onCollectResource(totalToUnload);
        if (ct === 'gems') {
          spawnParticle(`+${totalToUnload} gems stored`, '#9b59b6');
        } else if (ct === 'rawOre') {
          spawnParticle(`+${totalToUnload} ore stored`, '#f59e0b');
        } else if (ct === 'coal') {
          spawnParticle(`+${totalToUnload} coal stored`, '#374151');
        }
        setCarryType(null);
        setIsUnloading(false);
        setUnloadProgress(0);
      }
    }, UNLOAD_BLOCK_INTERVAL_MS);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearZone, carried, isUnloading, carryType, spawnParticle, onCollectResource]);

  // ── auto-smelt at unloading zone (requires rawOre + coal from inventory) ──
  React.useEffect(() => {
    if (nearZone !== 'UNLOADING') return;
    const trySmelt = () => {
      setInventory(prev => {
        if (prev.rawOre >= SMELT_COST.rawOre && prev.coal >= SMELT_COST.coal) {
          spawnParticle(`+${SMELT_OUTPUT} Refined`, '#f59e0b');
          return {
            ...prev,
            rawOre: prev.rawOre - SMELT_COST.rawOre,
            coal:   prev.coal   - SMELT_COST.coal,
            refinedMetal: prev.refinedMetal + SMELT_OUTPUT,
          };
        }
        return prev;
      });
    };
    trySmelt();
    const id = setInterval(trySmelt, SMELT_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [nearZone, spawnParticle]);

  // ── auto-deposit refined metal at delivery zone → global state ──────────
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
    // Give the unload sequence time to finish first
    const id = setInterval(tryDeposit, DEPOSIT_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearZone, spawnParticle, onCollectResource]);

  // ── world click / select ─────────────────────────────────────────────────
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

  // ── hover debounce ───────────────────────────────────────────────────────
  const flushHover = React.useCallback(() => {
    hoverRafRef.current = null;
    const pending = pendingHoverRef.current;
    setHoverInfo(prev => {
      if (!pending && !prev) return prev;
      if (!pending || !prev) return pending;
      if (pending.x === prev.x && pending.y === prev.y && pending.kind === prev.kind) return prev;
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

  const isNight = state.time >= 20 || state.time < 6;

  // ── node info helper ──────────────────────────────────────────────────────
  const nodeInfo = (id: string) => {
    switch (id) {
      case 'ore_node':  return { icon: <Hammer size={10} />, label: 'Ore', color: 'bg-amber-500', hex: '#f59e0b' };
      case 'coal_node': return { icon: <Hammer size={10} />, label: 'Coal', color: 'bg-gray-700', hex: '#374151' };
      case 'gem_node':  return { icon: <Hammer size={10} />, label: 'Gems', color: 'bg-purple-600', hex: '#9333ea' };
      default:          return { icon: <Hammer size={10} />, label: 'Resource', color: 'bg-stone-500', hex: '#78716c' };
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${isNight ? 'bg-slate-950' : 'bg-stone-800'}`}>

      {/* 3-D voxel world */}
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
        onStateChange={() => {}}
        onCountChange={() => {}}
        onHoverPosition={handleHoverPosition}
        onSelect={handleWorldSelect}
        showLoadingOverlay={false}
        playerWorking={isWorking}
        playerCarried={carried}
      />

      {/* ── Analog stick ────────────────────────────────────────────────── */}
      <AnalogStick onChange={setAnalogInput} isNight={isNight} />

      {/* ── Exit + recenter buttons ──────────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => { setRecenterTrigger(t => t + 1); }}
          className="bg-black/70 text-white p-2 rounded-full active:scale-95 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
          title="Recenter"
        >
          <Package size={16} />
        </button>
      </div>

      {/* ── Exit button (top-left) ───────────────────────────────────────── */}
      <button
        onClick={onExit}
        className="absolute top-3 left-3 z-[200] flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg backdrop-blur-sm active:scale-95 transition-all"
      >
        <ArrowLeft size={12} />
        Leave
      </button>

      {/* ── Resource HUD (carried + depot inventory) ─────────────────────── */}
      <div className="absolute top-3 right-3 z-[200] flex flex-col gap-1.5 items-end">
        {/* Carry bar */}
        <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm">
          <Weight size={10} className="text-amber-300" />
          <span className="text-amber-200">{carried}/{MAX_CARRY}</span>
          {/* Small capacity bar */}
          <div className="w-12 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${carried >= MAX_CARRY ? 'bg-red-400' : 'bg-amber-400'}`}
              style={{ width: `${(carried / MAX_CARRY) * 100}%` }}
            />
          </div>
          {carryType && (
            <span className="text-white/60 text-[9px] uppercase">{carryType === 'rawOre' ? 'ore' : carryType}</span>
          )}
        </div>
        {/* Depot inventory */}
        <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm">
          {inventory.rawOre > 0 && (
            <span className="flex items-center gap-0.5 text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{inventory.rawOre}
            </span>
          )}
          {inventory.coal > 0 && (
            <span className="flex items-center gap-0.5 text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />{inventory.coal}
            </span>
          )}
          {inventory.gems > 0 && (
            <span className="flex items-center gap-0.5 text-purple-300">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />{inventory.gems}
            </span>
          )}
          {inventory.refinedMetal > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-200">
              <Zap size={10} />{inventory.refinedMetal}
            </span>
          )}
          <span className="text-white/40">|</span>
          <span className="flex items-center gap-0.5 text-emerald-300">
            <Boxes size={10} />{state.ore}
          </span>
        </div>
      </div>

      {/* ── Flying resource particles ────────────────────────────────────── */}
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

      {/* ── Compact floating labels (near buildings) ─────────────────────── */}
      <AnimatePresence>
        {/* Extraction node: working status */}
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
              return (
                <div className="flex items-center gap-1.5 rounded-full bg-black/80 pl-1.5 pr-2.5 py-1 shadow-lg backdrop-blur-sm">
                  <div className={`rounded-full ${info.color} p-1 text-white`}>{info.icon}</div>
                  <span className="text-[10px] font-bold text-white">{MINE_WORLD_BUILDINGS[nearNode]?.name ?? info.label}</span>
                  {isWorking ? (
                    <span className="text-[9px] text-emerald-300 font-medium ml-1">⛏ mining…</span>
                  ) : carried >= MAX_CARRY ? (
                    <span className="text-[9px] text-red-300 font-medium ml-1">full – go unload!</span>
                  ) : playerIsMoving ? (
                    <span className="text-[9px] text-amber-300 font-medium ml-1">stop to mine</span>
                  ) : carryType && carryType !== nodeToResourceType(nearNode) ? (
                    <span className="text-[9px] text-red-300 font-medium ml-1">unload first</span>
                  ) : (
                    <span className="text-[9px] text-amber-300 font-medium ml-1">stand still…</span>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Loading zone: compact tag */}
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
            </div>
          </motion.div>
        )}

        {/* Smelter: compact tag with requirement hint */}
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
                <span className="text-[9px] text-emerald-300 font-medium ml-1">⚡ smelting</span>
              ) : (
                <span className="text-[9px] text-amber-300 font-medium ml-1">
                  need {SMELT_COST.rawOre} ore + {SMELT_COST.coal} coal
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Delivery: unload status */}
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
                  unloading…
                  <span className="w-8 h-1 rounded-full bg-white/20 overflow-hidden inline-block">
                    <span className="block h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${unloadTotal > 0 ? (unloadProgress / unloadTotal) * 100 : 0}%` }} />
                  </span>
                </span>
              ) : carried > 0 ? (
                <span className="text-[9px] text-emerald-300 font-medium ml-1">✓ ready to unload</span>
              ) : inventory.refinedMetal > 0 ? (
                <span className="text-[9px] text-emerald-300 font-medium ml-1">✓ storing metal</span>
              ) : (
                <span className="text-[9px] text-white/40 font-medium ml-1">nothing to deposit</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend overlay (top-center, compact) ───────────────────────── */}
      <div className="absolute top-10 inset-x-4 z-[100] flex justify-center pointer-events-none">
        <div className="flex gap-1 flex-wrap justify-center">
          {[
            { color: 'bg-amber-500', label: 'Ore' },
            { color: 'bg-gray-700',  label: 'Coal' },
            { color: 'bg-purple-600',label: 'Gems' },
            { color: 'bg-orange-600',label: 'Smelter' },
            { color: 'bg-emerald-600',label: 'Storage' },
          ].map(({ color, label }) => (
            <span key={label} className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider ${color}/80 backdrop-blur-sm`}>
              <span className="w-1 h-1 rounded-full bg-white/80 inline-block" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
