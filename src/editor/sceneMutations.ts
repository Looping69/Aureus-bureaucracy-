import { NavigationZone, WorldPosition } from '../types';
import { clampWorldCoordinate, clampWorldPosition } from '../utils/worldNavigation';
import { WORLD_SIZE } from '../utils/voxelConstants';
import { BUILDING_TEMPLATE_MAP, BuildingTemplate } from './templates';
import { AuthoringScene, AuthoredBuilding, EditorSelection } from './types';

const touchScene = (scene: AuthoringScene): AuthoringScene => ({
  ...scene,
  meta: {
    ...scene.meta,
    updatedAt: new Date().toISOString(),
  },
});

const buildBuildingId = (template: BuildingTemplate) =>
  `auth_${template.id}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeZoneBounds = (zone: NavigationZone): NavigationZone => ({
  ...zone,
  minX: Math.min(zone.minX, zone.maxX),
  minY: Math.min(zone.minY, zone.maxY),
  maxX: Math.max(zone.minX, zone.maxX),
  maxY: Math.max(zone.minY, zone.maxY),
});

export const createAuthoredBuilding = (
  template: BuildingTemplate,
  position: WorldPosition,
  options: Partial<AuthoredBuilding> = {}
): AuthoredBuilding => ({
  id: options.id ?? buildBuildingId(template),
  name: options.name ?? template.name,
  type: options.type ?? template.type,
  pos: clampWorldPosition(options.pos ?? position, WORLD_SIZE),
  voxels: options.voxels ?? template.voxels,
  npcId: options.npcId ?? 'none',
  isDiscovered: options.isDiscovered ?? true,
  isProtected: options.isProtected,
  templateId: options.templateId ?? template.id,
});

export const addBuildingToScene = (
  scene: AuthoringScene,
  building: AuthoredBuilding
): AuthoringScene => {
  const next = touchScene(scene);
  next.buildings = [...scene.buildings, building];
  return next;
};

export const addZoneToScene = (
  scene: AuthoringScene,
  zone: NavigationZone
): AuthoringScene => {
  const next = touchScene(scene);
  next.navigationZones = [...scene.navigationZones, normalizeZoneBounds(zone)];
  return next;
};

export const updateBuildingInScene = (
  scene: AuthoringScene,
  buildingId: string,
  patch: Partial<AuthoredBuilding>
): AuthoringScene => {
  const next = touchScene(scene);
  next.buildings = scene.buildings.map((building) =>
    building.id === buildingId
      ? {
          ...building,
          ...patch,
          pos: patch.pos ? clampWorldPosition(patch.pos, WORLD_SIZE) : building.pos,
        }
      : building
  );
  return next;
};

export const updateManyBuildingsInScene = (
  scene: AuthoringScene,
  buildingIds: string[],
  updater: (building: AuthoredBuilding) => AuthoredBuilding
): AuthoringScene => {
  const idSet = new Set(buildingIds);
  const next = touchScene(scene);
  next.buildings = scene.buildings.map((building) => {
    if (!idSet.has(building.id)) {
      return building;
    }

    const updated = updater(building);
    return {
      ...updated,
      pos: clampWorldPosition(updated.pos, WORLD_SIZE),
    };
  });
  return next;
};

export const updateZoneInScene = (
  scene: AuthoringScene,
  zoneId: string,
  patch: Partial<NavigationZone>
): AuthoringScene => {
  const next = touchScene(scene);
  next.navigationZones = scene.navigationZones.map((zone) =>
    zone.id === zoneId
      ? normalizeZoneBounds({
          ...zone,
          ...patch,
          minX: clampWorldCoordinate((patch.minX ?? zone.minX), WORLD_SIZE),
          minY: clampWorldCoordinate((patch.minY ?? zone.minY), WORLD_SIZE),
          maxX: clampWorldCoordinate((patch.maxX ?? zone.maxX), WORLD_SIZE),
          maxY: clampWorldCoordinate((patch.maxY ?? zone.maxY), WORLD_SIZE),
        })
      : zone
  );
  return next;
};

export const updateNpcBindingInScene = (
  scene: AuthoringScene,
  npcId: string,
  field: 'homeBuildingId' | 'workBuildingId',
  value: string
): AuthoringScene => {
  const existing = scene.npcBindings.find((binding) => binding.npcId === npcId);
  const next = touchScene(scene);
  const binding = {
    npcId,
    homeBuildingId: existing?.homeBuildingId,
    workBuildingId: existing?.workBuildingId,
    [field]: value || undefined,
  };

  next.npcBindings = existing
    ? scene.npcBindings.map((entry) => (entry.npcId === npcId ? binding : entry))
    : [...scene.npcBindings, binding];

  return next;
};

export const removeSelectionFromScene = (
  scene: AuthoringScene,
  selection: EditorSelection
): AuthoringScene => {
  const removableBuildings = scene.buildings
    .filter((building) => selection.buildingIds.includes(building.id) && !building.isProtected)
    .map((building) => building.id);
  const removableZones = new Set(selection.zoneIds);

  if (removableBuildings.length === 0 && removableZones.size === 0) {
    return scene;
  }

  const next = touchScene(scene);
  next.buildings = scene.buildings.filter((building) => !removableBuildings.includes(building.id));
  next.navigationZones = scene.navigationZones.filter((zone) => !removableZones.has(zone.id));
  next.npcBindings = scene.npcBindings.map((binding) => ({
    ...binding,
    homeBuildingId: removableBuildings.includes(binding.homeBuildingId ?? '') ? undefined : binding.homeBuildingId,
    workBuildingId: removableBuildings.includes(binding.workBuildingId ?? '') ? undefined : binding.workBuildingId,
  }));
  return next;
};

export const moveBuildingsInScene = (
  scene: AuthoringScene,
  buildingIds: string[],
  delta: WorldPosition,
  _options: { snapToGrid: boolean; snapStep: number }
): AuthoringScene => updateManyBuildingsInScene(scene, buildingIds, (building) => {
  const rawX = building.pos.x + delta.x;
  const rawY = building.pos.y + delta.y;
  return {
    ...building,
    pos: {
      x: clampWorldCoordinate(rawX, WORLD_SIZE),
      y: clampWorldCoordinate(rawY, WORLD_SIZE),
    },
  };
});

export const duplicateBuildingsInScene = (
  scene: AuthoringScene,
  buildingIds: string[],
  offset: WorldPosition
): { scene: AuthoringScene; duplicatedIds: string[] } => {
  const duplicates = scene.buildings
    .filter((building) => buildingIds.includes(building.id))
    .map((building) => {
      const template = (building.templateId && BUILDING_TEMPLATE_MAP.get(building.templateId)) ?? {
        id: building.templateId ?? building.type.toLowerCase(),
        name: building.name,
        type: building.type,
        voxels: building.voxels,
      };

      return createAuthoredBuilding(template, {
        x: building.pos.x + offset.x,
        y: building.pos.y + offset.y,
      }, {
        name: `${building.name} Copy`,
        npcId: 'none',
        isDiscovered: building.isDiscovered,
      });
    });

  if (duplicates.length === 0) {
    return { scene, duplicatedIds: [] };
  }

  return {
    scene: addManyBuildingsToScene(scene, duplicates),
    duplicatedIds: duplicates.map((building) => building.id),
  };
};

export const addManyBuildingsToScene = (
  scene: AuthoringScene,
  buildings: AuthoredBuilding[]
): AuthoringScene => {
  const next = touchScene(scene);
  next.buildings = [...scene.buildings, ...buildings];
  return next;
};

export const replaceBuildingTemplatesInScene = (
  scene: AuthoringScene,
  buildingIds: string[],
  template: BuildingTemplate
): AuthoringScene => updateManyBuildingsInScene(scene, buildingIds, (building) => ({
  ...building,
  name: template.name,
  type: template.type,
  voxels: template.voxels,
  templateId: template.id,
}));

export const setDiscoveryStateInScene = (
  scene: AuthoringScene,
  buildingIds: string[],
  isDiscovered: boolean
): AuthoringScene => updateManyBuildingsInScene(scene, buildingIds, (building) => ({
  ...building,
  isDiscovered,
}));

export const clearZonesInScene = (scene: AuthoringScene): AuthoringScene => {
  if (scene.navigationZones.length === 0) {
    return scene;
  }

  const next = touchScene(scene);
  next.navigationZones = [];
  return next;
};

export const restoreBuildingsFromScene = (
  scene: AuthoringScene,
  buildingIds: string[],
  referenceScene: AuthoringScene
): AuthoringScene => {
  const referenceById = new Map(referenceScene.buildings.map((building) => [building.id, building]));
  return updateManyBuildingsInScene(scene, buildingIds, (building) => referenceById.get(building.id) ?? building);
};
