import * as THREE from 'three';
import { VoxelCharacter } from './VoxelCharacter';
import { VoxelBuilding } from './VoxelBuilding';
import { Building, NPC } from './types';
import { CONFIG, WORLD_HALF_SIZE } from './utils/voxelConstants';
import {
  getBuildingAccessPosition,
  getBuildingFootprint,
  getBuildingHeight,
  getStructureBaseHeight,
} from './utils/worldNavigation';

export class EntityManager {
  private scene: THREE.Scene;
  public player: VoxelCharacter;
  public buildings: Map<string, VoxelBuilding> = new Map();
  public npcs: Map<string, VoxelCharacter> = new Map();
  public entityGroup: THREE.Group;
  private lightPool: THREE.PointLight[] = [];
  private MAX_LIGHTS = 8;

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
      light.castShadow = false; // Shadows are expensive
      this.lightPool.push(light);
      this.scene.add(light);
    }
  }

  public addBuilding(buildingData: Building) {
    if (this.buildings.has(buildingData.id)) return;
    
    if (buildingData.voxels) {
      const shouldVaryPalette = !['ROAD', 'SIDEWALK', 'PARK', 'HOTLINE', 'MINE_ENTRANCE'].includes(buildingData.type);
      const building = new VoxelBuilding(
        buildingData.id,
        buildingData.name,
        buildingData.voxels,
        buildingData.id,
        shouldVaryPalette
      );
      
      // Give flat infrastructure a tiny height separation from the terrain
      // to prevent z-fighting and create a readable street stack.
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

      // Add light if it's a street light
      if (buildingData.name === 'Street Light') {
        // We will handle street lights globally to avoid shader uniform limits
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
    
    const npc = new VoxelCharacter();
    const worldX = position.x - WORLD_HALF_SIZE;
    const worldZ = position.y - WORLD_HALF_SIZE;
    
    npc.group.position.set(worldX, CONFIG.FLOOR_Y + 0.5, worldZ);
    npc.group.userData.npcId = npcData.id;
    this.npcs.set(npcData.id, npc);
    this.entityGroup.add(npc.group);
  }

  public update(deltaTime: number, time: number) {
    this.player.update(deltaTime);
    this.npcs.forEach(npc => npc.update(deltaTime));

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
        if (dist < 50) { // Only consider lights within 50 units
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
    this.lightPool.forEach(l => this.scene.remove(l));
    this.lightPool = [];
  }
}
