// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { buildSculptedVoxelGeometry } from '../three/voxelMesh';
import {
  clampAttackDamage,
  clampDurability,
  clampHungerRestored,
  clampMovementSpeed,
  floodPaintVoxels,
  placeVoxelInList,
  removeVoxelFromList,
} from '../utils/voxelOps';

describe('Voxel Operations', () => {
  it('supports 3D voxel place, remove, X-symmetry, 3D flood paint, and Y-layer slicing', () => {
    // Place voxel at x=2 with X-symmetry -> places at x=2 and x=13
    const placed = placeVoxelInList([], 2, 0, 5, '#ffaa00', true);
    expect(placed.changed).toBe(true);
    expect(placed.nextVoxels).toHaveLength(2);
    expect(placed.nextVoxels.map((v) => v.x).sort((a, b) => a - b)).toEqual([2, 13]);

    // Stack second voxel at (2, 1, 5)
    const stacked = placeVoxelInList(placed.nextVoxels, 2, 1, 5, '#ffaa00', false);
    expect(stacked.nextVoxels).toHaveLength(3);

    // 3D geometry slicing: full height vs sliced
    const fullBuilt = buildSculptedVoxelGeometry(stacked.nextVoxels, 15);
    expect(fullBuilt.visibleCount).toBe(3);
    fullBuilt.geometry.dispose();

    const slicedBuilt = buildSculptedVoxelGeometry(stacked.nextVoxels, 0);
    expect(slicedBuilt.visibleCount).toBe(2);
    expect(slicedBuilt.quadMeta).toHaveLength(12);
    slicedBuilt.geometry.dispose();

    // 3D flood paint connected column at x=2
    const painted = floodPaintVoxels(stacked.nextVoxels, 2, 0, 5, '#38F2FF', false);
    expect(painted.changed).toBe(true);
    expect(painted.nextVoxels.filter((v) => v.color === '#38F2FF')).toHaveLength(2);

    // Remove with X-symmetry
    const removed = removeVoxelFromList(painted.nextVoxels, 2, 0, 5, true);
    expect(removed.nextVoxels).toHaveLength(1);
    expect(removed.nextVoxels[0]?.y).toBe(1);
  });

  it('clamps combat, utility, and food stats safely', () => {
    expect(clampAttackDamage(-10)).toBe(1);
    expect(clampAttackDamage(999)).toBe(50);
    expect(clampDurability(5)).toBe(50);
    expect(clampDurability(25000)).toBe(5000);
    expect(clampMovementSpeed(-80)).toBe(-20);
    expect(clampMovementSpeed(95)).toBe(50);
    expect(clampHungerRestored(0)).toBe(1);
    expect(clampHungerRestored(42)).toBe(10);
  });
});
