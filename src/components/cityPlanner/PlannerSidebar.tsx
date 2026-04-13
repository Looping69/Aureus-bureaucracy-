import React from 'react';
import {
  AlertTriangle,
  Copy,
  Eraser,
  ImageDown,
  Grid2X2,
  Map,
  MousePointer2,
  Move,
  PanelsTopLeft,
  Redo2,
  RefreshCcw,
  Save,
  Square,
  Undo2,
  FileJson,
} from 'lucide-react';
import { BUILDING_TEMPLATES } from '../../editor/templates';
import { EditorOverlayState, EditorTool, EditorViewportMode } from '../../editor/types';

type PlannerSidebarProps = {
  tool: EditorTool;
  viewportMode: EditorViewportMode;
  setViewportMode: (mode: EditorViewportMode) => void;
  selectedTemplateId: string;
  setSelectedTemplateId: (templateId: string) => void;
  setTool: (tool: EditorTool) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  snapToGrid: boolean;
  setSnapToGrid: (value: boolean) => void;
  snapStep: number;
  setSnapStep: (value: number) => void;
  overlays: EditorOverlayState;
  toggleOverlay: (key: keyof EditorOverlayState) => void;
  errorCount: number;
  warningCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onApplyScene: () => void;
  onLoadSavedBlueprint: () => void;
  onResetFromRuntime: () => void;
  onDuplicateSelection: () => void;
  onExportViewport: () => void;
  onExportBlueprint: () => void;
};

const TOOL_OPTIONS: Array<{ id: EditorTool; label: string; icon: React.ReactNode; shortcut: string }> = [
  { id: 'select', label: 'Select', icon: <MousePointer2 size={14} />, shortcut: 'V' },
  { id: 'move', label: 'Move', icon: <Move size={14} />, shortcut: 'M' },
  { id: 'place-building', label: 'Place', icon: <Map size={14} />, shortcut: 'B' },
  { id: 'draw-blocked-zone', label: 'Blocked', icon: <Square size={14} />, shortcut: 'Z' },
  { id: 'erase', label: 'Erase', icon: <Eraser size={14} />, shortcut: 'E' },
];

const OVERLAY_OPTIONS: Array<{ key: keyof EditorOverlayState; label: string }> = [
  { key: 'showWorldGrid', label: 'World grid' },
  { key: 'showPathGrid', label: 'Path grid' },
  { key: 'showSurface', label: 'Surface map' },
  { key: 'showWalkability', label: 'Walkability' },
  { key: 'showAccessPoints', label: 'Access points' },
  { key: 'showTypeOverlay', label: 'Building types' },
  { key: 'showZoneOverlay', label: 'Zones' },
  { key: 'showBounds', label: 'Bounds' },
];

const VIEWPORT_OPTIONS: Array<{ id: EditorViewportMode; label: string }> = [
  { id: 'screen', label: 'Screen' },
  { id: '2d', label: '2D' },
  { id: '3d', label: '3D' },
];

export const PlannerSidebar: React.FC<PlannerSidebarProps> = ({
  tool,
  viewportMode,
  setViewportMode,
  selectedTemplateId,
  setSelectedTemplateId,
  setTool,
  zoom,
  setZoom,
  snapToGrid,
  setSnapToGrid,
  snapStep,
  setSnapStep,
  overlays,
  toggleOverlay,
  errorCount,
  warningCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onApplyScene,
  onLoadSavedBlueprint,
  onResetFromRuntime,
  onDuplicateSelection,
  onExportViewport,
  onExportBlueprint,
}) => (
  <aside className="w-80 shrink-0 border-r border-white/10 bg-slate-900/80 p-5 overflow-y-auto">
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Authoring Layer</div>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">World Builder</h1>
      <p className="mt-2 text-sm text-slate-400">
        Precise world-state editing with validation, overlays, and history.
      </p>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-2">
      {TOOL_OPTIONS.map((entry) => (
        <button
          key={entry.id}
          onClick={() => setTool(entry.id)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium ${
            tool === entry.id
              ? 'border-blue-400/60 bg-blue-500/20 text-blue-50'
              : 'border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">{entry.icon}{entry.label}</span>
            <span className="text-[10px] uppercase text-slate-500">{entry.shortcut}</span>
          </span>
        </button>
      ))}
    </div>

    <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <PanelsTopLeft size={14} />
        Viewport Mode
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {VIEWPORT_OPTIONS.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setViewportMode(entry.id)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
              viewportMode === entry.id
                ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-50'
                : 'border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        `Screen` is the presentation preview, `2D` is exact top-down planning, `3D` is the full workspace.
      </p>
    </div>

    <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Grid2X2 size={14} />
        Precision
      </div>
      <div className="mt-3 grid gap-3 text-sm">
        <label className="flex items-center justify-between gap-3">
          <span className="text-slate-300">Snap to grid</span>
          <input type="checkbox" checked={snapToGrid} onChange={(event) => setSnapToGrid(event.target.checked)} />
        </label>
        <label className="grid gap-1">
          <span className="text-slate-400">Snap step</span>
          <select
            value={snapStep}
            onChange={(event) => setSnapStep(Number(event.target.value))}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
          >
            {[1, 5, 10, 20].map((step) => (
              <option key={step} value={step}>{step} units</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-slate-400">Zoom</span>
          <input type="range" min={2} max={8} step={0.5} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </label>
      </div>
    </div>

    <div className="mt-6">
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Building Palette</div>
      <div className="mt-3 grid gap-2">
        {BUILDING_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              setSelectedTemplateId(template.id);
              setTool('place-building');
            }}
            className={`rounded-xl border px-3 py-3 text-left ${
              selectedTemplateId === template.id
                ? 'border-emerald-400/60 bg-emerald-500/10'
                : 'border-white/10 bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <div className="font-medium">{template.name}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">{template.type}</div>
          </button>
        ))}
      </div>
    </div>

    <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">System Visibility</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">debug</div>
      </div>
      <div className="mt-3 grid gap-2">
        {OVERLAY_OPTIONS.map((overlay) => (
          <label key={overlay.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-800/70 px-3 py-2 text-sm">
            <span>{overlay.label}</span>
            <input type="checkbox" checked={overlays[overlay.key]} onChange={() => toggleOverlay(overlay.key)} />
          </label>
        ))}
      </div>
    </div>

    <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Blueprint Actions</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {errorCount} errors / {warningCount} warnings
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        <button
          onClick={onApplyScene}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          <span className="flex items-center gap-2"><Save size={14} /> Save And Apply</span>
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          >
            <span className="flex items-center gap-2"><Undo2 size={14} /> Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          >
            <span className="flex items-center gap-2"><Redo2 size={14} /> Redo</span>
          </button>
        </div>
        <button
          onClick={onDuplicateSelection}
          className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          <span className="flex items-center gap-2"><Copy size={14} /> Duplicate Selection</span>
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportViewport}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            <span className="flex items-center gap-2"><ImageDown size={14} /> Export PNG</span>
          </button>
          <button
            onClick={onExportBlueprint}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            <span className="flex items-center gap-2"><FileJson size={14} /> Export JSON</span>
          </button>
        </div>
        <button
          onClick={onLoadSavedBlueprint}
          className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          Load Stored Blueprint
        </button>
        <button
          onClick={onResetFromRuntime}
          className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          <span className="flex items-center gap-2"><RefreshCcw size={14} /> Reset From Runtime</span>
        </button>
      </div>
      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
        <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.16em]">
          <AlertTriangle size={12} />
          Shortcuts
        </div>
        <div className="mt-2 leading-relaxed text-amber-50/90">
          <div>`V` select, `M` move, `B` place, `E` erase</div>
          <div>Arrows nudge selection, `Shift` for fine 1-unit moves</div>
          <div>`Ctrl/Cmd+D` duplicate, `Delete` remove, `Ctrl/Cmd+Z` undo</div>
        </div>
      </div>
    </div>
  </aside>
);
