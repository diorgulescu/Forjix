// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { buildExtrudedItemGeometry } from '../three/extrudeMesh';
import { computeItemGripTransform } from '../three/playerArm';
import {
  createEmptyPixels,
  floodFill,
  getMirroredPoints,
  paintStrokeSegment,
  pixelsToExtrudedVoxels,
  resizePixelGrid,
  slugifyItemName,
} from '../utils/pixelOps';

describe('Pixel Operations', () => {
  it('validates 2D symmetry mirror points', () => {
    const pts = getMirroredPoints(2, 3, 16, { x: true, y: true });
    expect(pts).toHaveLength(4);
  });

  it('paints a stroke segment and flood-fills', () => {
    const empty = createEmptyPixels(16);
    const stroke = paintStrokeSegment(
      empty,
      16,
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      '#ff5500',
      { x: true, y: false }
    );
    const filled = floodFill(stroke.nextPixels, 16, 0, 0, '#112233', {
      x: false,
      y: false,
    });
    expect(filled.nextPixels[0]).toBe('#112233');
  });

  it('resizes 32x32 grid to 16x16 preserving strokes', () => {
    const px32 = createEmptyPixels(32);
    px32[5 * 32 + 5] = '#ABCDEF';
    expect(resizePixelGrid(px32, 32, 16)[2 * 16 + 2]).toBe('#ABCDEF');
  });

  it('builds extruded geometry with correct face count', () => {
    const pair = createEmptyPixels(16);
    pair[0] = '#FFE054';
    pair[1] = '#38F2FF';
    const pairGeo = buildExtrudedItemGeometry(pair, 16);
    expect(pairGeo.getIndex()?.count).toBe(60);
    pairGeo.dispose();
  });

  it('slugifies Romanian diacritics and English names', () => {
    expect(slugifyItemName('Sabie Clasică')).toBe('sabie_clasica');
    expect(slugifyItemName('Târnăcop de Foc & Gheață')).toBe('tarnacop_de_foc_gheata');
    expect(slugifyItemName('   ')).toBe('custom_item');
  });

  it('converts pixels to extruded voxels', () => {
    const pixels = createEmptyPixels(16);
    pixels[0] = '#FFE054';
    const voxels = pixelsToExtrudedVoxels(pixels, 16);
    expect(voxels).toHaveLength(1);
    expect(voxels[0]!.color).toBe('#FFE054');
  });

  it('computes item grip transform for weapon category', () => {
    expect(computeItemGripTransform(true, 'weapon').pivotScale).toBe(0.85);
  });
});
