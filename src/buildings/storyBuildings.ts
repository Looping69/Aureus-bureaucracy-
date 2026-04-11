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
  OFF_WHITE,
  SIGNAL_RED,
  SIGNAL_BLUE,
  PHONE_RED,
  WARM_LIGHT,
  addFrontSteps,
  addWindowBand,
  addRoofCap,
  addCornerPilasters,
  addLanternTree,
} from './colors';

// 1. Licensing Office - enlarged civic bureau with archive wing.
const genLicensing = new BuildingGenerator();
genLicensing.addBox(-8, -8, 0, 8, 8, 0, CHARCOAL);
genLicensing.addBox(-8, -8, 1, 8, 8, 1, SLATE);
genLicensing.addHollowBox(-7, -7, 2, 7, 5, 8, CONCRETE);
genLicensing.addBox(-9, -8, 2, -9, 8, 8, CHARCOAL);
genLicensing.addBox(9, -8, 2, 9, 8, 8, CHARCOAL);
genLicensing.addBox(-4, -8, 2, 4, -8, 6, TIMBER);
genLicensing.addBox(-5, -7, 3, 5, -7, 6, DEEP_GLASS);
genLicensing.addBox(-6, 6, 3, 6, 6, 6, DEEP_GLASS);
genLicensing.addBox(-7, -3, 3, -7, 3, 6, DEEP_GLASS);
genLicensing.addBox(7, -3, 3, 7, 3, 6, DEEP_GLASS);
genLicensing.addBox(-6, 7, 2, -2, 10, 7, SLATE);
genLicensing.addBox(-6, 7, 8, 2, 10, 8, BRASS);
genLicensing.addBox(-3, 8, 4, 1, 8, 6, DEEP_GLASS);
genLicensing.addBox(-6, 1, 9, 6, 1, 9, SIGNAL_BLUE);
genLicensing.addBox(-5, -5, 10, 5, 5, 11, SLATE);
addRoofCap(genLicensing, -7, -7, 7, 7, 9, OFF_WHITE);
addFrontSteps(genLicensing, 4, -9, 1, PALE_STONE, CHARCOAL);
addFrontSteps(genLicensing, 3, -10, 0, PALE_STONE);
addCornerPilasters(genLicensing, -7, -7, 7, 7, 2, 8, CHARCOAL);
export const LICENSING_OFFICE_VOXELS = genLicensing.getVoxels();

// 2. Union Hall / Gilded Pick - broad public house with deep porch.
const genUnion = new BuildingGenerator();
genUnion.addBox(-9, -9, 0, 9, 9, 0, CHARCOAL);
genUnion.addBox(-9, -9, 1, 9, 9, 1, RUST);
genUnion.addHollowBox(-8, -8, 2, 8, 7, 7, OXIDE);
genUnion.addBox(-5, -9, 2, 5, -9, 6, TIMBER);
genUnion.addBox(-7, -8, 3, -3, -8, 5, GLASS);
genUnion.addBox(3, -8, 3, 7, -8, 5, GLASS);
genUnion.addBox(-8, -2, 3, -8, 4, 5, GLASS);
genUnion.addBox(8, -2, 3, 8, 4, 5, GLASS);
genUnion.addBox(-7, -10, 5, 7, -8, 5, CANVAS);
genUnion.addBox(-8, 8, 3, 8, 8, 6, DUST);
genUnion.addBox(-7, -7, 8, 7, 7, 8, DUST);
genUnion.addBox(-5, -6, 9, 5, 6, 9, BRASS);
genUnion.addBox(0, -9, 7, 0, -9, 11, BRASS);
genUnion.addBox(-2, -9, 11, 2, -9, 11, BRASS);
addFrontSteps(genUnion, 5, -10, 1, PALE_STONE, CHARCOAL);
addFrontSteps(genUnion, 4, -11, 0, PALE_STONE);
export const UNION_HALL_VOXELS = genUnion.getVoxels();

// 3. Compliance Tower - taller tower with observation crown.
const genInspector = new BuildingGenerator();
genInspector.addBox(-6, -6, 0, 6, 6, 0, CHARCOAL);
genInspector.addBox(-6, -6, 1, 6, 6, 1, OFF_WHITE);
genInspector.addHollowBox(-5, -5, 2, 5, 5, 6, OFF_WHITE);
genInspector.addBox(-4, -4, 7, 4, 4, 15, OFF_WHITE);
for (let z = 3; z <= 14; z += 2) {
  addWindowBand(genInspector, -3, -5, z, 3, z, GLASS);
  addWindowBand(genInspector, -3, 5, z, 3, z, GLASS);
}
for (let z = 8; z <= 14; z += 2) {
  addWindowBand(genInspector, -4, 0, z, -4, z, DEEP_GLASS);
  addWindowBand(genInspector, 4, 0, z, 4, z, DEEP_GLASS);
}
genInspector.addBox(-1, -6, 2, 1, -6, 5, CHARCOAL);
genInspector.addBox(-5, -5, 16, 5, 5, 16, OFF_WHITE);
genInspector.addBox(-4, -4, 17, 4, 4, 17, GLASS);
genInspector.addBox(-2, -2, 18, 2, 2, 18, SIGNAL_RED);
genInspector.addBox(-6, 0, 5, -6, 0, 12, SIGNAL_BLUE);
genInspector.addBox(6, 0, 5, 6, 0, 12, SIGNAL_BLUE);
addFrontSteps(genInspector, 2, -7, 1, PALE_STONE, CHARCOAL);
addFrontSteps(genInspector, 1, -8, 0, PALE_STONE);
export const INSPECTOR_HQ_VOXELS = genInspector.getVoxels();

// 4. Slink's Salvage - sprawling depot yard with gantries and scrap piles.
const genFixer = new BuildingGenerator();
genFixer.addBox(-8, -8, 0, 8, 8, 0, CHARCOAL);
genFixer.addBox(-7, -7, 1, 1, 4, 1, RUST);
genFixer.addHollowBox(-7, -7, 2, 1, 4, 6, RUST);
genFixer.addBox(-5, -7, 2, -1, -7, 5, '#1c1d20');
genFixer.addBox(3, -5, 1, 8, 5, 3, SLATE);
genFixer.addBox(3, -5, 4, 8, 5, 4, CONCRETE);
genFixer.addBox(-9, 2, 1, -5, 8, 3, DUST);
genFixer.addBox(-9, 1, 4, -5, 7, 4, CHARCOAL);
genFixer.addBox(0, 1, 1, 2, 4, 3, TIMBER);
genFixer.addBox(2, 1, 1, 4, 4, 5, CHARCOAL);
genFixer.addBox(7, -8, 1, 7, 8, 1, CHARCOAL);
genFixer.addBox(7, -8, 2, 7, -8, 7, CHARCOAL);
genFixer.addBox(7, 8, 2, 7, 8, 7, CHARCOAL);
genFixer.addBox(5, -8, 7, 9, 8, 7, RUST);
genFixer.addBox(-1, 3, 8, 3, 6, 8, BRASS);
genFixer.addBox(-8, -8, 2, -8, -3, 5, CHARCOAL);
genFixer.addBox(4, -8, 2, 6, -8, 5, TIMBER);
export const FIXER_DEN_VOXELS = genFixer.getVoxels();

// 5. Chief's Hut - expanded communal hall with layered roof.
const genChief = new BuildingGenerator();
genChief.addBox(-8, -8, 0, 8, 8, 0, DUST);
genChief.addBox(-7, -7, 1, 7, 7, 1, CANVAS);
genChief.addHollowBox(-7, -7, 2, 7, 6, 5, TIMBER);
genChief.addBox(-3, -8, 2, 3, -8, 5, TIMBER);
genChief.addBox(-4, -7, 3, 4, -7, 4, GLASS);
genChief.addBox(-8, -2, 2, -8, 2, 4, CANVAS);
genChief.addBox(8, -2, 2, 8, 2, 4, CANVAS);
genChief.addBox(-8, -8, 6, 8, 8, 6, TIMBER);
genChief.addBox(-6, -6, 7, 6, 6, 7, TIMBER);
genChief.addBox(-4, -4, 8, 4, 4, 8, TIMBER);
genChief.addBox(-2, -2, 9, 2, 2, 9, TIMBER);
genChief.addBox(0, 0, 10, 0, 0, 10, WARM_LIGHT);
addFrontSteps(genChief, 4, -9, 1, PALE_STONE, DUST);
addFrontSteps(genChief, 3, -10, 0, PALE_STONE);
addLanternTree(genChief, -8, -5);
addLanternTree(genChief, 8, -5);
export const CHIEF_HUT_VOXELS = genChief.getVoxels();

// 6. Hotline Booth - still compact, but no longer toy-sized.
const genHotline = new BuildingGenerator();
genHotline.addBox(-2, -2, 0, 2, 2, 0, CHARCOAL);
genHotline.addBox(-2, -2, 1, 2, 2, 1, PHONE_RED);
genHotline.addHollowBox(-2, -2, 2, 2, 2, 6, PHONE_RED);
genHotline.addBox(-2, -2, 2, 2, -2, 5, GLASS);
genHotline.addBox(-2, 2, 2, 2, 2, 5, GLASS);
genHotline.addBox(0, -2, 2, 0, -2, 4, DEEP_GLASS);
genHotline.addBox(-2, -2, 7, 2, 2, 7, OFF_WHITE);
genHotline.addBox(0, 0, 8, 0, 0, 8, SIGNAL_RED);
export const HOTLINE_BOOTH_VOXELS = genHotline.getVoxels();
