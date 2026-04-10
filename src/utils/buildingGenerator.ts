export interface Voxel {
  id: number;
  x: number;
  y: number;
  z: number;
  c: string;
}

/**
 * Rotation preset for building voxels.
 * 0 = no rotation (original), 1 = 90° CW, 2 = 180°, 3 = 270° CW.
 */
export type RotationStep = 0 | 1 | 2 | 3;

/**
 * Rotate a voxel array by the given step around the Y axis (vertical).
 * Each step is 90° clockwise when viewed from above.
 *
 * @param voxels - Source voxel array.
 * @param step   - Rotation step (0–3).
 * @returns New voxel array with rotated coordinates and fresh IDs.
 */
export const rotateVoxels = (voxels: Voxel[], step: RotationStep): Voxel[] => {
  if (step === 0) return voxels;

  return voxels.map((v, idx) => {
    let { x, y } = v;
    const { z, c } = v;

    for (let i = 0; i < step; i++) {
      const temp = x;
      x = -y;
      y = temp;
    }

    return { id: idx, x, y, z, c };
  });
};

/**
 * Mirror a voxel array along the X axis.
 * Useful for creating building variants from one definition.
 */
export const mirrorVoxelsX = (voxels: Voxel[]): Voxel[] =>
  voxels.map((v, idx) => ({ ...v, id: idx, x: -v.x }));

/**
 * Mirror a voxel array along the Y axis.
 */
export const mirrorVoxelsY = (voxels: Voxel[]): Voxel[] =>
  voxels.map((v, idx) => ({ ...v, id: idx, y: -v.y }));

export class BuildingGenerator {
  private voxelsMap: Map<string, Voxel> = new Map();
  private nextId = 0;
  private scale = 1;

  constructor(scale: number = 1) {
    this.scale = scale;
  }

  addVoxel(x: number, y: number, z: number, c: string) {
    // When scaling, we create a block of voxels for each "logical" voxel
    for (let sx = 0; sx < this.scale; sx++) {
      for (let sy = 0; sy < this.scale; sy++) {
        for (let sz = 0; sz < this.scale; sz++) {
          const vx = x * this.scale + sx;
          const vy = y * this.scale + sy;
          const vz = z * this.scale + sz;
          const key = `${vx},${vy},${vz}`;
          this.voxelsMap.set(key, { 
            id: this.nextId++, 
            x: vx, 
            y: vy, 
            z: vz, 
            c 
          });
        }
      }
    }
  }

  addBox(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, c: string) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
          this.addVoxel(x, y, z, c);
        }
      }
    }
  }

  addHollowBox(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, c: string) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const isEdge = x === minX || x === maxX || y === minY || y === maxY || z === minZ || z === maxZ;
          if (isEdge) {
            this.addVoxel(x, y, z, c);
          }
        }
      }
    }
  }

  /** Merge voxels from another generator (for composing buildings from sub-parts). */
  merge(other: BuildingGenerator, offsetX = 0, offsetY = 0, offsetZ = 0) {
    for (const v of other.getVoxels()) {
      this.addVoxel(v.x + offsetX, v.y + offsetY, v.z + offsetZ, v.c);
    }
  }

  getVoxels() {
    return Array.from(this.voxelsMap.values());
  }
}
