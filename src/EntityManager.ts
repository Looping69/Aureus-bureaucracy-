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
import { findPath } from './utils/pathfinding';

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
  pathToWork: WorldPosition[];
  pathToHome: WorldPosition[];
  phase: 'AT_HOME' | 'COMMUTING_TO_WORK' | 'AT_WORK' | 'COMMUTING_HOME';
  pathIndex: number;
  moveTick: number;
}

export class EntityManager {
  private scene: THREE.Scene;
  public player: VoxelCharacter;
  public remotePlayers: Map<string, VoxelCharacter> = new Map();
  public buildings: Map<string, VoxelBuilding> = new Map();
  public npcs: Map<string, VoxelCharacter> = new Map();
  public entityGroup: THREE.Group;
  private lightPool: THREE.PointLight[] = [];
  private MAX_LIGHTS = 8;
  private npcMovement: Map<string, NpcMovementState> = new Map();
  private buildingsData: Record<string, Building> = {};

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

  private getRemotePlayerPalette(playerId: string) {
    const palettes = Object.values(NPC_PALETTES);
    const hash = Array.from(playerId).reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 7);
    return palettes[hash % palettes.length];
  }

  public syncRemotePlayers(players: Array<{ id: string; position: WorldPosition; carriedOre?: number }>) {
    const activeIds = new Set(players.map((player) => player.id));

    this.remotePlayers.forEach((character, playerId) => {
      if (activeIds.has(playerId)) return;
      this.entityGroup.remove(character.group);
      this.remotePlayers.delete(playerId);
    });

    players.forEach((player) => {
      let character = this.remotePlayers.get(player.id);
      if (!character) {
        character = new VoxelCharacter(this.getRemotePlayerPalette(player.id));
        character.group.userData.remotePlayerId = player.id;
        this.remotePlayers.set(player.id, character);
        this.entityGroup.add(character.group);
      }

      character.group.position.set(
        player.position.x - WORLD_HALF_SIZE,
        CONFIG.FLOOR_Y + 0.5,
        player.position.y - WORLD_HALF_SIZE,
      );
      character.setCarriedAmount(player.carriedOre ?? 0);
    });
  }

  public updateRemotePlayer(
    playerId: string,
    position: WorldPosition,
    isMoving: boolean,
    carriedOre = 0,
  ) {
    const character = this.remotePlayers.get(playerId);
    if (!character) return;

    character.group.position.set(
      position.x - WORLD_HALF_SIZE,
      CONFIG.FLOOR_Y + 0.5,
      position.y - WORLD_HALF_SIZE,
    );
    character.setMoving(isMoving);
    character.setCarriedAmount(carriedOre);
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

    for (const npc of Object.values(allNpcs)) {
      if (!npc.homeBuildingId || !npc.workBuildingId) continue;
      if (npc.homeBuildingId === npc.workBuildingId) continue;

      const homeBuilding = buildings[npc.homeBuildingId];
      const workBuilding = buildings[npc.workBuildingId];
      if (!homeBuilding || !workBuilding) continue;

      const homePos = getBuildingAccessPosition(homeBuilding);
      const workPos = getBuildingAccessPosition(workBuilding);

      const pathToWork = findPath(homePos, workPos, buildings, undefined, navigationZones);
      const pathToHome = findPath(workPos, homePos, buildings, undefined, navigationZones);

      if (pathToWork.length === 0 && pathToHome.length === 0) continue;

      this.npcMovement.set(npc.id, {
        npcId: npc.id,
        homePos,
        workPos,
        workStart: npc.workHours.start,
        workEnd: npc.workHours.end,
        pathToWork,
        pathToHome,
        phase: 'AT_HOME',
        pathIndex: 0,
        moveTick: 0,
      });
    }
  }

  /** Advance NPC commuting based on current game time (called every frame). */
  private updateNpcCommute(time: number) {
    this.npcMovement.forEach((state) => {
      const npcChar = this.npcs.get(state.npcId);
      if (!npcChar) return;

      // Determine whether NPC should be commuting, at work, or at home
      const commuteLeadTime = 1; // leave 1 hour before work starts
      const wrapsAround = state.workStart > state.workEnd;
      const isWorkTime = wrapsAround
        ? time >= state.workStart || time < state.workEnd
        : time >= state.workStart && time < state.workEnd;
      const isCommuteToWork = wrapsAround
        ? time >= (state.workStart - commuteLeadTime + 24) % 24 && time < state.workStart
        : time >= state.workStart - commuteLeadTime && time < state.workStart;
      const isCommuteHome = wrapsAround
        ? time >= state.workEnd && time < state.workEnd + commuteLeadTime
        : time >= state.workEnd && time < state.workEnd + commuteLeadTime;

      const prevPhase = state.phase;

      if (isCommuteToWork && state.phase === 'AT_HOME') {
        state.phase = 'COMMUTING_TO_WORK';
        state.pathIndex = 0;
        state.moveTick = 0;
      } else if (isWorkTime && (state.phase === 'COMMUTING_TO_WORK' || state.phase === 'AT_HOME')) {
        state.phase = 'AT_WORK';
        state.pathIndex = 0;
        state.moveTick = 0;
      } else if (isCommuteHome && state.phase === 'AT_WORK') {
        state.phase = 'COMMUTING_HOME';
        state.pathIndex = 0;
        state.moveTick = 0;
      } else if (!isWorkTime && !isCommuteToWork && !isCommuteHome && state.phase !== 'AT_HOME' && state.phase !== 'COMMUTING_HOME') {
        state.phase = 'AT_HOME';
        state.pathIndex = 0;
        state.moveTick = 0;
      }

      // If phase just changed, handle snap to destination
      if (prevPhase !== state.phase) {
        if (state.phase === 'AT_WORK') {
          this.placeNpcAt(npcChar, state.workPos);
          npcChar.setMoving(false);
        } else if (state.phase === 'AT_HOME') {
          this.placeNpcAt(npcChar, state.homePos);
          npcChar.setMoving(false);
        }
      }

      // Animate commuting
      if (state.phase === 'COMMUTING_TO_WORK') {
        this.advanceNpcAlongPath(npcChar, state, state.pathToWork, 'AT_WORK', state.workPos);
      } else if (state.phase === 'COMMUTING_HOME') {
        this.advanceNpcAlongPath(npcChar, state, state.pathToHome, 'AT_HOME', state.homePos);
      }
    });
  }

  private advanceNpcAlongPath(
    npcChar: VoxelCharacter,
    state: NpcMovementState,
    path: WorldPosition[],
    endPhase: NpcMovementState['phase'],
    endPos: WorldPosition
  ) {
    if (path.length === 0) {
      state.phase = endPhase;
      this.placeNpcAt(npcChar, endPos);
      npcChar.setMoving(false);
      return;
    }

    // Move one step every few ticks (controlled by moveTick)
    state.moveTick += 1;
    const TICKS_PER_STEP = 4; // advance one path node every 4 update cycles
    if (state.moveTick < TICKS_PER_STEP) return;
    state.moveTick = 0;

    if (state.pathIndex < path.length) {
      const target = path[state.pathIndex];
      this.placeNpcAt(npcChar, target);
      npcChar.setMoving(true);

      // Face direction of movement
      if (state.pathIndex > 0) {
        const prev = path[state.pathIndex - 1];
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        if (dx !== 0 || dy !== 0) {
          npcChar.group.rotation.y = Math.atan2(dx, -dy);
        }
      }

      state.pathIndex += 1;
    } else {
      state.phase = endPhase;
      this.placeNpcAt(npcChar, endPos);
      npcChar.setMoving(false);
    }
  }

  private placeNpcAt(npcChar: VoxelCharacter, pos: WorldPosition) {
    npcChar.group.position.set(
      pos.x - WORLD_HALF_SIZE,
      CONFIG.FLOOR_Y + 0.5,
      pos.y - WORLD_HALF_SIZE
    );
  }

  public update(deltaTime: number, time: number) {
    this.player.update(deltaTime);
    this.remotePlayers.forEach((player) => player.update(deltaTime));
    this.npcs.forEach(npc => npc.update(deltaTime));

    // Advance NPC commuting
    this.updateNpcCommute(time);

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
    this.remotePlayers.clear();
    this.buildings.clear();
    this.npcMovement.clear();
    this.lightPool.forEach(l => this.scene.remove(l));
    this.lightPool = [];
  }
}
