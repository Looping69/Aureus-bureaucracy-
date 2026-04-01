/**
 * MineWorldScene – a fully walkable 3-D mine environment.
 *
 * The player spawns near the mine entrance and can physically navigate to:
 *   • Extraction nodes (iron ore, coal, gems)  → auto-collect resources
 *   • Loading zone (truck bay)                 → brief loading indicator
 *   • Unloading zone (smelter / crusher)        → auto-smelt (needs ore+coal)
 *   • Delivery zone (storage warehouse)         → auto-deposit refined metal
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Hammer, Package, Flame, Boxes, Zap } from 'lucide-react';
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

// ─── helpers ──────────────────────────────────────────────────────────────────
const isNear = (a: WorldPosition, b: WorldPosition, radius: number) =>
  Math.abs(a.x - b.x) <= radius && Math.abs(a.y - b.y) <= radius;

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

  // ── local mine inventory ───────────────────────────────────────────────
  const [inventory, setInventory] = React.useState<MineInventory>({ rawOre: 0, coal: 0, gems: 0, refinedMetal: 0 });
  const [particles, setParticles] = React.useState<ResourceParticle[]>([]);

  // ── interaction state ───────────────────────────────────────────────────
  const [nodeStates, setNodeStates]     = React.useState<Record<string, NodeState>>({});
  const [nearNode, setNearNode]         = React.useState<string | null>(null);
  const [nearZone, setNearZone]         = React.useState<'LOADING' | 'UNLOADING' | 'DELIVERY' | null>(null);

  const [analogInput, setAnalogInput]   = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const [recenterTrigger, setRecenterTrigger] = React.useState(0);
  const [hoverInfo, setHoverInfo]       = React.useState<WorldHoverInfo | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<WorldHoverInfo | null>(null);

  // ── voxels for the mine world terrain ───────────────────────────────────
  const allVoxels = React.useMemo(
    () => buildWorldTerrainVoxels(MINE_WORLD_BUILDINGS, WORLD_SIZE).voxels,
    []
  );

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
    if (path.length > 1 || analogInput.magnitude < 0.35) return;
    const sv = -analogInput.y;
    const wx = camRight.x * analogInput.x + camForward.x * sv;
    const wy = camRight.y * analogInput.x + camForward.y * sv;
    const sx = wx > 0.35 ? 1 : wx < -0.35 ? -1 : 0;
    const sy = wy > 0.35 ? 1 : wy < -0.35 ? -1 : 0;
    if (sx === 0 && sy === 0) return;
    const next = {
      x: Math.max(0, Math.min(WORLD_SIZE - 1, Math.round(playerPos.x) + sx * 3)),
      y: Math.max(0, Math.min(WORLD_SIZE - 1, Math.round(playerPos.y) + sy * 3)),
    };
    if (next.x === Math.round(playerPos.x) && next.y === Math.round(playerPos.y)) return;
    const p = findPath(playerPos, next, MINE_WORLD_BUILDINGS, WORLD_SIZE);
    setPath(p);
    setTargetPos(next);
  }, [analogInput, camForward, camRight, path.length, playerPos]);

  React.useEffect(() => {
    if (!analogInput.active || analogInput.magnitude < 0.35 || path.length > 1) return;
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

    // Zones
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

  // ── auto-harvest extraction nodes on proximity ─────────────────────────
  React.useEffect(() => {
    if (!nearNode) return;
    const tryHarvest = () => {
      const ns = nodeStates[nearNode];
      const ready = !ns || (Date.now() - ns.lastHarvested >= NODE_HARVEST_COOLDOWN_MS);
      if (!ready) return;
      const yieldAmt = MINE_NODE_YIELDS[nearNode] ?? 1;
      // Add to local mine inventory based on node type
      setInventory(prev => {
        switch (nearNode) {
          case 'ore_node':  return { ...prev, rawOre: prev.rawOre + yieldAmt };
          case 'coal_node': return { ...prev, coal:   prev.coal   + yieldAmt };
          case 'gem_node':  return { ...prev, gems:   prev.gems   + yieldAmt };
          default:          return prev;
        }
      });
      setNodeStates(prev => ({ ...prev, [nearNode]: { lastHarvested: Date.now() } }));
      // Spawn flying particle
      const info = nodeInfo(nearNode);
      spawnParticle(`+${yieldAmt} ${info.label}`, info.hex);
    };
    // Harvest immediately, then repeat while standing near
    tryHarvest();
    const id = setInterval(tryHarvest, NODE_HARVEST_COOLDOWN_MS + 200);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearNode, spawnParticle]);

  // ── auto-smelt at unloading zone (requires rawOre + coal) ──────────────
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
    const id = setInterval(trySmelt, 2500);
    return () => clearInterval(id);
  }, [nearZone, spawnParticle]);

  // ── auto-deposit at delivery zone → global state ──────────────────────
  React.useEffect(() => {
    if (nearZone !== 'DELIVERY') return;
    const tryDeposit = () => {
      setInventory(prev => {
        if (prev.refinedMetal > 0) {
          onCollectResource(prev.refinedMetal);
          spawnParticle(`+${prev.refinedMetal} stored`, '#10b981');
          return { ...prev, refinedMetal: 0 };
        }
        // Also deposit raw gems directly (no smelting needed)
        if (prev.gems > 0) {
          onCollectResource(prev.gems);
          spawnParticle(`+${prev.gems} gems stored`, '#9b59b6');
          return { ...prev, gems: 0 };
        }
        return prev;
      });
    };
    tryDeposit();
    const id = setInterval(tryDeposit, 1500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearZone, spawnParticle, onCollectResource]);

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

  // ── node info helper ──────────────────────────────────────────────────────
  const nodeInfo = (id: string) => {
    switch (id) {
      case 'ore_node':  return { icon: <Hammer size={10} />, label: 'Ore', color: 'bg-amber-500', hex: '#f59e0b' };
      case 'coal_node': return { icon: <Hammer size={10} />, label: 'Coal', color: 'bg-gray-700', hex: '#374151' };
      case 'gem_node':  return { icon: <Hammer size={10} />, label: 'Gems', color: 'bg-purple-600', hex: '#9333ea' };
      default:          return { icon: <Hammer size={10} />, label: 'Resource', color: 'bg-stone-500', hex: '#78716c' };
    }
  };

  // ── cooldown remaining helper ──────────────────────────────────────────
  const cooldownPct = (nodeId: string) => {
    const ns = nodeStates[nodeId];
    if (!ns) return 0;
    const elapsed = Date.now() - ns.lastHarvested;
    if (elapsed >= NODE_HARVEST_COOLDOWN_MS) return 0;
    return Math.round(100 - (elapsed / NODE_HARVEST_COOLDOWN_MS) * 100);
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
        className="absolute top-3 left-3 z-[200] flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg backdrop-blur-sm active:scale-95 transition-all"
      >
        <ArrowLeft size={12} />
        Leave
      </button>

      {/* ── Resource HUD (carried inventory) ─────────────────────────────── */}
      <div className="absolute top-3 right-3 z-[200] flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm">
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
        {/* Extraction node: compact tag */}
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
              const cd = cooldownPct(nearNode);
              return (
                <div className="flex items-center gap-1.5 rounded-full bg-black/80 pl-1.5 pr-2.5 py-1 shadow-lg backdrop-blur-sm">
                  <div className={`rounded-full ${info.color} p-1 text-white`}>{info.icon}</div>
                  <span className="text-[10px] font-bold text-white">{MINE_WORLD_BUILDINGS[nearNode]?.name ?? info.label}</span>
                  {cd > 0 ? (
                    <span className="text-[9px] text-amber-300 font-medium ml-1">⏳ {cd}%</span>
                  ) : (
                    <span className="text-[9px] text-emerald-300 font-medium ml-1">✓ ready</span>
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
                  need {SMELT_COST.rawOre}ore+{SMELT_COST.coal}coal
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Delivery: compact tag */}
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
              {inventory.refinedMetal > 0 || inventory.gems > 0 ? (
                <span className="text-[9px] text-emerald-300 font-medium ml-1">✓ storing</span>
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
