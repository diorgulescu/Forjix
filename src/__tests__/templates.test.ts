// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { buildTemplatePixels, STARTER_TEMPLATES } from '../data/templates';

describe('Starter 2D Templates', () => {
  it('has exactly 7 templates in the expected order', () => {
    expect(STARTER_TEMPLATES.map((t) => t.id)).toEqual([
      'blank',
      'classic_sword',
      'battle_axe',
      'pickaxe',
      'shield',
      'magic_wand',
      'golden_apple',
    ]);
  });

  it('validates all templates at 16x16 and 32x32', () => {
    for (const tpl of STARTER_TEMPLATES) {
      expect(tpl.rows16).toHaveLength(16);
      for (const row of tpl.rows16) {
        expect(row).toHaveLength(16);
      }

      const px16 = buildTemplatePixels(tpl.id, 16);
      const px32 = buildTemplatePixels(tpl.id, 32);
      expect(px16).toHaveLength(256);
      expect(px32).toHaveLength(1024);

      if (tpl.id === 'blank') {
        expect(px16.every((c) => c === null)).toBe(true);
      } else {
        const opaque16 = px16.filter((c) => c !== null).length;
        const opaque32 = px32.filter((c) => c !== null).length;
        expect(opaque16).toBeGreaterThan(15);
        expect(opaque32).toBe(opaque16 * 4);
      }
    }
  });
});
