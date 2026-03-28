import { BuildingGenerator } from './utils/buildingGenerator';

const CHARCOAL = '#2d3339';
const SLATE = '#5d636a';
const CONCRETE = '#9ba1a6';
const GLASS = '#88a0a8';
const TIMBER = '#6b4f3d';
const SIGNAL_RED = '#9f4742';
const SIGNAL_TEAL = '#4d7e7a';
const WARM_LIGHT = '#d7bf73';
const ROOF = '#6d5445';
const OFF_WHITE = '#c9c0b2';

const genPlayerHouse = new BuildingGenerator();
genPlayerHouse.addBox(-3, -3, 0, 3, 3, 0, CHARCOAL);
genPlayerHouse.addBox(-3, -3, 1, 3, 3, 1, CONCRETE);
genPlayerHouse.addHollowBox(-3, -3, 2, 3, 3, 4, SLATE);
genPlayerHouse.addBox(-1, -3, 2, 1, -3, 4, TIMBER);
genPlayerHouse.addBox(-3, -2, 3, -3, 1, 3, GLASS);
genPlayerHouse.addBox(3, -1, 3, 3, 2, 3, GLASS);
genPlayerHouse.addBox(-1, 3, 3, 1, 3, 3, GLASS);
genPlayerHouse.addBox(-4, -4, 5, 4, 4, 5, CONCRETE);
genPlayerHouse.addBox(-3, -3, 6, 3, 3, 6, ROOF);
genPlayerHouse.addBox(-2, -2, 7, 2, 2, 7, ROOF);
genPlayerHouse.addBox(-1, -1, 8, 1, 1, 8, ROOF);
genPlayerHouse.addBox(-4, -1, 2, -4, 1, 4, SIGNAL_TEAL);
genPlayerHouse.addBox(4, -1, 2, 4, 1, 4, SIGNAL_TEAL);
genPlayerHouse.addBox(-3, -4, 2, 3, -4, 2, OFF_WHITE);
genPlayerHouse.addBox(-2, -4, 1, 2, -4, 1, CONCRETE);
genPlayerHouse.addBox(-2, -4, 3, -2, -4, 4, TIMBER);
genPlayerHouse.addBox(2, -4, 3, 2, -4, 4, TIMBER);
genPlayerHouse.addBox(0, 0, 9, 0, 0, 10, CHARCOAL);
genPlayerHouse.addBox(0, 0, 11, 0, 0, 11, SIGNAL_RED);
genPlayerHouse.addBox(-2, -3, 3, -1, -3, 3, WARM_LIGHT);
genPlayerHouse.addBox(2, -3, 3, 2, -3, 3, WARM_LIGHT);
genPlayerHouse.addBox(0, 3, 3, 0, 3, 3, WARM_LIGHT);

export const PLAYER_HOUSE_VOXELS = genPlayerHouse.getVoxels();

export const OFFICE_VOXELS = [
  { id: 0, x: -2, y: -2, z: 0, c: '#808080' },
  { id: 1, x: -2, y: 2, z: 0, c: '#808080' },
  { id: 2, x: 2, y: -2, z: 0, c: '#808080' },
  { id: 3, x: 2, y: 2, z: 0, c: '#808080' },
  { id: 4, x: 0, y: -2, z: 0, c: '#4b2c20' },
  { id: 5, x: 0, y: -2, z: 1, c: '#4b2c20' },
  { id: 6, x: 0, y: 0, z: 2, c: '#3b2f2f' },
];

export const PUB_VOXELS = [
  { id: 0, x: -3, y: -3, z: 0, c: '#a52a2a' },
  { id: 1, x: -3, y: 3, z: 0, c: '#a52a2a' },
  { id: 2, x: 3, y: -3, z: 0, c: '#a52a2a' },
  { id: 3, x: 3, y: 3, z: 0, c: '#a52a2a' },
  { id: 4, x: -3, y: 0, z: 1, c: '#add8e6' },
  { id: 5, x: 3, y: 0, z: 1, c: '#add8e6' },
  { id: 6, x: 0, y: 0, z: 3, c: '#8b4513' },
];
