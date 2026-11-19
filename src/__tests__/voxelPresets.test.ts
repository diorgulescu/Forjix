// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { VOXEL_PRESETS } from '../data/voxelPresets';
import { isInsideVoxelBounds } from '../utils/voxelOps';

describe('Starter 3D Voxel Presets', () => {
  it('has exactly 5 presets in the expected order', () => {
    expect(VOXEL_PRESETS.map((p) => p.id)).toEqual([
      'empty_plate',
      'war_hammer',
      'royal_crown',
      'champion_trophy',
      'magic_totem',
    ]);
  });

  it('validates all presets within 16x16x16 bounds', () => {
    for (const preset of VOXEL_PRESETS) {
      const voxels = preset.buildVoxels();
      if (preset.id === 'empty_plate') {
        expect(voxels).toHaveLength(0);
      } else {
        expect(voxels.length).toBeGreaterThan(40);
        for (const v of voxels) {
          expect(isInsideVoxelBounds(v.x, v.y, v.z)).toBe(true);
          expect(v.color).toMatch(/^#[0-9A-F]{6}$/);
        }
      }
    }
  });
});
