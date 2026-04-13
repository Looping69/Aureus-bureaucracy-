import { Building, NPC } from '../types';
import { AuthoringScene, CompiledAuthoringWorld } from './types';

export const compileAuthoringScene = (
  scene: AuthoringScene,
  baseNpcs: Record<string, NPC>
): CompiledAuthoringWorld => {
  const buildings = Object.fromEntries(
    scene.buildings.map((building) => [
      building.id,
      {
        id: building.id,
        name: building.name,
        type: building.type,
        pos: { ...building.pos },
        voxels: building.voxels,
        npcId: building.npcId,
        isDiscovered: building.isDiscovered,
      } as Building,
    ])
  );

  const npcs = Object.fromEntries(
    Object.values(baseNpcs).map((npc) => {
      const binding = scene.npcBindings.find((entry) => entry.npcId === npc.id);
      return [
        npc.id,
        {
          ...npc,
          homeBuildingId: binding?.homeBuildingId ?? npc.homeBuildingId,
          workBuildingId: binding?.workBuildingId ?? npc.workBuildingId,
        },
      ];
    })
  );

  return {
    buildings,
    navigationZones: scene.navigationZones.map((zone) => ({ ...zone })),
    npcs,
  };
};
