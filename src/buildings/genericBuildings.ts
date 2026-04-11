import { BuildingGenerator } from '../utils/buildingGenerator';
import {
  CHARCOAL,
  SLATE,
  CONCRETE,
  PALE_STONE,
  BRASS,
  RUST,
  TIMBER,
  GLASS,
  DEEP_GLASS,
  OXIDE,
  CANVAS,
  DUST,
  MOSS,
  OFF_WHITE,
  SIGNAL_RED,
  SIGNAL_BLUE,
  WARM_LIGHT,
  addFrontSteps,
  addWindowBand,
} from './colors';

// 8. Generic House A - worker duplex with larger footprint.
const genHouseA = new BuildingGenerator();
genHouseA.addBox(-6, -6, 0, 6, 6, 0, CHARCOAL);
genHouseA.addBox(-6, -6, 1, 6, 6, 1, CONCRETE);
genHouseA.addHollowBox(-6, -6, 2, 6, 5, 6, RUST);
genHouseA.addBox(-2, -6, 2, 2, -6, 5, TIMBER);
genHouseA.addBox(-5, -6, 3, -3, -6, 4, GLASS);
genHouseA.addBox(3, -6, 3, 5, -6, 4, GLASS);
genHouseA.addBox(-6, -2, 3, -6, 3, 4, GLASS);
genHouseA.addBox(6, -1, 3, 6, 3, 4, GLASS);
genHouseA.addBox(-7, -7, 7, 7, 7, 7, SLATE);
genHouseA.addBox(-5, -5, 8, 5, 5, 8, SLATE);
genHouseA.addBox(-3, -3, 9, 3, 3, 9, SLATE);
genHouseA.addBox(5, 2, 7, 5, 2, 10, CHARCOAL);
addFrontSteps(genHouseA, 2, -7, 1, PALE_STONE, CHARCOAL);
addFrontSteps(genHouseA, 1, -8, 0, PALE_STONE);
export const GENERIC_HOUSE_A_VOXELS = genHouseA.getVoxels();

// 9. Generic House B - broader porch house.
const genHouseB = new BuildingGenerator();
genHouseB.addBox(-6, -6, 0, 6, 6, 0, CHARCOAL);
genHouseB.addBox(-6, -6, 1, 6, 6, 1, DUST);
genHouseB.addHollowBox(-6, -6, 2, 6, 5, 6, CANVAS);
genHouseB.addBox(-2, -6, 2, 1, -6, 5, TIMBER);
genHouseB.addBox(-5, -6, 3, -3, -6, 4, GLASS);
genHouseB.addBox(3, -6, 3, 5, -6, 4, GLASS);
genHouseB.addBox(-6, 2, 3, -6, 4, 4, GLASS);
genHouseB.addBox(-7, -7, 7, 7, 7, 7, OXIDE);
genHouseB.addBox(-5, -5, 8, 5, 5, 8, OXIDE);
genHouseB.addBox(-6, -8, 4, 2, -6, 4, TIMBER);
genHouseB.addBox(-4, -8, 3, -4, -8, 5, TIMBER);
genHouseB.addBox(0, -8, 3, 0, -8, 5, TIMBER);
addFrontSteps(genHouseB, 3, -7, 1, PALE_STONE, DUST);
addFrontSteps(genHouseB, 2, -8, 0, PALE_STONE);
export const GENERIC_HOUSE_B_VOXELS = genHouseB.getVoxels();

// 9b. Generic House C - brick rowhouse with planters.
const genHouseC = new BuildingGenerator();
genHouseC.addBox(-6, -5, 0, 6, 5, 0, CHARCOAL);
genHouseC.addBox(-6, -5, 1, 6, 5, 1, PALE_STONE);
genHouseC.addHollowBox(-6, -5, 2, 6, 4, 6, RUST);
genHouseC.addBox(-1, -5, 2, 1, -5, 5, TIMBER);
genHouseC.addBox(-5, -5, 3, -3, -5, 4, GLASS);
genHouseC.addBox(3, -5, 3, 5, -5, 4, GLASS);
genHouseC.addBox(6, -2, 3, 6, 2, 4, GLASS);
genHouseC.addBox(-7, -6, 7, 7, 6, 7, SLATE);
genHouseC.addBox(-5, -4, 8, 5, 4, 8, SLATE);
genHouseC.addBox(-6, -6, 2, -3, -6, 2, MOSS);
genHouseC.addBox(3, -6, 2, 6, -6, 2, MOSS);
addFrontSteps(genHouseC, 2, -6, 1, PALE_STONE, CHARCOAL);
addFrontSteps(genHouseC, 1, -7, 0, PALE_STONE);
export const GENERIC_HOUSE_C_VOXELS = genHouseC.getVoxels();

// 9c. Generic House D - metal-roof cabin scaled up into a real dwelling.
const genHouseD = new BuildingGenerator();
genHouseD.addBox(-6, -5, 0, 6, 5, 0, CHARCOAL);
genHouseD.addBox(-6, -5, 1, 6, 5, 1, CONCRETE);
genHouseD.addHollowBox(-6, -5, 2, 6, 4, 6, SLATE);
genHouseD.addBox(0, -5, 2, 2, -5, 5, TIMBER);
genHouseD.addBox(-5, -5, 3, -3, -5, 4, GLASS);
genHouseD.addBox(6, -1, 3, 6, 3, 4, GLASS);
genHouseD.addBox(-7, -6, 7, 7, 6, 7, CHARCOAL);
genHouseD.addBox(-5, -4, 8, 5, 4, 8, CHARCOAL);
genHouseD.addBox(-2, -2, 9, -2, -2, 9, SIGNAL_RED);
addFrontSteps(genHouseD, 2, -6, 1, CONCRETE, CHARCOAL);
addFrontSteps(genHouseD, 1, -7, 0, PALE_STONE);
export const GENERIC_HOUSE_D_VOXELS = genHouseD.getVoxels();

// 10. Generic Office - larger district block.
const genOffice = new BuildingGenerator();
genOffice.addBox(-7, -7, 0, 7, 7, 0, CHARCOAL);
genOffice.addBox(-7, -7, 1, 7, 7, 1, OFF_WHITE);
genOffice.addHollowBox(-7, -7, 2, 7, 6, 8, OFF_WHITE);
addWindowBand(genOffice, -5, -7, 3, 5, 4, GLASS);
addWindowBand(genOffice, -5, -7, 6, 5, 7, GLASS);
addWindowBand(genOffice, -6, 7, 3, 6, 4, GLASS);
addWindowBand(genOffice, -6, 7, 6, 6, 7, GLASS);
genOffice.addBox(-1, -7, 2, 1, -7, 5, DEEP_GLASS);
genOffice.addBox(-7, -7, 9, 7, 7, 9, SIGNAL_BLUE);
genOffice.addBox(-5, -5, 10, 5, 5, 10, CONCRETE);
genOffice.addBox(-3, -3, 11, 3, 3, 11, CONCRETE);
addFrontSteps(genOffice, 2, -8, 1, PALE_STONE, CHARCOAL);
addFrontSteps(genOffice, 1, -9, 0, PALE_STONE);
export const GENERIC_OFFICE_VOXELS = genOffice.getVoxels();

// 11. Factory - genuinely large plant with gantries and stacks.
const genFactory = new BuildingGenerator();
genFactory.addBox(-9, -8, 0, 9, 8, 0, CHARCOAL);
genFactory.addBox(-9, -8, 1, 9, 8, 1, SLATE);
genFactory.addHollowBox(-9, -8, 2, 9, 6, 6, RUST);
genFactory.addBox(-4, -8, 2, 4, -8, 5, '#1b1d20');
genFactory.addBox(-8, 3, 7, -4, 3, 12, CHARCOAL);
genFactory.addBox(2, 3, 7, 6, 3, 11, CHARCOAL);
genFactory.addBox(-9, 2, 7, 9, 2, 7, SLATE);
genFactory.addBox(-9, -8, 7, 9, 8, 7, DUST);
genFactory.addBox(-7, -6, 8, 7, 6, 8, SLATE);
genFactory.addBox(0, 0, 9, 0, 0, 10, WARM_LIGHT);
genFactory.addBox(7, -7, 2, 9, -4, 6, CONCRETE);
addFrontSteps(genFactory, 4, -9, 1, PALE_STONE, CHARCOAL);
addFrontSteps(genFactory, 3, -10, 0, PALE_STONE);
export const FACTORY_VOXELS = genFactory.getVoxels();
