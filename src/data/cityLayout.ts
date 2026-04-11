import { Building, WorldPosition } from '../types';
import { WORLD_SIZE as SHARED_WORLD_SIZE } from '../utils/voxelConstants';
import { PLAYER_HOUSE_VOXELS } from '../voxelData';
import {
  ASSET_BUILDING_A_VOXELS,
  ASSET_BUILDING_B_VOXELS,
  ASSET_BUILDING_C_VOXELS,
  ASSET_BUILDING_D_VOXELS,
  ASSET_BUILDING_E_VOXELS,
} from '../assetBuildings';
import { 
  LICENSING_OFFICE_VOXELS, 
  UNION_HALL_VOXELS, 
  INSPECTOR_HQ_VOXELS, 
  FIXER_DEN_VOXELS, 
  CHIEF_HUT_VOXELS, 
  HOTLINE_BOOTH_VOXELS,
  PARK_VOXELS,
  ROAD_NS_VOXELS,
  ROAD_EW_VOXELS,
  ROAD_CROSS_VOXELS,
  GENERIC_HOUSE_A_VOXELS,
  GENERIC_HOUSE_B_VOXELS,
  GENERIC_OFFICE_VOXELS,
  FACTORY_VOXELS,
  TREE_A_VOXELS,
  TREE_B_VOXELS,
  BUSH_VOXELS,
  GARDEN_VOXELS,
  GENERIC_HOUSE_C_VOXELS,
  GENERIC_HOUSE_D_VOXELS,
} from '../buildings';

const WORLD_SIZE = SHARED_WORLD_SIZE;
const WORLD_CENTER = WORLD_SIZE / 2;

const CITY_CELL_SIZE = 14;
const CITY_GRID_WIDTH = 13;
const CITY_GRID_HEIGHT = 13;
const CITY_ORIGIN = {
  x: WORLD_CENTER - Math.floor((CITY_GRID_WIDTH - 1) * CITY_CELL_SIZE / 2),
  y: WORLD_CENTER - Math.floor((CITY_GRID_HEIGHT - 1) * CITY_CELL_SIZE / 2),
};

type CityCell = { x: number; y: number };

const toWorldFromCityCell = ({ x, y }: CityCell): WorldPosition => ({
  x: CITY_ORIGIN.x + x * CITY_CELL_SIZE,
  y: CITY_ORIGIN.y + y * CITY_CELL_SIZE,
});

const createCityLine = (start: CityCell, end: CityCell): CityCell[] => {
  const dx = Math.sign(end.x - start.x);
  const dy = Math.sign(end.y - start.y);
  const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
  return Array.from({ length: steps + 1 }, (_, index) => ({
    x: start.x + dx * index,
    y: start.y + dy * index,
  }));
};

const createPlacedTiles = (
  prefix: string,
  type: 'ROAD' | 'SIDEWALK',
  cells: CityCell[],
  voxels: { id: number, x: number, y: number, z: number, c: string }[],
  occupiedCells: Set<string>,
  discovered: boolean = true
): Record<string, Building> => {
  const tiles: Record<string, Building> = {};

  cells.forEach((cell, index) => {
    const key = `${cell.x},${cell.y}`;
    if (occupiedCells.has(key)) {
      throw new Error(`City layout overlap at cell ${key} while placing ${prefix}`);
    }
    occupiedCells.add(key);

    const id = `${prefix}_${index}`;
    tiles[id] = {
      id,
      npcId: 'none',
      name: type === 'ROAD' ? 'Road' : 'Sidewalk',
      pos: toWorldFromCityCell(cell),
      type,
      isDiscovered: discovered,
      voxels,
    };
  });

  return tiles;
};

const createPlacedBuilding = (
  cell: CityCell,
  building: Omit<Building, 'pos'>,
  occupiedCells: Set<string>
): Building => {
  const key = `${cell.x},${cell.y}`;
  if (occupiedCells.has(key)) {
    throw new Error(`City layout overlap at cell ${key} while placing ${building.id}`);
  }
  occupiedCells.add(key);

  return {
    ...building,
    pos: toWorldFromCityCell(cell),
  };
};

const getLayoutBounds = (buildings: Record<string, Building>) => {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  Object.values(buildings).forEach((building) => {
    if (building.voxels && building.voxels.length > 0) {
      building.voxels.forEach((voxel) => {
        bounds.minX = Math.min(bounds.minX, building.pos.x + voxel.x);
        bounds.maxX = Math.max(bounds.maxX, building.pos.x + voxel.x);
        bounds.minY = Math.min(bounds.minY, building.pos.y + voxel.y);
        bounds.maxY = Math.max(bounds.maxY, building.pos.y + voxel.y);
      });
      return;
    }

    bounds.minX = Math.min(bounds.minX, building.pos.x);
    bounds.maxX = Math.max(bounds.maxX, building.pos.x);
    bounds.minY = Math.min(bounds.minY, building.pos.y);
    bounds.maxY = Math.max(bounds.maxY, building.pos.y);
  });

  return bounds;
};

const normalizeWorldLayout = (buildings: Record<string, Building>) => {
  const WORLD_PADDING = 16;
  const bounds = getLayoutBounds(buildings);
  const currentCenterX = (bounds.minX + bounds.maxX) / 2;
  const currentCenterY = (bounds.minY + bounds.maxY) / 2;

  let offsetX = Math.round(WORLD_CENTER - currentCenterX);
  let offsetY = Math.round(WORLD_CENTER - currentCenterY);

  const shiftedMinX = bounds.minX + offsetX;
  const shiftedMaxX = bounds.maxX + offsetX;
  const shiftedMinY = bounds.minY + offsetY;
  const shiftedMaxY = bounds.maxY + offsetY;

  if (shiftedMinX < WORLD_PADDING) offsetX += WORLD_PADDING - shiftedMinX;
  if (shiftedMaxX > WORLD_SIZE - 1 - WORLD_PADDING) offsetX -= shiftedMaxX - (WORLD_SIZE - 1 - WORLD_PADDING);
  if (shiftedMinY < WORLD_PADDING) offsetY += WORLD_PADDING - shiftedMinY;
  if (shiftedMaxY > WORLD_SIZE - 1 - WORLD_PADDING) offsetY -= shiftedMaxY - (WORLD_SIZE - 1 - WORLD_PADDING);

  return Object.fromEntries(
    Object.entries(buildings).map(([id, building]) => [
      id,
      {
        ...building,
        pos: {
          x: building.pos.x + offsetX,
          y: building.pos.y + offsetY,
        },
      },
    ])
  ) as Record<string, Building>;
};

const occupiedCityCells = new Set<string>();

// ── Road network ─────────────────────────────────────────────────────
// The city is rebuilt around larger structures rather than squeezing
// oversized footprints into the old compact grid. Roads remain on the
// 14-unit tile cadence so the existing road voxel pieces still join up.
//
// Layout:
// - Main Avenue runs north/south through the middle of town.
// - Grand Crossing carries the civic core east/west.
// - North Terrace serves housing and the fixer quarter.
// - South Works serves the inspector/factory district.

const cityStreets: Record<string, Building> = {
  ...createPlacedTiles(
    'main_ave_low',
    'ROAD',
    createCityLine({ x: 6, y: 0 }, { x: 6, y: 1 }),
    ROAD_NS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'main_ave_mid_a',
    'ROAD',
    createCityLine({ x: 6, y: 3 }, { x: 6, y: 3 }),
    ROAD_NS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'main_ave_mid_b',
    'ROAD',
    createCityLine({ x: 6, y: 5 }, { x: 6, y: 5 }),
    ROAD_NS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'main_ave_mid_c',
    'ROAD',
    createCityLine({ x: 6, y: 7 }, { x: 6, y: 7 }),
    ROAD_NS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'main_ave_high',
    'ROAD',
    createCityLine({ x: 6, y: 9 }, { x: 6, y: 9 }),
    ROAD_NS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'main_ave_top',
    'ROAD',
    createCityLine({ x: 6, y: 11 }, { x: 6, y: 11 }),
    ROAD_NS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'south_works_w',
    'ROAD',
    createCityLine({ x: 0, y: 2 }, { x: 5, y: 2 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'south_works_e',
    'ROAD',
    createCityLine({ x: 7, y: 2 }, { x: 12, y: 2 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'south_market_w',
    'ROAD',
    createCityLine({ x: 0, y: 4 }, { x: 5, y: 4 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'south_market_e',
    'ROAD',
    createCityLine({ x: 7, y: 4 }, { x: 12, y: 4 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'grand_cross_w',
    'ROAD',
    createCityLine({ x: 0, y: 6 }, { x: 5, y: 6 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'grand_cross_e',
    'ROAD',
    createCityLine({ x: 7, y: 6 }, { x: 12, y: 6 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'north_market_w',
    'ROAD',
    createCityLine({ x: 0, y: 8 }, { x: 5, y: 8 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'north_market_e',
    'ROAD',
    createCityLine({ x: 7, y: 8 }, { x: 12, y: 8 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'north_terrace_w',
    'ROAD',
    createCityLine({ x: 0, y: 10 }, { x: 5, y: 10 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'north_terrace_e',
    'ROAD',
    createCityLine({ x: 7, y: 10 }, { x: 12, y: 10 }),
    ROAD_EW_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'avenue_cross_south',
    'ROAD',
    [{ x: 6, y: 2 }],
    ROAD_CROSS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'avenue_cross_market_s',
    'ROAD',
    [{ x: 6, y: 4 }],
    ROAD_CROSS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'avenue_cross_main',
    'ROAD',
    [{ x: 6, y: 6 }],
    ROAD_CROSS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'avenue_cross_market_n',
    'ROAD',
    [{ x: 6, y: 8 }],
    ROAD_CROSS_VOXELS,
    occupiedCityCells
  ),
  ...createPlacedTiles(
    'avenue_cross_north',
    'ROAD',
    [{ x: 6, y: 10 }],
    ROAD_CROSS_VOXELS,
    occupiedCityCells
  ),
};

// ── Building placement ───────────────────────────────────────────────
// Buildings sit on a wider 13x13 planning grid with intentional empty lots
// around the bigger footprints. Story-critical structures remain on the road
// network and keep their original IDs.

const baseBuildings: Record<string, Building> = {
  player_home: createPlacedBuilding(
    { x: 2, y: 9 },
    {
      id: 'player_home',
      npcId: 'none',
      name: 'Your House',
      type: 'HOME',
      isDiscovered: true,
      voxels: PLAYER_HOUSE_VOXELS,
    },
    occupiedCityCells
  ),
  licensing_office: createPlacedBuilding(
    { x: 2, y: 7 },
    {
      id: 'licensing_office',
      npcId: 'licensing',
      name: 'Bureau of Extraction',
      type: 'OFFICE',
      isDiscovered: false,
      explorationItems: ['vane_ledger', 'trash_can_vane'],
      voxels: LICENSING_OFFICE_VOXELS,
    },
    occupiedCityCells
  ),
  union_hall: createPlacedBuilding(
    { x: 8, y: 7 },
    {
      id: 'union_hall',
      npcId: 'union',
      name: 'The Gilded Pick',
      type: 'PUB',
      isDiscovered: false,
      explorationItems: ['sal_cigar_box'],
      voxels: UNION_HALL_VOXELS,
    },
    occupiedCityCells
  ),
  inspector_hq: createPlacedBuilding(
    { x: 12, y: 3 },
    {
      id: 'inspector_hq',
      npcId: 'inspector',
      name: 'Compliance Tower',
      type: 'OFFICE',
      isDiscovered: false,
      explorationItems: ['krell_blueprints'],
      voxels: INSPECTOR_HQ_VOXELS,
    },
    occupiedCityCells
  ),
  fixer_den: createPlacedBuilding(
    { x: 10, y: 9 },
    {
      id: 'fixer_den',
      npcId: 'fixer',
      name: 'Slink\'s Salvage',
      type: 'HOME',
      isDiscovered: false,
      voxels: FIXER_DEN_VOXELS,
    },
    occupiedCityCells
  ),
  hotline_booth: createPlacedBuilding(
    { x: 0, y: 5 },
    {
      id: 'hotline_booth',
      npcId: 'journalist',
      name: 'Hotline Booth',
      type: 'HOTLINE',
      isDiscovered: false,
      voxels: HOTLINE_BOOTH_VOXELS,
    },
    occupiedCityCells
  ),
  chief_hut: createPlacedBuilding(
    { x: 0, y: 7 },
    {
      id: 'chief_hut',
      npcId: 'chief',
      name: 'Chief\'s Hut',
      type: 'HOME',
      isDiscovered: false,
      voxels: CHIEF_HUT_VOXELS,
    },
    occupiedCityCells
  ),
  mine_entrance: createPlacedBuilding(
    { x: 6, y: 12 },
    {
      id: 'mine_entrance',
      npcId: 'none',
      name: 'Sector 4 Entrance',
      type: 'MINE_ENTRANCE',
      isDiscovered: false,
    },
    occupiedCityCells
  ),
  central_park: createPlacedBuilding(
    { x: 4, y: 7 },
    {
      id: 'central_park',
      npcId: 'none',
      name: 'Dusty Palms Park',
      type: 'PARK',
      isDiscovered: true,
      description: 'The only place with actual (dying) trees.',
      voxels: PARK_VOXELS,
    },
    occupiedCityCells
  ),

  // ── Extra buildings ────────────────────────────────────────────────
  house_south_a: createPlacedBuilding(
    { x: 4, y: 1 },
    {
      id: 'house_south_a',
      npcId: 'none',
      name: 'Residential Unit A',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_A_VOXELS,
    },
    occupiedCityCells
  ),
  house_south_b: createPlacedBuilding(
    { x: 10, y: 1 },
    {
      id: 'house_south_b',
      npcId: 'none',
      name: 'Residential Unit B',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_B_VOXELS,
    },
    occupiedCityCells
  ),
  office_east: createPlacedBuilding(
    { x: 10, y: 7 },
    {
      id: 'office_east',
      npcId: 'none',
      name: 'District Office',
      type: 'OFFICE',
      isDiscovered: true,
      voxels: GENERIC_OFFICE_VOXELS,
    },
    occupiedCityCells
  ),
  factory_west: createPlacedBuilding(
    { x: 2, y: 3 },
    {
      id: 'factory_west',
      npcId: 'none',
      name: 'Processing Plant',
      type: 'INDUSTRIAL',
      isDiscovered: true,
      voxels: FACTORY_VOXELS,
    },
    occupiedCityCells
  ),
  house_north_a: createPlacedBuilding(
    { x: 5, y: 3 },
    {
      id: 'house_north_a',
      npcId: 'none',
      name: 'Foreman\'s Quarters',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_A_VOXELS,
    },
    occupiedCityCells
  ),
  house_west_c: createPlacedBuilding(
    { x: 2, y: 5 },
    {
      id: 'house_west_c',
      npcId: 'none',
      name: 'Worker Housing',
      type: 'HOME',
      isDiscovered: true,
      voxels: GENERIC_HOUSE_B_VOXELS,
    },
    occupiedCityCells
  ),

  // ── NPC residential houses ─────────────────────────────────────────
  house_nw_d: createPlacedBuilding(
    { x: 4, y: 9 },
    {
      id: 'house_nw_d',
      npcId: 'resident_a',
      name: 'Dunn Residence',
      type: 'HOME',
      isDiscovered: false,
      voxels: GENERIC_HOUSE_C_VOXELS,
    },
    occupiedCityCells
  ),
  house_ne_c: createPlacedBuilding(
    { x: 7, y: 9 },
    {
      id: 'house_ne_c',
      npcId: 'resident_b',
      name: 'Holt Residence',
      type: 'HOME',
      isDiscovered: false,
      voxels: GENERIC_HOUSE_D_VOXELS,
    },
    occupiedCityCells
  ),
  house_sw_e: createPlacedBuilding(
    { x: 8, y: 3 },
    {
      id: 'house_sw_e',
      npcId: 'resident_c',
      name: 'Sato Residence',
      type: 'HOME',
      isDiscovered: false,
      voxels: GENERIC_HOUSE_C_VOXELS,
    },
    occupiedCityCells
  ),
  house_east_f: createPlacedBuilding(
    { x: 0, y: 1 },
    {
      id: 'house_east_f',
      npcId: 'resident_d',
      name: 'Bray Residence',
      type: 'HOME',
      isDiscovered: false,
      voxels: GENERIC_HOUSE_D_VOXELS,
    },
    occupiedCityCells
  ),

  // ── Foliage / green spaces ─────────────────────────────────────────
  tree_sw_1: createPlacedBuilding(
    { x: 0, y: 0 },
    {
      id: 'tree_sw_1',
      npcId: 'none',
      name: 'Dusty Oak',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_A_VOXELS,
    },
    occupiedCityCells
  ),
  tree_se_1: createPlacedBuilding(
    { x: 12, y: 0 },
    {
      id: 'tree_se_1',
      npcId: 'none',
      name: 'Roadside Pine',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_B_VOXELS,
    },
    occupiedCityCells
  ),
  garden_east: createPlacedBuilding(
    { x: 10, y: 5 },
    {
      id: 'garden_east',
      npcId: 'none',
      name: 'East Gardens',
      type: 'PARK',
      isDiscovered: true,
      voxels: GARDEN_VOXELS,
    },
    occupiedCityCells
  ),
  tree_ne_1: createPlacedBuilding(
    { x: 12, y: 11 },
    {
      id: 'tree_ne_1',
      npcId: 'none',
      name: 'Northern Pine',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_A_VOXELS,
    },
    occupiedCityCells
  ),
  bush_w_1: createPlacedBuilding(
    { x: 2, y: 0 },
    {
      id: 'bush_w_1',
      npcId: 'none',
      name: 'Wild Brush',
      type: 'PARK',
      isDiscovered: true,
      voxels: BUSH_VOXELS,
    },
    occupiedCityCells
  ),
  tree_nw_1: createPlacedBuilding(
    { x: 0, y: 11 },
    {
      id: 'tree_nw_1',
      npcId: 'none',
      name: 'Withered Tree',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_B_VOXELS,
    },
    occupiedCityCells
  ),
  garden_center: createPlacedBuilding(
    { x: 4, y: 5 },
    {
      id: 'garden_center',
      npcId: 'none',
      name: 'Median Garden',
      type: 'PARK',
      isDiscovered: true,
      voxels: GARDEN_VOXELS,
    },
    occupiedCityCells
  ),
  tree_mid_east: createPlacedBuilding(
    { x: 8, y: 5 },
    {
      id: 'tree_mid_east',
      npcId: 'none',
      name: 'Lone Oak',
      type: 'PARK',
      isDiscovered: true,
      voxels: TREE_A_VOXELS,
    },
    occupiedCityCells
  ),

  ...cityStreets,

  // ── Imported voxel model buildings ─────────────────────────────────
  asset_tower_a: createPlacedBuilding(
    { x: 0, y: 9 },
    {
      id: 'asset_tower_a',
      npcId: 'none',
      name: 'Aureus Tower',
      type: 'LANDMARK',
      isDiscovered: true,
      voxels: ASSET_BUILDING_A_VOXELS,
    },
    occupiedCityCells
  ),
  asset_block_b: createPlacedBuilding(
    { x: 0, y: 3 },
    {
      id: 'asset_block_b',
      npcId: 'none',
      name: 'Commerce Block',
      type: 'OFFICE',
      isDiscovered: true,
      voxels: ASSET_BUILDING_B_VOXELS,
    },
    occupiedCityCells
  ),
  asset_hall_c: createPlacedBuilding(
    { x: 12, y: 9 },
    {
      id: 'asset_hall_c',
      npcId: 'none',
      name: 'Borough Hall',
      type: 'LANDMARK',
      isDiscovered: true,
      voxels: ASSET_BUILDING_C_VOXELS,
    },
    occupiedCityCells
  ),
  asset_depot_d: createPlacedBuilding(
    { x: 12, y: 1 },
    {
      id: 'asset_depot_d',
      npcId: 'none',
      name: 'Supply Depot',
      type: 'INDUSTRIAL',
      isDiscovered: true,
      voxels: ASSET_BUILDING_D_VOXELS,
    },
    occupiedCityCells
  ),
  asset_quarters_e: createPlacedBuilding(
    { x: 12, y: 7 },
    {
      id: 'asset_quarters_e',
      npcId: 'none',
      name: 'Staff Quarters',
      type: 'HOME',
      isDiscovered: true,
      voxels: ASSET_BUILDING_E_VOXELS,
    },
    occupiedCityCells
  ),
};

export const BUILDINGS = normalizeWorldLayout(baseBuildings);
