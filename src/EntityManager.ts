/**
 * @module EntityManager
 * Manages all live scene entities: the player {@link VoxelCharacter}, NPC characters,
 * {@link VoxelBuilding} meshes, a pooled street-light system, and the NPC commute AI.
 *
 * NPC commuting is driven by pre-computed A* paths ({@link findPath}) stored in
 * {@link NpcMovementState}.  Call {@link EntityManager.initNpcMovement} after buildings
 * are loaded, then call {@link EntityManager.update} every frame.
 */
import * as THREE from 'three';
import { VoxelCharacter } from './VoxelCharacter';
import { VoxelBuilding } from './VoxelBuilding';
import { Building, NPC, WorldPosition } from './types';
import { CONFIG, WORLD_HALF_SIZE } from './utils/voxelConstants';
import {
  getBuildingAccessPosition,
  getBuildingFootprint,
  getBuildingHeight,
  getStructureBaseHeight,
} from './utils/worldNavigation';
import { findNpcPath } from './utils/pathfinding';
import { isDaytimeHours } from './utils/dayNightCycle';

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

/**
 * Runtime commuting state for a single NPC.
 * Paths are pre-computed once via {@link EntityManager.initNpcMovement} and
 * replayed frame-by-frame in {@link EntityManager.updateNpcCommute}.
 */
interface NpcMovementState {
  npcId: string;
  homePos: WorldPosition;
  workPos: WorldPosition;
  workStart: number;
  workEnd: number;
  pathToWork: WorldPosition[];
  pathToHome: WorldPosition[];
  /** Current commute phase – determines which path array is being followed. */
  phase: 'AT_HOME' | 'COMMUTING_TO_WORK' | 'AT_WORK' | 'COMMUTING_HOME';
  /** Index of the next waypoint to visit in the active path array. */
  pathIndex: number;
  /** Fractional interpolation progress [0,1) between current waypoint and next. */
  lerpProgress: number;
}

/** Owns and animates all Three.js scene entities for a single game scene. */
export class EntityManager {
  private scene: THREE.Scene;
  public player: VoxelCharacter;
  public buildings: Map<string, VoxelBuilding> = new Map();
  public npcs: Map<string, VoxelCharacter> = new Map();
  public entityGroup: THREE.Group;
  private lightPool: THREE.PointLight[] = [];
  private MAX_LIGHTS = 8;
  private npcMovement: Map<string, NpcMovementState> = new Map();
  private buildingsData: Record<string, Building> = {};

  // --- Initialization ---
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

  // --- Building Management ---

  /**
   * Instantiate a {@link VoxelBuilding} mesh for the given building data, position
   * it in world space, and attach an invisible interaction collider used for
   * raycasting.  Street Lights additionally register a pooled point-light position.
   * @param buildingData - Serialised building descriptor from the world data.
   */
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

  // --- NPC Management ---

  /**
   * Spawn a new NPC character at the given world-grid position and register it
   * in the NPC map.  Each NPC receives a palette keyed by its `npcData.id`.
   * @param npcData - NPC descriptor including id, work hours, and building refs.
   * @param position - World-grid tile position (x, y) where the NPC should appear.
   */
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

  // --- NPC Commute AI ---

  /**
   * Set up commuting routes for NPCs that have separate home / work buildings.
   * @param allNpcs - Map of all NPC descriptors keyed by NPC id.
   * @param buildings - Map of all building descriptors keyed by building id.
   */
  public initNpcMovement(allNpcs: Record<string, NPC>, buildings: Record<string, Building>) {
    this.npcMovement.clear();

    for (const npc of Object.values(allNpcs)) {
      if (!npc.homeBuildingId || !npc.workBuildingId) continue;
      if (npc.homeBuildingId === npc.workBuildingId) continue;

      const homeBuilding = buildings[npc.homeBuildingId];
      const workBuilding = buildings[npc.workBuildingId];
      if (!homeBuilding || !workBuilding) continue;

      const homePos = getBuildingAccessPosition(homeBuilding);
      const workPos = getBuildingAccessPosition(workBuilding);

      // Use NPC-specific pathfinding that strongly prefers roads
      const pathToWork = findNpcPath(homePos, workPos, buildings);
      const pathToHome = findNpcPath(workPos, homePos, buildings);

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
        lerpProgress: 0,
      });
    }
  }

  /** Advance NPC commuting based on current game time (called every frame). */
  private updateNpcCommute(time: number, deltaTime: number) {
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
        state.lerpProgress = 0;
      } else if (isWorkTime && (state.phase === 'COMMUTING_TO_WORK' || state.phase === 'AT_HOME')) {
        state.phase = 'AT_WORK';
        state.pathIndex = 0;
        state.lerpProgress = 0;
      } else if (isCommuteHome && state.phase === 'AT_WORK') {
        state.phase = 'COMMUTING_HOME';
        state.pathIndex = 0;
        state.lerpProgress = 0;
      } else if (!isWorkTime && !isCommuteToWork && !isCommuteHome && state.phase !== 'AT_HOME' && state.phase !== 'COMMUTING_HOME') {
        state.phase = 'AT_HOME';
        state.pathIndex = 0;
        state.lerpProgress = 0;
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

      // Animate commuting with smooth interpolation
      if (state.phase === 'COMMUTING_TO_WORK') {
        this.advanceNpcAlongPath(npcChar, state, state.pathToWork, 'AT_WORK', state.workPos, deltaTime);
      } else if (state.phase === 'COMMUTING_HOME') {
        this.advanceNpcAlongPath(npcChar, state, state.pathToHome, 'AT_HOME', state.homePos, deltaTime);
      }
    });
  }

  /** NPC walking speed in tiles per second — a natural walking pace. */
  private static readonly NPC_WALK_SPEED = 3.5;

  private advanceNpcAlongPath(
    npcChar: VoxelCharacter,
    state: NpcMovementState,
    path: WorldPosition[],
    endPhase: NpcMovementState['phase'],
    endPos: WorldPosition,
    deltaTime: number
  ) {
    if (path.length === 0) {
      state.phase = endPhase;
      this.placeNpcAt(npcChar, endPos);
      npcChar.setMoving(false);
      return;
    }

    // Advance lerp progress based on walk speed and delta time
    state.lerpProgress += EntityManager.NPC_WALK_SPEED * deltaTime;

    // Consume full waypoint segments as the NPC walks past them
    while (state.lerpProgress >= 1 && state.pathIndex < path.length - 1) {
      state.lerpProgress -= 1;
      state.pathIndex += 1;
    }

    if (state.pathIndex >= path.length - 1) {
      // Reached end of path
      state.phase = endPhase;
      this.placeNpcAt(npcChar, endPos);
      npcChar.setMoving(false);
      return;
    }

    // Interpolate between current waypoint and next
    const from = path[state.pathIndex];
    const to = path[state.pathIndex + 1];
    const t = Math.min(state.lerpProgress, 1);

    const interpX = from.x + (to.x - from.x) * t;
    const interpY = from.y + (to.y - from.y) * t;

    npcChar.group.position.set(
      interpX - WORLD_HALF_SIZE,
      CONFIG.FLOOR_Y + 0.5,
      interpY - WORLD_HALF_SIZE
    );
    npcChar.setMoving(true);

    // Face the direction of movement
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx !== 0 || dy !== 0) {
      npcChar.group.rotation.y = Math.atan2(dx, -dy);
    }
  }

  private placeNpcAt(npcChar: VoxelCharacter, pos: WorldPosition) {
    npcChar.group.position.set(
      pos.x - WORLD_HALF_SIZE,
      CONFIG.FLOOR_Y + 0.5,
      pos.y - WORLD_HALF_SIZE
    );
  }

  // --- Per-Frame Update ---

  /**
   * Advance all entity animations, NPC commuting logic, and the street-light pool.
   * @param deltaTime - Seconds elapsed since the last frame (for character animations).
   * @param time - Current in-game hour (0–23) used to schedule NPC commute phases.
   */
  public update(deltaTime: number, time: number) {
    this.player.update(deltaTime);
    this.npcs.forEach(npc => npc.update(deltaTime));

    // Advance NPC commuting
    this.updateNpcCommute(time, deltaTime);

    // Update light pool based on proximity to player
    const isNight = !isDaytimeHours(time);
    
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

  /**
   * Remove all entities from the scene and release light-pool resources.
   * Call before destroying the scene or loading a new one.
   */
  public cleanup() {
    this.entityGroup.clear();
    this.buildings.clear();
    this.npcMovement.clear();
    this.lightPool.forEach(l => this.scene.remove(l));
    this.lightPool = [];
  }
}
