import React from 'react';
import { GameState, NavigationZone, WorldPosition } from '../../types';
import { compileAuthoringScene } from '../../editor/compiler';
import { deriveAuthoringScene } from '../../editor/derive';
import {
  createHistoryState,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
} from '../../editor/history';
import {
  EMPTY_SELECTION,
  isSelectionEmpty,
  primaryBuildingId,
  primaryZoneId,
  selectSingleBuilding,
  selectSingleZone,
  toggleBuildingSelection,
  toggleZoneSelection,
} from '../../editor/selection';
import {
  addBuildingToScene,
  addZoneToScene,
  clearZonesInScene,
  createAuthoredBuilding,
  duplicateBuildingsInScene,
  moveBuildingsInScene,
  removeSelectionFromScene,
  replaceBuildingTemplatesInScene,
  restoreBuildingsFromScene,
  setDiscoveryStateInScene,
  updateBuildingInScene,
  updateManyBuildingsInScene,
  updateNpcBindingInScene,
  updateZoneInScene,
} from '../../editor/sceneMutations';
import { loadStoredAuthoringScene, saveStoredAuthoringScene } from '../../editor/storage';
import { BUILDING_TEMPLATES, BUILDING_TEMPLATE_MAP } from '../../editor/templates';
import {
  AuthoringScene,
  AuthoredBuilding,
  EditorOverlayState,
  EditorSelection,
  EditorTool,
} from '../../editor/types';
import { validateAuthoringScene } from '../../editor/validation';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from '../../utils/worldSurface';
import { WORLD_SIZE } from '../../utils/voxelConstants';

const INITIAL_ZOOM = 4;
const DEFAULT_SNAP_STEP = 10;
const FINE_STEP = 1;

type PointerModifiers = {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
};

type MovePreview = Record<string, WorldPosition>;

type DragState =
  | {
      kind: 'zone';
      start: WorldPosition;
      end: WorldPosition;
    }
  | {
      kind: 'move';
      origin: WorldPosition;
      basePositions: Record<string, WorldPosition>;
    }
  | null;

const DEFAULT_OVERLAYS: EditorOverlayState = {
  showWorldGrid: true,
  showPathGrid: false,
  showSurface: false,
  showWalkability: false,
  showAccessPoints: true,
  showTypeOverlay: true,
  showZoneOverlay: true,
  showBounds: true,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const snapPlacementCoordinate = (value: number, step: number) =>
  clamp(Math.floor(value / step) * step + Math.floor(step / 2), 0, WORLD_SIZE - 1);

const normalizeDraftZone = (draft: { start: WorldPosition; end: WorldPosition }): NavigationZone => ({
  id: `blocked_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
  kind: 'BLOCKED',
  name: 'Blocked Zone',
  minX: Math.min(draft.start.x, draft.end.x),
  minY: Math.min(draft.start.y, draft.end.y),
  maxX: Math.max(draft.start.x, draft.end.x),
  maxY: Math.max(draft.start.y, draft.end.y),
});

const getSelectionLabel = (selection: EditorSelection) => {
  if (selection.buildingIds.length > 0) {
    return `${selection.buildingIds.length} building${selection.buildingIds.length === 1 ? '' : 's'}`;
  }

  if (selection.zoneIds.length > 0) {
    return `${selection.zoneIds.length} zone${selection.zoneIds.length === 1 ? '' : 's'}`;
  }

  return 'nothing';
};

const quantizeDelta = (delta: number, snapStep: number, useFine: boolean) => {
  if (useFine) {
    return delta;
  }

  if (snapStep <= 1) {
    return delta;
  }

  return Math.round(delta / snapStep) * snapStep;
};

export const useCityPlannerEditor = (
  state: GameState,
  onApplyAuthoring: (world: ReturnType<typeof compileAuthoringScene>) => void,
  onClose: () => void
) => {
  const runtimeDerivedScene = React.useMemo(() => deriveAuthoringScene(state), [state]);
  const [history, setHistory] = React.useState(() =>
    createHistoryState<AuthoringScene>(loadStoredAuthoringScene() ?? runtimeDerivedScene)
  );
  const [tool, setTool] = React.useState<EditorTool>('select');
  const [selection, setSelection] = React.useState<EditorSelection>(EMPTY_SELECTION);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(BUILDING_TEMPLATES[0]?.id ?? '');
  const [zoom, setZoom] = React.useState(INITIAL_ZOOM);
  const [snapToGrid, setSnapToGrid] = React.useState(true);
  const [snapStep, setSnapStep] = React.useState(DEFAULT_SNAP_STEP);
  const [overlays, setOverlays] = React.useState<EditorOverlayState>(DEFAULT_OVERLAYS);
  const [hoverTile, setHoverTile] = React.useState<WorldPosition | null>(null);
  const [dragState, setDragState] = React.useState<DragState>(null);
  const [movePreview, setMovePreview] = React.useState<MovePreview | null>(null);

  const scene = history.present;
  const selectedTemplate = BUILDING_TEMPLATE_MAP.get(selectedTemplateId) ?? BUILDING_TEMPLATES[0];
  const compiledWorld = React.useMemo(() => compileAuthoringScene(scene, state.npcs), [scene, state.npcs]);
  const issues = React.useMemo(() => validateAuthoringScene(scene, state.npcs), [scene, state.npcs]);
  const surfaceMap = React.useMemo(
    () => buildWorldSurfaceMap(compiledWorld.buildings, WORLD_SIZE, compiledWorld.navigationZones),
    [compiledWorld.buildings, compiledWorld.navigationZones]
  );

  const displayBuildings = React.useMemo(
    () =>
      scene.buildings.map((building) => {
        const preview = movePreview?.[building.id];
        return preview ? { ...building, pos: preview } : building;
      }),
    [movePreview, scene.buildings]
  );

  const selectedBuildings = React.useMemo(
    () => displayBuildings.filter((building) => selection.buildingIds.includes(building.id)),
    [displayBuildings, selection.buildingIds]
  );
  const selectedZones = React.useMemo(
    () => scene.navigationZones.filter((zone) => selection.zoneIds.includes(zone.id)),
    [scene.navigationZones, selection.zoneIds]
  );
  const activeBuilding = React.useMemo(
    () => selectedBuildings.find((building) => building.id === primaryBuildingId(selection)) ?? null,
    [selectedBuildings, selection]
  );
  const activeZone = React.useMemo(
    () => selectedZones.find((zone) => zone.id === primaryZoneId(selection)) ?? null,
    [selectedZones, selection]
  );
  const buildingOptions = React.useMemo(
    () => scene.buildings.map((building) => ({ id: building.id, name: building.name })),
    [scene.buildings]
  );

  const commitScene = React.useCallback((recipe: (current: AuthoringScene) => AuthoringScene) => {
    setHistory((current) => {
      const next = recipe(current.present);
      return Object.is(next, current.present) ? current : pushHistoryState(current, next);
    });
  }, []);

  const clearTransientInteraction = React.useCallback(() => {
    setDragState(null);
    setMovePreview(null);
  }, []);

  const selectBuildings = React.useCallback((buildingIds: string[]) => {
    setSelection({ buildingIds, zoneIds: [] });
  }, []);

  const deleteSelection = React.useCallback(() => {
    if (isSelectionEmpty(selection)) {
      return;
    }

    const protectedCount = scene.buildings.filter(
      (building) => selection.buildingIds.includes(building.id) && building.isProtected
    ).length;
    const removableCount = selection.buildingIds.length + selection.zoneIds.length - protectedCount;

    if (removableCount <= 0) {
      window.alert('Selected items are protected and cannot be deleted.');
      return;
    }

    const message = [
      `Delete ${removableCount} selected item${removableCount === 1 ? '' : 's'}?`,
      protectedCount > 0 ? `${protectedCount} protected building${protectedCount === 1 ? ' was' : 's were'} skipped.` : null,
    ]
      .filter(Boolean)
      .join('\n');

    if (!window.confirm(message)) {
      return;
    }

    commitScene((current) => removeSelectionFromScene(current, selection));
    setSelection(EMPTY_SELECTION);
    clearTransientInteraction();
  }, [clearTransientInteraction, commitScene, scene.buildings, selection]);

  const duplicateSelection = React.useCallback(() => {
    const selectedIds = selection.buildingIds;
    if (selectedIds.length === 0) {
      return;
    }

    setHistory((current) => {
      const { scene: nextScene, duplicatedIds } = duplicateBuildingsInScene(current.present, selectedIds, {
        x: snapToGrid ? snapStep : FINE_STEP,
        y: snapToGrid ? snapStep : FINE_STEP,
      });
      if (duplicatedIds.length === 0) {
        return current;
      }

      window.setTimeout(() => setSelection({ buildingIds: duplicatedIds, zoneIds: [] }), 0);
      return pushHistoryState(current, nextScene);
    });
  }, [selection.buildingIds, snapStep, snapToGrid]);

  const placeBuilding = React.useCallback((tile: WorldPosition) => {
    if (!selectedTemplate) {
      return;
    }

    const position = snapToGrid
      ? {
          x: snapPlacementCoordinate(tile.x, snapStep),
          y: snapPlacementCoordinate(tile.y, snapStep),
        }
      : tile;

    const authoredBuilding = createAuthoredBuilding(selectedTemplate, position);
    commitScene((current) => addBuildingToScene(current, authoredBuilding));
    setSelection(selectSingleBuilding(authoredBuilding.id));
  }, [commitScene, selectedTemplate, snapStep, snapToGrid]);

  const updateBuilding = React.useCallback((buildingId: string, patch: Partial<AuthoredBuilding>) => {
    commitScene((current) => updateBuildingInScene(current, buildingId, patch));
  }, [commitScene]);

  const updateZone = React.useCallback((zoneId: string, patch: Partial<NavigationZone>) => {
    commitScene((current) => updateZoneInScene(current, zoneId, patch));
  }, [commitScene]);

  const updateNpcBinding = React.useCallback((
    npcId: string,
    field: 'homeBuildingId' | 'workBuildingId',
    value: string
  ) => {
    commitScene((current) => updateNpcBindingInScene(current, npcId, field, value));
  }, [commitScene]);

  const applyTemplateToSelection = React.useCallback((templateId: string) => {
    const template = BUILDING_TEMPLATE_MAP.get(templateId);
    if (!template || selection.buildingIds.length === 0) {
      return;
    }

    commitScene((current) => replaceBuildingTemplatesInScene(current, selection.buildingIds, template));
  }, [commitScene, selection.buildingIds]);

  const setSelectionDiscovery = React.useCallback((isDiscovered: boolean) => {
    if (selection.buildingIds.length === 0) {
      return;
    }

    commitScene((current) => setDiscoveryStateInScene(current, selection.buildingIds, isDiscovered));
  }, [commitScene, selection.buildingIds]);

  const restoreSelectionFromRuntime = React.useCallback(() => {
    if (selection.buildingIds.length === 0) {
      return;
    }

    commitScene((current) => restoreBuildingsFromScene(current, selection.buildingIds, runtimeDerivedScene));
  }, [commitScene, runtimeDerivedScene, selection.buildingIds]);

  const clearAllZones = React.useCallback(() => {
    if (scene.navigationZones.length === 0) {
      return;
    }

    if (!window.confirm(`Clear all ${scene.navigationZones.length} blocked zones?`)) {
      return;
    }

    commitScene((current) => clearZonesInScene(current));
    setSelection(EMPTY_SELECTION);
  }, [commitScene, scene.navigationZones.length]);

  const runValidation = React.useCallback(() => validateAuthoringScene(scene, state.npcs), [scene, state.npcs]);

  const applyScene = React.useCallback(() => {
    const nextIssues = runValidation();
    if (nextIssues.some((issue) => issue.severity === 'error')) {
      window.alert('Cannot apply authoring scene while validation errors remain.');
      return;
    }

    saveStoredAuthoringScene(scene);
    onApplyAuthoring(compileAuthoringScene(scene, state.npcs));
    onClose();
  }, [onApplyAuthoring, onClose, runValidation, scene, state.npcs]);

  const loadSavedBlueprint = React.useCallback(() => {
    const stored = loadStoredAuthoringScene();
    if (!stored) {
      window.alert('No stored blueprint found.');
      return;
    }

    commitScene(() => stored);
    setSelection(EMPTY_SELECTION);
    clearTransientInteraction();
  }, [clearTransientInteraction, commitScene]);

  const resetFromRuntime = React.useCallback(() => {
    if (!window.confirm('Reset the editor scene from current runtime state? Unsaved planner changes will be discarded.')) {
      return;
    }

    commitScene(() => runtimeDerivedScene);
    setSelection(EMPTY_SELECTION);
    clearTransientInteraction();
  }, [clearTransientInteraction, commitScene, runtimeDerivedScene]);

  const undo = React.useCallback(() => {
    clearTransientInteraction();
    setHistory((current) => undoHistoryState(current));
  }, [clearTransientInteraction]);

  const redo = React.useCallback(() => {
    clearTransientInteraction();
    setHistory((current) => redoHistoryState(current));
  }, [clearTransientInteraction]);

  const startMoveDrag = React.useCallback((tile: WorldPosition, buildingIds: string[]) => {
    const basePositions = Object.fromEntries(
      scene.buildings
        .filter((building) => buildingIds.includes(building.id))
        .map((building) => [building.id, building.pos])
    );

    setDragState({
      kind: 'move',
      origin: tile,
      basePositions,
    });
    setMovePreview(basePositions);
  }, [scene.buildings]);

  const handleCanvasPointerDown = React.useCallback((tile: WorldPosition) => {
    setHoverTile(tile);

    if (tool === 'place-building') {
      placeBuilding(tile);
      return;
    }

    if (tool === 'draw-blocked-zone') {
      setDragState({ kind: 'zone', start: tile, end: tile });
      return;
    }

    if (tool === 'select') {
      setSelection(EMPTY_SELECTION);
    }
  }, [placeBuilding, tool]);

  const handleCanvasPointerMove = React.useCallback((tile: WorldPosition, modifiers?: { shiftKey?: boolean }) => {
    setHoverTile(tile);

    if (!dragState) {
      return;
    }

    if (dragState.kind === 'zone') {
      setDragState({ ...dragState, end: tile });
      return;
    }

    const deltaX = quantizeDelta(tile.x - dragState.origin.x, snapStep, Boolean(modifiers?.shiftKey) || !snapToGrid);
    const deltaY = quantizeDelta(tile.y - dragState.origin.y, snapStep, Boolean(modifiers?.shiftKey) || !snapToGrid);

    setMovePreview(
      Object.fromEntries(
        Object.entries(dragState.basePositions).map(([id, pos]) => [
          id,
          {
            x: clamp(pos.x + deltaX, 0, WORLD_SIZE - 1),
            y: clamp(pos.y + deltaY, 0, WORLD_SIZE - 1),
          },
        ])
      )
    );
  }, [dragState, snapStep, snapToGrid]);

  const handleCanvasPointerUp = React.useCallback(() => {
    if (!dragState) {
      return;
    }

    if (dragState.kind === 'zone') {
      const zone = normalizeDraftZone(dragState);
      commitScene((current) => addZoneToScene(current, zone));
      setSelection(selectSingleZone(zone.id));
      setDragState(null);
      return;
    }

    if (movePreview) {
      commitScene((current) =>
        updateManyBuildingsInScene(current, Object.keys(movePreview), (building) => ({
          ...building,
          pos: movePreview[building.id] ?? building.pos,
        }))
      );
    }

    clearTransientInteraction();
  }, [clearTransientInteraction, commitScene, dragState, movePreview]);

  const handleBuildingPointerDown = React.useCallback((
    buildingId: string,
    tile: WorldPosition,
    modifiers: PointerModifiers
  ) => {
    setHoverTile(tile);

    if (tool === 'erase') {
      setSelection(selectSingleBuilding(buildingId));
      window.setTimeout(() => deleteSelection(), 0);
      return;
    }

    if (modifiers.shiftKey || modifiers.metaKey || modifiers.ctrlKey) {
      setSelection((current) => toggleBuildingSelection(current, buildingId));
      return;
    }

    const nextSelection = selection.buildingIds.includes(buildingId) && selection.buildingIds.length > 0
      ? selection
      : selectSingleBuilding(buildingId);
    setSelection(nextSelection);

    if (tool === 'move') {
      startMoveDrag(tile, nextSelection.buildingIds);
    }
  }, [deleteSelection, selection, startMoveDrag, tool]);

  const handleZonePointerDown = React.useCallback((zoneId: string, modifiers: PointerModifiers) => {
    if (tool === 'erase') {
      setSelection(selectSingleZone(zoneId));
      window.setTimeout(() => deleteSelection(), 0);
      return;
    }

    if (modifiers.shiftKey || modifiers.metaKey || modifiers.ctrlKey) {
      setSelection((current) => toggleZoneSelection(current, zoneId));
      return;
    }

    setSelection(selectSingleZone(zoneId));
  }, [deleteSelection, tool]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? '';
      if (target?.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return;
      }

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelection();
        return;
      }

      if (meta && event.key.toLowerCase() === 'a' && tool !== 'draw-blocked-zone') {
        event.preventDefault();
        selectBuildings(scene.buildings.map((building) => building.id));
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
        return;
      }

      if (event.key.toLowerCase() === 'v') {
        setTool('select');
        return;
      }

      if (event.key.toLowerCase() === 'm') {
        setTool('move');
        return;
      }

      if (event.key.toLowerCase() === 'b') {
        setTool('place-building');
        return;
      }

      if (event.key.toLowerCase() === 'z' && !meta) {
        setTool('draw-blocked-zone');
        return;
      }

      if (event.key.toLowerCase() === 'e') {
        setTool('erase');
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        setSnapToGrid((current) => !current);
        return;
      }

      const arrowDeltas: Record<string, WorldPosition> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };

      if (selection.buildingIds.length > 0 && arrowDeltas[event.key]) {
        event.preventDefault();
        const step = event.shiftKey ? FINE_STEP : snapToGrid ? snapStep : FINE_STEP;
        const delta = arrowDeltas[event.key];
        commitScene((current) =>
          moveBuildingsInScene(current, selection.buildingIds, {
            x: delta.x * step,
            y: delta.y * step,
          }, { snapStep, snapToGrid })
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    commitScene,
    deleteSelection,
    duplicateSelection,
    redo,
    scene.buildings,
    selectBuildings,
    selection.buildingIds,
    snapStep,
    snapToGrid,
    tool,
    undo,
  ]);

  const toggleOverlay = React.useCallback((key: keyof EditorOverlayState) => {
    setOverlays((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const selectedBuildingIssues = activeBuilding
    ? issues.filter((issue) => issue.targetType === 'building' && selection.buildingIds.includes(issue.targetId))
    : [];
  const selectedZoneIssues = activeZone
    ? issues.filter((issue) => issue.targetType === 'zone' && selection.zoneIds.includes(issue.targetId))
    : [];

  const activeTileInfo = hoverTile ? getWorldSurfaceTile(surfaceMap, hoverTile.x, hoverTile.y) : null;

  return {
    scene,
    displayBuildings,
    compiledWorld,
    issues,
    selectedBuildingIssues,
    selectedZoneIssues,
    buildingOptions,
    runtimeDerivedScene,
    selection,
    selectedBuildings,
    selectedZones,
    activeBuilding,
    activeZone,
    tool,
    setTool,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedTemplate,
    zoom,
    setZoom,
    snapToGrid,
    setSnapToGrid,
    snapStep,
    setSnapStep,
    fineStep: FINE_STEP,
    overlays,
    toggleOverlay,
    hoverTile,
    activeTileInfo,
    dragState,
    movePreview,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    selectionLabel: getSelectionLabel(selection),
    surfaceMap,
    setSelection,
    updateBuilding,
    updateZone,
    updateNpcBinding,
    applyTemplateToSelection,
    setSelectionDiscovery,
    restoreSelectionFromRuntime,
    clearAllZones,
    applyScene,
    loadSavedBlueprint,
    resetFromRuntime,
    undo,
    redo,
    deleteSelection,
    duplicateSelection,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleBuildingPointerDown,
    handleZonePointerDown,
    setHoverTile,
  };
};
