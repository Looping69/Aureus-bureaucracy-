import { Building } from './types';
import { GENERIC_HOUSE_A_VOXELS, GENERIC_OFFICE_VOXELS, ROAD_VOXELS, SIDEWALK_VOXELS } from './buildings';

export const generateCityLayout = (): Record<string, Building> => {
  const buildings: Record<string, Building> = {};
  
  // City Center
  buildings['center_office'] = {
    id: 'center_office',
    npcId: 'none',
    name: 'City Hall',
    pos: { x: 80, y: 80 },
    type: 'OFFICE',
    isDiscovered: true,
    voxels: GENERIC_OFFICE_VOXELS,
  };

  // Suburbs
  buildings['suburb_house_1'] = {
    id: 'suburb_house_1',
    npcId: 'npc_1',
    name: 'House 1',
    pos: { x: 20, y: 20 },
    type: 'HOME',
    isDiscovered: true,
    voxels: GENERIC_HOUSE_A_VOXELS,
  };

  // Roads
  for (let i = 0; i < 16; i++) {
    buildings[`road_x_${i}`] = {
      id: `road_x_${i}`,
      npcId: 'none',
      name: 'Road',
      pos: { x: i * 10 + 5, y: 85 },
      type: 'ROAD',
      isDiscovered: true,
      voxels: ROAD_VOXELS,
    };
  }

  return buildings;
};
