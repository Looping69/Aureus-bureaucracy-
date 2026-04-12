import React from 'react';
import {
  AlertTriangle,
  Eraser,
  Factory,
  Home,
  Map,
  MapPin,
  MousePointer2,
  RefreshCcw,
  Save,
  Square,
  TreePine,
  Users,
  X,
} from 'lucide-react';
import { GameState, Building, NavigationZone } from '../types';
import { compileAuthoringScene } from '../editor/compiler';
import { deriveAuthoringScene } from '../editor/derive';
import { loadStoredAuthoringScene, saveStoredAuthoringScene } from '../editor/storage';
import { BUILDING_TEMPLATES, BUILDING_TEMPLATE_MAP, type BuildingTemplate } from '../editor/templates';
import { AuthoringScene, AuthoredBuilding, EditorTool, EditorValidationIssue } from '../editor/types';
import { validateAuthoringScene } from '../editor/validation';
import { getBuildingFootprint } from '../utils/worldNavigation';

interface CityPlannerProps {
  state: GameState;
  onApplyAuthoring: (world: ReturnType<typeof compileAuthoringScene>) => void;
  onClose: () => void;
}

type Selection =
  | { type: 'building'; id: string }
  | { type: 'zone'; id: string }
  | null;

type DraftZone = {
  start: { x: number; y: number };
  end: { x: number; y: number };
};

const WORLD_SIZE = 240;
const INITIAL_ZOOM = 4;
const BUILDING_GRID_SIZE = 10;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const iconForType = (type: Building['type']) => {
  switch (type) {
    case 'HOME':
      return <Home size={16} />;
    case 'OFFICE':
    case 'HOTLINE':
      return <MapPin size={16} />;
    case 'INDUSTRIAL':
      return <Factory size={16} />;
    case 'PARK':
      return <TreePine size={16} />;
    default:
      return <Square size={16} />;
  }
};

const tintForType = (type: Building['type']) => {
  switch (type) {
    case 'ROAD':
      return '#64748b';
    case 'SIDEWALK':
      return '#94a3b8';
    case 'PARK':
      return '#3f6212';
    case 'INDUSTRIAL':
      return '#92400e';
    case 'LANDMARK':
      return '#1d4ed8';
    case 'OFFICE':
      return '#7c3aed';
    case 'HOME':
      return '#0f766e';
    default:
      return '#334155';
  }
};

const buildRuntimeBuilding = (building: AuthoredBuilding): Building => ({
  id: building.id,
  name: building.name,
  type: building.type,
  pos: { ...building.pos },
  voxels: building.voxels,
  npcId: building.npcId,
  isDiscovered: building.isDiscovered,
});

const getAuthoredFootprint = (building: AuthoredBuilding) => {
  return getBuildingFootprint(buildRuntimeBuilding(building)) ?? {
    minX: building.pos.x,
    maxX: building.pos.x + 1,
    minY: building.pos.y,
    maxY: building.pos.y + 1,
  };
};

const normalizeZone = (draft: DraftZone): NavigationZone => ({
  id: `blocked_${Date.now()}`,
  kind: 'BLOCKED',
  name: 'Blocked Zone',
  minX: Math.min(draft.start.x, draft.end.x),
  minY: Math.min(draft.start.y, draft.end.y),
  maxX: Math.max(draft.start.x, draft.end.x),
  maxY: Math.max(draft.start.y, draft.end.y),
});

const buildBuildingId = (template: BuildingTemplate) =>
  `auth_${template.id}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const snapBuildingCoordinate = (value: number) =>
  clamp(Math.floor(value / BUILDING_GRID_SIZE) * BUILDING_GRID_SIZE + 5, 0, WORLD_SIZE - 1);

const getTileFromPointer = (
  event: React.PointerEvent<SVGSVGElement>,
  zoom: number
) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = clamp(Math.floor((event.clientX - rect.left) / zoom), 0, WORLD_SIZE - 1);
  const y = clamp(Math.floor((event.clientY - rect.top) / zoom), 0, WORLD_SIZE - 1);
  return { x, y };
};

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
  const runtimeDerivedScene = React.useMemo(() => deriveAuthoringScene(state), [state]);
  const [scene, setScene] = React.useState<AuthoringScene>(() => loadStoredAuthoringScene() ?? runtimeDerivedScene);
  const [tool, setTool] = React.useState<EditorTool>('select');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>(BUILDING_TEMPLATES[0]?.id ?? '');
  const [selection, setSelection] = React.useState<Selection>(null);
  const [draftZone, setDraftZone] = React.useState<DraftZone | null>(null);
  const [zoom, setZoom] = React.useState(INITIAL_ZOOM);
  const [issues, setIssues] = React.useState<EditorValidationIssue[]>([]);

  const selectedTemplate = BUILDING_TEMPLATE_MAP.get(selectedTemplateId) ?? BUILDING_TEMPLATES[0];
  const compiledWorld = React.useMemo(() => compileAuthoringScene(scene, state.npcs), [scene, state.npcs]);
  const buildingOptions = React.useMemo(
    () => scene.buildings.map((building) => ({ id: building.id, name: building.name })),
    [scene.buildings]
  );

  React.useEffect(() => {
    setIssues(validateAuthoringScene(scene, state.npcs));
  }, [scene, state.npcs]);

  const selectedBuilding = React.useMemo(
    () => selection?.type === 'building'
      ? scene.buildings.find((building) => building.id === selection.id) ?? null
      : null,
    [scene.buildings, selection]
  );
  const selectedZone = React.useMemo(
    () => selection?.type === 'zone'
      ? scene.navigationZones.find((zone) => zone.id === selection.id) ?? null
      : null,
    [scene.navigationZones, selection]
  );

  const placeBuilding = (tile: { x: number; y: number }) => {
    if (!selectedTemplate) return;

    const authoredBuilding: AuthoredBuilding = {
      id: buildBuildingId(selectedTemplate),
      name: selectedTemplate.name,
      type: selectedTemplate.type,
      pos: {
        x: snapBuildingCoordinate(tile.x),
        y: snapBuildingCoordinate(tile.y),
      },
      voxels: selectedTemplate.voxels,
      npcId: 'none',
      isDiscovered: true,
      templateId: selectedTemplate.id,
    };

    setScene((prev) => ({
      ...prev,
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      buildings: [...prev.buildings, authoredBuilding],
    }));
    setSelection({ type: 'building', id: authoredBuilding.id });
  };

  const removeAtSelection = (target: Selection) => {
    if (!target) return;

    setScene((prev) => {
      if (target.type === 'building') {
        const building = prev.buildings.find((entry) => entry.id === target.id);
        if (!building || building.isProtected) return prev;

        return {
          ...prev,
          meta: { ...prev.meta, updatedAt: new Date().toISOString() },
          buildings: prev.buildings.filter((entry) => entry.id !== target.id),
          npcBindings: prev.npcBindings.map((binding) => ({
            ...binding,
            homeBuildingId: binding.homeBuildingId === target.id ? undefined : binding.homeBuildingId,
            workBuildingId: binding.workBuildingId === target.id ? undefined : binding.workBuildingId,
          })),
        };
      }

      return {
        ...prev,
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
        navigationZones: prev.navigationZones.filter((entry) => entry.id !== target.id),
      };
    });
    setSelection(null);
  };

  const applyScene = () => {
    const nextIssues = validateAuthoringScene(scene, state.npcs);
    setIssues(nextIssues);
    if (nextIssues.some((issue) => issue.severity === 'error')) {
      return;
    }

    const persistedScene: AuthoringScene = {
      ...scene,
      meta: {
        ...scene.meta,
        updatedAt: new Date().toISOString(),
      },
    };

    saveStoredAuthoringScene(persistedScene);
    onApplyAuthoring(compileAuthoringScene(persistedScene, state.npcs));
    onClose();
  };

  const handleCanvasPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const tile = getTileFromPointer(event, zoom);

    if (tool === 'place-building') {
      placeBuilding(tile);
      return;
    }

    if (tool === 'draw-blocked-zone') {
      setDraftZone({ start: tile, end: tile });
      setSelection(null);
      return;
    }

    if (tool === 'select') {
      setSelection(null);
    }
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draftZone) return;
    const tile = getTileFromPointer(event, zoom);
    setDraftZone((prev) => (prev ? { ...prev, end: tile } : prev));
  };

  const handleCanvasPointerUp = () => {
    if (!draftZone) return;
    const zone = normalizeZone(draftZone);
    setScene((prev) => ({
      ...prev,
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      navigationZones: [...prev.navigationZones, zone],
    }));
    setSelection({ type: 'zone', id: zone.id });
    setDraftZone(null);
  };

  const updateBuilding = (buildingId: string, patch: Partial<AuthoredBuilding>) => {
    setScene((prev) => ({
      ...prev,
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      buildings: prev.buildings.map((building) =>
        building.id === buildingId ? { ...building, ...patch } : building
      ),
    }));
  };

  const updateZone = (zoneId: string, patch: Partial<NavigationZone>) => {
    setScene((prev) => ({
      ...prev,
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      navigationZones: prev.navigationZones.map((zone) =>
        zone.id === zoneId ? { ...zone, ...patch } : zone
      ),
    }));
  };

  const updateNpcBinding = (npcId: string, field: 'homeBuildingId' | 'workBuildingId', value: string) => {
    setScene((prev) => {
      const existing = prev.npcBindings.find((binding) => binding.npcId === npcId);
      const nextBinding = {
        npcId,
        homeBuildingId: existing?.homeBuildingId,
        workBuildingId: existing?.workBuildingId,
        [field]: value || undefined,
      };

      return {
        ...prev,
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
        npcBindings: existing
          ? prev.npcBindings.map((binding) => (binding.npcId === npcId ? nextBinding : binding))
          : [...prev.npcBindings, nextBinding],
      };
    });
  };

  const resetFromRuntime = () => {
    setScene(deriveAuthoringScene(state));
    setSelection(null);
    setDraftZone(null);
  };

  const loadSavedBlueprint = () => {
    const stored = loadStoredAuthoringScene();
    if (!stored) return;
    setScene(stored);
    setSelection(null);
    setDraftZone(null);
  };

  const activeBuildingIssues = selectedBuilding
    ? issues.filter((issue) => issue.targetType === 'building' && issue.targetId === selectedBuilding.id)
    : [];
  const activeZoneIssues = selectedZone
    ? issues.filter((issue) => issue.targetType === 'zone' && issue.targetId === selectedZone.id)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-white">
      <aside className="w-80 shrink-0 border-r border-white/10 bg-slate-900/80 p-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Authoring Layer</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">World Builder</h1>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {([
            { id: 'select', label: 'Select', icon: <MousePointer2 size={14} /> },
            { id: 'place-building', label: 'Building', icon: <Map size={14} /> },
            { id: 'draw-blocked-zone', label: 'Blocked', icon: <Square size={14} /> },
            { id: 'erase', label: 'Erase', icon: <Eraser size={14} /> },
          ] satisfies { id: EditorTool; label: string; icon: React.ReactNode }[]).map((entry) => (
            <button
              key={entry.id}
              onClick={() => setTool(entry.id)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                tool === entry.id
                  ? 'border-blue-400/60 bg-blue-500/20 text-blue-50'
                  : 'border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">{entry.icon}{entry.label}</span>
            </button>
          ))}
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
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-white/10 bg-slate-900 p-2 text-slate-100">
                    {iconForType(template.type)}
                  </div>
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{template.type}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Blueprint Actions</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {issues.filter((issue) => issue.severity === 'error').length} errors
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            <button
              onClick={applyScene}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <span className="flex items-center gap-2"><Save size={14} /> Save And Apply</span>
            </button>
            <button
              onClick={() => setIssues(validateAuthoringScene(scene, state.npcs))}
              className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              <span className="flex items-center gap-2"><AlertTriangle size={14} /> Re-run Validation</span>
            </button>
            <button
              onClick={loadSavedBlueprint}
              className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              Load Stored Blueprint
            </button>
            <button
              onClick={resetFromRuntime}
              className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              <span className="flex items-center gap-2"><RefreshCcw size={14} /> Reset From Runtime</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/40 px-5 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Overhead View</div>
            <div className="text-sm text-slate-200">
              Buildings snap to 10-unit cells. Blocked zones author pathing limits directly.
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            Zoom
            <input
              type="range"
              min={2}
              max={8}
              step={0.5}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#020617] p-4">
          <svg
            width={WORLD_SIZE * zoom}
            height={WORLD_SIZE * zoom}
            viewBox={`0 0 ${WORLD_SIZE} ${WORLD_SIZE}`}
            className="rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
          >
            <defs>
              <pattern id="editor-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#182235" strokeWidth="0.35" />
              </pattern>
            </defs>
            <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#editor-grid)" />

            {scene.navigationZones.map((zone) => (
              <rect
                key={zone.id}
                x={zone.minX}
                y={zone.minY}
                width={zone.maxX - zone.minX + 1}
                height={zone.maxY - zone.minY + 1}
                fill={selection?.type === 'zone' && selection.id === zone.id ? '#f87171aa' : '#dc262680'}
                stroke={selection?.type === 'zone' && selection.id === zone.id ? '#fecaca' : '#fca5a5'}
                strokeWidth={0.8}
                onClick={(event) => {
                  event.stopPropagation();
                  if (tool === 'erase') {
                    removeAtSelection({ type: 'zone', id: zone.id });
                    return;
                  }
                  setSelection({ type: 'zone', id: zone.id });
                  setTool('select');
                }}
              />
            ))}

            {scene.buildings.map((building) => {
              const footprint = getAuthoredFootprint(building);
              const isSelected = selection?.type === 'building' && selection.id === building.id;
              return (
                <rect
                  key={building.id}
                  x={footprint.minX}
                  y={footprint.minY}
                  width={footprint.maxX - footprint.minX + 1}
                  height={footprint.maxY - footprint.minY + 1}
                  rx={1}
                  fill={isSelected ? '#fde68aaa' : `${tintForType(building.type)}dd`}
                  stroke={isSelected ? '#fef3c7' : '#0f172a'}
                  strokeWidth={0.8}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (tool === 'erase') {
                      removeAtSelection({ type: 'building', id: building.id });
                      return;
                    }
                    setSelection({ type: 'building', id: building.id });
                    setTool('select');
                  }}
                />
              );
            })}

            {draftZone && (
              <rect
                x={Math.min(draftZone.start.x, draftZone.end.x)}
                y={Math.min(draftZone.start.y, draftZone.end.y)}
                width={Math.abs(draftZone.end.x - draftZone.start.x) + 1}
                height={Math.abs(draftZone.end.y - draftZone.start.y) + 1}
                fill="#fb718580"
                stroke="#fecdd3"
                strokeWidth={0.8}
                strokeDasharray="2 1"
              />
            )}
          </svg>
        </div>
      </main>

      <aside className="w-[26rem] shrink-0 border-l border-white/10 bg-slate-900/80 p-5 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Inspector</div>

        {selectedBuilding ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{selectedBuilding.name}</div>
              {selectedBuilding.isProtected && (
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-100">
                  protected
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-400">Name</span>
                <input
                  value={selectedBuilding.name}
                  onChange={(event) => updateBuilding(selectedBuilding.id, { name: event.target.value })}
                  className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-slate-400">X</span>
                  <input
                    type="number"
                    value={selectedBuilding.pos.x}
                    onChange={(event) => updateBuilding(selectedBuilding.id, {
                      pos: {
                        ...selectedBuilding.pos,
                        x: clamp(Number(event.target.value), 0, WORLD_SIZE - 1),
                      },
                    })}
                    className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-slate-400">Y</span>
                  <input
                    type="number"
                    value={selectedBuilding.pos.y}
                    onChange={(event) => updateBuilding(selectedBuilding.id, {
                      pos: {
                        ...selectedBuilding.pos,
                        y: clamp(Number(event.target.value), 0, WORLD_SIZE - 1),
                      },
                    })}
                    className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-400">Occupant NPC</span>
                <select
                  value={selectedBuilding.npcId}
                  onChange={(event) => updateBuilding(selectedBuilding.id, { npcId: event.target.value })}
                  className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
                >
                  <option value="none">None</option>
                  {Object.values(state.npcs).map((npc) => (
                    <option key={npc.id} value={npc.id}>{npc.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {activeBuildingIssues.length > 0 && (
              <div className="mt-4 grid gap-2">
                {activeBuildingIssues.map((issue) => <IssueBadge key={issue.id} issue={issue} />)}
              </div>
            )}
          </div>
        ) : selectedZone ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <div className="text-lg font-semibold">{selectedZone.name}</div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-400">Name</span>
                <input
                  value={selectedZone.name}
                  onChange={(event) => updateZone(selectedZone.id, { name: event.target.value })}
                  className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['minX', 'minY', 'maxX', 'maxY'] as const).map((field) => (
                  <label key={field} className="grid gap-1 text-sm">
                    <span className="text-slate-400">{field}</span>
                    <input
                      type="number"
                      value={selectedZone[field]}
                      onChange={(event) => updateZone(selectedZone.id, {
                        [field]: clamp(Number(event.target.value), 0, WORLD_SIZE - 1),
                      })}
                      className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
                    />
                  </label>
                ))}
              </div>
            </div>

            {activeZoneIssues.length > 0 && (
              <div className="mt-4 grid gap-2">
                {activeZoneIssues.map((issue) => <IssueBadge key={issue.id} issue={issue} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-sm text-slate-400">
            Select a building or blocked zone to edit its properties.
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
            <Users size={12} /> NPC Assignments
          </div>
          <div className="mt-3 grid gap-3">
            {Object.values(compiledWorld.npcs).map((npc) => {
              const binding = scene.npcBindings.find((entry) => entry.npcId === npc.id);
              return (
                <div key={npc.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <div className="font-medium">{npc.name}</div>
                  <div className="mt-3 grid gap-2">
                    <label className="grid gap-1 text-sm">
                      <span className="text-slate-400">Home building</span>
                      <select
                        value={binding?.homeBuildingId ?? ''}
                        onChange={(event) => updateNpcBinding(npc.id, 'homeBuildingId', event.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
                      >
                        <option value="">Unassigned</option>
                        {buildingOptions.map((building) => (
                          <option key={building.id} value={building.id}>{building.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-slate-400">Work building</span>
                      <select
                        value={binding?.workBuildingId ?? ''}
                        onChange={(event) => updateNpcBinding(npc.id, 'workBuildingId', event.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
                      >
                        <option value="">Unassigned</option>
                        {buildingOptions.map((building) => (
                          <option key={building.id} value={building.id}>{building.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Validation</div>
          <div className="mt-3 grid gap-2">
            {issues.length > 0 ? (
              issues.map((issue) => <IssueBadge key={issue.id} issue={issue} />)
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                No validation issues. The authored world is coherent enough to apply.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
