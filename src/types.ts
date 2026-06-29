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

export interface NPC {
  id: string;
  name: string;
  role: string;
  persona: string;
  motive: string;
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

export type UndergroundResourceType = 'ore' | 'coal' | 'gem' | 'rubble' | 'gold';

export interface UndergroundResourceNode {
  id: string;
  name: string;
  type: UndergroundResourceType;
  pos: WorldPosition;
  capacity: number;
  yield: number;
  hidden?: boolean;
}

export interface UndergroundResourceState extends UndergroundResourceNode {
  remaining: number;
  discovered: boolean;
}

export interface UndergroundGoldDrop {
  id: string;
  pos: WorldPosition;
  amount: number;
}

export interface UndergroundMineState {
  resources: UndergroundResourceState[];
  clearedTerrainCells: string[];
  playerPos: WorldPosition;
  carriedGold: number;
  depositedGold: number;
  droppedGold: UndergroundGoldDrop[];
  lanternFuel: number;
  terrainHitProgress: Record<string, number>;
}

export type NavigationZoneKind = 'BLOCKED';

export interface NavigationZone {
  id: string;
  kind: NavigationZoneKind;
  name: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WorldPickup {
  id: string;
  pos: WorldPosition;
  energyRestore: number;
}

export type WeatherType =
  | 'CLEAR'
  | 'CLOUDY'
  | 'RAIN'
  | 'STORM'
  | 'DUST_STORM'
  | 'ACID_RAIN'
  | 'HEATWAVE';

export interface WeatherState {
  current: WeatherType;
  timeLeft: number; // In-world hours remaining in the current front
  intensity: number; // 0..1 severity used by render and gameplay systems
}

export type WorldProfileId = 'world-1' | 'world-2' | 'world-3' | 'world-4';

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

export interface PlayerFeedback {
  id: string;
  amount: number;
  type: 'ENERGY';
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

export interface CityIncidentChoice {
  id: string;
  label: string;
  detail: string;
  effectLabel: string;
  disabledReason?: string;
}

export interface CityIncident {
  id: string;
  title: string;
  description: string;
  trigger: string;
  choices: CityIncidentChoice[];
}

export type FtuePhase =
  | 'intro'
  | 'reach_bureau'
  | 'enter_bureau'
  | 'talk_vane'
  | 'open_form_17b'
  | 'submit_form_17b'
  | 'ftue_complete';

export type GameScene = 'MINE' | 'MINE_WORLD' | 'UNDERGROUND' | 'OFFICE' | 'WORLD' | 'CITY_PLANNER';
export type ActiveMiniGame = 'FORM_PROCESSING' | null;
export type PendingPermitAction = 'SUBMIT' | 'FAST_TRACK' | 'DIALOGUE' | null;

export interface OfficeItem {
  id: string;
  name: string;
  description: string;
  type: 'DIRT' | 'CLUE' | 'EVENT';
  icon: string;
  position: { x: number; y: number }; // Percentage based for responsive layout
  onInteract?: (state: GameState) => Partial<GameState>;
}

export interface GameResourceState {
  money: number;
  ore: number;
  evidence: number;
  energy: number;
  maxEnergy: number;
  movementSpeed: number;
  upgrades: string[];
  dirtItems: DirtItem[];
  leverage: string[];
}

export interface GameOfficeState {
  foundOfficeItemIds: string[];
  explorationActive: boolean;
}

export interface GameMeterState {
  meters: {
    trust: number;
    influence: number;
    exposure: number;
  };
}

export interface GameProgressionState {
  permits: Record<string, Permit>;
  npcs: Record<string, NPC>;
  knownNpcIds: string[];
  objectives: Objective[];
  mines: Mine[];
  activeMineId: string | null;
  unlockedEndings: string[];
}

export interface GameInteractionState {
  currentScene: GameScene;
  activeNPCId: string | null;
  activePermitId: string | null;
  activeBuildingId: string | null;
  activeMiniGame: ActiveMiniGame;
  pendingPermitAction: PendingPermitAction;
  activeEndingId: string | null;
}

export interface GameWorldState {
  worldProfileId: WorldProfileId;
  buildings: Record<string, Building>;
  navigationZones: NavigationZone[];
  day: number;
  time: number; // 0 to 2400 (military time representation or just 0-24 float)
  weather: WeatherState;
  playerPos: WorldPosition;
  targetPos: WorldPosition | null;
  path: WorldPosition[];
  streetPickups: WorldPickup[];
}

export interface GameNarrativeState {
  feedbacks: RelationshipFeedback[];
  playerFeedbacks: PlayerFeedback[];
  dialogueCooldowns: Record<string, number>;
  worldEffects: WorldEffects;
  storyFlags: StoryFlag[];
  lastCityEventHour: number;
  activeCityIncident: CityIncident | null;
}

export interface GameFtueState {
  ftuePhase: FtuePhase;
  tutorialStep: number;
  tutorialMinimized: boolean;
}

export interface GameState extends
  GameResourceState,
  GameOfficeState,
  GameMeterState,
  GameProgressionState,
  GameInteractionState,
  GameWorldState,
  GameNarrativeState,
  GameFtueState {
  underground: UndergroundMineState;
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

export type DialogueFeedbackType = 'TRUST' | 'LEVERAGE';

export type DialogueCommand =
  | { type: 'ADD_STORY_FLAGS'; flags: StoryFlag[] }
  | { type: 'EXTEND_WORLD_EFFECT'; effectId: WorldEffectId; hours: number }
  | { type: 'ADJUST_NPC_TRUST'; npcId: string; delta: number }
  | { type: 'ADJUST_NPC_LEVERAGE'; npcId: string; delta: number }
  | { type: 'PATCH_NPC'; npcId: string; patch: Partial<NPC> }
  | { type: 'ADJUST_METERS'; delta: Partial<Record<keyof GameMeterState['meters'], number>> }
  | { type: 'ADD_MONEY'; amount: number }
  | { type: 'ADD_EVIDENCE'; amount: number }
  | { type: 'SET_TUTORIAL_STEP'; step: number }
  | { type: 'SET_PERMIT_STATUS'; permitId: string; status: PermitStatus; rejectionReason?: string; accuracy?: number }
  | { type: 'START_DIALOGUE_PERMIT_MINIGAME'; permitId: string; cost: number }
  | { type: 'APPROVE_PERMIT'; permitId: string }
  | { type: 'APPROVE_PENDING_PERMITS' }
  | { type: 'SET_DIALOGUE_COOLDOWN'; key: string; hours: number }
  | { type: 'QUEUE_FEEDBACK'; npcId: string; amount: number; feedbackType: DialogueFeedbackType }
  | { type: 'ADD_UPGRADE'; upgradeId: string }
  | { type: 'SET_MOVEMENT_SPEED'; speed: number }
  | { type: 'ADD_DIRT_ITEMS'; items: DirtItem[] }
  | { type: 'CLEAR_DIRT_ITEMS' }
  | { type: 'REMOVE_FIRST_DIRT_ITEM' }
  | { type: 'APPLY_NPC_VULNERABILITY'; npcId: string; trustDelta: number; leverageGain: number; cooldownHours: number; effectId?: WorldEffectId; effectHours?: number }
  | { type: 'BRIBE_NPC'; npcId: string; cost: number; trustDelta: number; exposureDelta: number; cooldownHours: number }
  | { type: 'NEGOTIATE_PENDING_PERMITS'; npcId: string; successThreshold: number; successTrustDelta: number; failureTrustDelta: number; failureExposureDelta: number; cooldownHours: number }
  | { type: 'USE_BACKCHANNEL_APPROVAL'; npcId: string; exposureDelta: number; cooldownHours: number }
  | { type: 'BUY_MOVEMENT_UPGRADE'; npcId: string; upgradeId: string; cost: number; speed: number; trustDelta: number }
  | { type: 'PROCESS_FIXER_EVIDENCE'; npcId: string; cooldownHours: number; effectHours: number }
  | { type: 'RUN_SMUGGLING_CONVOY'; cooldownHours: number; effectHours: number; moneyGain: number; exposureDelta: number; influenceDelta: number }
  | { type: 'LEAK_DIRT_TO_HOTLINE'; cooldownHours: number; effectHours: number }
  | { type: 'REPORT_FIRST_DIRT_TO_AUTHORITY'; reporterNpcId: string; cooldownHours: number }
  | { type: 'FAST_TRACK_PENDING_PERMITS'; npcId: string; leverageCost: number; cooldownHours: number };

export interface DialogueOption {
  text: string;
  nextNodeId?: string;
  action?: (state: GameState) => DialogueCommand[];
  condition?: (state: GameState) => boolean;
  leverageRequired?: number;
  trustRequired?: number;
}
