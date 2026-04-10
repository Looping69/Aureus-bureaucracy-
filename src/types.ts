import { LucideIcon } from 'lucide-react';
import * as THREE from 'three';

/** Lifecycle state of a single {@link Permit}. */
export type PermitStatus = 'LOCKED' | 'AVAILABLE' | 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * A bureaucratic permit the player must file and track through its lifecycle.
 * Permits gate features (mines, export channels, etc.) and can be fast-tracked
 * by spending money or leverage.
 */
export interface Permit {
  id: string;
  name: string;
  formNumber: string;
  description: string;
  /** Filing fee in in-game dollars. */
  cost: number;
  /** Current lifecycle state. */
  status: PermitStatus;
  /** Clerk's stated reason when status is REJECTED. */
  rejectionReason?: string;
  /** Identifier of the game feature unlocked on APPROVED. */
  unlocksFeature?: string;
  /** Form-filling accuracy (0–100) from the mini-game; affects approval odds. */
  accuracy?: number;
}

/** Category of incriminating information the player can collect on an NPC. */
export type DirtType = 'PERMIT_VIOLATION' | 'BACKROOM_DEAL' | 'PERSONAL_SECRET';

/** A piece of dirt (leverage material) the player has gathered on an NPC. */
export interface DirtItem {
  id: string;
  type: DirtType;
  description: string;
  targetNpcId: string; // Who this dirt is about
  value: number; // How much leverage it provides
}

/** Indicates how an NPC's disposition changes after leverage is applied. */
export type MoodShiftType = 'GRUMPY' | 'HAPPY' | 'NEUTRAL';

/**
 * Lightweight relationship state per NPC.
 * Derived from trust/leverage/story-flags; used to branch dialogue without
 * exploding complexity.
 */
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

/**
 * A non-player character the player can interact with, build trust with, or
 * use leverage against to advance permit processing and story objectives.
 *
 * Each NPC also carries **force identity** fields that define their
 * ideological pressure on the player (belief / tone / pressure).
 */
export interface NPC {
  id: string;
  name: string;
  role: string;
  persona: string;
  motive: string;

  // --- Force identity (Step 1) ---
  /** Core ideological belief that drives this NPC's every line. */
  belief: string;
  /** Dialogue voice descriptor (e.g. "Calm, reasonable, quietly corrupt"). */
  tone: string;
  /** The kind of pressure this NPC exerts on the player. */
  pressure: string;

  vulnerability: {
    id: string;
    description: string;
    discovered: boolean;
    leverageDialogue: string;
    successDialogue: string;
    reward: 'DISCOUNT' | 'SPEED' | 'INFO';
  };
  /** Relationship score 0–100; higher trust unlocks dialogue and favours. */
  trustLevel: number; // 0-100 (Relationship)
  /** Dirt/favours held by the player against this NPC (0–100). */
  leverage: number; // 0-100 (Dirt/Favors held by player)
  /** Human-readable description of what kind of dirt might exist. */
  potentialLeverage: string; // Description of what kind of dirt exists
  avatar: string;
  /** IDs of NPCs who are antagonistic to this one. */
  rivals: string[]; // NPC IDs
  /** IDs of NPCs who are allied with this one. */
  allies: string[]; // NPC IDs
  /** In-game hour range when this NPC is at their work building. */
  workHours: { start: number; end: number };
  /** Building ID of this NPC's home; undefined for non-commuting NPCs. */
  homeBuildingId?: string;
  /** Building ID of this NPC's workplace; undefined for non-commuting NPCs. */
  workBuildingId?: string;
  /** How dialogue tone changes when leverage is applied. */
  moodShiftType: MoodShiftType;
  /** Current relationship state — lightweight enum used for dialogue branching. */
  relationshipState: NpcRelationshipState;
}

/** A single cell in a mine grid, representing a unit of underground terrain. */
export interface Tile {
  id: string;
  /** Resource type of this cell. */
  type: 'DIRT' | 'ORE' | 'ROCK' | 'EMPTY';
  /** Structural stability; drops as surrounding tiles are mined. */
  stability: number;
  mined: boolean;
  /** True if visible via prospecting but not yet extracted. */
  revealed: boolean; // Visible but not collected (for prospecting)
  x: number;
  y: number;
  /** Height layer within the mine grid. */
  z: number; // Height
}

/** A mineable site the player discovers, prospects, and eventually operates. */
export interface Mine {
  id: string;
  name: string;
  location: 'OUTSKIRTS' | 'DEEP_WASTE';
  /** Hours of in-game time to travel to this mine. */
  travelTime: number; // in hours
  hasLocals: boolean;
  chiefId?: string;
  /** Base ore yield per extraction tick. */
  yield: number;
  /** Risk level (0–100) affecting mishap probability. */
  danger: number;
  discovered: boolean;
  // New fields
  grid: Tile[];
  gridWidth: number;
  gridHeight: number;
  /** Progression state of this mine site. */
  status: 'LOCKED' | 'PROSPECTING' | 'OPERATIONAL';
  /** Number of prospecting surveys completed so far. */
  prospectingCount: number;
  permits: {
    prospectingId: string;
    miningId: string;
  };
}

/** 2-D integer grid coordinate in the world map (0..WORLD_SIZE-1). */
export interface WorldPosition {
  x: number;
  y: number;
}

/** Information about the world tile or entity currently under the pointer. */
export interface WorldHoverInfo {
  x: number;
  y: number;
  z: number;
  kind: 'GROUND' | 'BUILDING' | 'NPC';
  id?: string;
  label?: string;
}

/**
 * A structure placed on the world grid.  May be a solid obstacle (OFFICE, HOME),
 * a walkable surface (ROAD, SIDEWALK, PARK), or a special interaction point
 * (MINE_ENTRANCE, HOTLINE).
 */
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

/** Floating feedback bubble shown when trust or leverage changes. */
export interface RelationshipFeedback {
  id: string;
  npcId: string;
  amount: number;
  type: 'TRUST' | 'LEVERAGE';
  timestamp: number;
}

/**
 * Identifiers for time-limited world effects that modify game rules.
 * - `bureauPull`    – speeds up permit processing
 * - `communityBacking` – reduces upkeep and exposure
 * - `marketInsight` – boosts ore export price
 * - `mediaHeat`    – increases audit chance and exposure costs
 */
export type WorldEffectId = 'bureauPull' | 'communityBacking' | 'marketInsight' | 'mediaHeat';
export type WorldEffects = Record<WorldEffectId, number>;
/**
 * Persistent narrative flags set by dialogue choices and key events.
 * Used to gate advanced dialogue options and alter world-effect thresholds.
 */
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

/** A player objective shown in the progress guide. */
export interface Objective {
  id: string;
  text: string;
  isCompleted: boolean;
  type: 'TALK' | 'COLLECT' | 'UPGRADE' | 'PERMIT' | 'DISCOVER';
  targetId?: string;
}

/** An interactable clue or event object found during office exploration. */
export interface OfficeItem {
  id: string;
  name: string;
  description: string;
  type: 'DIRT' | 'CLUE' | 'EVENT';
  icon: string;
  position: { x: number; y: number }; // Percentage based for responsive layout
  onInteract?: (state: GameState) => Partial<GameState>;
}

/**
 * Complete serialisable game state.  All React hooks and pure game-logic
 * functions treat this as an immutable record and return a new copy on change.
 */
export interface GameState {
  /** Player's cash balance in in-game dollars. */
  money: number;
  /** Ore units in inventory, ready to export. */
  ore: number;
  /** Evidence tokens usable in leverage plays and press leaks. */
  evidence: number;
  /** Current stamina; depleted by actions, restored by rest. */
  energy: number;
  /** Upper cap for energy, expandable via upgrades. */
  maxEnergy: number;
  movementSpeed: number;
  /** IDs of purchased permanent upgrades. */
  upgrades: string[];
  /** Collected leverage material on NPCs. */
  dirtItems: DirtItem[];
  leverage: string[];
  /** Office exploration items already collected this session. */
  foundOfficeItemIds: string[];
  /** Whether office exploration mode is currently open. */
  explorationActive: boolean;
  meters: {
    /** Global community trust (0–100). */
    trust: number;
    /** Political influence meter (0–100). */
    influence: number;
    /** Heat/scrutiny meter (0–100); high values trigger audits. */
    exposure: number;
  };
  /** All permits keyed by permit ID. */
  permits: Record<string, Permit>;
  npcs: Record<string, NPC>;
  /** NPCs the player has been introduced to. */
  knownNpcIds: string[];
  objectives: Objective[];
  mines: Mine[];
  /** Currently selected mine for the MINE scene; null = none. */
  activeMineId: string | null;
  /** Which scene is currently rendered. */
  currentScene: 'MINE' | 'MINE_WORLD' | 'OFFICE' | 'WORLD' | 'MENU' | 'CITY_PLANNER' | 'TESTING';
  activeNPCId: string | null;
  activePermitId: string | null;
  activeBuildingId: string | null;
  activeMiniGame: 'FORM_PROCESSING' | null;
  pendingPermitAction: 'SUBMIT' | 'FAST_TRACK' | 'DIALOGUE' | null;
  buildings: Record<string, Building>;
  day: number;
  /** In-game clock as a fractional hour (0.0 = midnight, 12.0 = noon). */
  time: number; // 0 to 2400 (military time representation or just 0-24 float)
  playerPos: WorldPosition;
  targetPos: WorldPosition | null;
  /** Active movement path waypoints (world-grid coordinates). */
  path: WorldPosition[];
  feedbacks: RelationshipFeedback[];
  /** Map of cooldown keys to expiry world-hour values. */
  dialogueCooldowns: Record<string, number>;
  worldEffects: WorldEffects;
  /** Active narrative flags. */
  storyFlags: StoryFlag[];
  /** World-hour at which the last city event fired. */
  lastCityEventHour: number;
  unlockedEndings: string[];
  activeEndingId: string | null;
  /** Index of the current tutorial step (0 = not started). */
  tutorialStep: number;
  /** Whether the tutorial overlay is collapsed. */
  tutorialMinimized: boolean;
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
}

/** Raw voxel position and packed hex colour used to build geometry. */
export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: number;
}

/** Extended voxel with physics velocity and rotation state for destruction animations. */
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

/** Queued voxel to be rebuilt after a destruction animation, with an optional delay. */
export interface RebuildTarget {
  x: number;
  y: number;
  z: number;
  delay: number;
  isRubble?: boolean;
}

/** High-level state of the voxel simulation (used by the editor/dismantling mode). */
export enum AppState {
  STABLE = 'STABLE',
  DISMANTLING = 'DISMANTLING',
  REBUILDING = 'REBUILDING',
}

/** Axis of symmetry for the voxel brush tool. */
export enum SymmetryMode {
  NONE = 'NONE',
  X = 'X',
  Z = 'Z',
}

/** Active voxel editing tool. */
export enum EditTool {
  BRUSH = 'BRUSH',
  ERASER = 'ERASER',
  ROAD = 'ROAD',
}

/** A single node in a branching dialogue tree. */
export interface DialogueNode {
  id: string;
  text: string;
  options: DialogueOption[];
}

/** One selectable response in a {@link DialogueNode}. */
export interface DialogueOption {
  text: string;
  nextNodeId?: string;
  /** Pure state-update function applied when this option is chosen. */
  action?: (state: GameState) => Partial<GameState>;
  /** If provided, option is only shown when this returns true. */
  condition?: (state: GameState) => boolean;
  /** Minimum leverage score needed to unlock this option. */
  leverageRequired?: number;
  /** Minimum trust score needed to unlock this option. */
  trustRequired?: number;
}
