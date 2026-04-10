/**
 * @module zoning
 * Modular zoning system for the city planner.
 *
 * Zones classify areas of the world grid into functional districts.
 * Each zone has properties that affect gameplay: build costs, event rates,
 * NPC traffic density, and surface-cost multipliers for pathfinding.
 *
 * The planner can paint zones onto the grid before placing buildings.
 * Buildings must be compatible with their zone (e.g. FACTORY only in INDUSTRIAL).
 */
import { Building } from '../types';

// ── Zone definitions ────────────────────────────────────────────────────────

export type ZoneType =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'CIVIC'
  | 'PARK'
  | 'MIXED_USE'
  | 'UNZONED';

export interface ZoneDefinition {
  type: ZoneType;
  label: string;
  /** Hex colour for the zone overlay on the planner grid. */
  color: string;
  /** Movement-cost multiplier inside this zone (1.0 = normal). */
  movementCostMultiplier: number;
  /** Building types that are allowed in this zone. */
  allowedBuildingTypes: Building['type'][];
  /** Per-in-game-hour chance of a zone-specific event firing. */
  eventChance: number;
  /** Short description shown in the zone info tooltip. */
  description: string;
}

export const ZONE_DEFINITIONS: Record<ZoneType, ZoneDefinition> = {
  RESIDENTIAL: {
    type: 'RESIDENTIAL',
    label: 'Residential',
    color: '#4ade80',
    movementCostMultiplier: 1.0,
    allowedBuildingTypes: ['HOME', 'RESIDENTIAL', 'PARK', 'ROAD', 'SIDEWALK'],
    eventChance: 0.12,
    description: 'Housing and community buildings. Low traffic, high livability.',
  },
  COMMERCIAL: {
    type: 'COMMERCIAL',
    label: 'Commercial',
    color: '#60a5fa',
    movementCostMultiplier: 0.9,
    allowedBuildingTypes: ['OFFICE', 'PUB', 'HOTLINE', 'LANDMARK', 'ROAD', 'SIDEWALK'],
    eventChance: 0.18,
    description: 'Shops, offices, and services. High foot traffic, moderate noise.',
  },
  INDUSTRIAL: {
    type: 'INDUSTRIAL',
    label: 'Industrial',
    color: '#f59e0b',
    movementCostMultiplier: 1.2,
    allowedBuildingTypes: ['INDUSTRIAL', 'LOADING_ZONE', 'UNLOADING_ZONE', 'DELIVERY_ZONE', 'ROAD'],
    eventChance: 0.25,
    description: 'Factories and logistics. High pollution, restricted access.',
  },
  CIVIC: {
    type: 'CIVIC',
    label: 'Civic',
    color: '#a78bfa',
    movementCostMultiplier: 0.85,
    allowedBuildingTypes: ['OFFICE', 'LANDMARK', 'HOTLINE', 'ROAD', 'SIDEWALK', 'PARK'],
    eventChance: 0.15,
    description: 'Government and public-service buildings. Well-maintained.',
  },
  PARK: {
    type: 'PARK',
    label: 'Green Space',
    color: '#34d399',
    movementCostMultiplier: 1.1,
    allowedBuildingTypes: ['PARK', 'SIDEWALK'],
    eventChance: 0.08,
    description: 'Parks, gardens, and open spaces. Boosts trust and livability.',
  },
  MIXED_USE: {
    type: 'MIXED_USE',
    label: 'Mixed Use',
    color: '#fb923c',
    movementCostMultiplier: 1.0,
    allowedBuildingTypes: [
      'HOME', 'RESIDENTIAL', 'OFFICE', 'PUB', 'HOTLINE', 'LANDMARK',
      'PARK', 'ROAD', 'SIDEWALK',
    ],
    eventChance: 0.2,
    description: 'Flexible zone allowing residential and commercial uses.',
  },
  UNZONED: {
    type: 'UNZONED',
    label: 'Unzoned',
    color: '#94a3b8',
    movementCostMultiplier: 1.0,
    allowedBuildingTypes: [
      'HOME', 'OFFICE', 'MINE_ENTRANCE', 'PUB', 'HOTLINE', 'PARK',
      'LANDMARK', 'RESIDENTIAL', 'INDUSTRIAL', 'ROAD', 'SIDEWALK',
      'EXTRACTION_NODE', 'LOADING_ZONE', 'UNLOADING_ZONE', 'DELIVERY_ZONE',
    ],
    eventChance: 0.1,
    description: 'No restrictions. Any building type may be placed.',
  },
};

// ── Zone grid utilities ─────────────────────────────────────────────────────

/** Grid of zone assignments, stored as a flat record keyed by "x,y". */
export type ZoneGrid = Record<string, ZoneType>;

const zoneKey = (x: number, y: number) => `${x},${y}`;

/** Get the zone at a specific grid tile. Defaults to UNZONED. */
export const getZoneAt = (grid: ZoneGrid, x: number, y: number): ZoneType =>
  grid[zoneKey(x, y)] ?? 'UNZONED';

/** Set the zone at a specific grid tile. */
export const setZoneAt = (
  grid: ZoneGrid,
  x: number,
  y: number,
  zone: ZoneType
): ZoneGrid => ({
  ...grid,
  [zoneKey(x, y)]: zone,
});

/** Check if a building type is valid in a given zone. */
export const isBuildingAllowedInZone = (
  buildingType: Building['type'],
  zoneType: ZoneType
): boolean => {
  const def = ZONE_DEFINITIONS[zoneType];
  return def.allowedBuildingTypes.includes(buildingType);
};

/** Paint a rectangular area of the zone grid with a given zone type. */
export const paintZoneRect = (
  grid: ZoneGrid,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  zone: ZoneType
): ZoneGrid => {
  const next = { ...grid };
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      next[zoneKey(x, y)] = zone;
    }
  }

  return next;
};

/**
 * Compute zone statistics: how many tiles of each zone type are present.
 */
export const getZoneStats = (
  grid: ZoneGrid
): Record<ZoneType, number> => {
  const stats: Record<ZoneType, number> = {
    RESIDENTIAL: 0,
    COMMERCIAL: 0,
    INDUSTRIAL: 0,
    CIVIC: 0,
    PARK: 0,
    MIXED_USE: 0,
    UNZONED: 0,
  };

  for (const zone of Object.values(grid)) {
    stats[zone] = (stats[zone] || 0) + 1;
  }

  return stats;
};
