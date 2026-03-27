export interface Voxel {
  id: number;
  x: number;
  y: number;
  z: number;
  c: string;
}

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

  getVoxels() {
    return Array.from(this.voxelsMap.values());
  }
}
