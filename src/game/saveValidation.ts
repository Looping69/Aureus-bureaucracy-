import { z } from 'zod';
import { GameScene, GameState } from '../types';

export type SaveValidationResult =
  | { valid: true; state: GameState; reasons: [] }
  | { valid: false; reasons: string[] };

const permitStatusSchema = z.enum(['LOCKED', 'AVAILABLE', 'PENDING', 'APPROVED', 'REJECTED']);
const gameSceneSchema = z.enum(['MINE', 'MINE_WORLD', 'UNDERGROUND', 'OFFICE', 'WORLD', 'CITY_PLANNER']) satisfies z.ZodType<GameScene>;
const activeMiniGameSchema = z.union([z.literal('FORM_PROCESSING'), z.null()]);
const pendingPermitActionSchema = z.union([
  z.literal('SUBMIT'),
  z.literal('FAST_TRACK'),
  z.literal('DIALOGUE'),
  z.null(),
]);

const finiteNumber = z.number().finite();
const nullableString = z.union([z.string(), z.null()]);
const worldPositionSchema = z.object({ x: finiteNumber, y: finiteNumber }).passthrough();

const minimalPermitSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: finiteNumber,
  status: permitStatusSchema,
}).passthrough();

const minimalNpcSchema = z.object({
  id: z.string(),
  name: z.string(),
  trustLevel: finiteNumber,
  leverage: finiteNumber,
}).passthrough();

const minimalMineSchema = z.object({
  id: z.string(),
  name: z.string(),
  discovered: z.boolean(),
  status: z.enum(['LOCKED', 'PROSPECTING', 'OPERATIONAL']),
  grid: z.array(z.unknown()),
  permits: z.object({
    prospectingId: z.string(),
    miningId: z.string(),
  }).passthrough(),
}).passthrough();

export const gameStateCandidateSchema = z.object({
  money: finiteNumber,
  ore: finiteNumber,
  evidence: finiteNumber,
  energy: finiteNumber,
  maxEnergy: finiteNumber,
  movementSpeed: finiteNumber,
  upgrades: z.array(z.string()),
  dirtItems: z.array(z.unknown()),
  leverage: z.array(z.string()),
  foundOfficeItemIds: z.array(z.string()).optional(),
  explorationActive: z.boolean().optional(),
  meters: z.object({
    trust: finiteNumber,
    influence: finiteNumber,
    exposure: finiteNumber,
  }).passthrough(),
  permits: z.record(z.string(), minimalPermitSchema),
  npcs: z.record(z.string(), minimalNpcSchema),
  knownNpcIds: z.array(z.string()),
  objectives: z.array(z.unknown()),
  mines: z.array(minimalMineSchema),
  activeMineId: nullableString,
  currentScene: gameSceneSchema,
  activeNPCId: nullableString,
  activePermitId: nullableString,
  activeBuildingId: nullableString,
  activeMiniGame: activeMiniGameSchema,
  pendingPermitAction: pendingPermitActionSchema,
  activeEndingId: nullableString,
  worldProfileId: z.string().optional(),
  buildings: z.record(z.string(), z.unknown()),
  navigationZones: z.array(z.unknown()).optional(),
  day: finiteNumber,
  time: finiteNumber,
  weather: z.unknown().optional(),
  playerPos: worldPositionSchema,
  targetPos: z.union([worldPositionSchema, z.null()]),
  path: z.array(worldPositionSchema),
  streetPickups: z.array(z.unknown()).optional(),
  feedbacks: z.array(z.unknown()),
  playerFeedbacks: z.array(z.unknown()).optional(),
  dialogueCooldowns: z.record(z.string(), finiteNumber).optional(),
  worldEffects: z.record(z.string(), finiteNumber).optional(),
  storyFlags: z.array(z.string()).optional(),
  lastCityEventHour: finiteNumber.optional(),
  activeCityIncident: z.union([z.unknown(), z.null()]).optional(),
  unlockedEndings: z.array(z.string()).optional(),
  ftuePhase: z.string().optional(),
  tutorialStep: finiteNumber,
  tutorialMinimized: z.boolean().optional(),
}).passthrough();

export const validateSavedState = (candidate: unknown): SaveValidationResult => {
  const parsed = gameStateCandidateSchema.safeParse(candidate);

  if (!parsed.success) {
    return {
      valid: false,
      reasons: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'save'}: ${issue.message}`),
    };
  }

  return { valid: true, state: parsed.data as GameState, reasons: [] };
};
