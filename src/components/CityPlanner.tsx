import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { GameState } from '../types';
import { compileAuthoringScene } from '../editor/compiler';
import { EditorValidationIssue, EditorViewportMode } from '../editor/types';
import { useCityPlannerEditor } from '../hooks/editor/useCityPlannerEditor';
import { PlannerCanvas, PlannerCanvasHandle } from './cityPlanner/PlannerCanvas';
import { PlannerInspector } from './cityPlanner/PlannerInspector';
import { PlannerSidebar } from './cityPlanner/PlannerSidebar';

interface CityPlannerProps {
  state: GameState;
  onApplyAuthoring: (world: ReturnType<typeof compileAuthoringScene>) => void;
  onClose: () => void;
}

const IssueBadge = ({ issue }: { issue: EditorValidationIssue }) => (
  <div
    className={`rounded-xl border p-3 text-xs ${
      issue.severity === 'error'
        ? 'border-red-500/30 bg-red-500/10 text-red-100'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
    }`}
  >
    <div className="font-semibold uppercase tracking-[0.16em] text-[10px]">{issue.severity}</div>
    <div className="mt-1 text-sm leading-snug">{issue.message}</div>
  </div>
);

export const CityPlanner: React.FC<CityPlannerProps> = ({ state, onApplyAuthoring, onClose }) => {
  const editor = useCityPlannerEditor(state, onApplyAuthoring, onClose);
  const canvasRef = React.useRef<PlannerCanvasHandle | null>(null);
  const [viewportMode, setViewportMode] = React.useState<EditorViewportMode>('screen');
  const [showBootCurtain, setShowBootCurtain] = React.useState(true);
  const errorCount = editor.issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = editor.issues.filter((issue) => issue.severity === 'warning').length;

  React.useEffect(() => {
    const timer = window.setTimeout(() => setShowBootCurtain(false), 950);
    return () => window.clearTimeout(timer);
  }, []);

  const downloadBlob = React.useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const handleExportViewport = React.useCallback(async () => {
    const exported = await canvasRef.current?.exportViewportPng();
    if (!exported) {
      window.alert('Viewport export failed. Try again after the editor finishes rendering.');
    }
  }, []);

  const handleExportBlueprint = React.useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      viewportMode,
      authoredScene: editor.scene,
      compiledWorld: editor.compiledWorld,
      issues: editor.issues,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `aureus-editor-blueprint-${viewportMode}.json`);
  }, [downloadBlob, editor.compiledWorld, editor.issues, editor.scene, viewportMode]);

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-white">
      <PlannerSidebar
        tool={editor.tool}
        viewportMode={viewportMode}
        setViewportMode={setViewportMode}
        selectedTemplateId={editor.selectedTemplateId}
        setSelectedTemplateId={editor.setSelectedTemplateId}
        setTool={editor.setTool}
        zoom={editor.zoom}
        setZoom={editor.setZoom}
        snapToGrid={editor.snapToGrid}
        setSnapToGrid={editor.setSnapToGrid}
        snapStep={editor.snapStep}
        setSnapStep={editor.setSnapStep}
        overlays={editor.overlays}
        toggleOverlay={editor.toggleOverlay}
        errorCount={errorCount}
        warningCount={warningCount}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onApplyScene={editor.applyScene}
        onLoadSavedBlueprint={editor.loadSavedBlueprint}
        onResetFromRuntime={editor.resetFromRuntime}
        onDuplicateSelection={editor.duplicateSelection}
        onExportViewport={handleExportViewport}
        onExportBlueprint={handleExportBlueprint}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/40 px-5 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Developer World Editor</div>
            <div className="mt-1 text-sm text-slate-200">
              Hover: {editor.hoverTile ? `${editor.hoverTile.x}, ${editor.hoverTile.y}` : 'off canvas'}
              {editor.activeTileInfo ? ` / ${editor.activeTileInfo.kind} / ${editor.activeTileInfo.walkable ? 'walkable' : 'blocked'}` : ''}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Selection: {editor.selectionLabel} / snap {editor.snapToGrid ? `on (${editor.snapStep})` : 'off'} / fine step {editor.fineStep}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
              {viewportMode} view
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
              {errorCount} errors / {warningCount} warnings
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
              aria-label="Close world editor"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-[#020617] p-4">
          <PlannerCanvas
            ref={canvasRef}
            mode={viewportMode}
            buildings={editor.displayBuildings}
            zones={editor.scene.navigationZones}
            selection={editor.selection}
            overlays={editor.overlays}
            tool={editor.tool}
            zoom={editor.zoom}
            hoverTile={editor.hoverTile}
            dragState={editor.dragState}
            surfaceMap={editor.surfaceMap}
            onCanvasPointerDown={editor.handleCanvasPointerDown}
            onCanvasPointerMove={editor.handleCanvasPointerMove}
            onCanvasPointerUp={editor.handleCanvasPointerUp}
            onCanvasPointerLeave={() => editor.setHoverTile(null)}
            onBuildingPointerDown={editor.handleBuildingPointerDown}
            onZonePointerDown={editor.handleZonePointerDown}
          />
        </div>

        <div className="border-t border-white/10 bg-slate-950/80 px-5 py-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
            <AlertTriangle size={12} />
            Validation
          </div>
          <div className="mt-3 grid max-h-44 gap-2 overflow-auto md:grid-cols-2">
            {editor.issues.length > 0 ? (
              editor.issues.map((issue) => <IssueBadge key={issue.id} issue={issue} />)
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                No validation issues. The authored world is coherent enough to apply.
              </div>
            )}
          </div>
        </div>
      </main>

      <PlannerInspector
        state={state}
        compiledNpcs={editor.compiledWorld.npcs}
        surfaceMap={editor.surfaceMap}
        activeBuilding={editor.activeBuilding}
        activeZone={editor.activeZone}
        selectedBuildings={editor.selectedBuildings}
        selectedBuildingIssues={editor.selectedBuildingIssues}
        selectedZoneIssues={editor.selectedZoneIssues}
        buildingOptions={editor.buildingOptions}
        onUpdateBuilding={editor.updateBuilding}
        onUpdateZone={editor.updateZone}
        onUpdateNpcBinding={editor.updateNpcBinding}
        onApplyTemplateToSelection={editor.applyTemplateToSelection}
        onSetSelectionDiscovery={editor.setSelectionDiscovery}
        onRestoreSelectionFromRuntime={editor.restoreSelectionFromRuntime}
        onClearAllZones={editor.clearAllZones}
        selectionLabel={editor.selectionLabel}
      />

      <AnimatePresence>
        {showBootCurtain && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.28, ease: 'easeInOut' } }}
            className="pointer-events-none absolute inset-0 z-[70] overflow-hidden bg-[#020617]"
          >
            <motion.div
              initial={{ scaleX: 1 }}
              exit={{ scaleX: 0, transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } }}
              style={{ transformOrigin: 'left center' }}
              className="absolute inset-0 bg-[linear-gradient(90deg,#020617_0%,#071127_30%,#0b1f46_70%,#123a7a_100%)]"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16, transition: { duration: 0.18 } }}
                className="rounded-[32px] border border-cyan-400/20 bg-slate-950/80 px-8 py-7 shadow-[0_30px_90px_rgba(2,12,27,0.7)] backdrop-blur-md"
              >
                <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/70">Authoring Layer</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-white">Developer World Editor</div>
                <div className="mt-2 text-sm text-slate-300">Bypassing game boot. Bringing the workspace online.</div>
                <motion.div
                  initial={{ scaleX: 0.15 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                  style={{ transformOrigin: 'left center' }}
                  className="mt-5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-slate-200"
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
