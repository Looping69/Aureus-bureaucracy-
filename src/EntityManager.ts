import * as THREE from 'three';
import { VoxelCharacter } from './VoxelCharacter';
import { VoxelBuilding } from './VoxelBuilding';
import { Building, NavigationZone, NPC, WorldPosition } from './types';
import { CONFIG, WORLD_HALF_SIZE } from './utils/voxelConstants';
import {
  getBuildingAccessPosition,
  getBuildingFootprint,
  getBuildingHeight,
  getStructureBaseHeight,
} from './utils/worldNavigation';
import {
  buildNpcPedestrianPath,
  chooseNpcRoamingDestination,
  collectNpcRoamingDestinations,
  NPC_WALK_SPEED,
} from './game/npcNavigation';

// NPC colour palettes so each resident looks distinct
const NPC_PALETTES: Record<string, { shirt: number; pants: number; hair: number; skin: number; shoes: number; belt: number }> = {
  licensing:  { shirt: 0x4a5568, pants: 0x2d3748, hair: 0x1a1a2e, skin: 0xf5cba7, shoes: 0x1c1c1c, belt: 0x3b3b3b },
  union:      { shirt: 0x9b2c2c, pants: 0x4a3728, hair: 0x2c1810, skin: 0xd4a574, shoes: 0x2c2c2c, belt: 0x5c3a1e },
  inspector:  { shirt: 0x2b4c7e, pants: 0x1a1a2e, hair: 0x808080, skin: 0xfad6a5, shoes: 0x1c1c1c, belt: 0x2c2c2c },
  fixer:      { shirt: 0x4a4a4a, pants: 0x2c2c2c, hair: 0x111111, skin: 0xc69c6d, shoes: 0x333333, belt: 0x555555 },
  journalist: { shirt: 0x7c3aed, pants: 0x312e81, hair: 0x1a1a2e, skin: 0xfce4c7, shoes: 0x2c2c2c, belt: 0x4a3728 },
  chief:      { shirt: 0x6b8e23, pants: 0x556b2f, hair: 0xcccccc, skin: 0x8b6914, shoes: 0x3b2f1a, belt: 0x5c3a1e },
  resident_a: { shirt: 0xb5651d, pants: 0x3d3d3d, hair: 0x4a2a0a, skin: 0xf0c8a0, shoes: 0x222222, belt: 0x6b4226 },
  resident_b: { shirt: 0x607d8b, pants: 0x37474f, hair: 0x8d6e63, skin: 0xffdbac, shoes: 0x1a1a1a, belt: 0x3e2723 },
  resident_c: { shirt: 0xef6c00, pants: 0x4e342e, hair: 0x111111, skin: 0xc69c6d, shoes: 0x3e2723, belt: 0x4a3728 },
  resident_d: { shirt: 0x558b2f, pants: 0x33691e, hair: 0x5d4037, skin: 0xf5cba7, shoes: 0x2c2c2c, belt: 0x5c3a1e },
};

interface NpcMovementState {
  npcId: string;
  homePos: WorldPosition;
  workPos: WorldPosition;
  workStart: number;
  workEnd: number;
  phase: 'AT_WORK' | 'COMMUTING_TO_WORK' | 'OFF_DUTY_IDLE' | 'OFF_DUTY_WALK';
  currentPos: WorldPosition;
  activePath: WorldPosition[];
  pathIndex: number;
  idleTimeRemaining: number;
  roamDestinations: WorldPosition[];
  lastRoamDestination: WorldPosition | null;
}

export class EntityManager {
  private scene: THREE.Scene;
  public player: VoxelCharacter;
  public buildings: Map<string, VoxelBuilding> = new Map();
  public npcs: Map<string, VoxelCharacter> = new Map();
  public entityGroup: THREE.Group;
  private lightPool: THREE.PointLight[] = [];
  private MAX_LIGHTS = 8;
  private npcMovement: Map<string, NpcMovementState> = new Map();
  private npcData: Record<string, NPC> = {};
  private buildingsData: Record<string, Building> = {};
  private navigationZones: NavigationZone[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.entityGroup = new THREE.Group();
    this.scene.add(this.entityGroup);

    // Initialize player
    this.player = new VoxelCharacter();
    this.entityGroup.add(this.player.group);

    // Initialize light pool
    for (let i = 0; i < this.MAX_LIGHTS; i++) {
      const light = new THREE.PointLight(0xffaa00, 0, 15);
      light.castShadow = false;
      this.lightPool.push(light);
      this.scene.add(light);
    }
  }

  public addBuilding(buildingData: Building) {
    if (this.buildings.has(buildingData.id)) return;
    this.buildingsData[buildingData.id] = buildingData;
    
    if (buildingData.voxels) {
      const shouldVaryPalette = !['ROAD', 'SIDEWALK', 'PARK', 'HOTLINE', 'MINE_ENTRANCE'].includes(buildingData.type);
      const building = new VoxelBuilding(
        buildingData.id,
        buildingData.name,
        buildingData.voxels,
        buildingData.id,
        shouldVaryPalette
      );

      const worldX = buildingData.pos.x - WORLD_HALF_SIZE;
      const worldZ = buildingData.pos.y - WORLD_HALF_SIZE;

      building.setPosition(worldX, getStructureBaseHeight(buildingData.type), worldZ);
      building.group.userData.buildingId = buildingData.id;
      building.group.userData.buildingType = buildingData.type;
      building.group.userData.worldFootprint = getBuildingFootprint(buildingData);
      building.group.userData.worldAccessPoint = getBuildingAccessPosition(buildingData);
      this.buildings.set(buildingData.id, building);
      this.entityGroup.add(building.group);

      const collider = this.createInteractionCollider(buildingData);
      if (collider) {
        building.group.add(collider);
      }

      if (buildingData.name === 'Street Light') {
        building.group.userData.isStreetLight = true;
        building.group.userData.lightPos = new THREE.Vector3(worldX + 1, CONFIG.FLOOR_Y + 6, worldZ);
      }
    }
  }

  private createInteractionCollider(buildingData: Building) {
    if (['ROAD', 'SIDEWALK', 'PARK'].includes(buildingData.type)) {
      return null;
    }

    const footprint = getBuildingFootprint(buildingData) ?? (
      buildingData.type === 'MINE_ENTRANCE' || buildingData.type === 'HOTLINE'
        ? {
            minX: buildingData.pos.x - 1,
            maxX: buildingData.pos.x + 1,
            minY: buildingData.pos.y - 1,
            maxY: buildingData.pos.y + 1,
          }
        : null
    );

    if (!footprint) {
      return null;
    }

    const width = Math.max(1.5, footprint.maxX - footprint.minX + 1.25);
    const depth = Math.max(1.5, footprint.maxY - footprint.minY + 1.25);
    const height = Math.max(2.5, getBuildingHeight(buildingData) + 0.75);

    const collider = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );

    collider.position.set(
      (footprint.minX + footprint.maxX) / 2 - WORLD_HALF_SIZE,
      getStructureBaseHeight(buildingData.type) + height / 2,
      (footprint.minY + footprint.maxY) / 2 - WORLD_HALF_SIZE
    );
    collider.userData.buildingId = buildingData.id;
    collider.userData.buildingType = buildingData.type;
    collider.userData.worldFootprint = footprint;
    collider.userData.worldAccessPoint = getBuildingAccessPosition(buildingData);
    collider.renderOrder = -1;

    return collider;
  }

  public addNPC(npcData: NPC, position: { x: number, y: number }) {
    if (this.npcs.has(npcData.id)) return;
    
    const palette = NPC_PALETTES[npcData.id];
    const npc = new VoxelCharacter(palette);
    const worldX = position.x - WORLD_HALF_SIZE;
    const worldZ = position.y - WORLD_HALF_SIZE;
    
    npc.group.position.set(worldX, CONFIG.FLOOR_Y + 0.5, worldZ);
    npc.group.userData.npcId = npcData.id;
    this.npcs.set(npcData.id, npc);
    this.entityGroup.add(npc.group);
  }

  /** Set up commuting routes for NPCs that have separate home / work buildings. */
  public initNpcMovement(
    allNpcs: Record<string, NPC>,
    buildings: Record<string, Building>,
    navigationZones: NavigationZone[] = []
  ) {
    this.npcMovement.clear();
    this.npcData = allNpcs;
    this.buildingsData = buildings;
    this.navigationZones = navigationZones;

    for (const npc of Object.values(allNpcs)) {
      if (!npc.homeBuildingId || !npc.workBuildingId) continue;

      const homeBuilding = buildings[npc.homeBuildingId];
      const workBuilding = buildings[npc.workBuildingId];
      if (!homeBuilding || !workBuilding) continue;

      const homePos = getBuildingAccessPosition(homeBuilding);
      const workPos = getBuildingAccessPosition(workBuilding);
      const roamDestinations = collectNpcRoamingDestinations(npc, buildings);

      this.npcMovement.set(npc.id, {
        npcId: npc.id,
        homePos,
        workPos,
        workStart: npc.workHours.start,
        workEnd: npc.workHours.end,
        phase: 'OFF_DUTY_IDLE',
        currentPos: { ...homePos },
        activePath: [],
        pathIndex: 0,
        idleTimeRemaining: 0.6,
        roamDestinations,
        lastRoamDestination: null,
      });
    }
  }

  private isWorkTime(state: NpcMovementState, time: number) {
    if (state.workStart === state.workEnd) {
      return true;
    }

    const wrapsAround = state.workStart > state.workEnd;
    return wrapsAround
      ? time >= state.workStart || time < state.workEnd
      : time >= state.workStart && time < state.workEnd;
  }

  private isWithinPreWorkLead(state: NpcMovementState, time: number, leadHours: number = 1) {
    if (state.workStart === state.workEnd) {
      return true;
    }

    const normalizedDelta = (state.workStart - time + 24) % 24;
    return normalizedDelta > 0 && normalizedDelta <= leadHours;
  }

  private positionsClose(a: WorldPosition, b: WorldPosition, tolerance: number = 0.05) {
    return Math.hypot(a.x - b.x, a.y - b.y) <= tolerance;
  }

  private setNpcPhase(state: NpcMovementState, phase: NpcMovementState['phase']) {
    state.phase = phase;
    if (phase !== 'OFF_DUTY_WALK') {
      state.activePath = [];
      state.pathIndex = 0;
    }
  }

  private routeNpc(
    npc: NPC,
    state: NpcMovementState,
    destination: WorldPosition,
    phase: NpcMovementState['phase']
  ) {
    const route = buildNpcPedestrianPath(
      npc,
      this.buildingsData,
      undefined,
      this.navigationZones,
      { x: Math.round(state.currentPos.x), y: Math.round(state.currentPos.y) },
      destination
    );

    state.activePath = route;
    state.pathIndex = 0;
    state.phase = phase;

    if (route.length === 0) {
      state.currentPos = { ...destination };
    }
  }

  private beginOffDutyWander(npc: NPC, state: NpcMovementState) {
    const destination = chooseNpcRoamingDestination(
      state.currentPos,
      state.roamDestinations,
      state.lastRoamDestination
    );

    if (!destination) {
      this.setNpcPhase(state, 'OFF_DUTY_IDLE');
      state.idleTimeRemaining = 1;
      return;
    }

    this.routeNpc(npc, state, destination, 'OFF_DUTY_WALK');

    if (state.activePath.length === 0) {
      state.lastRoamDestination = destination;
      this.setNpcPhase(state, 'OFF_DUTY_IDLE');
      state.idleTimeRemaining = 0.8 + Math.random() * 1.4;
    }
  }

  /** Advance NPC movement based on current game time (called every frame). */
  private updateNpcCommute(deltaTime: number, time: number) {
    this.npcMovement.forEach((state) => {
      const npcChar = this.npcs.get(state.npcId);
      const npcData = this.npcData[state.npcId];
      if (!npcChar || !npcData) return;

      this.updateNpcMovementState(npcData, npcChar, state, deltaTime, time);
    });
  }

  private updateNpcMovementState(
    npcData: NPC,
    npcChar: VoxelCharacter,
    state: NpcMovementState,
    deltaTime: number,
    time: number
  ) {
    const shouldHeadToWork = this.isWorkTime(state, time) || this.isWithinPreWorkLead(state, time);

    if (shouldHeadToWork) {
      if (this.positionsClose(state.currentPos, state.workPos)) {
        state.currentPos = { ...state.workPos };
        this.setNpcPhase(state, 'AT_WORK');
        this.placeNpcAt(npcChar, state.workPos);
        npcChar.setMoving(false);
        return;
      }

      if (state.phase !== 'COMMUTING_TO_WORK' || state.activePath.length === 0) {
        this.routeNpc(npcData, state, state.workPos, 'COMMUTING_TO_WORK');
      }

      this.advanceNpcAlongPath(npcChar, state, deltaTime, 'AT_WORK', state.workPos);
      return;
    }

    if (state.phase === 'COMMUTING_TO_WORK' || state.phase === 'AT_WORK') {
      this.setNpcPhase(state, 'OFF_DUTY_IDLE');
      state.idleTimeRemaining = 0.8;
    }

    if (state.phase === 'OFF_DUTY_WALK') {
      const destination = state.activePath[state.activePath.length - 1] ?? state.currentPos;
      this.advanceNpcAlongPath(npcChar, state, deltaTime, 'OFF_DUTY_IDLE', destination);
      const phaseAfterMove = state.phase as NpcMovementState['phase'];
      if (phaseAfterMove === 'OFF_DUTY_IDLE') {
        state.lastRoamDestination = { x: Math.round(destination.x), y: Math.round(destination.y) };
        state.idleTimeRemaining = 0.8 + Math.random() * 1.4;
      }
      return;
    }

    state.idleTimeRemaining -= deltaTime;
    if (state.idleTimeRemaining <= 0) {
      this.beginOffDutyWander(npcData, state);
      const phaseAfterWanderPick = state.phase as NpcMovementState['phase'];
      if (phaseAfterWanderPick === 'OFF_DUTY_WALK') {
        this.advanceNpcAlongPath(
          npcChar,
          state,
          deltaTime,
          'OFF_DUTY_IDLE',
          state.activePath[state.activePath.length - 1] ?? state.currentPos
        );
      } else {
        this.placeNpcAtFloat(npcChar, state.currentPos);
        npcChar.setMoving(false);
      }
      return;
    }

    this.placeNpcAtFloat(npcChar, state.currentPos);
    npcChar.setMoving(false);
  }

  private advanceNpcAlongPath(
    npcChar: VoxelCharacter,
    state: NpcMovementState,
    deltaTime: number,
    endPhase: NpcMovementState['phase'],
    endPos: WorldPosition
  ) {
    const path = state.activePath;
    if (path.length === 0 || state.pathIndex >= path.length) {
      state.phase = endPhase;
      state.currentPos = { ...endPos };
      this.placeNpcAt(npcChar, endPos);
      npcChar.setMoving(false);
      return;
    }

    let remainingDistance = NPC_WALK_SPEED * deltaTime;
    let moved = false;

    while (remainingDistance > 0 && state.pathIndex < path.length) {
      const target = path[state.pathIndex];
      const dx = target.x - state.currentPos.x;
      const dy = target.y - state.currentPos.y;
      const segmentDistance = Math.hypot(dx, dy);

      if (segmentDistance <= 0.0001) {
        state.currentPos = { ...target };
        state.pathIndex += 1;
        continue;
      }

      npcChar.group.rotation.y = Math.atan2(dx, -dy);
      moved = true;

      if (remainingDistance >= segmentDistance) {
        state.currentPos = { ...target };
        state.pathIndex += 1;
        remainingDistance -= segmentDistance;
        continue;
      }

      state.currentPos = {
        x: state.currentPos.x + (dx / segmentDistance) * remainingDistance,
        y: state.currentPos.y + (dy / segmentDistance) * remainingDistance,
      };
      remainingDistance = 0;
    }

    if (state.pathIndex >= path.length) {
      state.currentPos = { ...endPos };
      state.activePath = [];
      state.pathIndex = 0;
      state.phase = endPhase;
      this.placeNpcAt(npcChar, endPos);
      npcChar.setMoving(false);
      return;
    }

    this.placeNpcAtFloat(npcChar, state.currentPos);
    npcChar.setMoving(moved);
  }

  private placeNpcAt(npcChar: VoxelCharacter, pos: WorldPosition) {
    npcChar.group.position.set(
      pos.x - WORLD_HALF_SIZE,
      CONFIG.FLOOR_Y + 0.5,
      pos.y - WORLD_HALF_SIZE
    );
  }

  private placeNpcAtFloat(npcChar: VoxelCharacter, pos: WorldPosition) {
    npcChar.group.position.set(
      pos.x - WORLD_HALF_SIZE,
      CONFIG.FLOOR_Y + 0.5,
      pos.y - WORLD_HALF_SIZE
    );
  }

  public update(deltaTime: number, time: number) {
    this.player.update(deltaTime);
    this.npcs.forEach(npc => npc.update(deltaTime));

    // Advance NPC commuting
    this.updateNpcCommute(deltaTime, time);

    // Update light pool based on proximity to player
    const isNight = time >= 19 || time < 6;
    
    if (!isNight) {
      this.lightPool.forEach(l => l.intensity = 0);
      return;
    }

    // Find closest street lights
    const streetLights: { dist: number, pos: THREE.Vector3 }[] = [];
    this.buildings.forEach(b => {
      if (b.group.userData.isStreetLight) {
        const pos = b.group.userData.lightPos as THREE.Vector3;
        const dist = pos.distanceTo(this.player.group.position);
        if (dist < 50) {
          streetLights.push({ dist, pos });
        }
      }
    });

    streetLights.sort((a, b) => a.dist - b.dist);

    // Assign lights from pool
    for (let i = 0; i < this.MAX_LIGHTS; i++) {
      const light = this.lightPool[i];
      if (i < streetLights.length) {
        light.position.copy(streetLights[i].pos);
        light.intensity = 1.5;
      } else {
        light.intensity = 0;
      }
    }
  }

  public cleanup() {
    this.entityGroup.clear();
    this.buildings.clear();
    this.npcMovement.clear();
    this.lightPool.forEach(l => this.scene.remove(l));
    this.lightPool = [];
  }
}
