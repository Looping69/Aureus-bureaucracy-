import { BuildingGenerator } from './utils/buildingGenerator';
import {
  CHIEF_HUT_ASSET_VOXELS,
  CITY_HALL_ASSET_VOXELS,
  FIRE_STATION_ASSET_VOXELS,
  FIXER_DEN_ASSET_VOXELS,
  GENERIC_HOUSE_A_ASSET_VOXELS,
  GENERIC_HOUSE_B_ASSET_VOXELS,
  GENERIC_HOUSE_C_ASSET_VOXELS,
  GENERIC_HOUSE_D_ASSET_VOXELS,
  HOTLINE_BOOTH_ASSET_VOXELS,
  HOUSE_TYPE_A_ASSET_VOXELS,
  INSPECTOR_HQ_ASSET_VOXELS,
  LIBRARY_ASSET_VOXELS,
  LICENSING_OFFICE_ASSET_VOXELS,
  PARK_ASSET_VOXELS,
  POLICE_STATION_ASSET_VOXELS,
  UNION_HALL_ASSET_VOXELS,
} from './assetVoxels';

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

function addRoofCap(gen: BuildingGenerator, x1: number, y1: number, x2: number, y2: number, z: number, color: string) {
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
  gen.addBox(x, y, 0, x, y, 2, TIMBER);
  gen.addBox(x - 1, y - 1, 3, x + 1, y + 1, 4, MOSS);
  gen.addBox(x, y, 5, x, y, 5, WARM_LIGHT);
}

// 1. Licensing Office - heavier civic bunker with records annex.
const genLicensing = new BuildingGenerator();
genLicensing.addBox(-4, -4, 0, 4, 4, 0, CHARCOAL);
genLicensing.addBox(-4, -4, 1, 4, 4, 1, SLATE);
genLicensing.addHollowBox(-3, -3, 2, 3, 3, 5, CONCRETE);
genLicensing.addBox(-4, -4, 2, -4, 4, 5, CHARCOAL);
genLicensing.addBox(4, -4, 2, 4, 4, 5, CHARCOAL);
genLicensing.addBox(-2, -4, 2, 2, -4, 4, TIMBER);
genLicensing.addBox(-2, -3, 3, 2, -3, 4, DEEP_GLASS);
genLicensing.addBox(-2, 3, 3, 2, 3, 4, DEEP_GLASS);
genLicensing.addBox(-3, -1, 3, -3, 1, 4, DEEP_GLASS);
genLicensing.addBox(3, -1, 3, 3, 1, 4, DEEP_GLASS);
genLicensing.addBox(-3, 1, 6, 3, 1, 6, SIGNAL_BLUE);
genLicensing.addBox(-2, -1, 6, 2, 3, 7, SLATE);
genLicensing.addBox(1, 2, 2, 3, 4, 4, CHARCOAL);
genLicensing.addBox(1, 2, 5, 3, 4, 5, BRASS);
addFrontSteps(genLicensing, 2, -5, 1, PALE_STONE, CHARCOAL);
addCornerPilasters(genLicensing, -3, -3, 3, 3, 2, 5, CHARCOAL);
export const LICENSING_OFFICE_VOXELS = LICENSING_OFFICE_ASSET_VOXELS;

// 2. Union Hall / Gilded Pick - broader public house with awning and sign.
const genUnion = new BuildingGenerator();
genUnion.addBox(-5, -5, 0, 5, 5, 0, CHARCOAL);
genUnion.addBox(-5, -5, 1, 5, 5, 1, RUST);
genUnion.addHollowBox(-4, -4, 2, 4, 4, 4, OXIDE);
genUnion.addBox(-1, -5, 2, 1, -5, 4, TIMBER);
genUnion.addBox(-4, -4, 3, -2, -4, 3, GLASS);
genUnion.addBox(2, -4, 3, 4, -4, 3, GLASS);
genUnion.addBox(-5, -2, 3, -5, 2, 3, GLASS);
genUnion.addBox(5, -2, 3, 5, 2, 3, GLASS);
genUnion.addBox(-4, -5, 5, 4, -5, 5, BRASS);
genUnion.addBox(-3, -6, 4, 3, -5, 4, CANVAS);
genUnion.addBox(-4, -4, 5, 4, 4, 5, DUST);
genUnion.addBox(-2, -2, 6, 2, 2, 6, BRASS);
genUnion.addBox(0, -5, 6, 0, -5, 8, BRASS);
genUnion.addBox(-1, -5, 8, 1, -5, 8, BRASS);
addFrontSteps(genUnion, 2, -6, 1, PALE_STONE, CHARCOAL);
export const UNION_HALL_VOXELS = UNION_HALL_ASSET_VOXELS;

// 3. Compliance Tower - slender core with podium and observation crown.
const genInspector = new BuildingGenerator();
genInspector.addBox(-3, -3, 0, 3, 3, 0, CHARCOAL);
genInspector.addBox(-3, -3, 1, 3, 3, 1, OFF_WHITE);
genInspector.addHollowBox(-2, -2, 2, 2, 2, 10, OFF_WHITE);
for (let z = 3; z <= 9; z += 2) {
  addWindowBand(genInspector, -1, -2, z, 1, z, GLASS);
  addWindowBand(genInspector, -1, 2, z, 1, z, GLASS);
}
genInspector.addBox(0, -3, 2, 0, -3, 4, CHARCOAL);
genInspector.addBox(-3, -3, 11, 3, 3, 11, OFF_WHITE);
genInspector.addBox(-2, -2, 12, 2, 2, 12, GLASS);
genInspector.addBox(-1, -1, 13, 1, 1, 13, SIGNAL_RED);
genInspector.addBox(-3, 0, 4, -3, 0, 8, SIGNAL_BLUE);
genInspector.addBox(3, 0, 4, 3, 0, 8, SIGNAL_BLUE);
addFrontSteps(genInspector, 1, -4, 1, PALE_STONE, CHARCOAL);
export const INSPECTOR_HQ_VOXELS = INSPECTOR_HQ_ASSET_VOXELS;

// 4. Slink's Salvage - patched yard with shack, lean-to, crates, and scrap gantry.
const genFixer = new BuildingGenerator();
genFixer.addBox(-4, -4, 0, 4, 4, 0, CHARCOAL);
genFixer.addBox(-3, -3, 1, 1, 2, 1, RUST);
genFixer.addHollowBox(-3, -3, 2, 1, 2, 4, RUST);
genFixer.addBox(-2, -3, 2, 0, -3, 3, '#1c1d20');
genFixer.addBox(2, -2, 1, 4, 3, 2, SLATE);
genFixer.addBox(2, -2, 3, 4, 3, 3, CONCRETE);
genFixer.addBox(-4, 2, 1, -2, 4, 2, DUST);
genFixer.addBox(-4, 1, 3, -2, 3, 3, CHARCOAL);
genFixer.addBox(0, 1, 1, 1, 2, 2, TIMBER);
genFixer.addBox(1, 1, 1, 2, 2, 3, CHARCOAL);
genFixer.addBox(3, -4, 1, 3, 4, 1, CHARCOAL);
genFixer.addBox(3, -4, 2, 3, -4, 4, CHARCOAL);
genFixer.addBox(3, 4, 2, 3, 4, 4, CHARCOAL);
genFixer.addBox(2, -4, 4, 4, 4, 4, RUST);
genFixer.addBox(-1, 2, 5, 1, 3, 5, BRASS);
export const FIXER_DEN_VOXELS = FIXER_DEN_ASSET_VOXELS;

// 5. Chief's Hut - layered roof, porch, and lantern poles.
const genChief = new BuildingGenerator();
genChief.addBox(-4, -4, 0, 4, 4, 0, DUST);
genChief.addBox(-3, -3, 1, 3, 3, 1, CANVAS);
genChief.addHollowBox(-3, -3, 2, 3, 3, 3, TIMBER);
genChief.addBox(-1, -4, 2, 1, -4, 3, TIMBER);
genChief.addBox(-2, -3, 3, 2, -3, 3, GLASS);
genChief.addBox(-4, -4, 4, 4, 4, 4, TIMBER);
genChief.addBox(-3, -3, 5, 3, 3, 5, TIMBER);
genChief.addBox(-2, -2, 6, 2, 2, 6, TIMBER);
genChief.addBox(-1, -1, 7, 1, 1, 7, TIMBER);
genChief.addBox(-4, -1, 2, -4, 1, 3, CANVAS);
genChief.addBox(4, -1, 2, 4, 1, 3, CANVAS);
genChief.addBox(0, 0, 8, 0, 0, 8, WARM_LIGHT);
addFrontSteps(genChief, 2, -5, 1, PALE_STONE, DUST);
addLanternTree(genChief, -4, -3);
addLanternTree(genChief, 4, -3);
export const CHIEF_HUT_VOXELS = CHIEF_HUT_ASSET_VOXELS;

// 6. Hotline Booth - richer utility kiosk with roof cap and call panel.
const genHotline = new BuildingGenerator();
genHotline.addBox(-1, -1, 0, 1, 1, 0, CHARCOAL);
genHotline.addBox(-1, -1, 1, 1, 1, 1, PHONE_RED);
genHotline.addHollowBox(-1, -1, 2, 1, 1, 4, PHONE_RED);
genHotline.addBox(-1, -1, 2, 1, -1, 4, GLASS);
genHotline.addBox(-1, 1, 2, 1, 1, 4, GLASS);
genHotline.addBox(0, -1, 2, 0, -1, 3, DEEP_GLASS);
genHotline.addBox(-1, -1, 5, 1, 1, 5, OFF_WHITE);
genHotline.addBox(0, 0, 6, 0, 0, 6, SIGNAL_RED);
export const HOTLINE_BOOTH_VOXELS = HOTLINE_BOOTH_ASSET_VOXELS;

// 7. Street Light - slim pole with warmer lamp head.
const genStreetLight = new BuildingGenerator();
genStreetLight.addBox(0, 0, 0, 0, 0, 5, CHARCOAL);
genStreetLight.addBox(0, 0, 5, 2, 0, 5, CHARCOAL);
genStreetLight.addBox(2, 0, 4, 2, 0, 4, WARM_LIGHT);
genStreetLight.addBox(0, 0, 0, 0, 0, 0, CONCRETE);
export const STREET_LIGHT_VOXELS = genStreetLight.getVoxels();

// 8. Generic House A - compact masonry home with stoop and chimney.
const genHouseA = new BuildingGenerator();
genHouseA.addBox(-3, -3, 0, 3, 3, 0, CHARCOAL);
genHouseA.addBox(-3, -3, 1, 3, 3, 1, CONCRETE);
genHouseA.addHollowBox(-3, -3, 2, 3, 3, 4, RUST);
genHouseA.addBox(0, -3, 2, 0, -3, 4, TIMBER);
genHouseA.addBox(-2, -3, 3, -1, -3, 3, GLASS);
genHouseA.addBox(1, -3, 3, 2, -3, 3, GLASS);
genHouseA.addBox(-3, -2, 3, -3, 1, 3, GLASS);
genHouseA.addBox(-3, -3, 5, 3, 3, 5, SLATE);
genHouseA.addBox(-2, -2, 6, 2, 2, 6, SLATE);
genHouseA.addBox(2, 1, 6, 2, 1, 8, CHARCOAL);
addFrontSteps(genHouseA, 1, -4, 1, PALE_STONE, CHARCOAL);
export const GENERIC_HOUSE_A_VOXELS = GENERIC_HOUSE_A_ASSET_VOXELS;

// 9. Generic House B - stucco home with asymmetrical porch canopy.
const genHouseB = new BuildingGenerator();
genHouseB.addBox(-3, -3, 0, 3, 3, 0, CHARCOAL);
genHouseB.addBox(-3, -3, 1, 3, 3, 1, DUST);
genHouseB.addHollowBox(-3, -3, 2, 3, 3, 4, CANVAS);
genHouseB.addBox(-1, -3, 2, 0, -3, 4, TIMBER);
genHouseB.addBox(2, -3, 3, 2, -3, 3, GLASS);
genHouseB.addBox(-2, -3, 3, -2, -3, 3, GLASS);
genHouseB.addBox(-3, 1, 3, -3, 2, 3, GLASS);
genHouseB.addBox(-3, -3, 5, 3, 3, 5, OXIDE);
genHouseB.addBox(-2, -2, 6, 2, 2, 6, OXIDE);
genHouseB.addBox(-3, -4, 4, 1, -3, 4, TIMBER);
genHouseB.addBox(-2, -4, 3, -2, -4, 4, TIMBER);
genHouseB.addBox(0, -4, 3, 0, -4, 4, TIMBER);
addFrontSteps(genHouseB, 2, -4, 1, PALE_STONE, DUST);
export const GENERIC_HOUSE_B_VOXELS = GENERIC_HOUSE_B_ASSET_VOXELS;

// 9b. Generic House C - brick cottage with planter boxes.
const genHouseC = new BuildingGenerator();
genHouseC.addBox(-3, -3, 0, 3, 3, 0, CHARCOAL);
genHouseC.addBox(-3, -3, 1, 3, 3, 1, PALE_STONE);
genHouseC.addHollowBox(-3, -3, 2, 3, 3, 4, RUST);
genHouseC.addBox(-1, -3, 2, 0, -3, 4, TIMBER);
genHouseC.addBox(2, -3, 3, 2, -3, 3, GLASS);
genHouseC.addBox(-2, -3, 3, -2, -3, 3, GLASS);
genHouseC.addBox(3, -2, 3, 3, 1, 3, GLASS);
genHouseC.addBox(-3, -3, 5, 3, 3, 5, SLATE);
genHouseC.addBox(-2, -2, 6, 2, 2, 6, SLATE);
genHouseC.addBox(-3, -4, 2, -2, -4, 2, MOSS);
genHouseC.addBox(1, -4, 2, 2, -4, 2, MOSS);
addFrontSteps(genHouseC, 1, -4, 1, PALE_STONE, CHARCOAL);
export const GENERIC_HOUSE_C_VOXELS = GENERIC_HOUSE_C_ASSET_VOXELS;

// 9c. Generic House D - industrial worker cabin with metal roof.
const genHouseD = new BuildingGenerator();
genHouseD.addBox(-3, -3, 0, 3, 3, 0, CHARCOAL);
genHouseD.addBox(-3, -3, 1, 3, 3, 1, CONCRETE);
genHouseD.addHollowBox(-3, -3, 2, 3, 3, 4, SLATE);
genHouseD.addBox(0, -3, 2, 1, -3, 4, TIMBER);
genHouseD.addBox(-2, -3, 3, -1, -3, 3, GLASS);
genHouseD.addBox(3, 0, 3, 3, 2, 3, GLASS);
genHouseD.addBox(-3, -3, 5, 3, 3, 5, CHARCOAL);
genHouseD.addBox(-2, -2, 6, 2, 2, 6, CHARCOAL);
genHouseD.addBox(-1, -1, 7, -1, -1, 7, SIGNAL_RED);
addFrontSteps(genHouseD, 1, -4, 1, CONCRETE, CHARCOAL);
export const GENERIC_HOUSE_D_VOXELS = GENERIC_HOUSE_D_ASSET_VOXELS;

// 10. Generic Office - cleaner podium office with stepped crown.
const genOffice = new BuildingGenerator();
genOffice.addBox(-3, -3, 0, 3, 3, 0, CHARCOAL);
genOffice.addBox(-3, -3, 1, 3, 3, 1, OFF_WHITE);
genOffice.addHollowBox(-3, -3, 2, 3, 3, 6, OFF_WHITE);
addWindowBand(genOffice, -2, -3, 3, 2, 3, GLASS);
addWindowBand(genOffice, -2, -3, 5, 2, 5, GLASS);
genOffice.addBox(0, -3, 2, 0, -3, 4, DEEP_GLASS);
genOffice.addBox(-3, -3, 7, 3, 3, 7, SIGNAL_BLUE);
genOffice.addBox(-2, -2, 8, 2, 2, 8, CONCRETE);
addFrontSteps(genOffice, 1, -4, 1, PALE_STONE, CHARCOAL);
export const GENERIC_OFFICE_VOXELS = genOffice.getVoxels();

// 11. Factory - low industrial plant with stacks, gantry and dock.
const genFactory = new BuildingGenerator();
genFactory.addBox(-4, -4, 0, 4, 4, 0, CHARCOAL);
genFactory.addBox(-4, -4, 1, 4, 4, 1, SLATE);
genFactory.addHollowBox(-4, -4, 2, 4, 4, 4, RUST);
genFactory.addBox(-2, -4, 2, 2, -4, 4, '#1b1d20');
genFactory.addBox(-3, 2, 5, -1, 2, 9, CHARCOAL);
genFactory.addBox(1, 2, 5, 3, 2, 8, CHARCOAL);
genFactory.addBox(-4, 1, 5, 4, 1, 5, SLATE);
genFactory.addBox(-4, -4, 5, 4, 4, 5, DUST);
genFactory.addBox(0, 0, 6, 0, 0, 7, WARM_LIGHT);
export const FACTORY_VOXELS = genFactory.getVoxels();

// Stable aliases for legacy "asset" building slots. These now point at
// normalized modular JSON assets from `assets/` so the existing world layout
// can keep its IDs while rendering the authored building set again.
export const ASSET_BUILDING_A_VOXELS = CITY_HALL_ASSET_VOXELS;
export const ASSET_BUILDING_B_VOXELS = LIBRARY_ASSET_VOXELS;
export const ASSET_BUILDING_C_VOXELS = POLICE_STATION_ASSET_VOXELS;
export const ASSET_BUILDING_D_VOXELS = FIRE_STATION_ASSET_VOXELS;
export const ASSET_BUILDING_E_VOXELS = HOUSE_TYPE_A_ASSET_VOXELS;

// 12. Small Park - more like a civic patch than a placeholder square.
const genPark = new BuildingGenerator();
genPark.addBox(-5, -5, 0, 5, 5, 0, '#4e6a4f');
genPark.addBox(-1, -5, 0, 1, 5, 0, CURB);
genPark.addBox(-5, -1, 0, 5, 1, 0, CURB);
addLanternTree(genPark, -3, -3);
addLanternTree(genPark, 3, 2);
genPark.addBox(0, 2, 1, 2, 3, 1, TIMBER);
genPark.addBox(-2, 2, 1, -1, 3, 1, TIMBER);
genPark.addBox(-1, -1, 1, 1, 1, 1, BRASS);
export const PARK_VOXELS = PARK_ASSET_VOXELS;

// Street tiles – each tile spans 14 voxels (−7 … +6) along the travel
// direction so that adjacent road cells connect seamlessly.  Three variants
// are provided: north-south, east-west, and intersection.

// North-South road (centre-line runs along Y)
const genStreetNS = new BuildingGenerator();
genStreetNS.addBox(-4, -7, 0, 4, 6, 0, PAVEMENT);      // sidewalk base
genStreetNS.addBox(-2, -7, 0, 2, 6, 0, ASPHALT);       // carriageway
genStreetNS.addBox(0, -7, 0, 0, 6, 0, OFF_WHITE);      // centre line
genStreetNS.addBox(-4, -7, 0, -3, 6, 0, CURB);         // left curb
genStreetNS.addBox(3, -7, 0, 4, 6, 0, CURB);           // right curb
export const ROAD_NS_VOXELS = genStreetNS.getVoxels();

// East-West road (centre-line runs along X)
const genStreetEW = new BuildingGenerator();
genStreetEW.addBox(-7, -4, 0, 6, 4, 0, PAVEMENT);
genStreetEW.addBox(-7, -2, 0, 6, 2, 0, ASPHALT);
genStreetEW.addBox(-7, 0, 0, 6, 0, 0, OFF_WHITE);      // centre line along X
genStreetEW.addBox(-7, -4, 0, 6, -3, 0, CURB);         // top curb
genStreetEW.addBox(-7, 3, 0, 6, 4, 0, CURB);           // bottom curb
export const ROAD_EW_VOXELS = genStreetEW.getVoxels();

// Intersection (centre-lines in both directions)
const genStreetX = new BuildingGenerator();
genStreetX.addBox(-7, -7, 0, 6, 6, 0, PAVEMENT);       // full paving slab
genStreetX.addBox(-2, -7, 0, 2, 6, 0, ASPHALT);        // NS carriageway
genStreetX.addBox(-7, -2, 0, 6, 2, 0, ASPHALT);        // EW carriageway
genStreetX.addBox(0, -7, 0, 0, 6, 0, OFF_WHITE);       // NS centre line
genStreetX.addBox(-7, 0, 0, 6, 0, 0, OFF_WHITE);       // EW centre line
// curbs in the four corners only
genStreetX.addBox(-7, -7, 0, -3, -3, 0, CURB);
genStreetX.addBox(3, -7, 0, 6, -3, 0, CURB);
genStreetX.addBox(-7, 3, 0, -3, 6, 0, CURB);
genStreetX.addBox(3, 3, 0, 6, 6, 0, CURB);
export const ROAD_CROSS_VOXELS = genStreetX.getVoxels();

// Backwards-compatible aliases used by CityPlanner and cityLayout.
// SIDEWALK_VOXELS uses the EW variant so that sidewalk tiles placed by
// the legacy city-planner tool still render with reasonable lane markings;
// the original single-tile design had no orientation, so either variant
// is a valid stand-in.
export const STREET_VOXELS = ROAD_NS_VOXELS;
export const ROAD_VOXELS = ROAD_NS_VOXELS;
export const SIDEWALK_VOXELS = ROAD_EW_VOXELS;

// ── Foliage / trees ──────────────────────────────────────────────────

// 13. Oak-style tree – larger standalone tree for decorating empty lots.
const genTreeA = new BuildingGenerator();
genTreeA.addBox(0, 0, 0, 0, 0, 0, CHARCOAL);   // base
genTreeA.addBox(0, 0, 1, 0, 0, 4, TIMBER);      // trunk
genTreeA.addBox(-2, -2, 5, 2, 2, 7, MOSS);      // canopy core
genTreeA.addBox(-1, -1, 8, 1, 1, 8, MOSS);      // canopy top
genTreeA.addBox(-3, 0, 6, 3, 0, 6, MOSS);       // canopy spread X
genTreeA.addBox(0, -3, 6, 0, 3, 6, MOSS);       // canopy spread Y
export const TREE_A_VOXELS = genTreeA.getVoxels();

// 14. Pine-style tree – tall narrow evergreen.
const genTreeB = new BuildingGenerator();
genTreeB.addBox(0, 0, 0, 0, 0, 0, CHARCOAL);
genTreeB.addBox(0, 0, 1, 0, 0, 3, TIMBER);
genTreeB.addBox(-1, -1, 4, 1, 1, 5, '#3a5a3a');
genTreeB.addBox(0, 0, 6, 0, 0, 7, '#3a5a3a');
genTreeB.addBox(-2, -2, 3, 2, 2, 4, '#4a6a4a');
export const TREE_B_VOXELS = genTreeB.getVoxels();

// 15. Bush / shrub cluster – low foliage filler.
const genBush = new BuildingGenerator();
genBush.addBox(-1, -1, 0, 1, 1, 0, '#4e6a4f');  // ground
genBush.addBox(-1, -1, 1, 1, 1, 2, MOSS);       // bush body
genBush.addBox(0, 0, 3, 0, 0, 3, '#5a7a5a');    // top tuft
export const BUSH_VOXELS = genBush.getVoxels();

// 16. Small garden plot – decorative mini-park tile.
const genGarden = new BuildingGenerator();
genGarden.addBox(-3, -3, 0, 3, 3, 0, '#4e6a4f'); // grass base
genGarden.addBox(-1, -1, 0, 1, 1, 0, CURB);      // stone path
// Trees at corners
genGarden.addBox(-2, -2, 1, -2, -2, 3, TIMBER);
genGarden.addBox(-3, -3, 4, -1, -1, 5, MOSS);
genGarden.addBox(2, 2, 1, 2, 2, 3, TIMBER);
genGarden.addBox(1, 1, 4, 3, 3, 5, MOSS);
// Flower bed
genGarden.addBox(-2, 1, 1, -1, 2, 1, '#a85858'); // red flowers
genGarden.addBox(1, -2, 1, 2, -1, 1, '#8a7a4a'); // yellow flowers
export const GARDEN_VOXELS = genGarden.getVoxels();
