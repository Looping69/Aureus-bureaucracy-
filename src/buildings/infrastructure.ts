import { BuildingGenerator } from '../utils/buildingGenerator';
import {
  CHARCOAL,
  CONCRETE,
  TIMBER,
  BRASS,
  CURB,
  ASPHALT,
  PAVEMENT,
  OFF_WHITE,
  WARM_LIGHT,
  addLanternTree,
} from './colors';

// 7. Street Light - taller street furniture.
const genStreetLight = new BuildingGenerator();
genStreetLight.addBox(0, 0, 0, 0, 0, 7, CHARCOAL);
genStreetLight.addBox(0, 0, 7, 3, 0, 7, CHARCOAL);
genStreetLight.addBox(3, 0, 6, 3, 0, 6, WARM_LIGHT);
genStreetLight.addBox(0, 0, 0, 0, 0, 0, CONCRETE);
export const STREET_LIGHT_VOXELS = genStreetLight.getVoxels();

// 12. Small Park - expanded civic green.
const genPark = new BuildingGenerator();
genPark.addBox(-7, -7, 0, 7, 7, 0, '#4e6a4f');
genPark.addBox(-1, -7, 0, 1, 7, 0, CURB);
genPark.addBox(-7, -1, 0, 7, 1, 0, CURB);
addLanternTree(genPark, -4, -4);
addLanternTree(genPark, 4, 3);
genPark.addBox(0, 3, 1, 3, 4, 1, TIMBER);
genPark.addBox(-3, 3, 1, -1, 4, 1, TIMBER);
genPark.addBox(-2, -2, 1, 2, 2, 1, BRASS);
export const PARK_VOXELS = genPark.getVoxels();

// Street tiles – each tile spans 14 voxels (−7 … +6) along the travel
// direction so that adjacent road cells connect seamlessly. Three variants
// are provided: north-south, east-west, and intersection.
const genStreetNS = new BuildingGenerator();
genStreetNS.addBox(-4, -7, 0, 4, 6, 0, PAVEMENT);
genStreetNS.addBox(-2, -7, 0, 2, 6, 0, ASPHALT);
genStreetNS.addBox(0, -7, 0, 0, 6, 0, OFF_WHITE);
genStreetNS.addBox(-4, -7, 0, -3, 6, 0, CURB);
genStreetNS.addBox(3, -7, 0, 4, 6, 0, CURB);
export const ROAD_NS_VOXELS = genStreetNS.getVoxels();

const genStreetEW = new BuildingGenerator();
genStreetEW.addBox(-7, -4, 0, 6, 4, 0, PAVEMENT);
genStreetEW.addBox(-7, -2, 0, 6, 2, 0, ASPHALT);
genStreetEW.addBox(-7, 0, 0, 6, 0, 0, OFF_WHITE);
genStreetEW.addBox(-7, -4, 0, 6, -3, 0, CURB);
genStreetEW.addBox(-7, 3, 0, 6, 4, 0, CURB);
export const ROAD_EW_VOXELS = genStreetEW.getVoxels();

const genStreetX = new BuildingGenerator();
genStreetX.addBox(-7, -7, 0, 6, 6, 0, PAVEMENT);
genStreetX.addBox(-2, -7, 0, 2, 6, 0, ASPHALT);
genStreetX.addBox(-7, -2, 0, 6, 2, 0, ASPHALT);
genStreetX.addBox(0, -7, 0, 0, 6, 0, OFF_WHITE);
genStreetX.addBox(-7, 0, 0, 6, 0, 0, OFF_WHITE);
genStreetX.addBox(-7, -7, 0, -3, -3, 0, CURB);
genStreetX.addBox(3, -7, 0, 6, -3, 0, CURB);
genStreetX.addBox(-7, 3, 0, -3, 6, 0, CURB);
genStreetX.addBox(3, 3, 0, 6, 6, 0, CURB);
export const ROAD_CROSS_VOXELS = genStreetX.getVoxels();

export const STREET_VOXELS = ROAD_NS_VOXELS;
export const ROAD_VOXELS = ROAD_NS_VOXELS;
export const SIDEWALK_VOXELS = ROAD_EW_VOXELS;
