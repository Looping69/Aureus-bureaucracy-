import { BuildingGenerator } from './utils/buildingGenerator';

const SLATE = '#6f7378';
const CHARCOAL = '#30363d';
const CONCRETE = '#9ca2a6';
const PALE_STONE = '#c6beb1';
const BRASS = '#b18b57';
const RUST = '#7a5749';
const TIMBER = '#674f3c';
const GLASS = '#8fa3ad';
const DEEP_GLASS = '#60737e';
const OXIDE = '#86483f';
const CANVAS = '#b69b74';
const DUST = '#9a8366';
const MOSS = '#586a4b';
const ASPHALT = '#23272c';
const PAVEMENT = '#aeadab';
const CURB = '#7f8486';
const SIGNAL_RED = '#a24b44';
const SIGNAL_BLUE = '#4f6274';
const SIGNAL_TEAL = '#4f7a74';
const PHONE_RED = '#953d45';
const WARM_LIGHT = '#d6bb71';
const OFF_WHITE = '#d4cec3';

function addFrontSteps(
  gen: BuildingGenerator,
  width: number,
  frontY: number,
  z: number,
  color: string,
  lipColor?: string,
) {
  gen.addBox(-width, frontY, z, width, frontY, z, color);
  if (lipColor) {
    gen.addBox(-width, frontY + 1, z, width, frontY + 1, z, lipColor);
  }
}

function addWindowBand(
  gen: BuildingGenerator,
  x1: number,
  y: number,
  z1: number,
  x2: number,
  z2: number,
  glass: string,
) {
  gen.addBox(x1, y, z1, x2, y, z2, glass);
}

function addRoofCap(
  gen: BuildingGenerator,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  z: number,
  color: string,
) {
  gen.addBox(x1, y1, z, x2, y2, z, color);
}

function addCornerPilasters(
  gen: BuildingGenerator,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  z1: number,
  z2: number,
  color: string,
) {
  gen.addBox(minX, minY, z1, minX, minY, z2, color);
  gen.addBox(maxX, minY, z1, maxX, minY, z2, color);
  gen.addBox(minX, maxY, z1, minX, maxY, z2, color);
  gen.addBox(maxX, maxY, z1, maxX, maxY, z2, color);
}

function addLanternTree(gen: BuildingGenerator, x: number, y: number) {
  gen.addBox(x, y, 0, x, y, 3, TIMBER);
  gen.addBox(x - 2, y - 2, 4, x + 2, y + 2, 6, MOSS);
  gen.addBox(x - 1, y - 1, 7, x + 1, y + 1, 7, MOSS);
  gen.addBox(x, y, 8, x, y, 8, WARM_LIGHT);
}

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

// 7. Street Light - taller street furniture.
const genStreetLight = new BuildingGenerator();
genStreetLight.addBox(0, 0, 0, 0, 0, 7, CHARCOAL);
genStreetLight.addBox(0, 0, 7, 3, 0, 7, CHARCOAL);
genStreetLight.addBox(3, 0, 6, 3, 0, 6, WARM_LIGHT);
genStreetLight.addBox(0, 0, 0, 0, 0, 0, CONCRETE);
export const STREET_LIGHT_VOXELS = genStreetLight.getVoxels();

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
