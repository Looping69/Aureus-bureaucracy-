import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Lock, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { Permit, PermitStatus } from '../types';

// ─── Circle dimensions (matching amCharts ForceDirected node size) ────────────
const NODE_R = 42;           // radius px
const NODE_D = NODE_R * 2;   // diameter px

// ─── Force-directed layout (mirrors amCharts params) ─────────────────────────
//   manyBodyStrength : -10  → repulsion constant 9000
//   centerStrength   : 0.8  → gravity 0.04 per step
//   link strength    : 0.5  → attraction 0.08 per step
//   damping          : 0.88

interface SimNode { id: string; x: number; y: number; vx: number; vy: number }
interface SimLink { source: string; target: string }

function computeForceLayout(
  allIds: string[],
  links: SimLink[],
): Record<string, { x: number; y: number }> {
  const W = 1400, H = 900, cx = W / 2, cy = H / 2;

  // Deterministic circle initialisation (no randomness → stable positions)
  const nodes: SimNode[] = allIds.map((id, i) => ({
    id,
    x: cx + Math.cos((2 * Math.PI * i) / allIds.length) * 380,
    y: cy + Math.sin((2 * Math.PI * i) / allIds.length) * 380,
    vx: 0, vy: 0,
  }));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (let t = 0; t < 300; t++) {
    const α = Math.max(0.001, 1 - t / 250); // cooling schedule

    // Repulsion between every pair (O(n²), fine for ≤ ~50 nodes)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = (b.x - a.x) || 0.01;
        const dy = (b.y - a.y) || 0.01;
        const d = Math.sqrt(dx * dx + dy * dy);
        const f = (9000 / (d * d)) * α;
        const nx = (dx / d) * f, ny = (dy / d) * f;
        a.vx -= nx; a.vy -= ny;
        b.vx += nx; b.vy += ny;
      }
    }

    // Spring attraction along edges (link strength 0.5 → k = 0.08)
    for (const { source, target } of links) {
      const a = nodeMap.get(source), b = nodeMap.get(target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const k = 0.08 * α;
      a.vx += dx * k; a.vy += dy * k;
      b.vx -= dx * k; b.vy -= dy * k;
    }

    // Gravity toward centre (centerStrength 0.8 → 0.04)
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.04 * α;
      n.vy += (cy - n.y) * 0.04 * α;
    }

    // Integrate with damping
    for (const n of nodes) {
      n.vx *= 0.88; n.vy *= 0.88;
      n.x += n.vx;  n.y += n.vy;
    }
  }

  // Return top-left corner of each node's bounding box for React Flow
  return Object.fromEntries(nodes.map(n => [n.id, { x: n.x - NODE_R, y: n.y - NODE_R }]));
}

// ─── Status styling (dark-theme palette matching amCharts defaults) ───────────
function statusStyle(status: PermitStatus): { border: string; bg: string; text: string; pulse: boolean } {
  switch (status) {
    case 'APPROVED':  return { border: '#22c55e', bg: '#14532d', text: '#86efac', pulse: false };
    case 'PENDING':   return { border: '#f59e0b', bg: '#451a03', text: '#fcd34d', pulse: true  };
    case 'AVAILABLE': return { border: '#3b82f6', bg: '#1e3a8a', text: '#93c5fd', pulse: false };
    case 'REJECTED':  return { border: '#ef4444', bg: '#450a0a', text: '#fca5a5', pulse: false };
    case 'LOCKED':
    default:          return { border: '#475569', bg: '#1e293b', text: '#94a3b8', pulse: false };
  }
}

function statusIcon(status: PermitStatus) {
  switch (status) {
    case 'APPROVED':  return <CheckCircle size={20} />;
    case 'PENDING':   return <Clock size={20} />;
    case 'AVAILABLE': return <FileText size={20} />;
    case 'REJECTED':  return <AlertTriangle size={20} />;
    case 'LOCKED':    return <Lock size={18} />;
  }
}

// ─── Circular permit node ─────────────────────────────────────────────────────
type CircleNodeData = {
  permit: Permit;
  onOpen: (id: string) => void;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggle: (id: string) => void;
};

function PermitCircleNode({ data }: NodeProps) {
  const { permit, onOpen, hasChildren, isCollapsed, onToggle } = data as CircleNodeData;
  const { border, bg, text, pulse } = statusStyle(permit.status);
  const isClickable = permit.status !== 'LOCKED';
  const shortName = permit.name.replace(/\(.*?\)/g, '').trim();

  return (
    <>
      <Handle type="target" position={Position.Left}  style={{ opacity: 0 }} />

      <div style={{ position: 'relative', width: NODE_D, height: NODE_D + 46 }}>

        {/* ── Circle body ── */}
        <div
          onClick={isClickable ? () => onOpen(permit.id) : undefined}
          title={permit.name}
          style={{
            width: NODE_D, height: NODE_D, borderRadius: '50%',
            background: bg, border: `3px solid ${border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: isClickable ? 'pointer' : 'default',
            opacity: permit.status === 'LOCKED' ? 0.55 : 1,
            boxShadow: pulse
              ? `0 0 0 5px ${border}44, 0 4px 16px rgba(0,0,0,0.35)`
              : `0 3px 12px rgba(0,0,0,0.3)`,
            animation: pulse ? 'rfc-pulse 1.8s ease-in-out infinite' : 'none',
            transition: 'transform 0.15s ease',
            userSelect: 'none',
          }}
          className={isClickable ? 'hover:scale-110' : ''}
        >
          <div style={{ color: text }}>{statusIcon(permit.status)}</div>
          <div style={{
            fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: text, marginTop: 3,
          }}>
            {permit.formNumber}
          </div>
        </div>

        {/* ── Expand / collapse badge (matches amCharts downDepth toggle) ── */}
        {hasChildren && (
          <div
            onClick={(e) => { e.stopPropagation(); onToggle(permit.id); }}
            title={isCollapsed ? 'Expand children' : 'Collapse children'}
            style={{
              position: 'absolute', top: NODE_D - 12, left: '50%', transform: 'translateX(-50%)',
              width: 22, height: 22, borderRadius: '50%',
              background: border, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, lineHeight: 1,
              cursor: 'pointer', zIndex: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            }}
          >
            {isCollapsed ? '+' : '−'}
          </div>
        )}

        {/* ── Label below circle (scales with zoom naturally) ── */}
        <div style={{
          position: 'absolute', top: NODE_D + 9, left: '50%',
          transform: 'translateX(-50%)', width: 110,
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.25, whiteSpace: 'normal' }}>
            {shortName}
          </div>
          <div style={{ fontSize: 8, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
            ${permit.cost.toLocaleString()}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
}

const nodeTypes = { permitCircle: PermitCircleNode };

// ─── Helper: build children map + compute BFS depth ──────────────────────────
function buildGraph(permits: Record<string, Permit>) {
  const childrenMap: Record<string, string[]> = {};
  Object.keys(permits).forEach(id => { childrenMap[id] = []; });
  Object.values(permits).forEach(p => {
    (p.requiresPermits ?? []).forEach(reqId => {
      if (childrenMap[reqId]) childrenMap[reqId].push(p.id);
    });
  });

  const depthMap: Record<string, number> = {};
  const roots = Object.values(permits).filter(p => !p.requiresPermits?.length).map(p => p.id);
  const q: Array<{ id: string; d: number }> = roots.map(id => ({ id, d: 0 }));
  roots.forEach(id => { depthMap[id] = 0; });
  while (q.length) {
    const { id, d } = q.shift()!;
    childrenMap[id].forEach(cid => {
      if (depthMap[cid] === undefined) { depthMap[cid] = d + 1; q.push({ id: cid, d: d + 1 }); }
    });
  }
  return { childrenMap, depthMap };
}

// ─── Main component ───────────────────────────────────────────────────────────
interface ProgressionMapOverlayProps {
  permits: Record<string, Permit>;
  onClose: () => void;
  onOpenPermit: (id: string) => void;
}

export const ProgressionMapOverlay: React.FC<ProgressionMapOverlayProps> = ({
  permits,
  onClose,
  onOpenPermit,
}) => {
  // Compute graph structure and force positions once per permits snapshot
  const { childrenMap, positions } = useMemo(() => {
    const { childrenMap } = buildGraph(permits);
    const links: SimLink[] = Object.values(permits).flatMap(p =>
      (p.requiresPermits ?? []).map(reqId => ({ source: reqId, target: p.id }))
    );
    const positions = computeForceLayout(Object.keys(permits), links);
    return { childrenMap, positions };
  }, [permits]);

  // Initial collapse: nodes at depth ≥ 1 that have children are collapsed
  // (mirrors amCharts initialDepth: 1 — only depth-0 and depth-1 visible initially)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => {
    const { childrenMap, depthMap } = buildGraph(permits);
    const collapsed = new Set<string>();
    Object.entries(depthMap).forEach(([id, d]) => {
      if (d >= 1 && (childrenMap[id]?.length ?? 0) > 0) collapsed.add(id);
    });
    return collapsed;
  });

  // Visible nodes: BFS from roots, stop at collapsed nodes (children hidden)
  const visibleIds = useMemo(() => {
    const vis = new Set<string>();
    const roots = Object.values(permits).filter(p => !p.requiresPermits?.length).map(p => p.id);
    const q = [...roots];
    roots.forEach(id => vis.add(id));
    while (q.length) {
      const id = q.shift()!;
      if (collapsedNodes.has(id)) continue;
      (childrenMap[id] ?? []).forEach(cid => {
        if (!vis.has(cid)) { vis.add(cid); q.push(cid); }
      });
    }
    return vis;
  }, [permits, collapsedNodes, childrenMap]);

  const onOpen = useCallback((id: string) => {
    onOpenPermit(id);
    onClose();
  }, [onOpenPermit, onClose]);

  const onToggle = useCallback((id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    visibleIds.forEach(id => {
      const permit = permits[id];
      if (!permit) return;
      const pos = positions[id] ?? { x: 0, y: 0 };
      const hasChildren = (childrenMap[id]?.length ?? 0) > 0;
      const isCollapsed = collapsedNodes.has(id);

      nodes.push({
        id,
        type: 'permitCircle',
        position: pos,
        data: { permit, onOpen, hasChildren, isCollapsed, onToggle },
        draggable: false,
      });

      (permit.requiresPermits ?? []).forEach((reqId, i) => {
        if (!visibleIds.has(reqId)) return;
        const st = permit.status;
        edges.push({
          id: `${reqId}->${id}-${i}`,
          source: reqId,
          target: id,
          type: 'smoothstep',
          animated: st === 'PENDING',
          style: {
            stroke: st === 'APPROVED' ? '#22c55e' : st === 'PENDING' ? '#f59e0b' : '#334155',
            strokeWidth: 2.5,
          },
        });
      });
    });

    return { nodes, edges };
  }, [permits, visibleIds, positions, collapsedNodes, childrenMap, onOpen, onToggle]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0f172a' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-4"
        style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ background: '#3b82f6' }}
        >
          <FileText size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight leading-none text-white">Permit Network</h2>
          <p className="text-[10px] font-mono uppercase tracking-widest mt-0.5" style={{ color: '#64748b' }}>
            Force-directed · click node to file · +/− to expand
          </p>
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4 flex-wrap">
          {(['AVAILABLE', 'PENDING', 'APPROVED', 'REJECTED', 'LOCKED'] as PermitStatus[]).map((s) => {
            const { border } = statusStyle(s);
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: border }} />
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: border }}>
                  {s}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="ml-4 p-2 rounded-full transition-colors text-slate-400 hover:text-white hover:bg-white/10"
          aria-label="Close progression map"
        >
          <X size={20} />
        </button>
      </div>

      {/* Graph */}
      <div className="flex-1 relative" style={{ background: '#0f172a' }}>
        <style>{`
          @keyframes rfc-pulse {
            0%, 100% { box-shadow: 0 0 0 5px #f59e0b44, 0 4px 16px rgba(0,0,0,0.35); }
            50%       { box-shadow: 0 0 0 10px #f59e0b11, 0 4px 16px rgba(0,0,0,0.35); }
          }
          @keyframes rfc-appear {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .react-flow__node { animation: rfc-appear 0.45s ease-out both; }
        `}</style>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.15}
          maxZoom={3}
          nodesDraggable={false}
          elementsSelectable={false}
        >
          <Background color="#1e3a5f" gap={30} size={1.5} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </motion.div>
  );
};
