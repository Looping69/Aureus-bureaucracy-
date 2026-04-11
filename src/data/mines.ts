import { Tile, Mine } from '../types';

export const generateGrid = (width: number, height: number, yieldRate: number = 0.2): Tile[] => {
  const grid: Tile[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isOre = Math.random() < yieldRate;
      const isRock = !isOre && Math.random() < 0.15;
      const type: Tile['type'] = isOre ? 'ORE' : (isRock ? 'ROCK' : 'DIRT');
      const stability = isRock
        ? 80 + Math.floor(Math.random() * 21)
        : 45 + Math.floor(Math.random() * 56);

      grid.push({
        id: `${x}-${y}`,
        x,
        y,
        z: 0,
        type,
        stability,
        mined: false,
        revealed: false
      });
    }
  }
  return grid;
};

export const INITIAL_MINES: Mine[] = [
  {
    id: 'iron-vein',
    name: 'Iron Vein Outpost',
    location: 'OUTSKIRTS',
    travelTime: 2,
    hasLocals: false,
    yield: 1,
    danger: 10,
    discovered: true,
    grid: generateGrid(5, 10, 0.3), // 5x10 grid (50 tiles)
    gridWidth: 5,
    gridHeight: 10,
    status: 'PROSPECTING', // Starts in prospecting phase
    prospectingCount: 0,
    permits: {
      prospectingId: 'prospecting-license',
      miningId: 'mining-permit-iron'
    }
  },
  {
    id: 'deep-hollow',
    name: 'Deep Hollow',
    location: 'DEEP_WASTE',
    travelTime: 6,
    hasLocals: true,
    chiefId: 'chief',
    yield: 3,
    danger: 40,
    discovered: false,
    grid: generateGrid(8, 15, 0.5), // Larger grid
    gridWidth: 8,
    gridHeight: 15,
    status: 'LOCKED',
    prospectingCount: 0,
    permits: {
      prospectingId: 'prospecting-permit-deep',
      miningId: 'mining-permit-deep'
    }
  },
  {
    id: 'abyssal-reach',
    name: 'Abyssal Reach',
    location: 'DEEP_WASTE',
    travelTime: 12,
    hasLocals: false,
    yield: 10,
    danger: 90,
    discovered: false,
    grid: generateGrid(10, 20, 0.8), // Huge grid
    gridWidth: 10,
    gridHeight: 20,
    status: 'LOCKED',
    prospectingCount: 0,
    permits: {
      prospectingId: 'prospecting-permit-abyss',
      miningId: 'mining-permit-abyss'
    }
  }
];
