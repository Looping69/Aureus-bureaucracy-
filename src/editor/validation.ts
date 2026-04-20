import { WORLD_SIZE } from '../utils/voxelConstants';
import { getBuildingAccessPosition } from '../utils/buildingAccess';
import { getBuildingFootprint } from '../utils/worldNavigation';
import { buildWorldSurfaceMap, getWorldSurfaceTile } from '../utils/worldSurface';
import { compileAuthoringScene } from './compiler';
import { AuthoringScene, EditorValidationIssue } from './types';
import { NPC } from '../types';
import { buildNpcPedestrianPath } from '../game/npcNavigation';

const overlaps = (
  a: { minX: number; maxX: number; minY: number; maxY: number },
  b: { minX: number; maxX: number; minY: number; maxY: number }
) => !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);

export const validateAuthoringScene = (
  scene: AuthoringScene,
  baseNpcs: Record<string, NPC>
): EditorValidationIssue[] => {
  const issues: EditorValidationIssue[] = [];
  const compiled = compileAuthoringScene(scene, baseNpcs);
  const buildings = Object.values(compiled.buildings);
  const surfaceMap = buildWorldSurfaceMap(compiled.buildings, WORLD_SIZE, compiled.navigationZones);

  buildings.forEach((building, index) => {
    const footprint = getBuildingFootprint(building);
    if (!footprint) return;

    if (
      footprint.minX < 0 ||
      footprint.minY < 0 ||
      footprint.maxX >= WORLD_SIZE ||
      footprint.maxY >= WORLD_SIZE
    ) {
      issues.push({
        id: `bounds:${building.id}`,
        severity: 'error',
        targetType: 'building',
        targetId: building.id,
        message: `${building.name} extends beyond world bounds.`,
      });
    }

    for (let otherIndex = index + 1; otherIndex < buildings.length; otherIndex += 1) {
      const other = buildings[otherIndex];
      const otherFootprint = getBuildingFootprint(other);
      if (!otherFootprint) continue;
      if (overlaps(footprint, otherFootprint)) {
        issues.push({
          id: `overlap:${building.id}:${other.id}`,
          severity: 'error',
          targetType: 'building',
          targetId: building.id,
          message: `${building.name} overlaps ${other.name}.`,
        });
      }
    }

    const accessPos = getBuildingAccessPosition(building);
    const accessTile = getWorldSurfaceTile(surfaceMap, accessPos.x, accessPos.y);
    if (!accessTile?.walkable) {
      issues.push({
        id: `access:${building.id}`,
        severity: 'error',
        targetType: 'building',
        targetId: building.id,
        message: `${building.name} has a blocked access tile.`,
      });
    }
  });

  scene.navigationZones.forEach((zone) => {
    if (
      zone.minX < 0 ||
      zone.minY < 0 ||
      zone.maxX >= WORLD_SIZE ||
      zone.maxY >= WORLD_SIZE ||
      zone.maxX < zone.minX ||
      zone.maxY < zone.minY
    ) {
      issues.push({
        id: `zone:${zone.id}`,
        severity: 'error',
        targetType: 'zone',
        targetId: zone.id,
        message: `${zone.name} has invalid bounds.`,
      });
    }
  });

  Object.values(compiled.npcs).forEach((npc) => {
    if (!npc.homeBuildingId || !compiled.buildings[npc.homeBuildingId]) {
      issues.push({
        id: `npc-home:${npc.id}`,
        severity: 'warning',
        targetType: 'npc',
        targetId: npc.id,
        message: `${npc.name} has no valid home building.`,
      });
    }

    if (!npc.workBuildingId || !compiled.buildings[npc.workBuildingId]) {
      issues.push({
        id: `npc-work:${npc.id}`,
        severity: 'warning',
        targetType: 'npc',
        targetId: npc.id,
        message: `${npc.name} has no valid work building.`,
      });
    }

    if (npc.homeBuildingId && npc.workBuildingId) {
      const home = compiled.buildings[npc.homeBuildingId];
      const work = compiled.buildings[npc.workBuildingId];
      if (home && work && home.id !== work.id) {
        const path = buildNpcPedestrianPath(
          npc,
          compiled.buildings,
          WORLD_SIZE,
          compiled.navigationZones,
          getBuildingAccessPosition(home),
          getBuildingAccessPosition(work)
        );
        if (path.length === 0) {
          issues.push({
            id: `npc-route:${npc.id}`,
            severity: 'error',
            targetType: 'npc',
            targetId: npc.id,
            message: `${npc.name} cannot path between home and work.`,
          });
        }
      }
    }
  });

  return issues;
};
