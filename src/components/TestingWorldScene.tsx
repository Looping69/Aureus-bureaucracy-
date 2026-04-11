/**
 * TestingWorldScene – a walkable forest world for prototyping the
 * wood-gathering mechanic.
 *
 * Gathering loop:
 *   1. Walk near a tree node → auto-lock into gathering
 *   2. Every 100 ms → +1 Wood added to carry stack (up to TESTING_CARRY_MAX)
 *   3. Floating "+1 Wood" feedback per tick
 *   4. Node depletes at 0 remaining and visually disappears
 *   5. Moving or leaving range cancels gathering instantly
 *   6. Walk to the Log Depot → logs unload one-by-one onto the pile
 *   7. Log pile stages grow visually as more logs are deposited
 *
 * Uses the same VoxelWorldContainer / VoxelEngine as all other world scenes.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, MapPin, TreePine, Package, Weight } from 'lucide-react';
import { GameState, WorldHoverInfo, WorldPosition } from '../types';
import { WORLD_CAMERA_AZIMUTH } from '../engine';
import { VoxelWorldContainer } from './VoxelWorldContainer';
import { AnalogStick, AnalogStickVector } from './AnalogStick';
import { buildWorldTerrainVoxels } from '../utils/worldSurface';
import { WORLD_SIZE } from '../utils/voxelConstants';
import { findPath } from '../utils/pathfinding';
import { useContinuousAnalogMovement } from '../hooks/game/useContinuousAnalogMovement';
import {
  TESTING_WORLD_BUILDINGS,
  TESTING_WORLD_ENTRANCE_POS,
  TESTING_TREE_NODES,
  TESTING_GATHER_RANGE,
  TESTING_GATHER_INTERVAL_MS,
  TESTING_YIELD_PER_TICK,
  TREE_INITIAL_AMOUNT,
  LOG_DEPOT_ID,
  LOG_PILE_BUILDINGS,
  LOG_PILE_THRESHOLDS,
  TESTING_CARRY_MAX,
  TESTING_UNLOAD_INTERVAL_MS,
} from '../worlds/testingWorldData';
import { isDaytimeHours } from '../utils/dayNightCycle';

// ─── types ────────────────────────────────────────────────────────────────────
interface ResourceNodeState {
  remaining: number;
  isDepleted: boolean;
}

interface FloatingParticle {
  id: number;
  label: string;
  color: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const isNear = (a: WorldPosition, b: WorldPosition, radius: number) =>
  Math.abs(a.x - b.x) <= radius && Math.abs(a.y - b.y) <= radius;

let _pid = 0;

/** Return which log pile stage to show (0 = none, 1/2/3 = small/medium/large) */
const getLogPileStage = (deposited: number): 0 | 1 | 2 | 3 => {
  if (deposited < LOG_PILE_THRESHOLDS[0]) return 0;
  if (deposited < LOG_PILE_THRESHOLDS[1]) return 1;
  if (deposited < LOG_PILE_THRESHOLDS[2]) return 2;
  return 3;
};

// All buildings combined for the voxel renderer (stable reference)
const ALL_BUILDINGS_BASE = [
  ...Object.values(TESTING_WORLD_BUILDINGS),
  ...Object.values(LOG_PILE_BUILDINGS),
];

// ─── component ────────────────────────────────────────────────────────────────
export const TestingWorldScene = ({
  state,
  onExit,
}: {
  state: GameState;
  onExit: () => void;
}) => {
  // ── local movement state ──────────────────────────────────────────────
  const [playerPos, setPlayerPos]   = React.useState<WorldPosition>(TESTING_WORLD_ENTRANCE_POS);
  const [path, setPath]             = React.useState<WorldPosition[]>([]);
  const [targetPos, setTargetPos]   = React.useState<WorldPosition | null>(null);

  // ── carry / deposit state ─────────────────────────────────────────────
  /** Logs currently on the player's back (0..TESTING_CARRY_MAX) */
  const [carried, setCarried]       = React.useState(0);
  /** Total logs deposited at the depot (persistent – grows each trip) */
  const [deposited, setDeposited]   = React.useState(0);
  const [isUnloading, setIsUnloading] = React.useState(false);

  // ── gather state ──────────────────────────────────────────────────────
  const [nodeStates, setNodeStates] = React.useState<Record<string, ResourceNodeState>>(() => {
    const init: Record<string, ResourceNodeState> = {};
    for (const id of TESTING_TREE_NODES) {
      init[id] = { remaining: TREE_INITIAL_AMOUNT, isDepleted: false };
    }
    return init;
  });
  const [isGathering, setIsGathering]         = React.useState(false);
  const [currentNodeId, setCurrentNodeId]     = React.useState<string | null>(null);
  const [nearDepot, setNearDepot]             = React.useState(false);
  const [particles, setParticles]             = React.useState<FloatingParticle[]>([]);

  // ── analog stick ──────────────────────────────────────────────────────
  const [analogInput, setAnalogInput]         = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const [recenterTrigger, setRecenterTrigger] = React.useState(0);
  const [hoverInfo, setHoverInfo]             = React.useState<WorldHoverInfo | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<WorldHoverInfo | null>(null);

  // Ref to avoid stale closure in gatherTick – always reflects current carried
  const carriedRef = React.useRef(carried);
  React.useEffect(() => { carriedRef.current = carried; }, [carried]);

  // Ref that tracks whether an unload sequence is currently running.
  // Using a ref (not state) means the unload effect is NOT re-triggered
  // when unload progress changes — only when nearDepot itself changes.
  const unloadingRef = React.useRef(false);

  // ── build terrain (stable – buildings never change) ───────────────────
  const terrainData = React.useMemo(
    () => buildWorldTerrainVoxels(TESTING_WORLD_BUILDINGS, WORLD_SIZE),
    []
  );
  const allVoxels = terrainData.voxels;

  // ── visible buildings: hide depleted trees + show correct pile stage ──
  const visibleBuildings = React.useMemo(() => {
    const pileStage = getLogPileStage(deposited);
    return ALL_BUILDINGS_BASE.filter(b => {
      // Hide depleted tree nodes
      const ns = nodeStates[b.id];
      if (ns && ns.isDepleted) return false;
      // Show only the matching log pile stage (0 = none shown)
      if (b.id === 'log_pile_stage1') return pileStage === 1;
      if (b.id === 'log_pile_stage2') return pileStage === 2;
      if (b.id === 'log_pile_stage3') return pileStage === 3;
      return true;
    });
  }, [nodeStates, deposited]);

  // ── analog movement ───────────────────────────────────────────────────
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

  // ── particle spawner ──────────────────────────────────────────────────
  const spawnParticle = React.useCallback((label: string, color: string) => {
    const id = ++_pid;
    setParticles(prev => [...prev, { id, label, color }]);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 900);
  }, []);

  // ── path-based movement loop ──────────────────────────────────────────
  React.useEffect(() => {
    let budget = 0;
    const id = setInterval(() => {
      setPath(prev => {
        if (usingAnalogMovement) { budget = 0; return prev; }
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

  // ── proximity: detect nearest gatherable node + depot ─────────────────
  React.useEffect(() => {
    let found: string | null = null;
    for (const nodeId of TESTING_TREE_NODES) {
      const ns = nodeStates[nodeId];
      if (ns && ns.isDepleted) continue;
      const b = TESTING_WORLD_BUILDINGS[nodeId];
      if (b && isNear(currentPlayerPos, b.pos, TESTING_GATHER_RANGE)) {
        found = nodeId;
        break;
      }
    }
    setCurrentNodeId(found);

    // Depot proximity
    const depotB = TESTING_WORLD_BUILDINGS[LOG_DEPOT_ID];
    setNearDepot(!!(depotB && isNear(currentPlayerPos, depotB.pos, TESTING_GATHER_RANGE)));
  }, [currentPlayerPos, nodeStates]);

  // ── GATHER LOOP: the heartbeat ─────────────────────────────────────────
  React.useEffect(() => {
    // Gate: must be near a node, not moving, node not depleted, and carry not full
    if (!currentNodeId || playerIsMoving || carried >= TESTING_CARRY_MAX) {
      setIsGathering(false);
      return;
    }

    const ns = nodeStates[currentNodeId];
    if (!ns || ns.isDepleted || ns.remaining <= 0) {
      setIsGathering(false);
      return;
    }

    setIsGathering(true);

    const gatherTick = () => {
      // Guard via ref to prevent any stale closure over-increment
      if (carriedRef.current >= TESTING_CARRY_MAX) return;

      setNodeStates(prev => {
        const node = prev[currentNodeId];
        if (!node || node.isDepleted || node.remaining <= 0) return prev;

        const amount = Math.min(TESTING_YIELD_PER_TICK, node.remaining);
        const newRemaining = node.remaining - amount;
        const depleted = newRemaining <= 0;

        // Stack on player
        setCarried(c => Math.min(c + amount, TESTING_CARRY_MAX));

        // Feedback
        spawnParticle(`+${amount} Wood`, '#5c3a1e');

        return {
          ...prev,
          [currentNodeId]: {
            remaining: newRemaining,
            isDepleted: depleted,
          },
        };
      });
    };

    // Immediate first tick, then interval
    gatherTick();
    const id = setInterval(gatherTick, TESTING_GATHER_INTERVAL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId, playerIsMoving, carried, spawnParticle]);

  // ── Stop gathering instantly when moving ───────────────────────────────
  React.useEffect(() => {
    if (playerIsMoving) {
      setIsGathering(false);
    }
  }, [playerIsMoving]);

  // ── UNLOAD at depot: one-by-one visual unload, logs stack at depot ─────
  //
  // Key design: `carried` is intentionally NOT in the dependency array.
  // Reading `carriedRef.current` at start-time avoids the bug where
  // each `setCarried(prev - 1)` re-fires the effect, restarts the interval,
  // and fights itself.  `unloadingRef` prevents double-starts.
  React.useEffect(() => {
    if (!nearDepot) {
      // Left the depot — let any running interval finish naturally;
      // it already captured totalToUnload so it will self-terminate.
      return;
    }

    // Already mid-unload, or nothing to unload
    if (unloadingRef.current || carriedRef.current <= 0) return;

    const totalToUnload = carriedRef.current;
    unloadingRef.current = true;
    setIsUnloading(true);
    let unloaded = 0;

    const id = setInterval(() => {
      unloaded++;
      setCarried(prev => Math.max(0, prev - 1));
      setDeposited(prev => prev + 1);
      spawnParticle('+1 log 🪵', '#22c55e');

      if (unloaded >= totalToUnload) {
        clearInterval(id);
        unloadingRef.current = false;
        setIsUnloading(false);
        spawnParticle(`${totalToUnload} log${totalToUnload !== 1 ? 's' : ''} stored!`, '#22c55e');
      }
    }, TESTING_UNLOAD_INTERVAL_MS);

    return () => {
      clearInterval(id);
      unloadingRef.current = false;
      setIsUnloading(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearDepot, spawnParticle]);

  // ── world click / select ──────────────────────────────────────────────
  const handleWorldSelect = React.useCallback((target: WorldHoverInfo) => {
    if (target.kind === 'GROUND') {
      const p = findPath(currentPlayerPos, { x: target.x, y: target.y }, TESTING_WORLD_BUILDINGS, WORLD_SIZE);
      setPath(p);
      setTargetPos({ x: target.x, y: target.y });
      return;
    }
    if (target.kind === 'BUILDING' && target.id) {
      const building = TESTING_WORLD_BUILDINGS[target.id];
      if (building) {
        const dest = { x: building.pos.x, y: building.pos.y + 6 };
        const p = findPath(currentPlayerPos, dest, TESTING_WORLD_BUILDINGS, WORLD_SIZE);
        setPath(p);
        setTargetPos(dest);
      }
    }
  }, [currentPlayerPos]);

  // ── hover debounce ────────────────────────────────────────────────────
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

  const isNight = !isDaytimeHours(state.time);
  const totalWood = deposited; // total logs deposited at the depot

  // ── render ────────────────────────────────────────────────────────────
  return (
    <div className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${isNight ? 'bg-slate-950' : 'bg-emerald-900'} cursor-crosshair`}>

      {/* 3-D voxel world */}
      <VoxelWorldContainer
        voxels={allVoxels}
        buildings={visibleBuildings}
        npcs={state.npcs}
        time={state.time}
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
        playerWorking={isGathering}
        playerCarried={carried}
        playerCarriedType="wood"
      />

      {/* ── Analog stick ──────────────────────────────────────────────── */}
      <AnalogStick onChange={setAnalogInput} isNight={isNight} />

      {/* ── Exit + recenter buttons ──────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => { setRecenterTrigger(t => t + 1); }}
          className="bg-black/70 text-white p-2 rounded-full active:scale-95 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
          title="Recenter"
        >
          <MapPin size={16} />
        </button>
      </div>

      {/* ── Exit button (top-left) ───────────────────────────────────── */}
      <button
        onClick={onExit}
        className="absolute top-3 left-3 z-[200] flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg backdrop-blur-sm active:scale-95 transition-all"
      >
        <ArrowLeft size={12} />
        Leave
      </button>

      {/* ── Wood inventory HUD ───────────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-[200] flex flex-col gap-1.5 items-end">
        {/* Carry bar */}
        <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm">
          <Weight size={10} className="text-amber-300" />
          <span className="text-amber-200">{carried}/{TESTING_CARRY_MAX}</span>
          <div className="w-12 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${carried >= TESTING_CARRY_MAX ? 'bg-red-400' : 'bg-amber-400'}`}
              style={{ width: `${(carried / TESTING_CARRY_MAX) * 100}%` }}
            />
          </div>
        </div>

        {/* Depot stock */}
        <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm">
          <TreePine size={12} className="text-amber-400" />
          <span className="text-amber-200">{totalWood} stored</span>
        </div>

        {/* Contextual status */}
        {(currentNodeId || nearDepot) && (
          <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm">
            {nearDepot && carried > 0 ? (
              isUnloading ? (
                <span className="text-emerald-300">📦 Unloading…</span>
              ) : (
                <span className="text-emerald-300">📦 Walk here to deposit</span>
              )
            ) : currentNodeId ? (
              isGathering ? (
                <>
                  <span className="text-emerald-300">⛏ Gathering…</span>
                  <span className="text-white/50">
                    {nodeStates[currentNodeId]?.remaining ?? 0} left
                  </span>
                </>
              ) : carried >= TESTING_CARRY_MAX ? (
                <span className="text-red-300">Full! Unload at depot</span>
              ) : playerIsMoving ? (
                <span className="text-amber-300">Stop to gather</span>
              ) : (
                <span className="text-amber-300">Stand still…</span>
              )
            ) : null}
          </div>
        )}
      </div>

      {/* ── Floating node label ──────────────────────────────────────── */}
      <AnimatePresence>
        {(currentNodeId || nearDepot) && (
          <motion.div
            key={nearDepot ? 'depot-tag' : 'node-tag'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-36 z-[110] pointer-events-none"
          >
            {nearDepot && carried > 0 ? (
              <div className="flex items-center gap-1.5 rounded-full bg-black/80 pl-1.5 pr-2.5 py-1 shadow-lg backdrop-blur-sm">
                <div className="rounded-full bg-green-700 p-1 text-white">
                  <Package size={10} />
                </div>
                <span className="text-[10px] font-bold text-white">Log Depot</span>
                {isUnloading ? (
                  <span className="text-[9px] text-emerald-300 font-medium ml-1">📦 unloading…</span>
                ) : (
                  <span className="text-[9px] text-emerald-300 font-medium ml-1">deposit logs here</span>
                )}
              </div>
            ) : currentNodeId ? (
              <div className="flex items-center gap-1.5 rounded-full bg-black/80 pl-1.5 pr-2.5 py-1 shadow-lg backdrop-blur-sm">
                <div className="rounded-full bg-amber-700 p-1 text-white">
                  <TreePine size={10} />
                </div>
                <span className="text-[10px] font-bold text-white">
                  {TESTING_WORLD_BUILDINGS[currentNodeId]?.name ?? 'Tree'}
                </span>
                {isGathering ? (
                  <span className="text-[9px] text-emerald-300 font-medium ml-1">⛏ gathering…</span>
                ) : carried >= TESTING_CARRY_MAX ? (
                  <span className="text-[9px] text-red-300 font-medium ml-1">full – go to depot!</span>
                ) : playerIsMoving ? (
                  <span className="text-[9px] text-amber-300 font-medium ml-1">stop to gather</span>
                ) : (
                  <span className="text-[9px] text-amber-300 font-medium ml-1">stand still…</span>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Flying resource particles ────────────────────────────────── */}
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

      {/* ── All-trees-depleted notice ─────────────────────────────────── */}
      <AnimatePresence>
        {TESTING_TREE_NODES.every(id => nodeStates[id]?.isDepleted) && (
          <motion.div
            key="all-depleted"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-x-4 bottom-40 z-[120] text-center pointer-events-none"
          >
            <div className="inline-block rounded-2xl bg-black/80 px-4 py-2 text-sm font-bold text-amber-200 shadow-xl backdrop-blur-sm">
              🌲 All trees harvested! Stored: {totalWood} logs
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
