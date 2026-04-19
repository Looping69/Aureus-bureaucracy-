import React from 'react';
import { Info, Layers3, Users } from 'lucide-react';
import { GameState, NPC, NavigationZone } from '../../types';
import { BUILDING_TEMPLATES } from '../../editor/templates';
import { AuthoredBuilding, EditorValidationIssue } from '../../editor/types';
import { getBuildingAccessPosition } from '../../utils/buildingAccess';
import { getWorldSurfaceTile, WorldSurfaceMap } from '../../utils/worldSurface';
import { WORLD_SIZE } from '../../utils/voxelConstants';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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

type PlannerInspectorProps = {
  state: GameState;
  compiledNpcs: Record<string, NPC>;
  surfaceMap: WorldSurfaceMap;
  activeBuilding: AuthoredBuilding | null;
  activeZone: NavigationZone | null;
  selectedBuildings: AuthoredBuilding[];
  selectedBuildingIssues: EditorValidationIssue[];
  selectedZoneIssues: EditorValidationIssue[];
  buildingOptions: Array<{ id: string; name: string }>;
  onUpdateBuilding: (buildingId: string, patch: Partial<AuthoredBuilding>) => void;
  onUpdateZone: (zoneId: string, patch: Partial<NavigationZone>) => void;
  onUpdateNpcBinding: (npcId: string, field: 'homeBuildingId' | 'workBuildingId', value: string) => void;
  onApplyTemplateToSelection: (templateId: string) => void;
  onSetSelectionDiscovery: (isDiscovered: boolean) => void;
  onRestoreSelectionFromRuntime: () => void;
  onClearAllZones: () => void;
  selectionLabel: string;
};

export const PlannerInspector: React.FC<PlannerInspectorProps> = ({
  state,
  compiledNpcs,
  surfaceMap,
  activeBuilding,
  activeZone,
  selectedBuildings,
  selectedBuildingIssues,
  selectedZoneIssues,
  buildingOptions,
  onUpdateBuilding,
  onUpdateZone,
  onUpdateNpcBinding,
  onApplyTemplateToSelection,
  onSetSelectionDiscovery,
  onRestoreSelectionFromRuntime,
  onClearAllZones,
  selectionLabel,
}) => {
  const accessTile = activeBuilding
    ? (() => {
        const access = getBuildingAccessPosition({
          id: activeBuilding.id,
          name: activeBuilding.name,
          type: activeBuilding.type,
          pos: activeBuilding.pos,
          voxels: activeBuilding.voxels,
          npcId: activeBuilding.npcId,
          isDiscovered: activeBuilding.isDiscovered,
        });
        return {
          access,
          tile: getWorldSurfaceTile(surfaceMap, access.x, access.y),
        };
      })()
    : null;

  const linkedNpcs = activeBuilding
    ? Object.values(compiledNpcs).filter(
        (npc) => npc.homeBuildingId === activeBuilding.id || npc.workBuildingId === activeBuilding.id
      )
    : [];

  return (
    <aside className="w-[28rem] shrink-0 border-l border-white/10 bg-slate-900/80 p-5 overflow-y-auto">
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Inspector</div>
      <div className="mt-2 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Selection</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{selectionLabel}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => onSetSelectionDiscovery(true)} className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
            Mark discovered
          </button>
          <button onClick={() => onSetSelectionDiscovery(false)} className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
            Mark hidden
          </button>
          <button onClick={onRestoreSelectionFromRuntime} className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
            Reset selected from runtime
          </button>
          <button onClick={onClearAllZones} className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
            Reset blocked zones
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          <label className="grid gap-1 text-sm">
            <span className="text-slate-400">Replace selected buildings with template</span>
            <select
              onChange={(event) => event.target.value && onApplyTemplateToSelection(event.target.value)}
              defaultValue=""
              className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
            >
              <option value="">Choose template</option>
              {BUILDING_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {selectedBuildings.length > 1 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers3 size={14} />
            Bulk State
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div className="rounded-xl border border-white/10 bg-slate-800/80 p-3">
              <div className="text-slate-500">Count</div>
              <div className="mt-1 text-lg font-semibold">{selectedBuildings.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-800/80 p-3">
              <div className="text-slate-500">Types</div>
              <div className="mt-1 text-lg font-semibold">
                {new Set(selectedBuildings.map((building) => building.type)).size}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeBuilding ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{activeBuilding.name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {activeBuilding.type} / {activeBuilding.id}
              </div>
            </div>
            {activeBuilding.isProtected && (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-100">
                protected
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-slate-400">Name</span>
              <input
                value={activeBuilding.name}
                onChange={(event) => onUpdateBuilding(activeBuilding.id, { name: event.target.value })}
                className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-400">X</span>
                <input
                  type="number"
                  value={activeBuilding.pos.x}
                  onChange={(event) => onUpdateBuilding(activeBuilding.id, {
                    pos: {
                      ...activeBuilding.pos,
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
                  value={activeBuilding.pos.y}
                  onChange={(event) => onUpdateBuilding(activeBuilding.id, {
                    pos: {
                      ...activeBuilding.pos,
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
                value={activeBuilding.npcId}
                onChange={(event) => onUpdateBuilding(activeBuilding.id, { npcId: event.target.value })}
                className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
              >
                <option value="none">None</option>
                {Object.values(state.npcs).map((npc) => (
                  <option key={npc.id} value={npc.id}>{npc.name}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm">
              <span>Discovered</span>
              <input
                type="checkbox"
                checked={activeBuilding.isDiscovered}
                onChange={(event) => onUpdateBuilding(activeBuilding.id, { isDiscovered: event.target.checked })}
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-slate-800/70 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-100">
              <Info size={14} />
              Runtime attachment
            </div>
            <div className="mt-2 grid gap-1 text-slate-300">
              <div>Template: {activeBuilding.templateId ?? 'custom/runtime'}</div>
              <div>NPC occupant: {activeBuilding.npcId === 'none' ? 'none' : state.npcs[activeBuilding.npcId]?.name ?? activeBuilding.npcId}</div>
              <div>Linked NPC refs: {linkedNpcs.length > 0 ? linkedNpcs.map((npc) => npc.name).join(', ') : 'none'}</div>
              <div>
                Access tile: {accessTile ? `${accessTile.access.x}, ${accessTile.access.y}` : 'n/a'} /{' '}
                {accessTile?.tile?.walkable ? 'walkable' : 'blocked'}
              </div>
              <div>Surface kind: {accessTile?.tile?.kind ?? 'unknown'}</div>
            </div>
          </div>

          {selectedBuildingIssues.length > 0 && (
            <div className="mt-4 grid gap-2">
              {selectedBuildingIssues.map((issue) => <IssueBadge key={issue.id} issue={issue} />)}
            </div>
          )}
        </div>
      ) : activeZone ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="text-lg font-semibold">{activeZone.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">{activeZone.id}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(['minX', 'minY', 'maxX', 'maxY'] as const).map((field) => (
              <label key={field} className="grid gap-1 text-sm">
                <span className="text-slate-400">{field}</span>
                <input
                  type="number"
                  value={activeZone[field]}
                  onChange={(event) => onUpdateZone(activeZone.id, {
                    [field]: clamp(Number(event.target.value), 0, WORLD_SIZE - 1),
                  })}
                  className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-800/70 p-3 text-sm text-slate-300">
            Area: {(activeZone.maxX - activeZone.minX + 1) * (activeZone.maxY - activeZone.minY + 1)} blocked tiles
          </div>
          {selectedZoneIssues.length > 0 && (
            <div className="mt-4 grid gap-2">
              {selectedZoneIssues.map((issue) => <IssueBadge key={issue.id} issue={issue} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-sm text-slate-400">
          Select a building or blocked zone to inspect exact state, bindings, and validation.
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
          <Users size={12} /> NPC Assignments
        </div>
        <div className="mt-3 grid gap-3">
          {Object.values(state.npcs).map((npc) => (
            <div key={npc.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="font-medium">{npc.name}</div>
              <div className="mt-1 text-xs text-slate-500">{npc.role}</div>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-slate-400">Home building</span>
                  <select
                    value={compiledNpcs[npc.id]?.homeBuildingId ?? ''}
                    onChange={(event) => onUpdateNpcBinding(npc.id, 'homeBuildingId', event.target.value)}
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
                    value={compiledNpcs[npc.id]?.workBuildingId ?? ''}
                    onChange={(event) => onUpdateNpcBinding(npc.id, 'workBuildingId', event.target.value)}
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
          ))}
        </div>
      </div>
    </aside>
  );
};
