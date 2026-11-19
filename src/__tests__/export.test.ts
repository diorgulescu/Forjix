// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { CURATED_PALETTES } from '../data/palettes';
import { VOXEL_PRESETS } from '../data/voxelPresets';
import { createInitialProject, MAX_UNDO_STEPS } from '../hooks/useItemProject';
import { TRANSLATIONS } from '../i18n/translations';
import {
  buildJava121GiveCommandClient,
  normalizeProjectLocally,
  parseProjectJsonString,
  rarityColorCode,
} from '../ipc/tauriBridge';
import { slugifyItemName } from '../utils/pixelOps';
import { pixelsToExtrudedVoxels } from '../utils/pixelOps';

describe('Export & Project Serialization', () => {
  it('validates 6 curated palettes', () => {
    expect(CURATED_PALETTES).toHaveLength(6);
  });

  it('has bilingual translations for stats panel', () => {
    expect(TRANSLATIONS.ro.statsPanel.panelTitle).toBe('Statistici & Puteri');
    expect(TRANSLATIONS.en.statsPanel.panelTitle).toBe('Stats & Powers');
  });

  it('exports correct rarity color codes', () => {
    expect(rarityColorCode('common')).toBe('§f');
    expect(rarityColorCode('rare')).toBe('§b');
    expect(rarityColorCode('epic')).toBe('§d');
    expect(rarityColorCode('legendary')).toBe('§6');
  });

  it('has correct export modal translation strings', () => {
    expect(TRANSLATIONS.ro.mcaddonExport.targetBedrock).toContain('.mcaddon');
    expect(TRANSLATIONS.en.mcaddonExport.targetJava).toContain('Java Edition');
    expect(TRANSLATIONS.en.mcaddonExport.targetBoth).toBe('Export Both');
  });

  it('creates initial project with correct slug and voxels', () => {
    expect(MAX_UNDO_STEPS).toBe(50);
    const proj = createInitialProject('classic_sword', 'ro');
    expect(proj.slug).toBe(slugifyItemName('Sabie Clasică'));
    expect(proj.voxels).toEqual(pixelsToExtrudedVoxels(proj.pixels, 16));
  });

  it('round-trips .forjix.json in 3D voxel mode', () => {
    const proj = createInitialProject('classic_sword', 'ro');
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
  });

  it('builds valid Java 1.21+ give command', () => {
    const proj = createInitialProject('classic_sword', 'ro');
    const voxelProj = normalizeProjectLocally({
      ...proj,
      name: 'Sabia de Fulger',
      mode: 'voxel',
      voxels: VOXEL_PRESETS[1]!.buildVoxels(),
      rarity: 'legendary',
      stats: { ...proj.stats, attackDamage: 32, unbreakable: true, movementSpeed: 25 },
    });
    const javaGive = buildJava121GiveCommandClient(voxelProj);
    expect(javaGive.startsWith('/give @p minecraft:diamond_sword[')).toBe(true);
    expect(javaGive).toContain('minecraft:item_model="forjix:sabia_de_fulger"');
    expect(javaGive).toContain('minecraft:unbreakable={}');
    expect(javaGive).toContain('minecraft:attribute_modifiers=');
    expect(javaGive).toContain('minecraft:fire_resistant={}');
  });

  it('escapes backslashes in Java give command custom name', () => {
    const proj = createInitialProject('classic_sword', 'ro');
    const tricky = normalizeProjectLocally({
      ...proj,
      name: "C:\\path's Sabia",
    });
    const cmd = buildJava121GiveCommandClient(tricky);
    // Backslashes must be doubled in SNBT
    expect(cmd).toContain('\\\\path');
    expect(cmd).not.toMatch(/[^\\]'s/);
  });

  it('TS give command parity: same invariants as Rust build_java_121_give_command', () => {
    // This test cross-validates that the TS mirror produces the same key
    // invariants that the Rust implementation is tested against in
    // java_export.rs tests. Both must agree on structure.
    const proj = createInitialProject('classic_sword', 'en');
    const normalized = normalizeProjectLocally({
      ...proj,
      name: 'Sabia de Fulger',
      category: 'weapon',
      rarity: 'legendary',
      armorSlot: 'chestplate',
      stats: {
        ...proj.stats,
        attackDamage: 25,
        unbreakable: false,
        durability: 2000,
        movementSpeed: 15,
      },
      powers: [
        {
          id: 'passive_held:fire_resistance',
          trigger: 'passive_held',
          effect: 'fire_resistance',
          amplifier: 1,
          durationSeconds: 5,
        },
      ],
    });

    const cmd = buildJava121GiveCommandClient(normalized);

    // Same invariants the Rust test checks:
    expect(cmd.startsWith('/give @p minecraft:diamond_sword[')).toBe(true);
    expect(cmd).toContain('minecraft:item_model="forjix:sabia_de_fulger"');
    expect(cmd).toContain('minecraft:attribute_modifiers=');
    expect(cmd).toContain('minecraft:fire_resistant={}');
    expect(cmd).toContain('minecraft:enchantment_glint_override=true');
    expect(cmd).toContain('minecraft:max_damage=2000');
    expect(cmd).toContain('minecraft:custom_data={forjix_item:"sabia_de_fulger"}');
    expect(cmd.endsWith('] 1')).toBe(true);
  });

  it('armor slot changes the Java base item', () => {
    const proj = createInitialProject('classic_sword', 'en');
    const armorProj = normalizeProjectLocally({
      ...proj,
      category: 'armor',
      armorSlot: 'helmet',
    });
    const cmd = buildJava121GiveCommandClient(armorProj);
    expect(cmd.startsWith('/give @p minecraft:iron_helmet[')).toBe(true);

    const shieldProj = normalizeProjectLocally({
      ...proj,
      category: 'armor',
      armorSlot: 'shield',
    });
    const shieldCmd = buildJava121GiveCommandClient(shieldProj);
    expect(shieldCmd.startsWith('/give @p minecraft:shield[')).toBe(true);
  });

  it('attaches right-click usable component on Java 1.21+ handheld items with OnRightClick powers', () => {
    const proj = createInitialProject('classic_sword', 'en');
    const wandWithRightClick = normalizeProjectLocally({
      ...proj,
      category: 'weapon',
      powers: [
        {
          id: 'on_right_click:launch_fireball',
          trigger: 'on_right_click',
          effect: 'launch_fireball',
          amplifier: 1,
          durationSeconds: 1,
        },
      ],
    });
    const cmd = buildJava121GiveCommandClient(wandWithRightClick);
    expect(cmd).toContain('eat_seconds:3600.0');
  });
});
