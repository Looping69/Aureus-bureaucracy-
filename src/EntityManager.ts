import * as THREE from 'three';
import { VoxelCharacter } from './VoxelCharacter';
import { VoxelBuilding } from './VoxelBuilding';
import { Building, NPC } from './types';
import { CONFIG } from './utils/voxelConstants';
import { getStructureBaseHeight } from './utils/worldNavigation';

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
      const worldX = buildingData.pos.x - 80;
      const worldZ = buildingData.pos.y - 80;

      building.setPosition(worldX, getStructureBaseHeight(buildingData.type), worldZ);
      this.buildings.set(buildingData.id, building);
      this.entityGroup.add(building.group);

      // Add light if it's a street light
      if (buildingData.name === 'Street Light') {
        // We will handle street lights globally to avoid shader uniform limits
        building.group.userData.isStreetLight = true;
        building.group.userData.lightPos = new THREE.Vector3(worldX + 1, CONFIG.FLOOR_Y + 6, worldZ);
      }
    }
  }

  public addNPC(npcData: NPC, position: { x: number, y: number }) {
    if (this.npcs.has(npcData.id)) return;
    
    const npc = new VoxelCharacter();
    const worldX = position.x - 80;
    const worldZ = position.y - 80;
    
    npc.group.position.set(worldX, CONFIG.FLOOR_Y + 0.5, worldZ);
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
