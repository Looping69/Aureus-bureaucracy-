import * as THREE from 'three';
import { VoxelData } from '../types';
import { GreedyMesher } from '../utils/GreedyMesher';

export class VoxelObject {
  public group: THREE.Group;
  protected subVoxelSize = 0.1;

  constructor(voxels: VoxelData[], subVoxelSize: number = 0.1) {
    this.group = new THREE.Group();
    this.subVoxelSize = subVoxelSize;
    this.createFromVoxels(voxels);
  }

  private createFromVoxels(voxels: VoxelData[]) {
    if (voxels.length === 0) return;

    const meshData = GreedyMesher.mesh(voxels);
    const geometry = new THREE.BufferGeometry();
    
    // Scale positions by subVoxelSize
    const scaledPositions = meshData.positions.map(p => p * this.subVoxelSize);
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(scaledPositions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(meshData.colors, 3));
    geometry.setIndex(meshData.indices);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    
    const material = new THREE.MeshStandardMaterial({ 
        vertexColors: true,
        roughness: 0.8, 
        metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    this.group.add(mesh);
  }

  public setPosition(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
  }

  public setRotation(y: number) {
    this.group.rotation.y = y;
  }

  /**
   * Toggle a subtle emissive glow on the object's mesh material.
   * Used for tutorial "magnet" feedback on the Bureau.
   */
  public setHighlight(on: boolean, intensity: number = 0.15) {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (on) {
          child.material.emissive.setHex(0xeab308);  // warm amber
          child.material.emissiveIntensity = intensity;
        } else {
          child.material.emissive.setHex(0x000000);
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }
}
