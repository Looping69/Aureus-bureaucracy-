import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { GameState } from '../types';
import { compileAuthoringScene } from '../editor/compiler';
import { EditorValidationIssue } from '../editor/types';
import { useCityPlannerEditor } from '../hooks/editor/useCityPlannerEditor';
import { PlannerCanvas } from './cityPlanner/PlannerCanvas';
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
  const errorCount = editor.issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = editor.issues.filter((issue) => issue.severity === 'warning').length;

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-white">
      <PlannerSidebar
        tool={editor.tool}
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

        <div className="min-h-0 flex-1 overflow-auto bg-[#020617] p-4">
          <PlannerCanvas
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
    </div>
  );
};
