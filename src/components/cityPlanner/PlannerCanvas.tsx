import React from 'react';
import { NavigationZone, WorldPosition } from '../../types';
import { getBuildingAccessPosition } from '../../utils/buildingAccess';
import { getBuildingFootprint } from '../../utils/worldNavigation';
import { SurfaceKind, WorldSurfaceMap } from '../../utils/worldSurface';
import { AuthoredBuilding, EditorOverlayState, EditorSelection, EditorTool } from '../../editor/types';

const WORLD_SIZE = 240;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const tintForType = (type: AuthoredBuilding['type']) => {
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
      return '#2563eb';
    case 'HOME':
      return '#0f766e';
    case 'PUB':
      return '#c2410c';
    case 'HOTLINE':
      return '#9333ea';
    case 'MINE_ENTRANCE':
      return '#475569';
    default:
      return '#334155';
  }
};

const SURFACE_OVERLAY_COLORS: Record<SurfaceKind, string> = {
  GROUND: '#14532d',
  ROAD: '#475569',
  SIDEWALK: '#94a3b8',
  PARK: '#4d7c0f',
  PLAZA: '#f59e0b',
  FOUNDATION: '#dc2626',
  CLIFF: '#78350f',
};

const getTileFromPointer = (
  event: React.PointerEvent<SVGElement>,
  zoom: number
) => {
  const svg = event.currentTarget instanceof SVGSVGElement
    ? event.currentTarget
    : event.currentTarget.ownerSVGElement;
  const rect = svg?.getBoundingClientRect();
  if (!rect) {
    return { x: 0, y: 0 };
  }
  const x = clamp(Math.floor((event.clientX - rect.left) / zoom), 0, WORLD_SIZE - 1);
  const y = clamp(Math.floor((event.clientY - rect.top) / zoom), 0, WORLD_SIZE - 1);
  return { x, y };
};

const getFootprint = (building: AuthoredBuilding) =>
  getBuildingFootprint({
    id: building.id,
    name: building.name,
    type: building.type,
    pos: building.pos,
    voxels: building.voxels,
    npcId: building.npcId,
    isDiscovered: building.isDiscovered,
  }) ?? {
    minX: building.pos.x,
    maxX: building.pos.x + 1,
    minY: building.pos.y,
    maxY: building.pos.y + 1,
  };

const appendTile = (buffer: string[], x: number, y: number) => {
  buffer.push(`M${x} ${y}h1v1h-1Z`);
};

const buildSurfacePaths = (surfaceMap: WorldSurfaceMap) => {
  const byKind: Record<SurfaceKind, string[]> = {
    GROUND: [],
    ROAD: [],
    SIDEWALK: [],
    PARK: [],
    PLAZA: [],
    FOUNDATION: [],
    CLIFF: [],
  };
  const walkable: string[] = [];
  const blocked: string[] = [];

  for (const tile of surfaceMap.tiles.values()) {
    appendTile(byKind[tile.kind], tile.x, tile.y);
    appendTile(tile.walkable ? walkable : blocked, tile.x, tile.y);
  }

  return {
    byKind: Object.fromEntries(
      Object.entries(byKind).map(([kind, commands]) => [kind, commands.join(' ')])
    ) as Record<SurfaceKind, string>,
    walkable: walkable.join(' '),
    blocked: blocked.join(' '),
  };
};

type PlannerCanvasProps = {
  buildings: AuthoredBuilding[];
  zones: NavigationZone[];
  selection: EditorSelection;
  overlays: EditorOverlayState;
  tool: EditorTool;
  zoom: number;
  hoverTile: WorldPosition | null;
  dragState: { kind: 'zone'; start: WorldPosition; end: WorldPosition } | { kind: 'move'; origin: WorldPosition } | null;
  surfaceMap: WorldSurfaceMap;
  onCanvasPointerDown: (tile: WorldPosition) => void;
  onCanvasPointerMove: (tile: WorldPosition, modifiers?: { shiftKey?: boolean }) => void;
  onCanvasPointerUp: () => void;
  onBuildingPointerDown: (
    buildingId: string,
    tile: WorldPosition,
    modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
  ) => void;
  onZonePointerDown: (
    zoneId: string,
    modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
  ) => void;
};

export const PlannerCanvas: React.FC<PlannerCanvasProps> = ({
  buildings,
  zones,
  selection,
  overlays,
  tool,
  zoom,
  hoverTile,
  dragState,
  surfaceMap,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onBuildingPointerDown,
  onZonePointerDown,
}) => {
  const overlayPaths = React.useMemo(() => buildSurfacePaths(surfaceMap), [surfaceMap]);

  return (
    <svg
      width={WORLD_SIZE * zoom}
      height={WORLD_SIZE * zoom}
      viewBox={`0 0 ${WORLD_SIZE} ${WORLD_SIZE}`}
      className="rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
      onPointerDown={(event) => onCanvasPointerDown(getTileFromPointer(event, zoom))}
      onPointerMove={(event) => onCanvasPointerMove(getTileFromPointer(event, zoom), { shiftKey: event.shiftKey })}
      onPointerUp={onCanvasPointerUp}
    >
      <defs>
        <pattern id="editor-grid-10" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#182235" strokeWidth="0.35" />
        </pattern>
        <pattern id="editor-grid-1" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#243041" strokeWidth="0.08" />
        </pattern>
      </defs>

      <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="#020617" />

      {overlays.showSurface &&
        (Object.keys(SURFACE_OVERLAY_COLORS) as SurfaceKind[]).map((kind) =>
          overlayPaths.byKind[kind] ? (
            <path
              key={kind}
              d={overlayPaths.byKind[kind]}
              fill={SURFACE_OVERLAY_COLORS[kind]}
              fillOpacity={0.16}
              stroke="none"
            />
          ) : null
        )}

      {overlays.showWalkability && overlayPaths.walkable && (
        <path d={overlayPaths.walkable} fill="#22c55e" fillOpacity={0.08} stroke="none" />
      )}
      {overlays.showWalkability && overlayPaths.blocked && (
        <path d={overlayPaths.blocked} fill="#ef4444" fillOpacity={0.16} stroke="none" />
      )}

      {overlays.showWorldGrid && <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#editor-grid-10)" />}
      {overlays.showPathGrid && <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#editor-grid-1)" />}

      {zones.map((zone) => {
        const isSelected = selection.zoneIds.includes(zone.id);
        return (
          <g key={zone.id}>
            <rect
              x={zone.minX}
              y={zone.minY}
              width={zone.maxX - zone.minX + 1}
              height={zone.maxY - zone.minY + 1}
              fill={isSelected ? '#f87171aa' : overlays.showZoneOverlay ? '#dc262680' : '#dc262630'}
              stroke={isSelected ? '#fecaca' : '#fca5a5'}
              strokeWidth={isSelected ? 1.1 : 0.8}
              onPointerDown={(event) => {
                event.stopPropagation();
                onZonePointerDown(zone.id, {
                  shiftKey: event.shiftKey,
                  metaKey: event.metaKey,
                  ctrlKey: event.ctrlKey,
                });
              }}
            />
            {(isSelected || overlays.showZoneOverlay) && (
              <text
                x={zone.minX + 0.5}
                y={Math.max(zone.minY - 0.8, 1)}
                fill="#fca5a5"
                fontSize={2.4}
                className="pointer-events-none select-none"
              >
                {zone.name}
              </text>
            )}
          </g>
        );
      })}

      {buildings.map((building) => {
        const footprint = getFootprint(building);
        const access = getBuildingAccessPosition({
          id: building.id,
          name: building.name,
          type: building.type,
          pos: building.pos,
          voxels: building.voxels,
          npcId: building.npcId,
          isDiscovered: building.isDiscovered,
        });
        const isSelected = selection.buildingIds.includes(building.id);
        const fill = overlays.showTypeOverlay ? tintForType(building.type) : '#475569';

        return (
          <g key={building.id}>
            <rect
              x={footprint.minX}
              y={footprint.minY}
              width={footprint.maxX - footprint.minX + 1}
              height={footprint.maxY - footprint.minY + 1}
              rx={1}
              fill={isSelected ? '#fde68aaa' : `${fill}cc`}
              stroke={isSelected ? '#fef3c7' : '#0f172a'}
              strokeWidth={isSelected ? 1.2 : 0.8}
              onPointerDown={(event) => {
                event.stopPropagation();
                onBuildingPointerDown(building.id, getTileFromPointer(event, zoom), {
                  shiftKey: event.shiftKey,
                  metaKey: event.metaKey,
                  ctrlKey: event.ctrlKey,
                });
              }}
            />

            {overlays.showBounds && isSelected && (
              <>
                <rect
                  x={footprint.minX - 0.2}
                  y={footprint.minY - 0.2}
                  width={footprint.maxX - footprint.minX + 1.4}
                  height={footprint.maxY - footprint.minY + 1.4}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth={0.55}
                  strokeDasharray="1.2 0.8"
                />
                <text
                  x={footprint.minX}
                  y={Math.max(footprint.minY - 0.8, 1)}
                  fill="#fde68a"
                  fontSize={2.5}
                  className="pointer-events-none select-none"
                >
                  {`${building.id} [${building.pos.x},${building.pos.y}]`}
                </text>
              </>
            )}

            {(isSelected || (overlays.showTypeOverlay && zoom >= 3.5)) && (
              <text
                x={footprint.minX + 0.5}
                y={footprint.minY + 2}
                fill="#e2e8f0"
                fontSize={2.2}
                className="pointer-events-none select-none"
              >
                {isSelected ? `${building.name} (${building.type})` : building.type}
              </text>
            )}

            {overlays.showAccessPoints && (
              <>
                <line
                  x1={building.pos.x}
                  y1={building.pos.y}
                  x2={access.x}
                  y2={access.y}
                  stroke={isSelected ? '#fde68a' : '#93c5fd'}
                  strokeWidth={0.35}
                  strokeDasharray="1 0.6"
                />
                <circle
                  cx={access.x + 0.5}
                  cy={access.y + 0.5}
                  r={isSelected ? 0.75 : 0.55}
                  fill={isSelected ? '#fde68a' : '#38bdf8'}
                  stroke="#020617"
                  strokeWidth={0.2}
                />
              </>
            )}
          </g>
        );
      })}

      {dragState?.kind === 'zone' && (
        <rect
          x={Math.min(dragState.start.x, dragState.end.x)}
          y={Math.min(dragState.start.y, dragState.end.y)}
          width={Math.abs(dragState.end.x - dragState.start.x) + 1}
          height={Math.abs(dragState.end.y - dragState.start.y) + 1}
          fill="#fb718580"
          stroke="#fecdd3"
          strokeWidth={0.8}
          strokeDasharray="2 1"
        />
      )}

      {hoverTile && (
        <rect
          x={hoverTile.x}
          y={hoverTile.y}
          width={1}
          height={1}
          fill="none"
          stroke={tool === 'erase' ? '#f87171' : '#38bdf8'}
          strokeWidth={0.35}
          className="pointer-events-none"
        />
      )}
    </svg>
  );
};
