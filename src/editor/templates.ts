import { Building } from '../types';
import {
  LICENSING_OFFICE_VOXELS,
  UNION_HALL_VOXELS,
  INSPECTOR_HQ_VOXELS,
  FIXER_DEN_VOXELS,
  CHIEF_HUT_VOXELS,
  HOTLINE_BOOTH_VOXELS,
  STREET_LIGHT_VOXELS,
  GENERIC_HOUSE_A_VOXELS,
  GENERIC_HOUSE_B_VOXELS,
  GENERIC_OFFICE_VOXELS,
  SIDEWALK_VOXELS,
  ROAD_VOXELS,
  TREE_A_VOXELS,
  TREE_B_VOXELS,
  BUSH_VOXELS,
  GARDEN_VOXELS,
  ROAD_CROSS_VOXELS,
  FACTORY_VOXELS,
  GENERIC_HOUSE_D_VOXELS,
} from '../buildings';
import {
  ASSET_BUILDING_A_VOXELS,
  ASSET_BUILDING_B_VOXELS,
  ASSET_BUILDING_C_VOXELS,
  ASSET_BUILDING_D_VOXELS,
  ASSET_BUILDING_E_VOXELS,
} from '../assetBuildings';

export interface BuildingTemplate {
  id: string;
  name: string;
  type: Building['type'];
  voxels?: Building['voxels'];
}

export const BUILDING_TEMPLATES: BuildingTemplate[] = [
  { id: 'generic-house-a', type: 'HOME', name: 'Generic House A', voxels: GENERIC_HOUSE_A_VOXELS },
  { id: 'generic-house-b', type: 'HOME', name: 'Generic House B', voxels: GENERIC_HOUSE_B_VOXELS },
  { id: 'office-block', type: 'OFFICE', name: 'Office Block', voxels: GENERIC_OFFICE_VOXELS },
  { id: 'licensing-office', type: 'OFFICE', name: 'Licensing Office', voxels: LICENSING_OFFICE_VOXELS },
  { id: 'union-hall', type: 'PUB', name: 'Union Hall', voxels: UNION_HALL_VOXELS },
  { id: 'inspector-hq', type: 'OFFICE', name: 'Inspector HQ', voxels: INSPECTOR_HQ_VOXELS },
  { id: 'fixer-den', type: 'HOME', name: 'Fixer Den', voxels: FIXER_DEN_VOXELS },
  { id: 'chief-hut', type: 'HOME', name: 'Chief Hut', voxels: CHIEF_HUT_VOXELS },
  { id: 'hotline-booth', type: 'HOTLINE', name: 'Hotline Booth', voxels: HOTLINE_BOOTH_VOXELS },
  { id: 'street-light', type: 'LANDMARK', name: 'Street Light', voxels: STREET_LIGHT_VOXELS },
  { id: 'sidewalk', type: 'SIDEWALK', name: 'Sidewalk', voxels: SIDEWALK_VOXELS },
  { id: 'road', type: 'ROAD', name: 'Road', voxels: ROAD_VOXELS },
  { id: 'aureus-tower', type: 'LANDMARK', name: 'Aureus Tower', voxels: ASSET_BUILDING_A_VOXELS },
  { id: 'commerce-block', type: 'OFFICE', name: 'Commerce Block', voxels: ASSET_BUILDING_B_VOXELS },
  { id: 'borough-hall', type: 'LANDMARK', name: 'Borough Hall', voxels: ASSET_BUILDING_C_VOXELS },
  { id: 'supply-depot', type: 'INDUSTRIAL', name: 'Supply Depot', voxels: ASSET_BUILDING_D_VOXELS },
  { id: 'staff-quarters', type: 'HOME', name: 'Staff Quarters', voxels: ASSET_BUILDING_E_VOXELS },
  { id: 'road-cross', type: 'ROAD', name: 'Road Cross', voxels: ROAD_CROSS_VOXELS },
  { id: 'factory', type: 'INDUSTRIAL', name: 'Factory', voxels: FACTORY_VOXELS },
  { id: 'generic-house-d', type: 'HOME', name: 'Generic House D', voxels: GENERIC_HOUSE_D_VOXELS },
  { id: 'tree-a', type: 'PARK', name: 'Tree A', voxels: TREE_A_VOXELS },
  { id: 'tree-b', type: 'PARK', name: 'Tree B', voxels: TREE_B_VOXELS },
  { id: 'bush', type: 'PARK', name: 'Bush', voxels: BUSH_VOXELS },
  { id: 'garden', type: 'PARK', name: 'Garden', voxels: GARDEN_VOXELS },
];

export const BUILDING_TEMPLATE_MAP = new Map(
  BUILDING_TEMPLATES.map((template) => [template.id, template])
);
