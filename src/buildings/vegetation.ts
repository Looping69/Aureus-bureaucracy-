import { BuildingGenerator } from '../utils/buildingGenerator';
import {
  CHARCOAL,
  TIMBER,
  MOSS,
  CURB,
} from './colors';

// Foliage / trees.
const genTreeA = new BuildingGenerator();
genTreeA.addBox(0, 0, 0, 0, 0, 0, CHARCOAL);
genTreeA.addBox(0, 0, 1, 0, 0, 5, TIMBER);
genTreeA.addBox(-3, -3, 6, 3, 3, 8, MOSS);
genTreeA.addBox(-2, -2, 9, 2, 2, 9, MOSS);
genTreeA.addBox(-4, 0, 7, 4, 0, 7, MOSS);
genTreeA.addBox(0, -4, 7, 0, 4, 7, MOSS);
export const TREE_A_VOXELS = genTreeA.getVoxels();

const genTreeB = new BuildingGenerator();
genTreeB.addBox(0, 0, 0, 0, 0, 0, CHARCOAL);
genTreeB.addBox(0, 0, 1, 0, 0, 4, TIMBER);
genTreeB.addBox(-2, -2, 5, 2, 2, 6, '#3a5a3a');
genTreeB.addBox(-1, -1, 7, 1, 1, 8, '#3a5a3a');
genTreeB.addBox(-3, -3, 4, 3, 3, 5, '#4a6a4a');
export const TREE_B_VOXELS = genTreeB.getVoxels();

const genBush = new BuildingGenerator();
genBush.addBox(-2, -2, 0, 2, 2, 0, '#4e6a4f');
genBush.addBox(-2, -2, 1, 2, 2, 3, MOSS);
genBush.addBox(0, 0, 4, 0, 0, 4, '#5a7a5a');
export const BUSH_VOXELS = genBush.getVoxels();

const genGarden = new BuildingGenerator();
genGarden.addBox(-4, -4, 0, 4, 4, 0, '#4e6a4f');
genGarden.addBox(-1, -1, 0, 1, 1, 0, CURB);
genGarden.addBox(-3, -3, 1, -3, -3, 3, TIMBER);
genGarden.addBox(-4, -4, 4, -2, -2, 5, MOSS);
genGarden.addBox(3, 3, 1, 3, 3, 3, TIMBER);
genGarden.addBox(2, 2, 4, 4, 4, 5, MOSS);
genGarden.addBox(-3, 2, 1, -1, 3, 1, '#a85858');
genGarden.addBox(1, -3, 1, 3, -1, 1, '#8a7a4a');
export const GARDEN_VOXELS = genGarden.getVoxels();
