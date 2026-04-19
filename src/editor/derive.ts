import { GameState } from '../types';
import { AuthoringScene } from './types';
import { WORLD_SIZE } from '../utils/voxelConstants';

const PROTECTED_BUILDING_IDS = new Set(['player_home', 'mine_entrance', 'licensing_office']);

export const deriveAuthoringScene = (state: GameState): AuthoringScene => ({
  version: 1,
  meta: {
    id: 'aureus-main-world',
    name: 'Aureus Main World',
    worldSize: WORLD_SIZE,
    updatedAt: new Date().toISOString(),
  },
  buildings: Object.values(state.buildings).map((building) => ({
    id: building.id,
    name: building.name,
    type: building.type,
    pos: { ...building.pos },
    voxels: building.voxels,
    npcId: building.npcId,
    isDiscovered: building.isDiscovered,
    isProtected: PROTECTED_BUILDING_IDS.has(building.id) || building.npcId !== 'none',
  })),
  npcBindings: Object.values(state.npcs).map((npc) => ({
    npcId: npc.id,
    homeBuildingId: npc.homeBuildingId,
    workBuildingId: npc.workBuildingId,
  })),
  navigationZones: state.navigationZones.map((zone) => ({ ...zone })),
  routes: [],
});
