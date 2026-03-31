/**
 * MineWorldScene – a fully walkable 3-D mine environment.
 *
 * The player spawns near the mine entrance and can physically navigate to:
 *   • Extraction nodes (iron ore, coal, gems)  → collect resources
 *   • Loading zone (truck bay)                 → triggers a loading animation
 *   • Unloading zone (smelter / crusher)        → triggers an unloading animation
 *   • Delivery zone (storage warehouse)         → deposit collected resources
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Hammer, Package, Truck, Flame, Boxes } from 'lucide-react';
import { GameState, WorldHoverInfo, WorldPosition } from '../types';
import { WORLD_CAMERA_AZIMUTH } from '../VoxelEngine';
import { VoxelWorldContainer } from './VoxelWorldContainer';
import { AnalogStick, AnalogStickVector } from './AnalogStick';
import { buildWorldTerrainVoxels } from '../utils/worldSurface';
import { WORLD_SIZE } from '../utils/voxelConstants';
import { findPath } from '../utils/pathfinding';
import {
  MINE_WORLD_BUILDINGS,
  MINE_WORLD_ENTRANCE_POS,
  MINE_NODE_YIELDS,
  MINE_INTERACTION_RADIUS,
  NODE_HARVEST_COOLDOWN_MS,
} from '../mineWorldData';

// ─── types ────────────────────────────────────────────────────────────────────
type AnimationType = 'LOADING' | 'UNLOADING' | null;

interface NodeState {
  lastHarvested: number;  // timestamp ms
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const isNear = (a: WorldPosition, b: WorldPosition, radius: number) =>
  Math.abs(a.x - b.x) <= radius && Math.abs(a.y - b.y) <= radius;

// All buildings in the mine world (stable reference – never changes)
const MINE_BUILDINGS_LIST = Object.values(MINE_WORLD_BUILDINGS);

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
  // ── camera helpers ──────────────────────────────────────────────────────
  const camRight = React.useMemo(() => ({
    x:  Math.cos(WORLD_CAMERA_AZIMUTH),
    y: -Math.sin(WORLD_CAMERA_AZIMUTH),
  }), []);
  const camForward = React.useMemo(() => ({
    x: -Math.sin(WORLD_CAMERA_AZIMUTH),
    y: -Math.cos(WORLD_CAMERA_AZIMUTH),
  }), []);

  // ── local movement state (independent from global state.playerPos) ──────
  const [playerPos, setPlayerPos] = React.useState<WorldPosition>(MINE_WORLD_ENTRANCE_POS);
  const [path, setPath]           = React.useState<WorldPosition[]>([]);
  const [targetPos, setTargetPos] = React.useState<WorldPosition | null>(null);

  // ── interaction state ───────────────────────────────────────────────────
  const [animation, setAnimation]       = React.useState<AnimationType>(null);
  const [animProgress, setAnimProgress] = React.useState(0);
  const [nodeStates, setNodeStates]     = React.useState<Record<string, NodeState>>({});
  const [nearNode, setNearNode]         = React.useState<string | null>(null);
  const [nearZone, setNearZone]         = React.useState<'LOADING' | 'UNLOADING' | 'DELIVERY' | null>(null);

  const [analogInput, setAnalogInput]   = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const [recenterTrigger, setRecenterTrigger] = React.useState(0);
  const [hoverInfo, setHoverInfo]       = React.useState<WorldHoverInfo | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<WorldHoverInfo | null>(null);
  const animTimerRef  = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const animIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ── voxels for the mine world terrain ───────────────────────────────────
  const allVoxels = React.useMemo(
    () => buildWorldTerrainVoxels(MINE_WORLD_BUILDINGS, WORLD_SIZE).voxels,
    []
  );

  // ── movement loop ────────────────────────────────────────────────────────
  React.useEffect(() => {
    let budget = 0;
    const id = setInterval(() => {
      setPath(prev => {
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
  }, [state.movementSpeed, playerPos]);

  // ── analog stick movement ────────────────────────────────────────────────
  const issueAnalogMove = React.useCallback(() => {
    if (path.length > 0 || analogInput.magnitude < 0.35) return;
    const sv = -analogInput.y;
    const wx = camRight.x * analogInput.x + camForward.x * sv;
    const wy = camRight.y * analogInput.x + camForward.y * sv;
    const sx = wx > 0.35 ? 1 : wx < -0.35 ? -1 : 0;
    const sy = wy > 0.35 ? 1 : wy < -0.35 ? -1 : 0;
    if (sx === 0 && sy === 0) return;
    const next = {
      x: Math.max(0, Math.min(WORLD_SIZE - 1, Math.round(playerPos.x) + sx)),
      y: Math.max(0, Math.min(WORLD_SIZE - 1, Math.round(playerPos.y) + sy)),
    };
    if (next.x === Math.round(playerPos.x) && next.y === Math.round(playerPos.y)) return;
    const p = findPath(playerPos, next, MINE_WORLD_BUILDINGS, WORLD_SIZE);
    setPath(p);
    setTargetPos(next);
  }, [analogInput, camForward, camRight, path.length, playerPos]);

  React.useEffect(() => {
    if (!analogInput.active || analogInput.magnitude < 0.35 || path.length > 0) return;
    issueAnalogMove();
    const id = setInterval(issueAnalogMove, 180);
    return () => clearInterval(id);
  }, [analogInput.active, analogInput.magnitude, issueAnalogMove, path.length]);

  // ── proximity checks ─────────────────────────────────────────────────────
  React.useEffect(() => {
    const r = MINE_INTERACTION_RADIUS;

    // Extraction nodes
    let found: string | null = null;
    for (const id of Object.keys(MINE_NODE_YIELDS)) {
      const b = MINE_WORLD_BUILDINGS[id];
      if (b && isNear(playerPos, b.pos, r)) {
        found = id;
        break;
      }
    }
    setNearNode(found);

    // Loading zone
    const loadB = MINE_WORLD_BUILDINGS['loading_zone'];
    const unloadB = MINE_WORLD_BUILDINGS['unloading_zone'];
    const deliverB = MINE_WORLD_BUILDINGS['delivery_zone'];

    if (loadB && isNear(playerPos, loadB.pos, r)) {
      setNearZone('LOADING');
    } else if (unloadB && isNear(playerPos, unloadB.pos, r)) {
      setNearZone('UNLOADING');
    } else if (deliverB && isNear(playerPos, deliverB.pos, r)) {
      setNearZone('DELIVERY');
    } else {
      setNearZone(null);
    }
  }, [playerPos]);

  // ── zone animations (auto-trigger) ──────────────────────────────────────
  React.useEffect(() => {
    if (!nearZone || nearZone === 'DELIVERY' || animation) return;
    const type: AnimationType = nearZone === 'LOADING' ? 'LOADING' : 'UNLOADING';
    triggerAnimation(type);
  // Only trigger when nearZone first becomes non-null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearZone]);

  const triggerAnimation = (type: AnimationType) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    if (animIntervalRef.current) clearInterval(animIntervalRef.current);

    setAnimation(type);
    setAnimProgress(0);

    let progress = 0;
    animIntervalRef.current = setInterval(() => {
      progress += 4;
      setAnimProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(animIntervalRef.current!);
        animIntervalRef.current = null;
        animTimerRef.current = setTimeout(() => {
          setAnimation(null);
          setAnimProgress(0);
        }, 1200);
      }
    }, 120);
  };

  React.useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    };
  }, []);

  // ── resource harvest ─────────────────────────────────────────────────────
  const canHarvest = (nodeId: string) => {
    const ns = nodeStates[nodeId];
    if (!ns) return true;
    return Date.now() - ns.lastHarvested >= NODE_HARVEST_COOLDOWN_MS;
  };

  const handleHarvest = (nodeId: string) => {
    if (!canHarvest(nodeId)) return;
    const yieldAmount = MINE_NODE_YIELDS[nodeId] ?? 1;
    onCollectResource(yieldAmount);
    setNodeStates(prev => ({ ...prev, [nodeId]: { lastHarvested: Date.now() } }));
  };

  // ── world click / select ─────────────────────────────────────────────────
  const handleWorldSelect = React.useCallback((target: WorldHoverInfo) => {
    if (target.kind === 'GROUND') {
      const p = findPath(playerPos, { x: target.x, y: target.y }, MINE_WORLD_BUILDINGS, WORLD_SIZE);
      setPath(p);
      setTargetPos({ x: target.x, y: target.y });
      return;
    }
    if (target.kind === 'BUILDING' && target.id) {
      const building = MINE_WORLD_BUILDINGS[target.id];
      if (building) {
        const dest = { x: building.pos.x, y: building.pos.y + 6 };
        const p = findPath(playerPos, dest, MINE_WORLD_BUILDINGS, WORLD_SIZE);
        setPath(p);
        setTargetPos(dest);
      }
    }
  }, [playerPos]);

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

  // ── node label helper ─────────────────────────────────────────────────────
  const nodeLabel = (id: string) => {
    switch (id) {
      case 'ore_node':  return { icon: <Hammer size={16} />, label: 'Iron Ore', color: 'bg-amber-500' };
      case 'coal_node': return { icon: <Hammer size={16} />, label: 'Coal',     color: 'bg-gray-700'  };
      case 'gem_node':  return { icon: <Hammer size={16} />, label: 'Gems',     color: 'bg-purple-600'};
      default:          return { icon: <Hammer size={16} />, label: 'Resource', color: 'bg-stone-500' };
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${isNight ? 'bg-slate-950' : 'bg-stone-800'} cursor-crosshair`}>

      {/* 3-D voxel world */}
      <VoxelWorldContainer
        voxels={allVoxels}
        buildings={MINE_BUILDINGS_LIST}
        npcs={state.npcs}
        time={state.time}
        playerPos={playerPos}
        isMoving={path.length > 0}
        targetPos={targetPos}
        path={path}
        recenterTrigger={recenterTrigger}
        onStateChange={() => {}}
        onCountChange={() => {}}
        onHoverPosition={handleHoverPosition}
        onSelect={handleWorldSelect}
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
        className="absolute top-3 left-3 z-[200] flex items-center gap-2 rounded-2xl bg-black/70 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg backdrop-blur-sm active:scale-95 transition-all"
      >
        <ArrowLeft size={14} />
        Leave Mine
      </button>

      {/* ── Resource HUD (ore carried) ───────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-[200] flex items-center gap-2 rounded-2xl bg-black/70 px-3 py-2 text-xs font-black text-white shadow-lg backdrop-blur-sm">
        <Boxes size={14} className="text-amber-400" />
        <span className="text-amber-300">{state.ore}</span>
        <span className="text-white/50 font-normal">ore</span>
      </div>

      {/* ── Extraction node prompt ───────────────────────────────────────── */}
      <AnimatePresence>
        {nearNode && !animation && (
          <motion.div
            key="node-prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-x-4 bottom-40 z-[110] rounded-3xl border-2 border-black bg-white/95 p-5 shadow-2xl backdrop-blur-sm"
          >
            {(() => {
              const { icon, label, color } = nodeLabel(nearNode);
              const ready = canHarvest(nearNode);
              const building = MINE_WORLD_BUILDINGS[nearNode];
              return (
                <>
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 rounded-xl ${color} p-2 text-white`}>
                      {icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/40">Extraction Node</p>
                      <h3 className="mt-0.5 text-lg font-black leading-none">{building?.name ?? label}</h3>
                      <p className="mt-1 text-sm text-black/60">{building?.description ?? 'A source of raw materials.'}</p>
                      {!ready && (
                        <p className="mt-1 text-xs text-amber-600 font-medium">Cooldown – wait before harvesting again.</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleHarvest(nearNode)}
                    disabled={!ready}
                    className={`mt-4 w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.22em] transition-all active:scale-95 ${
                      ready
                        ? 'bg-black text-white hover:bg-zinc-800'
                        : 'bg-black/20 text-black/40 cursor-not-allowed'
                    }`}
                  >
                    {ready ? `Extract ${MINE_NODE_YIELDS[nearNode] ?? 1} unit(s)` : 'On Cooldown'}
                  </button>
                </>
              );
            })()}
          </motion.div>
        )}

        {/* ── Loading animation overlay ───────────────────────────────────── */}
        {animation === 'LOADING' && (
          <motion.div
            key="loading-anim"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-x-4 bottom-40 z-[120] rounded-3xl border-2 border-amber-400 bg-stone-900/95 p-5 shadow-2xl backdrop-blur-sm text-white"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-xl bg-amber-500 p-2">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">Loading Sequence</p>
                <h3 className="text-lg font-black leading-none text-amber-300">Truck Bay Loading</h3>
              </div>
            </div>

            {/* Mechanical arm animation */}
            <div className="relative h-16 mb-3 rounded-xl bg-stone-800 overflow-hidden">
              <div className="absolute inset-0 flex items-center gap-1 px-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-6 flex-1 rounded-sm ${i % 2 === 0 ? 'bg-amber-500' : 'bg-amber-700'}`}
                    animate={{ scaleY: [1, 0.4, 1] }}
                    transition={{ duration: 0.6, delay: i * 0.06, repeat: Infinity }}
                  />
                ))}
              </div>
              {/* Moving arm */}
              <motion.div
                className="absolute top-2 h-4 w-6 rounded-sm border-2 border-white/20"
                style={{ backgroundColor: '#9ca3af' }}
                animate={{ x: ['0%', '85%', '0%'] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            {/* Particle effects */}
            <div className="relative h-8 mb-3 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-amber-400"
                  style={{ left: `${10 + i * 12}%`, top: '50%' }}
                  animate={{ y: [-8, 8, -8], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, delay: i * 0.1, repeat: Infinity }}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div className="rounded-full bg-stone-700 h-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                style={{ width: `${animProgress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-white/60 font-medium">
              {animProgress < 100 ? 'Loading cargo onto transport vehicle…' : '✓ Loading complete'}
            </p>
          </motion.div>
        )}

        {/* ── Unloading animation overlay ─────────────────────────────────── */}
        {animation === 'UNLOADING' && (
          <motion.div
            key="unloading-anim"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-x-4 bottom-40 z-[120] rounded-3xl border-2 border-orange-500 bg-stone-900/95 p-5 shadow-2xl backdrop-blur-sm text-white"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-xl bg-orange-600 p-2">
                <Flame size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">Processing</p>
                <h3 className="text-lg font-black leading-none text-orange-300">Smelter Active</h3>
              </div>
            </div>

            {/* Furnace fire animation */}
            <div className="relative h-16 mb-3 rounded-xl bg-stone-800 overflow-hidden">
              <div className="absolute bottom-0 inset-x-0 flex justify-center gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-3 rounded-t-full"
                    style={{ backgroundColor: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#f97316' : '#fbbf24' }}
                    animate={{ height: [8, 24 + (i % 4) * 6, 8] }}
                    transition={{ duration: 0.4 + i * 0.05, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ))}
              </div>
              {/* Sparks */}
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={`sp-${i}`}
                  className="absolute w-1 h-1 rounded-full bg-yellow-200"
                  style={{ left: `${15 + i * 14}%`, bottom: '30%' }}
                  animate={{ y: [0, -20], opacity: [1, 0] }}
                  transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }}
                />
              ))}
            </div>

            {/* Sorting bins indicator */}
            <div className="flex gap-2 mb-3">
              {['Iron', 'Slag', 'Gas'].map((label, i) => (
                <motion.div
                  key={label}
                  className="flex-1 rounded-lg bg-stone-700 p-2 text-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, delay: i * 0.33, repeat: Infinity }}
                >
                  <div className="text-[10px] text-white/50 uppercase">{label}</div>
                  <motion.div
                    className="mt-1 h-1 rounded-full bg-orange-400"
                    animate={{ width: ['20%', '80%', '20%'] }}
                    transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                  />
                </motion.div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="rounded-full bg-stone-700 h-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-600 to-yellow-400"
                style={{ width: `${animProgress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-white/60 font-medium">
              {animProgress < 100 ? 'Smelting and sorting ore…' : '✓ Processing complete'}
            </p>
          </motion.div>
        )}

        {/* ── Delivery zone prompt ─────────────────────────────────────────── */}
        {nearZone === 'DELIVERY' && !animation && (
          <motion.div
            key="delivery-prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-x-4 bottom-40 z-[110] rounded-3xl border-2 border-black bg-white/95 p-5 shadow-2xl backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-xl bg-emerald-600 p-2 text-white">
                <Boxes size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/40">Storage Warehouse</p>
                <h3 className="mt-0.5 text-lg font-black leading-none">Deposit Resources</h3>
                <p className="mt-1 text-sm text-black/60">
                  You are carrying <strong>{state.ore}</strong> unit(s) of ore. Resources are stored here for export.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-emerald-700 font-medium">
              ✓ Resources automatically accounted for in your inventory.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend overlay (top-center, compact) ───────────────────────── */}
      <div className="absolute top-12 inset-x-4 z-[100] flex justify-center pointer-events-none">
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            { color: 'bg-amber-500', label: 'Ore' },
            { color: 'bg-gray-700',  label: 'Coal' },
            { color: 'bg-purple-600',label: 'Gems' },
            { color: 'bg-blue-600',  label: 'Loading' },
            { color: 'bg-orange-600',label: 'Smelter' },
            { color: 'bg-emerald-600',label: 'Storage' },
          ].map(({ color, label }) => (
            <span key={label} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider ${color}/80 backdrop-blur-sm`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-white/80 inline-block`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
