import { LucideIcon } from 'lucide-react';
import * as THREE from 'three';

export type PermitStatus = 'LOCKED' | 'AVAILABLE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Permit {
  id: string;
  name: string;
  formNumber: string;
  description: string;
  cost: number;
  status: PermitStatus;
  rejectionReason?: string;
  unlocksFeature?: string;
  accuracy?: number;
}

export type DirtType = 'PERMIT_VIOLATION' | 'BACKROOM_DEAL' | 'PERSONAL_SECRET';

export interface DirtItem {
  id: string;
  type: DirtType;
  description: string;
  targetNpcId: string; // Who this dirt is about
  value: number; // How much leverage it provides
}

export type MoodShiftType = 'GRUMPY' | 'HAPPY' | 'NEUTRAL';
export type RelationshipStateVane = 'neutral' | 'aligned' | 'complicit' | 'opposed';
export type RelationshipStateInspector = 'neutral' | 'watching' | 'targeting';
export type RelationshipStateFixer = 'neutral' | 'friendly' | 'dependent';
export type RelationshipStateVox = 'neutral' | 'interested' | 'invested';
export type RelationshipStateCommunity = 'neutral' | 'supportive' | 'disillusioned';
export type NpcRelationshipState =
  | RelationshipStateVane
  | RelationshipStateInspector
  | RelationshipStateFixer
  | RelationshipStateVox
  | RelationshipStateCommunity;

export interface NPC {
  id: string;
  name: string;
  role: string;
  persona: string;
  motive: string;
  belief: string;
  tone: string;
  pressure: string;
  vulnerability: {
    id: string;
    description: string;
    discovered: boolean;
    leverageDialogue: string;
    successDialogue: string;
    reward: 'DISCOUNT' | 'SPEED' | 'INFO';
  };
  trustLevel: number; // 0-100 (Relationship)
  leverage: number; // 0-100 (Dirt/Favors held by player)
  potentialLeverage: string; // Description of what kind of dirt exists
  avatar: string;
  rivals: string[]; // NPC IDs
  allies: string[]; // NPC IDs
  workHours: { start: number; end: number };
  homeBuildingId?: string;
  workBuildingId?: string;
  moodShiftType: MoodShiftType;
  relationshipState: NpcRelationshipState;
}

export interface Tile {
  id: string;
  type: 'DIRT' | 'ORE' | 'ROCK' | 'EMPTY';
  stability: number;
  mined: boolean;
  revealed: boolean; // Visible but not collected (for prospecting)
  x: number;
  y: number;
  z: number; // Height
}

export interface Mine {
  id: string;
  name: string;
  location: 'OUTSKIRTS' | 'DEEP_WASTE';
  travelTime: number; // in hours
  hasLocals: boolean;
  chiefId?: string;
  yield: number;
  danger: number;
  discovered: boolean;
  // New fields
  grid: Tile[];
  gridWidth: number;
  gridHeight: number;
  status: 'LOCKED' | 'PROSPECTING' | 'OPERATIONAL';
  prospectingCount: number;
  permits: {
    prospectingId: string;
    miningId: string;
  };
}

export interface WorldPosition {
  x: number;
  y: number;
}

export type PlayerCondition = 'ACTIVE' | 'COLLAPSING' | 'DOWNED' | 'REVIVING' | 'RECOVERING';
export type RescueNpcState = 'IDLE' | 'RESPONDING' | 'REVIVING' | 'ESCORTING' | 'RETURNING';
export type RescueMissionPhase =
  | 'IDLE'
  | 'DISPATCHED'
  | 'TEAM_STAGING'
  | 'REVIVING'
  | 'TRANSPORTING'
  | 'RECOVERING';
export type EmergencyVehicleState = 'IDLE' | 'RESPONDING' | 'STAGED' | 'TRANSPORTING' | 'RETURNING';
export type EmergencyVehicleType = 'AMBULANCE';
export type StaminaPowerUpKind = 'FIELD_RATION' | 'ADRENAL_CHARGE';

export interface PlayerStaminaState {
  current: number;
  max: number;
  regenPerSecond: number;
  restRegenPerSecond: number;
  movementDrainPerUnit: number;
  analogDrainPerStep: number;
}

export interface StaminaPowerUp {
  id: string;
  kind: StaminaPowerUpKind;
  label: string;
  pos: WorldPosition;
  restoreAmount: number;
  color: string;
  glowColor: string;
  bobOffset: number;
  spinSpeed: number;
}

export interface MedicalNpc {
  id: string;
  name: string;
  role: 'MEDIC';
  pos: WorldPosition;
  homePos: WorldPosition;
  state: RescueNpcState;
  path: WorldPosition[];
  pathIndex: number;
  paletteKey: 'medic_alpha' | 'medic_bravo';
  reviveSide: 'LEFT' | 'RIGHT';
}

export interface EmergencyVehicle {
  id: string;
  label: string;
  type: EmergencyVehicleType;
  pos: WorldPosition;
  homePos: WorldPosition;
  state: EmergencyVehicleState;
  path: WorldPosition[];
  pathIndex: number;
  seats: number;
}

export interface RescueMission {
  id: string | null;
  phase: RescueMissionPhase;
  targetPos: WorldPosition | null;
  stagingPos: WorldPosition | null;
  destinationPos: WorldPosition | null;
  assignedMedicIds: string[];
  vehicleId: string | null;
  phaseElapsed: number;
  playerAttachedToVehicle: boolean;
}

export interface PlayerStatus {
  condition: PlayerCondition;
  phaseElapsed: number;
}

export interface WorldHoverInfo {
  x: number;
  y: number;
  z: number;
  kind: 'GROUND' | 'BUILDING' | 'NPC';
  id?: string;
  label?: string;
}

export interface Building {
  id: string;
  npcId: string;
  name: string;
  pos: WorldPosition;
  type: 'OFFICE' | 'HOME' | 'MINE_ENTRANCE' | 'PUB' | 'HOTLINE' | 'PARK' | 'LANDMARK' | 'RESIDENTIAL' | 'INDUSTRIAL' | 'ROAD' | 'SIDEWALK' | 'EXTRACTION_NODE' | 'LOADING_ZONE' | 'UNLOADING_ZONE' | 'DELIVERY_ZONE';
  isDiscovered: boolean;
  description?: string;
  explorationItems?: string[];
  voxels?: { id: number, x: number, y: number, z: number, c: string }[];
}

export interface RelationshipFeedback {
  id: string;
  npcId: string;
  amount: number;
  type: 'TRUST' | 'LEVERAGE';
  timestamp: number;
}

export type WorldEffectId = 'bureauPull' | 'communityBacking' | 'marketInsight' | 'mediaHeat';
export type WorldEffects = Record<WorldEffectId, number>;
export type StoryFlag =
  | 'chief_water_quest'
  | 'vane_backchannel'
  | 'vane_exposed'
  | 'community_pact'
  | 'fixer_smuggling_tie'
  | 'public_scandal'
  | 'reform_alliance'
  | 'vox_exclusive'
  | 'vox_embargo'
  | 'inspector_deputized'
  | 'inspector_blacklist';

export interface Objective {
  id: string;
  text: string;
  isCompleted: boolean;
  type: 'TALK' | 'COLLECT' | 'UPGRADE' | 'PERMIT' | 'DISCOVER';
  targetId?: string;
}

export type FtuePhase =
  | 'intro'
  | 'reach_bureau'
  | 'enter_bureau'
  | 'talk_vane'
  | 'open_form_17b'
  | 'submit_form_17b'
  | 'ftue_complete';

export interface OfficeItem {
  id: string;
  name: string;
  description: string;
  type: 'DIRT' | 'CLUE' | 'EVENT';
  icon: string;
  position: { x: number; y: number }; // Percentage based for responsive layout
  onInteract?: (state: GameState) => Partial<GameState>;
}

export interface GameState {
  money: number;
  ore: number;
  evidence: number;
  energy: number;
  maxEnergy: number;
  stamina: PlayerStaminaState;
  movementSpeed: number;
  upgrades: string[];
  dirtItems: DirtItem[];
  leverage: string[];
  foundOfficeItemIds: string[];
  explorationActive: boolean;
  meters: {
    trust: number;
    influence: number;
    exposure: number;
  };
  permits: Record<string, Permit>;
  npcs: Record<string, NPC>;
  knownNpcIds: string[];
  objectives: Objective[];
  mines: Mine[];
  activeMineId: string | null;
  currentScene: 'MINE' | 'MINE_WORLD' | 'OFFICE' | 'WORLD' | 'MENU' | 'CITY_PLANNER' | 'TESTING';
  activeNPCId: string | null;
  activePermitId: string | null;
  activeBuildingId: string | null;
  activeMiniGame: 'FORM_PROCESSING' | null;
  pendingPermitAction: 'SUBMIT' | 'FAST_TRACK' | 'DIALOGUE' | null;
  buildings: Record<string, Building>;
  day: number;
  time: number; // 0 to 2400 (military time representation or just 0-24 float)
  playerPos: WorldPosition;
  playerStatus: PlayerStatus;
  targetPos: WorldPosition | null;
  path: WorldPosition[];
  staminaPowerUps: StaminaPowerUp[];
  medicalNpcs: Record<string, MedicalNpc>;
  emergencyVehicles: Record<string, EmergencyVehicle>;
  rescueMission: RescueMission;
  feedbacks: RelationshipFeedback[];
  dialogueCooldowns: Record<string, number>;
  worldEffects: WorldEffects;
  storyFlags: StoryFlag[];
  lastCityEventHour: number;
  unlockedEndings: string[];
  activeEndingId: string | null;
  ftuePhase: FtuePhase;
  tutorialStep: number;
  tutorialMinimized: boolean;
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: number;
}

export interface SimulationVoxel {
  id: number;
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  rvx: number;
  rvy: number;
  rvz: number;
}

export interface RebuildTarget {
  x: number;
  y: number;
  z: number;
  delay: number;
  isRubble?: boolean;
}

export enum AppState {
  STABLE = 'STABLE',
  DISMANTLING = 'DISMANTLING',
  REBUILDING = 'REBUILDING',
}

export enum SymmetryMode {
  NONE = 'NONE',
  X = 'X',
  Z = 'Z',
}

export enum EditTool {
  BRUSH = 'BRUSH',
  ERASER = 'ERASER',
  ROAD = 'ROAD',
}

export interface DialogueNode {
  id: string;
  text: string;
  options: DialogueOption[];
}

export interface DialogueOption {
  text: string;
  nextNodeId?: string;
  action?: (state: GameState) => Partial<GameState>;
  condition?: (state: GameState) => boolean;
  leverageRequired?: number;
  trustRequired?: number;
}
