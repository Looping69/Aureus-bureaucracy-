import { BuildingGenerator } from '../utils/buildingGenerator';

export const SLATE = '#6f7378';
export const CHARCOAL = '#30363d';
export const CONCRETE = '#9ca2a6';
export const PALE_STONE = '#c6beb1';
export const BRASS = '#b18b57';
export const RUST = '#7a5749';
export const TIMBER = '#674f3c';
export const GLASS = '#8fa3ad';
export const DEEP_GLASS = '#60737e';
export const OXIDE = '#86483f';
export const CANVAS = '#b69b74';
export const DUST = '#9a8366';
export const MOSS = '#586a4b';
export const ASPHALT = '#23272c';
export const PAVEMENT = '#aeadab';
export const CURB = '#7f8486';
export const SIGNAL_RED = '#a24b44';
export const SIGNAL_BLUE = '#4f6274';
export const SIGNAL_TEAL = '#4f7a74';
export const PHONE_RED = '#953d45';
export const WARM_LIGHT = '#d6bb71';
export const OFF_WHITE = '#d4cec3';

export function addFrontSteps(
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

export function addWindowBand(
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

export function addRoofCap(
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

export function addCornerPilasters(
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

export function addLanternTree(gen: BuildingGenerator, x: number, y: number) {
  gen.addBox(x, y, 0, x, y, 3, TIMBER);
  gen.addBox(x - 2, y - 2, 4, x + 2, y + 2, 6, MOSS);
  gen.addBox(x - 1, y - 1, 7, x + 1, y + 1, 7, MOSS);
  gen.addBox(x, y, 8, x, y, 8, WARM_LIGHT);
}
