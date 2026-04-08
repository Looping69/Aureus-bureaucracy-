import React, { useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Lock, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { Permit, PermitStatus } from '../types';

// ─── Layout constants ────────────────────────────────────────────────────────
const NODE_W = 180;
const NODE_H = 90;
const COL_GAP = 220;
const ROW_GAP = 120;

// ─── Node styling constants ───────────────────────────────────────────────────
const STATUS_LABEL_FONT_SIZE = 9;
const STATUS_LABEL_FONT_WEIGHT = 900;
const STATUS_LABEL_LETTER_SPACING = '0.12em';
const FORM_NUMBER_FONT_SIZE = 8;
const PERMIT_NAME_FONT_SIZE = 11;
const PERMIT_NAME_FONT_WEIGHT = 800;
const PERMIT_NAME_LINE_HEIGHT = 1.3;
const PERMIT_COST_FONT_SIZE = 10;
const PERMIT_COST_FONT_WEIGHT = 600;
const FEATURE_TAG_FONT_SIZE = 8;
const FEATURE_TAG_FONT_WEIGHT = 700;
const FEATURE_TAG_LETTER_SPACING = '0.05em';

// Manual column/row positions for each permit id (left-right tree layout)
const PERMIT_POSITIONS: Record<string, { col: number; row: number }> = {
  'extraction-intent':    { col: 0, row: 2 },
  'prospecting-license':  { col: 1, row: 2 },
  'mining-permit-iron':   { col: 2, row: 2 },
  'prospecting-permit-deep': { col: 3, row: 2 },
  'mining-permit-deep':   { col: 4, row: 2 },
  'prospecting-permit-abyss': { col: 5, row: 2 },
  'mining-permit-abyss':  { col: 6, row: 2 },
  'wash-plant-permit':    { col: 1, row: 0 },
  'export-license':       { col: 1, row: 4 },
  'claim-expansion':      { col: 3, row: 4 },
};

// ─── Status styling ───────────────────────────────────────────────────────────
function statusStyle(status: PermitStatus): {
  border: string;
  bg: string;
  text: string;
  pulse: boolean;
} {
  switch (status) {
    case 'APPROVED':
      return { border: '#16a34a', bg: '#f0fdf4', text: '#15803d', pulse: false };
    case 'PENDING':
      return { border: '#d97706', bg: '#fffbeb', text: '#92400e', pulse: true };
    case 'AVAILABLE':
      return { border: '#2563eb', bg: '#eff6ff', text: '#1d4ed8', pulse: false };
    case 'REJECTED':
      return { border: '#dc2626', bg: '#fef2f2', text: '#991b1b', pulse: false };
    case 'LOCKED':
    default:
      return { border: '#6b7280', bg: '#f9fafb', text: '#4b5563', pulse: false };
  }
}

function statusIcon(status: PermitStatus) {
  switch (status) {
    case 'APPROVED':  return <CheckCircle size={14} />;
    case 'PENDING':   return <Clock size={14} />;
    case 'AVAILABLE': return <FileText size={14} />;
    case 'REJECTED':  return <AlertTriangle size={14} />;
    case 'LOCKED':    return <Lock size={12} />;
  }
}

// ─── Custom node ──────────────────────────────────────────────────────────────
type PermitNodeData = {
  permit: Permit;
  onOpen: (id: string) => void;
};

function PermitNode({ data }: NodeProps) {
  const { permit, onOpen } = data as PermitNodeData;
  const { border, bg, text, pulse } = statusStyle(permit.status);
  const isClickable = permit.status !== 'LOCKED';

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        onClick={isClickable ? () => onOpen(permit.id) : undefined}
        style={{
          width: NODE_W,
          minHeight: NODE_H,
          background: bg,
          border: `2.5px solid ${border}`,
          borderRadius: 14,
          padding: '10px 12px',
          cursor: isClickable ? 'pointer' : 'default',
          opacity: permit.status === 'LOCKED' ? 0.55 : 1,
          boxShadow: pulse
            ? `0 0 0 3px ${border}55`
            : '0 2px 8px rgba(0,0,0,0.08)',
          animation: pulse ? 'rf-pulse 1.8s ease-in-out infinite' : 'none',
          fontFamily: 'inherit',
          transition: 'box-shadow 0.15s, transform 0.1s',
          userSelect: 'none',
        }}
        className={isClickable ? 'hover:scale-[1.03]' : ''}
      >
        {/* Status row */}
        <div style={{ color: text, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          {statusIcon(permit.status)}
          <span style={{ fontSize: STATUS_LABEL_FONT_SIZE, fontWeight: STATUS_LABEL_FONT_WEIGHT, textTransform: 'uppercase', letterSpacing: STATUS_LABEL_LETTER_SPACING }}>
            {permit.status}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: FORM_NUMBER_FONT_SIZE, opacity: 0.6, fontFamily: 'monospace' }}>
            {permit.formNumber}
          </span>
        </div>

        {/* Name */}
        <div style={{
          fontSize: PERMIT_NAME_FONT_SIZE,
          fontWeight: PERMIT_NAME_FONT_WEIGHT,
          color: '#111',
          lineHeight: PERMIT_NAME_LINE_HEIGHT,
          marginBottom: 4,
        }}>
          {permit.name}
        </div>

        {/* Cost */}
        <div style={{ fontSize: PERMIT_COST_FONT_SIZE, color: '#555', fontWeight: PERMIT_COST_FONT_WEIGHT }}>
          ${permit.cost.toLocaleString()}
          {permit.unlocksFeature && (
            <span style={{
              marginLeft: 6,
              fontSize: FEATURE_TAG_FONT_SIZE,
              background: `${border}22`,
              color: text,
              borderRadius: 4,
              padding: '1px 5px',
              fontWeight: FEATURE_TAG_FONT_WEIGHT,
              letterSpacing: FEATURE_TAG_LETTER_SPACING,
            }}>
              {permit.unlocksFeature.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
}

const nodeTypes = { permit: PermitNode };

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
  const onOpen = useCallback((id: string) => {
    onOpenPermit(id);
    onClose();
  }, [onOpenPermit, onClose]);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    Object.values(permits).forEach((permit) => {
      const pos = PERMIT_POSITIONS[permit.id] ?? { col: 0, row: 0 };

      nodes.push({
        id: permit.id,
        type: 'permit',
        position: { x: pos.col * COL_GAP, y: pos.row * ROW_GAP },
        data: { permit, onOpen },
        draggable: false,
      });

      (permit.requiresPermits ?? []).forEach((reqId, i) => {
        edges.push({
          id: `${reqId}->${permit.id}-${i}`,
          source: reqId,
          target: permit.id,
          type: 'smoothstep',
          animated: permit.status === 'PENDING',
          style: {
            stroke:
              permit.status === 'APPROVED'
                ? '#16a34a'
                : permit.status === 'PENDING'
                ? '#d97706'
                : '#94a3b8',
            strokeWidth: 2,
          },
        });
      });
    });

    return { nodes, edges };
  }, [permits, onOpen]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-100"
    >
      {/* Header */}
      <div className="flex items-center gap-4 border-b-4 border-black bg-white px-6 py-4">
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white">
          <FileText size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight leading-none">Permit Progression</h2>
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-40 mt-0.5">
            Interactive dependency map · click a node to file
          </p>
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {(['AVAILABLE', 'PENDING', 'APPROVED', 'REJECTED', 'LOCKED'] as PermitStatus[]).map((s) => {
            const { border, text } = statusStyle(s);
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 3, background: border }} />
                <span style={{ color: text }} className="text-[9px] font-black uppercase tracking-widest">
                  {s}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="ml-4 p-2 rounded-full hover:bg-black/5 transition-colors"
          aria-label="Close progression map"
        >
          <X size={20} />
        </button>
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        <style>{`
          @keyframes rf-pulse {
            0%, 100% { box-shadow: 0 0 0 3px #d9770655; }
            50%       { box-shadow: 0 0 0 6px #d9770622; }
          }
        `}</style>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          nodesDraggable={false}
          elementsSelectable={false}
        >
          <Background color="#cbd5e1" gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const p = permits[(n.data as PermitNodeData).permit?.id];
              return p ? statusStyle(p.status).border : '#94a3b8';
            }}
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
    </motion.div>
  );
};
