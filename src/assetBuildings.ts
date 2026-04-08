/**
 * Asset voxel buildings – loaded from the JSON models in /assets.
 *
 * Each JSON file has the shape:
 *   { voxels: Array<{ id: number, x: number, y: number, z: number, c: string }> }
 *
 * We import them statically so Vite can bundle/tree-shake them and type
 * them correctly for the rest of the codebase.
 */

import model1 from '../assets/voxel-model-1775633446701.json';
import model2 from '../assets/voxel-model-1775633458410.json';
import model3 from '../assets/voxel-model-1775633465961.json';
import model4 from '../assets/voxel-model-1775633480345.json';
import model5 from '../assets/voxel-model-1775633510160.json';

type RawVoxel = { id: number; x: number; y: number; z: number; c: string };

/** Re-index voxel ids, swap Y↔Z (model Y-up → generator Z-up),
 *  and shift so the base sits at z=0 (ground level). */
const reindex = (voxels: RawVoxel[]): RawVoxel[] => {
  // After swap, new z = original y (model height). Normalize so min z = 0.
  const minY = Math.min(...voxels.map(v => v.y));
  return voxels.map((v, i) => ({
    ...v,
    id: i,
    y: v.z,
    z: v.y - minY,
  }));
};

// ── Exported voxel arrays ────────────────────────────────────────────
// Named after what they visually look like (large detailed structures).

export const ASSET_BUILDING_A_VOXELS = reindex(model1.voxels as RawVoxel[]);
export const ASSET_BUILDING_B_VOXELS = reindex(model2.voxels as RawVoxel[]);
export const ASSET_BUILDING_C_VOXELS = reindex(model3.voxels as RawVoxel[]);
export const ASSET_BUILDING_D_VOXELS = reindex(model4.voxels as RawVoxel[]);
export const ASSET_BUILDING_E_VOXELS = reindex(model5.voxels as RawVoxel[]);
