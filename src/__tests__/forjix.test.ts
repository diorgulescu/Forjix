// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { CURATED_PALETTES } from '../data/palettes';
import {
  ALL_SPECIAL_POWERS,
  hasPower,
  ON_HIT_POWERS,
  PASSIVE_HELD_POWERS,
  togglePowerInList,
} from '../data/powersCatalog';
import { buildTemplatePixels, STARTER_TEMPLATES } from '../data/templates';
import { VOXEL_PRESETS } from '../data/voxelPresets';
import { createInitialProject, MAX_UNDO_STEPS } from '../hooks/useItemProject';
import { TRANSLATIONS } from '../i18n/translations';
import {
  buildJava121GiveCommandClient,
  normalizeProjectLocally,
  parseProjectJsonString,
  rarityColorCode,
} from '../ipc/tauriBridge';
import { buildExtrudedItemGeometry } from '../three/extrudeMesh';
import { computeItemGripTransform } from '../three/playerArm';
import { buildSculptedVoxelGeometry } from '../three/voxelMesh';
import {
  createEmptyPixels,
  floodFill,
  getMirroredPoints,
  paintStrokeSegment,
  pixelsToExtrudedVoxels,
  resizePixelGrid,
  slugifyItemName,
} from '../utils/pixelOps';
import {
  clampAttackDamage,
  clampDurability,
  clampHungerRestored,
  clampMovementSpeed,
  floodPaintVoxels,
  isInsideVoxelBounds,
  placeVoxelInList,
  removeVoxelFromList,
} from '../utils/voxelOps';

describe('Forjix Phase 1 & Phase 2 Suite', () => {
  it('validates all 7 starter 2D templates at 16x16 and 32x32', () => {
    const ids = STARTER_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual([
      'blank',
      'classic_sword',
      'battle_axe',
      'pickaxe',
      'shield',
      'magic_wand',
      'golden_apple',
    ]);

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

  it('validates all starter 3D Voxel Forge presets within 16x16x16 bounds', () => {
    expect(VOXEL_PRESETS.map((p) => p.id)).toEqual([
      'empty_plate',
      'war_hammer',
      'royal_crown',
      'champion_trophy',
      'magic_totem',
    ]);

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

  it('supports 3D voxel place, remove, X-symmetry, 3D flood paint, and Y-layer slicing', () => {
    // Place voxel at x=2 with X-symmetry -> places at x=2 and x=13
    const placed = placeVoxelInList([], 2, 0, 5, '#ffaa00', true);
    expect(placed.changed).toBe(true);
    expect(placed.nextVoxels).toHaveLength(2);
    expect(placed.nextVoxels.map((v) => v.x).sort((a, b) => a - b)).toEqual([
      2, 13,
    ]);

    // Stack second voxel at (2, 1, 5)
    const stacked = placeVoxelInList(
      placed.nextVoxels,
      2,
      1,
      5,
      '#ffaa00',
      false
    );
    expect(stacked.nextVoxels).toHaveLength(3);

    // 3D geometry slicing: full height (maxLayerY=15) vs sliced (maxLayerY=0)
    const fullBuilt = buildSculptedVoxelGeometry(stacked.nextVoxels, 15);
    expect(fullBuilt.visibleCount).toBe(3);
    fullBuilt.geometry.dispose();

    const slicedBuilt = buildSculptedVoxelGeometry(stacked.nextVoxels, 0);
    expect(slicedBuilt.visibleCount).toBe(2);
    // 2 isolated bottom voxels -> 12 exposed quads (including exposed +Y top cross-section!)
    expect(slicedBuilt.quadMeta).toHaveLength(12);
    slicedBuilt.geometry.dispose();

    // 3D flood paint connected column at x=2
    const painted = floodPaintVoxels(
      stacked.nextVoxels,
      2,
      0,
      5,
      '#38F2FF',
      false
    );
    expect(painted.changed).toBe(true);
    expect(
      painted.nextVoxels.filter((v) => v.color === '#38F2FF')
    ).toHaveLength(2);

    // Remove with X-symmetry
    const removed = removeVoxelFromList(painted.nextVoxels, 2, 0, 5, true);
    expect(removed.nextVoxels).toHaveLength(1);
    expect(removed.nextVoxels[0]?.y).toBe(1);
  });

  it('clamps Combat, Utility, and Food stats safely and toggles all 11 Special Powers', () => {
    expect(clampAttackDamage(-10)).toBe(1);
    expect(clampAttackDamage(999)).toBe(50);
    expect(clampDurability(5)).toBe(50);
    expect(clampDurability(25000)).toBe(5000);
    expect(clampMovementSpeed(-80)).toBe(-20);
    expect(clampMovementSpeed(95)).toBe(50);
    expect(clampHungerRestored(0)).toBe(1);
    expect(clampHungerRestored(42)).toBe(10);

    expect(ON_HIT_POWERS).toHaveLength(6);
    expect(PASSIVE_HELD_POWERS).toHaveLength(5);
    expect(ALL_SPECIAL_POWERS).toHaveLength(11);

    let list = togglePowerInList([], ON_HIT_POWERS[1]!); // lightning_bolt
    expect(hasPower(list, 'on_hit', 'lightning_bolt')).toBe(true);
    list = togglePowerInList(list, PASSIVE_HELD_POWERS[0]!); // speed_boost
    expect(list).toHaveLength(2);
    list = togglePowerInList(list, ON_HIT_POWERS[1]!);
    expect(hasPower(list, 'on_hit', 'lightning_bolt')).toBe(false);
    expect(list).toHaveLength(1);
  });

  it('validates all 6 curated palettes, 2D symmetry, face culling, and .forjix.json round-trip', () => {
    expect(CURATED_PALETTES).toHaveLength(6);
    expect(TRANSLATIONS.ro.statsPanel.panelTitle).toBe('Statistici & Puteri');
    expect(TRANSLATIONS.en.statsPanel.panelTitle).toBe('Stats & Powers');

    const pts = getMirroredPoints(2, 3, 16, { x: true, y: true });
    expect(pts).toHaveLength(4);

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

    const px32 = createEmptyPixels(32);
    px32[5 * 32 + 5] = '#ABCDEF';
    expect(resizePixelGrid(px32, 32, 16)[2 * 16 + 2]).toBe('#ABCDEF');

    const pair = createEmptyPixels(16);
    pair[0] = '#FFE054';
    pair[1] = '#38F2FF';
    const pairGeo = buildExtrudedItemGeometry(pair, 16);
    expect(pairGeo.getIndex()?.count).toBe(60);
    pairGeo.dispose();

    expect(MAX_UNDO_STEPS).toBe(50);
    const proj = createInitialProject('classic_sword', 'ro');
    expect(proj.slug).toBe(slugifyItemName('Sabie Clasică'));
    expect(proj.voxels).toEqual(pixelsToExtrudedVoxels(proj.pixels, 16));
    expect(computeItemGripTransform(true, 'weapon').pivotScale).toBe(0.85);

    // Round-trip .forjix.json in 3D Voxel mode
    const hammerVoxels = VOXEL_PRESETS[1]!.buildVoxels();
    const voxelProj = normalizeProjectLocally({
      ...proj,
      name: 'Sabia de Fulger',
      mode: 'voxel',
      voxels: hammerVoxels,
      rarity: 'legendary',
      stats: {
        ...proj.stats,
        attackDamage: 32,
        unbreakable: true,
        movementSpeed: 25,
      },
    });
    const raw = JSON.stringify(voxelProj, null, 2);
    const parsed = parseProjectJsonString(raw);
    expect(parsed.mode).toBe('voxel');
    expect(parsed.slug).toBe('sabia_de_fulger');
    expect(parsed.voxels.length).toBe(hammerVoxels.length);
    expect(parsed.stats.attackDamage).toBe(32);
    expect(parsed.stats.unbreakable).toBe(true);

    // Phase 3 & 4 Minecraft Bedrock, Education & Java 1.21+ export verification
    expect(rarityColorCode('common')).toBe('§f');
    expect(rarityColorCode('rare')).toBe('§b');
    expect(rarityColorCode('epic')).toBe('§d');
    expect(rarityColorCode('legendary')).toBe('§6');
    expect(TRANSLATIONS.ro.mcaddonExport.targetBedrock).toContain('.mcaddon');
    expect(TRANSLATIONS.en.mcaddonExport.targetJava).toContain('Java Edition');
    expect(TRANSLATIONS.en.mcaddonExport.targetBoth).toBe('Export Both');

    const javaGive = buildJava121GiveCommandClient(parsed);
    expect(javaGive.startsWith('/give @p minecraft:diamond_sword[')).toBe(true);
    expect(javaGive).toContain('minecraft:item_model="forjix:sabia_de_fulger"');
    expect(javaGive).toContain('minecraft:unbreakable={}');
    expect(javaGive).toContain('minecraft:attribute_modifiers=');
    expect(javaGive).toContain('minecraft:fire_resistant={}');
  });
});
