import { VoxelData } from '../types';
import * as THREE from 'three';
import { CONFIG } from '../utils/voxelConstants';

interface GreedyMesh {
  positions: number[];
  normals: number[];
  indices: number[];
  colors: number[];
}

export class GreedyMesher {
  public static mesh(voxels: VoxelData[]): GreedyMesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    if (voxels.length === 0) return { positions, normals, indices, colors };

    // 1. Find bounds
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    const voxelMap = new Map<string, number>();

    for (const v of voxels) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      minZ = Math.min(minZ, v.z);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
      maxZ = Math.max(maxZ, v.z);
      voxelMap.set(`${v.x},${v.y},${v.z}`, v.color);
    }

    // Dimensions
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const depth = maxZ - minZ + 1;

    // 2. Sweep over each axis (X, Y, Z)
    // We need to check for faces in 6 directions: +X, -X, +Y, -Y, +Z, -Z
    
    // Axis 0: X (Left/Right faces)
    // Axis 1: Y (Top/Bottom faces)
    // Axis 2: Z (Front/Back faces)

    const dims = [width, height, depth];
    
    // For each axis
    for (let d = 0; d < 3; d++) {
      let i, j, k, l, w, h;
      let u = (d + 1) % 3;
      let v = (d + 2) % 3;
      let x = [0, 0, 0];
      let q = [0, 0, 0];
      
      const mask = new Int32Array(dims[u] * dims[v]);
      
      q[d] = 1;

      // Iterate through the dimension
      for (let backFace = 0; backFace < 2; ++backFace) {
        for (x[d] = -1; x[d] < dims[d]; ) {
          
          // Compute mask
          let n = 0;
          for (x[v] = 0; x[v] < dims[v]; ++x[v]) {
            for (x[u] = 0; x[u] < dims[u]; ++x[u]) {
              
              // Current voxel pos
              const p1 = [x[0] + minX, x[1] + minY, x[2] + minZ];
              // Next voxel pos
              const p2 = [x[0] + q[0] + minX, x[1] + q[1] + minY, x[2] + q[2] + minZ];
              
              const c1 = voxelMap.has(`${p1[0]},${p1[1]},${p1[2]}`) ? voxelMap.get(`${p1[0]},${p1[1]},${p1[2]}`) : undefined;
              const c2 = voxelMap.has(`${p2[0]},${p2[1]},${p2[2]}`) ? voxelMap.get(`${p2[0]},${p2[1]},${p2[2]}`) : undefined;
              
              const has1 = c1 !== undefined;
              const has2 = c2 !== undefined;
              
              let maskVal = 0;
              
              if (backFace) {
                // Looking for faces pointing -Axis (c2 exists, c1 doesn't)
                if (has2 && !has1) {
                  maskVal = c2! + 1;
                }
              } else {
                // Looking for faces pointing +Axis (c1 exists, c2 doesn't)
                if (has1 && !has2) {
                  maskVal = c1! + 1;
                }
              }
              
              mask[n++] = maskVal;
            }
          }
          
          ++x[d];
          
          // Generate mesh from mask
          n = 0;
          for (j = 0; j < dims[v]; ++j) {
            for (i = 0; i < dims[u]; ) {
              
              const c = mask[n];
              if (c !== 0) {
                // Compute width
                for (w = 1; c === mask[n + w] && i + w < dims[u]; ++w) {}
                
                // Compute height
                let done = false;
                for (h = 1; j + h < dims[v]; ++h) {
                  for (k = 0; k < w; ++k) {
                    if (c !== mask[n + k + h * dims[u]]) {
                      done = true;
                      break;
                    }
                  }
                  if (done) break;
                }
                
                // Add Quad
                const min_u = d === 0 ? minY : (d === 1 ? minZ : minX);
                const min_v = d === 0 ? minZ : (d === 1 ? minX : minY);
                
                const du = [0, 0, 0]; du[u] = w;
                const dv = [0, 0, 0]; dv[v] = h;
                
                const origin = [0, 0, 0];
                origin[d] = x[d] - 0.5 + (d === 0 ? minX : (d === 1 ? minY : minZ));
                origin[u] = i - 0.5 + min_u;
                origin[v] = j - 0.5 + min_v;
                
                const color = c - 1;
                const isBackFace = backFace === 1;
                
                // Add vertices
                const v0 = [...origin];
                const v1 = [origin[0] + du[0], origin[1] + du[1], origin[2] + du[2]];
                const v2 = [origin[0] + du[0] + dv[0], origin[1] + du[1] + dv[1], origin[2] + du[2] + dv[2]];
                const v3 = [origin[0] + dv[0], origin[1] + dv[1], origin[2] + dv[2]];
                
                const startIdx = positions.length / 3;
                
                positions.push(...v0, ...v1, ...v2, ...v3);
                
                // Normals
                const norm = [0, 0, 0];
                norm[d] = isBackFace ? -1 : 1;
                for(let k=0; k<4; k++) normals.push(...norm);
                
                // Colors
                const col = new THREE.Color(color);
                for(let k=0; k<4; k++) colors.push(col.r, col.g, col.b);
                
                // Indices
                if (isBackFace) {
                   indices.push(startIdx, startIdx + 2, startIdx + 1);
                   indices.push(startIdx, startIdx + 3, startIdx + 2);
                } else {
                   indices.push(startIdx, startIdx + 1, startIdx + 2);
                   indices.push(startIdx, startIdx + 2, startIdx + 3);
                }
  
                // Zero out mask
                for (l = 0; l < h; ++l) {
                  for (k = 0; k < w; ++k) {
                    mask[n + k + l * dims[u]] = 0;
                  }
                }
                
                // Increment counters
                i += w; n += w;
              } else {
                i++; n++;
              }
            }
          }
        }
      }
    }

    return { positions, normals, indices, colors };
  }
}
