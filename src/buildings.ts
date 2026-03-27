import { BuildingGenerator } from './utils/buildingGenerator';

// COLORS
const GREY = "#7c7f84";
const DARK_GREY = "#454b52";
const BRICK = "#7b554c";
const WOOD = "#6b523d";
const GLASS = "#8fa1ad";
const GOLD = "#b08b57";
const WHITE = "#c8c1b6";
const RED = "#8e4a45";
const RUST = "#6f4b3f";
const BLUE = "#556270";

// 1. Licensing Office (Officer Vane) - Brutalist Bureaucracy
const genLicensing = new BuildingGenerator();
genLicensing.addBox(-4, -4, 0, 4, 4, 0, DARK_GREY); // Foundation
genLicensing.addHollowBox(-3, -3, 1, 3, 3, 4, GREY); // Main body
genLicensing.addBox(-1, -3, 1, 1, -3, 2, "#4c372b"); // Heavy door
genLicensing.addBox(-2, -3, 3, 2, -3, 3, GLASS); // High window
genLicensing.addBox(-3, 0, 5, 3, 0, 5, BLUE); // Blue stripe
genLicensing.addBox(-2, -2, 5, 2, 2, 6, GREY); // Top block
export const LICENSING_OFFICE_VOXELS = genLicensing.getVoxels();

// 2. Union Hall (Big Sal) - The Gilded Pick
const genUnion = new BuildingGenerator();
genUnion.addBox(-5, -5, 0, 5, 5, 0, DARK_GREY);
genUnion.addHollowBox(-4, -4, 1, 4, 4, 4, BRICK);
genUnion.addBox(-1, -4, 1, 1, -4, 2, WOOD); // Double doors
genUnion.addBox(-3, -4, 2, -2, -4, 3, GLASS); // Window L
genUnion.addBox(2, -4, 2, 3, -4, 3, GLASS); // Window R
genUnion.addBox(-1, -5, 5, 1, -5, 5, GOLD); // The "Pick" sign base
genUnion.addBox(0, -5, 5, 0, -5, 7, GOLD); // Pick handle
genUnion.addBox(-1, -5, 7, 1, -5, 7, GOLD); // Pick head
export const UNION_HALL_VOXELS = genUnion.getVoxels();

// 3. Compliance Tower (Inspector Krell) - Clinical & Tall
const genInspector = new BuildingGenerator();
genInspector.addBox(-3, -3, 0, 3, 3, 0, WHITE);
genInspector.addHollowBox(-2, -2, 1, 2, 2, 10, WHITE); // Tall tower
for(let z=2; z<10; z+=2) {
  genInspector.addBox(-2, -2, z, 2, -2, z, GLASS); // Windows every 2 floors
}
genInspector.addBox(-1, -2, 1, 1, -2, 2, DARK_GREY); // Entrance
genInspector.addBox(-3, -3, 10, 3, 3, 11, WHITE); // Top observation deck
genInspector.addBox(-2, -2, 11, 2, 2, 11, GLASS); // Observation windows
export const INSPECTOR_HQ_VOXELS = genInspector.getVoxels();

// 4. Slink's Salvage (Slink) - Scrap & Chaos
const genFixer = new BuildingGenerator();
genFixer.addBox(-4, -4, 0, 4, 4, 0, DARK_GREY);
genFixer.addBox(-3, -3, 1, 1, 2, 3, RUST); // Main shack
genFixer.addBox(2, -2, 1, 4, 3, 2, GREY); // Lean-to
genFixer.addBox(-4, 2, 1, -2, 4, 1, RUST); // Scrap pile 1
genFixer.addBox(1, 1, 1, 2, 2, 2, DARK_GREY); // Crate
genFixer.addBox(-1, -3, 1, 0, -3, 2, "#000"); // Dark entrance
export const FIXER_DEN_VOXELS = genFixer.getVoxels();

// 5. Chief's Hut (Chief Okon) - Organic & Traditional
const genChief = new BuildingGenerator();
genChief.addBox(-4, -4, 0, 4, 4, 0, "#b7a081"); // Sand base
genChief.addHollowBox(-3, -3, 1, 3, 3, 2, WOOD); // Walls
genChief.addBox(-4, -4, 3, 4, 4, 3, "#6a4e3a"); // Roof base
genChief.addBox(-3, -3, 4, 3, 3, 4, "#6a4e3a"); // Roof mid
genChief.addBox(-1, -1, 5, 1, 1, 5, "#6a4e3a"); // Roof top
genChief.addBox(0, -3, 1, 0, -3, 2, "#000"); // Entrance
export const CHIEF_HUT_VOXELS = genChief.getVoxels();

// 6. Hotline Booth (Elena Vox) - Iconic Red
const genHotline = new BuildingGenerator();
genHotline.addBox(-1, -1, 0, 1, 1, 0, DARK_GREY);
genHotline.addHollowBox(-1, -1, 1, 1, 1, 4, RED);
genHotline.addBox(-1, -1, 2, 1, -1, 3, GLASS); // Front glass
genHotline.addBox(-1, 1, 2, 1, 1, 3, GLASS); // Back glass
genHotline.addBox(-1, -1, 4, 1, 1, 4, RED); // Roof
export const HOTLINE_BOOTH_VOXELS = genHotline.getVoxels();

// 7. Street Light
const genStreetLight = new BuildingGenerator();
genStreetLight.addBox(0, 0, 0, 0, 0, 5, DARK_GREY); // Pole
genStreetLight.addBox(0, 0, 5, 1, 0, 5, DARK_GREY); // Arm
genStreetLight.addBox(1, 0, 4, 1, 0, 4, "#ffffcc"); // Light
export const STREET_LIGHT_VOXELS = genStreetLight.getVoxels();

// 8. Generic House A
const genHouseA = new BuildingGenerator();
genHouseA.addBox(-3, -3, 0, 3, 3, 0, GREY);
genHouseA.addHollowBox(-3, -3, 1, 3, 3, 3, BRICK);
genHouseA.addBox(-3, -3, 4, 3, 3, 4, DARK_GREY); // Roof
genHouseA.addBox(0, -3, 1, 0, -3, 2, WOOD); // Door
genHouseA.addBox(-2, -3, 2, -1, -3, 2, GLASS); // Window
export const GENERIC_HOUSE_A_VOXELS = genHouseA.getVoxels();

// 9. Generic House B
const genHouseB = new BuildingGenerator();
genHouseB.addBox(-3, -3, 0, 3, 3, 0, GREY);
genHouseB.addHollowBox(-3, -3, 1, 3, 3, 3, "#b39e83"); // Sandstone
genHouseB.addBox(-3, -3, 4, 3, 3, 4, RUST); // Roof
genHouseB.addBox(0, -3, 1, 0, -3, 2, WOOD); // Door
genHouseB.addBox(2, -3, 2, 2, -3, 2, GLASS); // Window
export const GENERIC_HOUSE_B_VOXELS = genHouseB.getVoxels();

// 10. Generic Office
const genOffice = new BuildingGenerator();
genOffice.addBox(-3, -3, 0, 3, 3, 0, GREY);
genOffice.addHollowBox(-3, -3, 1, 3, 3, 6, WHITE);
genOffice.addBox(0, -3, 1, 0, -3, 2, GLASS); // Door
genOffice.addBox(-2, -3, 2, 2, -3, 2, GLASS); // Window 1
genOffice.addBox(-2, -3, 4, 2, -3, 4, GLASS); // Window 2
export const GENERIC_OFFICE_VOXELS = genOffice.getVoxels();

// 11. Generic Factory
const genFactory = new BuildingGenerator();
genFactory.addBox(-4, -4, 0, 4, 4, 0, DARK_GREY);
genFactory.addHollowBox(-4, -4, 1, 4, 4, 4, RUST);
genFactory.addBox(-2, -4, 1, 2, -4, 3, "#1f2226"); // Big door
genFactory.addBox(-3, 2, 4, -1, 2, 8, DARK_GREY); // Smokestack 1
genFactory.addBox(1, 2, 4, 3, 2, 7, DARK_GREY); // Smokestack 2
export const FACTORY_VOXELS = genFactory.getVoxels();

// 12. Small Park
const genPark = new BuildingGenerator();
genPark.addBox(-5, -5, 0, 5, 5, 0, "#426345"); // Grass base
genPark.addBox(-1, -1, 0, 1, 1, 0, GREY); // Center path
// Tree 1
genPark.addBox(-3, -3, 0, -3, -3, 2, WOOD);
genPark.addBox(-4, -4, 2, -2, -2, 4, "#426345");
// Tree 2
genPark.addBox(3, 2, 0, 3, 2, 3, WOOD);
genPark.addBox(2, 1, 3, 4, 3, 5, "#426345");
// Bench
genPark.addBox(0, 2, 1, 2, 3, 1, WOOD);
export const PARK_VOXELS = genPark.getVoxels();

// 13. Sidewalk Block
const genSidewalk = new BuildingGenerator();
genSidewalk.addBox(-5, -5, 0, 4, 4, 0, "#b2b1ac");
genSidewalk.addHollowBox(-5, -5, 0, 4, 4, 0, "#8f918d"); // Border
export const SIDEWALK_VOXELS = genSidewalk.getVoxels();

// 14. Road Block
const genRoad = new BuildingGenerator();
genRoad.addBox(-5, -5, 0, 4, 4, 0, "#2a2d31"); // Asphalt
genRoad.addBox(-1, -1, 0, 0, 0, 0, "#c9c5bb"); // Center marking
export const ROAD_VOXELS = genRoad.getVoxels();
