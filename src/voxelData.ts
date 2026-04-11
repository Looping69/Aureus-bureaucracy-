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
genPlayerHouse.addBox(-5, -5, 0, 5, 5, 0, CHARCOAL);
genPlayerHouse.addBox(-5, -5, 1, 5, 5, 1, CONCRETE);
genPlayerHouse.addHollowBox(-5, -5, 2, 5, 4, 5, SLATE);
genPlayerHouse.addBox(-2, -5, 2, 2, -5, 5, TIMBER);
genPlayerHouse.addBox(-5, -3, 3, -5, 2, 4, GLASS);
genPlayerHouse.addBox(5, -1, 3, 5, 3, 4, GLASS);
genPlayerHouse.addBox(-2, 5, 3, 2, 5, 4, GLASS);
genPlayerHouse.addBox(-6, -6, 6, 6, 6, 6, CONCRETE);
genPlayerHouse.addBox(-5, -5, 7, 5, 5, 7, ROOF);
genPlayerHouse.addBox(-3, -3, 8, 3, 3, 8, ROOF);
genPlayerHouse.addBox(-1, -1, 9, 1, 1, 9, ROOF);
genPlayerHouse.addBox(-6, -2, 2, -6, 2, 4, SIGNAL_TEAL);
genPlayerHouse.addBox(6, -2, 2, 6, 2, 4, SIGNAL_TEAL);
genPlayerHouse.addBox(-4, -6, 2, 4, -6, 2, OFF_WHITE);
genPlayerHouse.addBox(-3, -6, 1, 3, -6, 1, CONCRETE);
genPlayerHouse.addBox(-3, -6, 3, -2, -6, 5, TIMBER);
genPlayerHouse.addBox(2, -6, 3, 3, -6, 5, TIMBER);
genPlayerHouse.addBox(0, 0, 10, 0, 0, 11, CHARCOAL);
genPlayerHouse.addBox(0, 0, 12, 0, 0, 12, SIGNAL_RED);
genPlayerHouse.addBox(-3, -5, 3, -2, -5, 3, WARM_LIGHT);
genPlayerHouse.addBox(2, -5, 3, 3, -5, 3, WARM_LIGHT);
genPlayerHouse.addBox(0, 5, 3, 0, 5, 3, WARM_LIGHT);

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
