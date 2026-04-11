import * as THREE from 'three';
import { SubVoxelGrid, VoxelData } from '../types';
import { GreedyMesher } from '../utils/GreedyMesher';
import { expandVoxelToSubVoxels, migrateVoxelToSubGrid, SUB_CELL_SIZE, SUB_DIVISIONS } from '../utils/subVoxel';

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

  /**
   * Create mesh geometry from voxels expanded through their sub-voxel grids.
   * Each parent voxel is split into up to 4 half-size children placed at the
   * correct offsets.  If no SubVoxelGrid map is supplied the parent colour
   * fills all 4 quadrants (migration default).
   */
  protected createFromSubVoxels(
    voxels: VoxelData[],
    subGrids?: Map<string, SubVoxelGrid>,
  ) {
    if (voxels.length === 0) return;

    // Expand every parent voxel into sub-voxel children
    const expanded: VoxelData[] = [];
    for (const v of voxels) {
      const key = `${v.x},${v.y},${v.z}`;
      const grid = subGrids?.get(key) ?? migrateVoxelToSubGrid(v);
      const children = expandVoxelToSubVoxels(v, grid);
      expanded.push(...children);
    }

    if (expanded.length === 0) return;

    const meshData = GreedyMesher.mesh(expanded);
    const geometry = new THREE.BufferGeometry();

    // Each child voxel lives in the double-resolution grid; scale back so the
    // combined mesh occupies the same world footprint as before.
    const scale = this.subVoxelSize * SUB_CELL_SIZE;
    const scaledPositions = meshData.positions.map(p => p * scale);

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(scaledPositions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(meshData.colors, 3));
    geometry.setIndex(meshData.indices);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
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
