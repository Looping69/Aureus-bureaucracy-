import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Hammer, MapPin } from 'lucide-react';
import { GameState, WorldHoverInfo, WorldPosition } from '../types';
import { WORLD_CAMERA_AZIMUTH } from '../VoxelEngine';
import { VoxelWorldContainer } from './VoxelWorldContainer';
import { AnalogStick, AnalogStickVector } from './AnalogStick';
import { HudActionButton, HudIconTile, HudPanel } from './HudFrame';
import { buildWorldTerrainVoxels } from '../utils/worldSurface';
import { WORLD_SIZE } from '../utils/voxelConstants';
import { findPath } from '../utils/pathfinding';
import { useContinuousAnalogMovement } from '../hooks/game/useContinuousAnalogMovement';
import {
  MINE_INTERACTION_RADIUS,
  MINE_NODE_YIELDS,
  MINE_WORLD_BUILDINGS,
  MINE_WORLD_ENTRANCE_POS,
  NODE_HARVEST_COOLDOWN_MS,
} from '../mineWorldData';

interface NodeState {
  unitsRemaining: number;
  cooldownUntil: number;
}

interface ResourcePop {
  id: number;
  label: string;
  color: string;
}

const NOOP = () => {};
const RESOURCE_CAPACITY: Record<string, number> = {
  ore_node: 24,
  coal_node: 24,
  gem_node: 14,
};
const MINE_TICK_MS = 1000;
const CAMERA_COMMIT_INTERVAL_MS = 120;
const CAMERA_COMMIT_DELTA = 0.03;

const isNear = (a: WorldPosition, b: WorldPosition, radius: number) =>
  Math.abs(a.x - b.x) <= radius && Math.abs(a.y - b.y) <= radius;

const getNodeCapacity = (nodeId: string) => RESOURCE_CAPACITY[nodeId] ?? 18;

const createNodeStates = (): Record<string, NodeState> =>
  Object.keys(MINE_NODE_YIELDS).reduce<Record<string, NodeState>>((acc, nodeId) => {
    acc[nodeId] = { unitsRemaining: getNodeCapacity(nodeId), cooldownUntil: 0 };
    return acc;
  }, {});

const refreshNodes = (states: Record<string, NodeState>, now: number) => {
  let changed = false;
  const next = { ...states };

  for (const [nodeId, node] of Object.entries(states)) {
    if (node.unitsRemaining <= 0 && node.cooldownUntil > 0 && node.cooldownUntil <= now) {
      next[nodeId] = { unitsRemaining: getNodeCapacity(nodeId), cooldownUntil: 0 };
      changed = true;
    }
  }

  return changed ? next : states;
};

const nodeInfo = (nodeId: string) => {
  switch (nodeId) {
    case 'ore_node':
      return { label: 'Iron Ore', shortLabel: 'Ore', color: '#f59e0b', toneClass: 'bg-amber-400' };
    case 'coal_node':
      return { label: 'Coal', shortLabel: 'Coal', color: '#64748b', toneClass: 'bg-slate-400' };
    case 'gem_node':
      return { label: 'Gems', shortLabel: 'Gems', color: '#9333ea', toneClass: 'bg-purple-400' };
    default:
      return { label: 'Resource', shortLabel: 'Resource', color: '#78716c', toneClass: 'bg-stone-400' };
  }
};

let resourcePopId = 0;

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
  const [hoverInfo, setHoverInfo] = React.useState<WorldHoverInfo | null>(null);
  const [analogInput, setAnalogInput] = React.useState<AnalogStickVector>({ x: 0, y: 0, magnitude: 0, active: false });
  const [cameraAzimuth, setCameraAzimuth] = React.useState(WORLD_CAMERA_AZIMUTH);
  const [recenterTrigger, setRecenterTrigger] = React.useState(0);
  const [nearNode, setNearNode] = React.useState<string | null>(null);
  const [nodeStates, setNodeStates] = React.useState<Record<string, NodeState>>(createNodeStates);
  const [mineClock, setMineClock] = React.useState(() => Date.now());
  const [isMining, setIsMining] = React.useState(false);
  const [resourcePops, setResourcePops] = React.useState<ResourcePop[]>([]);

  const playerPosRef = React.useRef(playerPos);
  const nearNodeRef = React.useRef<string | null>(null);
  const nodeStatesRef = React.useRef(nodeStates);
  const playerIsMovingRef = React.useRef(false);
  const pendingHoverRef = React.useRef<WorldHoverInfo | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const committedCameraAzimuthRef = React.useRef(WORLD_CAMERA_AZIMUTH);
  const lastCameraCommitRef = React.useRef(0);

  React.useEffect(() => { playerPosRef.current = playerPos; }, [playerPos]);
  React.useEffect(() => { nearNodeRef.current = nearNode; }, [nearNode]);
  React.useEffect(() => { nodeStatesRef.current = nodeStates; }, [nodeStates]);

  const terrainData = React.useMemo(
    () => buildWorldTerrainVoxels(MINE_WORLD_BUILDINGS, WORLD_SIZE),
    []
  );
  const resourceNodes = React.useMemo(() => Object.values(MINE_WORLD_BUILDINGS), []);

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
  const renderPlayerPos = usingAnalogMovement ? analogController.position : playerPos;
  const currentTile = usingAnalogMovement ? analogController.roundedPosition : playerPos;
  const playerIsMoving = usingAnalogMovement || path.length > 0;

  React.useEffect(() => {
    playerIsMovingRef.current = playerIsMoving;
  }, [playerIsMoving]);

  const spawnResourcePop = React.useCallback((label: string, color: string) => {
    const id = ++resourcePopId;
    setResourcePops(prev => [...prev, { id, label, color }]);
    window.setTimeout(() => {
      setResourcePops(prev => prev.filter(pop => pop.id !== id));
    }, 850);
  }, []);

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
    let foundNode: string | null = null;
    for (const nodeId of Object.keys(MINE_NODE_YIELDS)) {
      const node = MINE_WORLD_BUILDINGS[nodeId];
      if (node && isNear(currentTile, node.pos, MINE_INTERACTION_RADIUS)) {
        foundNode = nodeId;
        break;
      }
    }

    setNearNode(prev => (prev === foundNode ? prev : foundNode));
  }, [currentTile.x, currentTile.y]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setMineClock(now);
      setNodeStates(prev => refreshNodes(prev, now));
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    const mineTick = () => {
      const nodeId = nearNodeRef.current;
      if (!nodeId || playerIsMovingRef.current) {
        setIsMining(false);
        return;
      }

      const now = Date.now();
      const refreshed = refreshNodes(nodeStatesRef.current, now);
      if (refreshed !== nodeStatesRef.current) {
        nodeStatesRef.current = refreshed;
        setNodeStates(refreshed);
      }

      const nodeState = nodeStatesRef.current[nodeId] ?? { unitsRemaining: getNodeCapacity(nodeId), cooldownUntil: 0 };
      if (nodeState.unitsRemaining <= 0) {
        setIsMining(false);
        return;
      }

      const reward = MINE_NODE_YIELDS[nodeId] ?? 1;
      const info = nodeInfo(nodeId);
      const remaining = nodeState.unitsRemaining - 1;
      const nextState: NodeState = {
        unitsRemaining: remaining,
        cooldownUntil: remaining <= 0 ? now + NODE_HARVEST_COOLDOWN_MS : 0,
      };

      nodeStatesRef.current = { ...nodeStatesRef.current, [nodeId]: nextState };
      setNodeStates(nodeStatesRef.current);
      setIsMining(true);
      onCollectResource(reward);
      spawnResourcePop(`+${reward} ${info.shortLabel}`, info.color);

      if (remaining <= 0) {
        spawnResourcePop(`${info.shortLabel} depleted`, '#94a3b8');
      }
    };

    const id = window.setInterval(mineTick, MINE_TICK_MS);
    return () => window.clearInterval(id);
  }, [onCollectResource, spawnResourcePop]);

  React.useEffect(() => {
    if (playerIsMoving || !nearNode) {
      setIsMining(false);
    }
  }, [nearNode, playerIsMoving]);

  const handleWorldSelect = React.useCallback((target: WorldHoverInfo) => {
    if (target.kind === 'GROUND') {
      const nextPath = findPath(playerPosRef.current, { x: target.x, y: target.y }, MINE_WORLD_BUILDINGS, WORLD_SIZE);
      setPath(nextPath);
      setTargetPos({ x: target.x, y: target.y });
      return;
    }

    if (target.kind === 'BUILDING' && target.id) {
      const node = MINE_WORLD_BUILDINGS[target.id];
      if (!node) return;
      const destination = { x: node.pos.x, y: node.pos.y + MINE_INTERACTION_RADIUS + 1 };
      const nextPath = findPath(playerPosRef.current, destination, MINE_WORLD_BUILDINGS, WORLD_SIZE);
      setPath(nextPath);
      setTargetPos(destination);
    }
  }, []);

  const flushHover = React.useCallback(() => {
    hoverRafRef.current = null;
    const pending = pendingHoverRef.current;
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
    pendingHoverRef.current = pos;
    if (hoverRafRef.current !== null) return;
    hoverRafRef.current = requestAnimationFrame(flushHover);
  }, [flushHover]);

  React.useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null) cancelAnimationFrame(hoverRafRef.current);
    };
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
    const availableNode = Object.keys(MINE_NODE_YIELDS).find(nodeId => {
      const node = nodeStates[nodeId];
      return node && (node.unitsRemaining > 0 || node.cooldownUntil <= mineClock);
    });
    if (!availableNode) return null;
    const node = MINE_WORLD_BUILDINGS[availableNode];
    return {
      x: node.pos.x,
      y: node.pos.y,
      z: 1,
      kind: 'BUILDING',
      id: availableNode,
      label: node.name,
    };
  }, [mineClock, nodeStates]);

  const activeNodeState = nearNode ? nodeStates[nearNode] : null;
  const activeNodeInfo = nearNode ? nodeInfo(nearNode) : null;
  const activeCooldown = activeNodeState?.cooldownUntil && activeNodeState.cooldownUntil > mineClock
    ? Math.ceil((activeNodeState.cooldownUntil - mineClock) / 1000)
    : 0;
  const hoverLabel = hoverInfo?.label ?? (hoverInfo?.id ? MINE_WORLD_BUILDINGS[hoverInfo.id]?.name : null);
  const isNight = state.time >= 20 || state.time < 6;

  return (
    <div className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${isNight ? 'bg-slate-950' : 'bg-slate-200'}`}>
      <VoxelWorldContainer
        voxels={terrainData.voxels}
        buildings={resourceNodes}
        navigationZones={[]}
        npcs={{}}
        time={state.time}
        weather={state.weather}
        playerPos={renderPlayerPos}
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
        playerWorking={isMining}
        playerCarried={0}
      />

      <AnalogStick onChange={setAnalogInput} isNight={isNight} />

      <HudActionButton
        onClick={onExit}
        icon={ArrowLeft}
        label="Leave"
        detail="Return to world"
        className="absolute left-3 top-3 z-[200] min-w-[112px]"
      />

      <div className="absolute bottom-4 right-4 z-[200]">
        <button
          type="button"
          onClick={() => setRecenterTrigger(prev => prev + 1)}
          className="bg-black text-white p-2 rounded-full active:scale-95 transition-all flex items-center justify-center shadow-lg"
          title="Recenter"
        >
          <MapPin size={16} />
        </button>
      </div>

      <div className="absolute left-3 top-20 z-[200] flex max-w-[260px] flex-col gap-1.5">
        <HudPanel toneBorderClass="border-amber-600/80" className="px-3 py-2">
          <div className="flex items-start gap-2">
            <HudIconTile icon={Hammer} toneClass="bg-amber-400" />
            <div className="min-w-0">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Resource Field</div>
              <div className="mt-1 text-[11px] font-bold leading-snug text-white">
                {nearNode
                  ? playerIsMoving
                    ? 'Stop beside the resource to mine it.'
                    : activeCooldown > 0
                      ? `This resource refreshes in ${activeCooldown}s.`
                      : isMining
                        ? `Mining ${activeNodeInfo?.label ?? 'resource'}...`
                        : `Stand still to mine ${activeNodeInfo?.label ?? 'resource'}.`
                  : 'Walk to a resource deposit and stand still to mine.'}
              </div>
              {hoverLabel && (
                <div className="mt-1 truncate text-[9px] font-bold text-slate-400">Hover: {hoverLabel}</div>
              )}
            </div>
          </div>
        </HudPanel>
      </div>

      <div className="absolute top-3 right-3 z-[200] flex flex-col gap-1.5 items-end">
        {Object.keys(MINE_NODE_YIELDS).map(nodeId => {
          const info = nodeInfo(nodeId);
          const node = nodeStates[nodeId];
          const capacity = getNodeCapacity(nodeId);
          const cooldown = node?.cooldownUntil && node.cooldownUntil > mineClock
            ? Math.ceil((node.cooldownUntil - mineClock) / 1000)
            : 0;

          return (
            <HudPanel key={nodeId} toneBorderClass="border-slate-700/80" className="min-w-[158px] px-3 py-2">
              <div className="flex items-center gap-2">
                <HudIconTile icon={Hammer} toneClass={info.toneClass} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{info.shortLabel}</span>
                  <span className="mt-1 text-sm font-black text-white">
                    {cooldown > 0 ? `${cooldown}s` : `${node?.unitsRemaining ?? 0}/${capacity}`}
                  </span>
                </div>
              </div>
            </HudPanel>
          );
        })}
      </div>

      <AnimatePresence>
        {resourcePops.map(pop => (
          <motion.div
            key={pop.id}
            initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            animate={{ opacity: 0, y: -60, x: 30, scale: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute z-[300] pointer-events-none"
            style={{ bottom: '50%', left: '50%' }}
          >
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-lg"
              style={{ backgroundColor: pop.color }}
            >
              {pop.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
