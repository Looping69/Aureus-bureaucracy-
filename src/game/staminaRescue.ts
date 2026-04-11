import {
  EmergencyVehicle,
  GameState,
  MedicalNpc,
  PlayerCondition,
  RescueMission,
  StaminaPowerUp,
  WorldPosition,
} from '../types';
import { getBuildingAccessPosition } from '../utils/buildingAccess';
import { findNpcPath } from '../utils/pathfinding';
import { buildWorldSurfaceMap, getNearestWalkableTile } from '../utils/worldSurface';

const DEFAULT_STAMINA_MAX = 100;
const COLLAPSE_DURATION_SECONDS = 1.1;
const REVIVE_DURATION_SECONDS = 2.4;
const RECOVERY_DURATION_SECONDS = 1.8;
const POWER_UP_COLLECTION_RADIUS = 1.2;
const MEDIC_STEP_SECONDS = 0.16;
const AMBULANCE_STEP_SECONDS = 0.12;
const PLAYER_RECOVERY_STAMINA = 55;

const sanitizePosition = (
  pos: WorldPosition,
  surfaceMap: ReturnType<typeof buildWorldSurfaceMap>,
): WorldPosition => {
  const tile = getNearestWalkableTile(pos, surfaceMap, 10);
  return tile ? { x: tile.x, y: tile.y } : pos;
};

const findNearbyWalkableTile = (
  surfaceMap: ReturnType<typeof buildWorldSurfaceMap>,
  target: WorldPosition,
  offset: WorldPosition,
) => sanitizePosition({ x: target.x + offset.x, y: target.y + offset.y }, surfaceMap);

const buildPowerUp = (
  id: string,
  pos: WorldPosition,
  restoreAmount: number,
  color: string,
  glowColor: string,
  bobOffset: number,
  spinSpeed: number,
  label: string,
  kind: StaminaPowerUp['kind'],
): StaminaPowerUp => ({
  id,
  pos,
  restoreAmount,
  color,
  glowColor,
  bobOffset,
  spinSpeed,
  label,
  kind,
});

export const createInitialStaminaState = (): GameState['stamina'] => ({
  current: DEFAULT_STAMINA_MAX,
  max: DEFAULT_STAMINA_MAX,
  regenPerSecond: 4.5,
  restRegenPerSecond: 7.5,
  movementDrainPerUnit: 6.5,
  analogDrainPerStep: 3.25,
});

export const createInitialStaminaPowerUps = (state: Pick<GameState, 'buildings'>): StaminaPowerUp[] => {
  const fromBuilding = (buildingId: string, offset: WorldPosition) => {
    const building = state.buildings[buildingId];
    const anchor = building ? getBuildingAccessPosition(building) : { x: 0, y: 0 };
    return { x: anchor.x + offset.x, y: anchor.y + offset.y };
  };

  return [
    buildPowerUp('ration-park', fromBuilding('central_park', { x: 2, y: -1 }), 28, '#facc15', '#fde68a', 0.1, 0.9, 'Field Ration', 'FIELD_RATION'),
    buildPowerUp('charge-market', fromBuilding('union_hall', { x: -3, y: 2 }), 34, '#38bdf8', '#7dd3fc', 1.4, 1.2, 'Adrenal Charge', 'ADRENAL_CHARGE'),
    buildPowerUp('ration-home', fromBuilding('player_home', { x: 4, y: -2 }), 22, '#fb7185', '#fda4af', 2.1, 0.8, 'Pocket Salts', 'FIELD_RATION'),
    buildPowerUp('charge-factory', fromBuilding('factory_west', { x: 3, y: 3 }), 30, '#22c55e', '#86efac', 0.75, 1.1, 'Recovery Ampoule', 'ADRENAL_CHARGE'),
  ];
};

export const createInitialMedicalNpcs = (state: Pick<GameState, 'buildings'>): Record<string, MedicalNpc> => {
  const depot = state.buildings.hotline_booth
    ? getBuildingAccessPosition(state.buildings.hotline_booth)
    : { x: 0, y: 0 };

  return {
    medic_alpha: {
      id: 'medic_alpha',
      name: 'Medic Imani',
      role: 'MEDIC',
      pos: { x: depot.x - 1, y: depot.y },
      homePos: { x: depot.x - 1, y: depot.y },
      state: 'IDLE',
      path: [],
      pathIndex: 0,
      paletteKey: 'medic_alpha',
      reviveSide: 'LEFT',
    },
    medic_bravo: {
      id: 'medic_bravo',
      name: 'Medic Rho',
      role: 'MEDIC',
      pos: { x: depot.x + 1, y: depot.y },
      homePos: { x: depot.x + 1, y: depot.y },
      state: 'IDLE',
      path: [],
      pathIndex: 0,
      paletteKey: 'medic_bravo',
      reviveSide: 'RIGHT',
    },
  };
};

export const createInitialEmergencyVehicles = (state: Pick<GameState, 'buildings'>): Record<string, EmergencyVehicle> => {
  const depot = state.buildings.hotline_booth
    ? getBuildingAccessPosition(state.buildings.hotline_booth)
    : { x: 0, y: 0 };

  return {
    ambulance_1: {
      id: 'ambulance_1',
      label: 'Rescue Ambulance',
      type: 'AMBULANCE',
      pos: { x: depot.x, y: depot.y - 2 },
      homePos: { x: depot.x, y: depot.y - 2 },
      state: 'IDLE',
      path: [],
      pathIndex: 0,
      seats: 3,
    },
  };
};

export const createIdleRescueMission = (): RescueMission => ({
  id: null,
  phase: 'IDLE',
  targetPos: null,
  stagingPos: null,
  destinationPos: null,
  assignedMedicIds: [],
  vehicleId: null,
  phaseElapsed: 0,
  playerAttachedToVehicle: false,
});

const clampStamina = (value: number, max: number) => Math.max(0, Math.min(max, value));

export const isPlayerDowned = (state: Pick<GameState, 'playerStatus'>) =>
  state.playerStatus.condition !== 'ACTIVE';

export const canPlayerAct = (state: Pick<GameState, 'playerStatus'>) =>
  state.playerStatus.condition === 'ACTIVE';

export const applyStaminaDrain = (state: GameState, drain: number): GameState => {
  if (!canPlayerAct(state) || drain <= 0) {
    return state;
  }

  return {
    ...state,
    stamina: {
      ...state.stamina,
      current: clampStamina(state.stamina.current - drain, state.stamina.max),
    },
  };
};

export const applyStaminaRecovery = (state: GameState, deltaSeconds: number): GameState => {
  if (!canPlayerAct(state) || state.currentScene !== 'WORLD' || deltaSeconds <= 0) {
    return state;
  }

  const isIdle = state.path.length === 0 && state.targetPos === null;
  if (!isIdle) {
    return state;
  }

  const homePos = state.buildings.player_home
    ? getBuildingAccessPosition(state.buildings.player_home)
    : state.playerPos;
  const isResting = state.playerPos.x === homePos.x && state.playerPos.y === homePos.y;
  const regen = isResting ? state.stamina.restRegenPerSecond : state.stamina.regenPerSecond;

  return {
    ...state,
    stamina: {
      ...state.stamina,
      current: clampStamina(state.stamina.current + regen * deltaSeconds, state.stamina.max),
    },
  };
};

export const collectNearbyStaminaPowerUps = (
  state: GameState,
): { nextState: GameState; collected: StaminaPowerUp[] } => {
  if (state.currentScene !== 'WORLD' || state.staminaPowerUps.length === 0) {
    return { nextState: state, collected: [] };
  }

  const collected = state.staminaPowerUps.filter((powerUp) => {
    const dx = powerUp.pos.x - state.playerPos.x;
    const dy = powerUp.pos.y - state.playerPos.y;
    return Math.hypot(dx, dy) <= POWER_UP_COLLECTION_RADIUS;
  });

  if (collected.length === 0) {
    return { nextState: state, collected };
  }

  const restored = collected.reduce((sum, powerUp) => sum + powerUp.restoreAmount, 0);

  return {
    collected,
    nextState: {
      ...state,
      staminaPowerUps: state.staminaPowerUps.filter((powerUp) => !collected.some((item) => item.id === powerUp.id)),
      stamina: {
        ...state.stamina,
        current: clampStamina(state.stamina.current + restored, state.stamina.max),
      },
    },
  };
};

export const triggerPlayerCollapse = (state: GameState): GameState => {
  if (!canPlayerAct(state)) {
    return state;
  }

  const medicIds = Object.keys(state.medicalNpcs).slice(0, 2);
  const vehicle = Object.values(state.emergencyVehicles)[0] ?? null;
  const surfaceMap = buildWorldSurfaceMap(state.buildings);
  const targetPos = sanitizePosition(state.playerPos, surfaceMap);
  const stagingPos = findNearbyWalkableTile(surfaceMap, targetPos, { x: 0, y: 2 });
  const destinationPos = state.buildings.player_home
    ? getBuildingAccessPosition(state.buildings.player_home)
    : state.playerPos;

  const nextMedicalNpcs = { ...state.medicalNpcs };
  medicIds.forEach((medicId, index) => {
    const medic = nextMedicalNpcs[medicId];
    if (!medic) return;
    const reviveOffset = index === 0 ? { x: -1, y: 0 } : { x: 1, y: 0 };
    const rescueAnchor = findNearbyWalkableTile(surfaceMap, targetPos, reviveOffset);
    nextMedicalNpcs[medicId] = {
      ...medic,
      state: 'RESPONDING',
      path: findNpcPath(medic.pos, rescueAnchor, state.buildings),
      pathIndex: 0,
    };
  });

  const nextVehicles = { ...state.emergencyVehicles };
  if (vehicle) {
    nextVehicles[vehicle.id] = {
      ...vehicle,
      state: 'RESPONDING',
      path: findNpcPath(vehicle.pos, stagingPos, state.buildings),
      pathIndex: 0,
    };
  }

  return {
    ...state,
    playerStatus: {
      condition: 'COLLAPSING' as PlayerCondition,
      phaseElapsed: 0,
    },
    stamina: {
      ...state.stamina,
      current: 0,
    },
    path: [],
    targetPos: null,
    activeNPCId: null,
    rescueMission: {
      id: `rescue-${Date.now()}`,
      phase: 'DISPATCHED',
      targetPos,
      stagingPos,
      destinationPos,
      assignedMedicIds: medicIds,
      vehicleId: vehicle?.id ?? null,
      phaseElapsed: 0,
      playerAttachedToVehicle: false,
    },
    medicalNpcs: nextMedicalNpcs,
    emergencyVehicles: nextVehicles,
  };
};

const advancePathFollower = <T extends { pos: WorldPosition; path: WorldPosition[]; pathIndex: number }>(
  entity: T,
  elapsed: number,
  stepSeconds: number,
) => {
  const nextEntity = { ...entity };
  let remainingElapsed = elapsed;

  while (remainingElapsed >= stepSeconds && nextEntity.pathIndex < nextEntity.path.length) {
    nextEntity.pos = nextEntity.path[nextEntity.pathIndex];
    nextEntity.pathIndex += 1;
    remainingElapsed -= stepSeconds;
  }

  const arrived = nextEntity.pathIndex >= nextEntity.path.length;
  return { entity: nextEntity, arrived, leftoverElapsed: remainingElapsed };
};

export const advanceRescueMission = (
  state: GameState,
  deltaSeconds: number,
): { nextState: GameState; notifications: { title: string; msg: string }[] } => {
  const hasReturningEntities =
    Object.values(state.medicalNpcs).some((medic) => medic.state === 'RETURNING') ||
    Object.values(state.emergencyVehicles).some((vehicle) => vehicle.state === 'RETURNING');

  if ((state.rescueMission.phase === 'IDLE' && !hasReturningEntities) || deltaSeconds <= 0) {
    return { nextState: state, notifications: [] };
  }

  let nextState = {
    ...state,
    playerStatus: {
      ...state.playerStatus,
      phaseElapsed: state.playerStatus.phaseElapsed + deltaSeconds,
    },
    rescueMission: {
      ...state.rescueMission,
      phaseElapsed: state.rescueMission.phaseElapsed + deltaSeconds,
    },
    medicalNpcs: { ...state.medicalNpcs },
    emergencyVehicles: { ...state.emergencyVehicles },
  };
  const notifications: { title: string; msg: string }[] = [];

  if (
    nextState.playerStatus.condition === 'COLLAPSING' &&
    nextState.playerStatus.phaseElapsed >= COLLAPSE_DURATION_SECONDS
  ) {
    nextState.playerStatus = { condition: 'DOWNED', phaseElapsed: 0 };
    notifications.push({
      title: 'Medical Dispatch',
      msg: 'Two medics and an ambulance are inbound. Stay still. That part is no longer optional.',
    });
  }

  if (nextState.rescueMission.phase === 'DISPATCHED' || nextState.rescueMission.phase === 'TEAM_STAGING') {
    let medicsReady = true;

    nextState.rescueMission.assignedMedicIds.forEach((medicId) => {
      const medic = nextState.medicalNpcs[medicId];
      if (!medic) return;
      const { entity, arrived } = advancePathFollower(medic, deltaSeconds, MEDIC_STEP_SECONDS);
      nextState.medicalNpcs[medicId] = {
        ...entity,
        state: arrived ? 'REVIVING' : 'RESPONDING',
      };
      medicsReady = medicsReady && arrived;
    });

    if (nextState.rescueMission.vehicleId) {
      const vehicle = nextState.emergencyVehicles[nextState.rescueMission.vehicleId];
      if (vehicle) {
        const { entity, arrived } = advancePathFollower(vehicle, deltaSeconds, AMBULANCE_STEP_SECONDS);
        nextState.emergencyVehicles[vehicle.id] = {
          ...entity,
          state: arrived ? 'STAGED' : 'RESPONDING',
        };
        medicsReady = medicsReady && arrived;
      }
    }

    if (medicsReady) {
      nextState.rescueMission = {
        ...nextState.rescueMission,
        phase: 'REVIVING',
        phaseElapsed: 0,
      };
      nextState.playerStatus = { condition: 'REVIVING', phaseElapsed: 0 };
      notifications.push({
        title: 'Rescue Team On Site',
        msg: 'The medics have you. They are stabilizing you before transport.',
      });
    } else if (nextState.rescueMission.phase === 'DISPATCHED') {
      nextState.rescueMission = {
        ...nextState.rescueMission,
        phase: 'TEAM_STAGING',
      };
    }
  } else if (nextState.rescueMission.phase === 'REVIVING') {
    if (nextState.rescueMission.phaseElapsed >= REVIVE_DURATION_SECONDS) {
      const vehicleId = nextState.rescueMission.vehicleId;
      const destinationPos = nextState.rescueMission.destinationPos;
      if (vehicleId && destinationPos) {
        const vehicle = nextState.emergencyVehicles[vehicleId];
        if (vehicle) {
          nextState.emergencyVehicles[vehicleId] = {
            ...vehicle,
            state: 'TRANSPORTING',
            path: findNpcPath(vehicle.pos, destinationPos, nextState.buildings),
            pathIndex: 0,
          };
        }
      }

      nextState.rescueMission = {
        ...nextState.rescueMission,
        phase: 'TRANSPORTING',
        phaseElapsed: 0,
        playerAttachedToVehicle: true,
      };
      nextState.playerStatus = { condition: 'RECOVERING', phaseElapsed: 0 };
      notifications.push({
        title: 'Transport Underway',
        msg: 'The ambulance has loaded you and is moving you to recovery.',
      });
    }
  } else if (nextState.rescueMission.phase === 'TRANSPORTING') {
    const vehicleId = nextState.rescueMission.vehicleId;
    const vehicle = vehicleId ? nextState.emergencyVehicles[vehicleId] : null;

    if (vehicle) {
      const { entity, arrived } = advancePathFollower(vehicle, deltaSeconds, AMBULANCE_STEP_SECONDS);
      nextState.emergencyVehicles[vehicle.id] = entity;
      nextState.playerPos = entity.pos;
      nextState.rescueMission = {
        ...nextState.rescueMission,
        phaseElapsed: arrived ? 0 : nextState.rescueMission.phaseElapsed,
        phase: arrived ? 'RECOVERING' : nextState.rescueMission.phase,
      };

      nextState.rescueMission.assignedMedicIds.forEach((medicId, index) => {
        const medic = nextState.medicalNpcs[medicId];
        if (!medic) return;
        nextState.medicalNpcs[medicId] = {
          ...medic,
          pos: {
            x: entity.pos.x + (index === 0 ? -1 : 1),
            y: entity.pos.y,
          },
          state: 'ESCORTING',
          path: [],
          pathIndex: 0,
        };
      });

      if (arrived) {
        notifications.push({
          title: 'Recovery Site Reached',
          msg: 'You made it out. Give it a second and let the medics finish their work.',
        });
      }
    }
  } else if (nextState.rescueMission.phase === 'RECOVERING') {
    if (nextState.rescueMission.phaseElapsed >= RECOVERY_DURATION_SECONDS) {
      const destinationPos = nextState.rescueMission.destinationPos ?? nextState.playerPos;
      const vehicleId = nextState.rescueMission.vehicleId;

      if (vehicleId) {
        const vehicle = nextState.emergencyVehicles[vehicleId];
        if (vehicle) {
          nextState.emergencyVehicles[vehicleId] = {
            ...vehicle,
            state: 'RETURNING',
            path: findNpcPath(vehicle.pos, vehicle.homePos, nextState.buildings),
            pathIndex: 0,
          };
        }
      }

      nextState.rescueMission.assignedMedicIds.forEach((medicId) => {
        const medic = nextState.medicalNpcs[medicId];
        if (!medic) return;
        nextState.medicalNpcs[medicId] = {
          ...medic,
          state: 'RETURNING',
          path: findNpcPath(medic.pos, medic.homePos, nextState.buildings),
          pathIndex: 0,
        };
      });

      nextState.playerPos = destinationPos;
      nextState.playerStatus = { condition: 'ACTIVE', phaseElapsed: 0 };
      nextState.stamina = {
        ...nextState.stamina,
        current: Math.max(PLAYER_RECOVERY_STAMINA, nextState.stamina.current),
      };
      nextState.rescueMission = createIdleRescueMission();
      notifications.push({
        title: 'Recovered',
        msg: 'You are back on your feet. Stamina is partially restored, but don’t sprint yourself into the dirt again.',
      });
    }
  }

  if (nextState.rescueMission.phase === 'IDLE') {
    Object.values(nextState.medicalNpcs).forEach((medic) => {
      if (medic.state !== 'RETURNING') return;
      const { entity, arrived } = advancePathFollower(medic, deltaSeconds, MEDIC_STEP_SECONDS);
      nextState.medicalNpcs[medic.id] = {
        ...entity,
        state: arrived ? 'IDLE' : 'RETURNING',
      };
    });

    Object.values(nextState.emergencyVehicles).forEach((vehicle) => {
      if (vehicle.state !== 'RETURNING') return;
      const { entity, arrived } = advancePathFollower(vehicle, deltaSeconds, AMBULANCE_STEP_SECONDS);
      nextState.emergencyVehicles[vehicle.id] = {
        ...entity,
        state: arrived ? 'IDLE' : 'RETURNING',
      };
    });
  }

  return { nextState, notifications };
};
