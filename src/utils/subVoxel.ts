/**
 * @module subVoxel
 * Utilities for the 2×2 sub-voxel system.
 *
 * Each parent voxel cell can hold up to 4 smaller child blocks arranged in a
 * 2×2 grid.  The sub-grid is stored in a {@link SubVoxelGrid} and individual
 * children are addressed by `(subX, subY)` where both are `0 | 1`.
 *
 * The flat array index for a child is `subY * 2 + subX`.
 */

import { SubVoxel, SubVoxelGrid, VoxelData } from '../types';

// ── Constants ────────────────────────────────────────────────────────────────

/** Number of subdivisions along each axis (2 → 2×2 = 4 children). */
export const SUB_DIVISIONS = 2;

/** Total child cells per parent voxel. */
export const SUB_CELL_COUNT = SUB_DIVISIONS * SUB_DIVISIONS; // 4

/** World-space size of one child block (half of a parent voxel). */
export const SUB_CELL_SIZE = 1 / SUB_DIVISIONS; // 0.5

// ── Index helpers ────────────────────────────────────────────────────────────

/** Convert (subX, subY) → flat array index. */
export function subCellIndex(subX: 0 | 1, subY: 0 | 1): number {
  return subY * SUB_DIVISIONS + subX;
}

/** Convert flat array index → (subX, subY). */
export function subCellCoords(index: number): { subX: 0 | 1; subY: 0 | 1 } {
  return {
    subX: (index % SUB_DIVISIONS) as 0 | 1,
    subY: Math.floor(index / SUB_DIVISIONS) as 0 | 1,
  };
}

// ── Grid creation / migration ────────────────────────────────────────────────

/**
 * Create a new SubVoxelGrid by filling all 4 cells with the given colour.
 * This is the default migration path: an existing parent voxel with colour `c`
 * becomes a fully-filled 2×2 grid of the same colour.
 */
export function createFilledSubGrid(color: number): SubVoxelGrid {
  const cells: SubVoxel[] = [];
  for (let sy = 0; sy < SUB_DIVISIONS; sy++) {
    for (let sx = 0; sx < SUB_DIVISIONS; sx++) {
      cells.push({ subX: sx as 0 | 1, subY: sy as 0 | 1, color });
    }
  }
  return { cells };
}

/** Create an empty SubVoxelGrid (all cells null). */
export function createEmptySubGrid(): SubVoxelGrid {
  return { cells: [null, null, null, null] };
}

/**
 * Deterministically initialise a SubVoxelGrid for a parent VoxelData that
 * was created before the sub-voxel system existed.
 *
 * Current policy: fill every sub-cell with the parent colour so the visual
 * output is identical to the pre-migration rendering.
 */
export function migrateVoxelToSubGrid(voxel: VoxelData): SubVoxelGrid {
  return createFilledSubGrid(voxel.color);
}

// ── Accessors ────────────────────────────────────────────────────────────────

/** Get a single child from the grid (or null if empty). */
export function getSubVoxel(
  grid: SubVoxelGrid,
  subX: 0 | 1,
  subY: 0 | 1,
): SubVoxel | null {
  return grid.cells[subCellIndex(subX, subY)] ?? null;
}

/** Set (or clear) a single child in the grid. Returns a new grid. */
export function setSubVoxel(
  grid: SubVoxelGrid,
  subX: 0 | 1,
  subY: 0 | 1,
  child: SubVoxel | null,
): SubVoxelGrid {
  const cells = [...grid.cells];
  cells[subCellIndex(subX, subY)] = child;
  return { cells };
}

// ── World-space offset ───────────────────────────────────────────────────────

/**
 * Compute the world-space offset of a child block relative to the parent
 * voxel's origin.  The parent voxel occupies [0,1) on each axis; each child
 * block occupies [0, 0.5) of that.
 *
 * Returns offsets for the rendering coordinate system (Three.js XZ plane for
 * world horizontal, Y for height).
 */
export function subCellWorldOffset(subX: 0 | 1, subY: 0 | 1): { dx: number; dz: number } {
  return {
    dx: subX * SUB_CELL_SIZE,
    dz: subY * SUB_CELL_SIZE,
  };
}

/**
 * Given a fractional position within a parent voxel (0..1 range on each axis),
 * determine which sub-cell it falls into.
 */
export function resolveSubCell(
  fracX: number,
  fracY: number,
): { subX: 0 | 1; subY: 0 | 1 } {
  return {
    subX: fracX >= 0.5 ? 1 : 0,
    subY: fracY >= 0.5 ? 1 : 0,
  };
}

// ── Expansion helpers for rendering ──────────────────────────────────────────

/**
 * Expand a single parent voxel into up to 4 child VoxelData entries, each at
 * half-size offsets within the parent cell.
 *
 * The returned VoxelData entries have their coordinates scaled into the
 * "double-resolution" grid (parent coords * 2 + sub offset) so they can be
 * fed directly into the existing GreedyMesher at the finer resolution.
 */
export function expandVoxelToSubVoxels(
  parent: VoxelData,
  grid: SubVoxelGrid,
): VoxelData[] {
  const result: VoxelData[] = [];
  for (let i = 0; i < SUB_CELL_COUNT; i++) {
    const cell = grid.cells[i];
    if (!cell) continue;
    const { subX, subY } = subCellCoords(i);
    result.push({
      x: parent.x * SUB_DIVISIONS + subX,
      y: parent.y,  // height unchanged
      z: parent.z * SUB_DIVISIONS + subY,
      color: cell.color,
    });
  }
  return result;
}
