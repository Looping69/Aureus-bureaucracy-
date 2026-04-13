import { Building, NavigationZone, NPC, WorldPosition } from '../types';

export type EditorTool = 'select' | 'move' | 'place-building' | 'draw-blocked-zone' | 'erase';

export interface AuthoredBuilding {
  id: string;
  name: string;
  type: Building['type'];
  pos: WorldPosition;
  voxels?: Building['voxels'];
  npcId: string;
  isDiscovered: boolean;
  isProtected?: boolean;
  templateId?: string;
}

export interface AuthoredNpcBinding {
  npcId: string;
  homeBuildingId?: string;
  workBuildingId?: string;
}

export interface AuthoredRoute {
  id: string;
  name: string;
  points: WorldPosition[];
}

export interface AuthoringScene {
  version: 1;
  meta: {
    id: string;
    name: string;
    worldSize: number;
    updatedAt: string;
  };
  buildings: AuthoredBuilding[];
  npcBindings: AuthoredNpcBinding[];
  navigationZones: NavigationZone[];
  routes: AuthoredRoute[];
}

export interface CompiledAuthoringWorld {
  buildings: Record<string, Building>;
  navigationZones: NavigationZone[];
  npcs: Record<string, NPC>;
}

export interface EditorSelection {
  buildingIds: string[];
  zoneIds: string[];
}

export interface EditorOverlayState {
  showWorldGrid: boolean;
  showPathGrid: boolean;
  showSurface: boolean;
  showWalkability: boolean;
  showAccessPoints: boolean;
  showTypeOverlay: boolean;
  showZoneOverlay: boolean;
  showBounds: boolean;
}

export interface EditorValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  targetType: 'building' | 'npc' | 'zone' | 'route';
  targetId: string;
}
