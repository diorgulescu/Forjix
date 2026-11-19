// SPDX-License-Identifier: GPL-3.0-or-later

import type {
  ArmorSlot,
  HexColor,
  ItemCategory,
  ItemPower,
  ItemRarity,
  ItemStats,
  Language,
  Voxel,
  VoxelPresetId,
} from '../types/project';
import { voxelKey } from '../utils/voxelOps';

export interface VoxelPresetDefinition {
  id: VoxelPresetId;
  icon: string;
  defaultName: Record<Language, string>;
  category: ItemCategory;
  armorSlot?: ArmorSlot;
  rarity: ItemRarity;
  stats: ItemStats;
  powers: ItemPower[];
  buildVoxels: () => Voxel[];
}

class VoxelBuilder {
  private map = new Map<string, Voxel>();

  set(x: number, y: number, z: number, color: HexColor): void {
    if (x < 0 || x >= 16 || y < 0 || y >= 16 || z < 0 || z >= 16) return;
    this.map.set(voxelKey(x, y, z), { x, y, z, color });
  }

  setSymX(x: number, y: number, z: number, color: HexColor): void {
    this.set(x, y, z, color);
    this.set(15 - x, y, z, color);
  }

  remove(x: number, y: number, z: number): void {
    this.map.delete(voxelKey(x, y, z));
  }

  box(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    color: HexColor
  ): void {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          this.set(x, y, z, color);
        }
      }
    }
  }

  build(): Voxel[] {
    return Array.from(this.map.values());
  }
}

function buildWarHammer(): Voxel[] {
  const b = new VoxelBuilder();
  // Golden pommel at bottom (y=0..1)
  b.box(6, 0, 6, 9, 0, 9, '#C6780E');
  b.box(7, 1, 7, 8, 1, 8, '#FFE054');

  // Sturdy oak & leather-wrapped handle shaft (y=2..9)
  for (let y = 2; y <= 8; y++) {
    const color = y % 2 === 0 ? '#8F5630' : '#5C3416';
    b.box(7, y, 7, 8, y, 8, color);
  }
  // Golden collar beneath hammer head (y=9)
  b.box(6, 9, 6, 9, 9, 9, '#F7B718');

  // Massive 3D double-faced iron/steel hammer head (x=3..12, y=10..14, z=5..10)
  b.box(3, 10, 5, 12, 14, 10, '#8B9BB4');
  // Chamfer corners along top & bottom of head
  for (let x = 3; x <= 12; x++) {
    b.remove(x, 10, 5);
    b.remove(x, 10, 10);
    b.remove(x, 14, 5);
    b.remove(x, 14, 10);
  }

  // Gleaming steel striking faces on left (x=2..3) & right (x=12..13)
  b.box(2, 10, 6, 2, 14, 9, '#EAF4FF');
  b.box(13, 10, 6, 13, 14, 9, '#EAF4FF');
  b.box(3, 11, 6, 3, 13, 9, '#C7D5E8');
  b.box(12, 11, 6, 12, 13, 9, '#C7D5E8');

  // Royal gold center band & top spike cap
  b.box(6, 10, 5, 9, 14, 10, '#F7B718');
  b.box(7, 15, 7, 8, 15, 8, '#FFE054');

  // Glowing cyan lightning runes on front & back of hammer head
  b.box(7, 11, 5, 8, 13, 5, '#38F2FF');
  b.box(7, 11, 10, 8, 13, 10, '#38F2FF');

  return b.build();
}

function buildRoyalCrown(): Voxel[] {
  const b = new VoxelBuilder();
  // Hollow octagonal/square royal gold crown band (y=2..5, x=3..12, z=3..12)
  for (let y = 2; y <= 5; y++) {
    for (let x = 3; x <= 12; x++) {
      for (let z = 3; z <= 12; z++) {
        const isEdge = x === 3 || x === 12 || z === 3 || z === 12;
        const isCorner =
          (x === 3 || x === 12) && (z === 3 || z === 12);
        if (isEdge && !isCorner) {
          b.set(
            x,
            y,
            z,
            y === 2 ? '#C6780E' : y === 5 ? '#FFF07A' : '#F7B718'
          );
        }
      }
    }
    // Diagonal corner connectors for rounded octagonal look
    b.setSymX(4, y, 4, '#F7B718');
    b.setSymX(4, y, 11, '#F7B718');
  }

  // Plush crimson velvet cushion inside crown (y=2..3)
  b.box(5, 2, 5, 10, 3, 10, '#B5193E');
  b.box(6, 4, 6, 9, 4, 9, '#FF4769');

  // Crown spires around the rim (y=6..9)
  const spireCoords: Array<[number, number, number]> = [
    [7, 3, 10],
    [8, 3, 10],
    [7, 12, 9],
    [8, 12, 9],
    [3, 7, 9],
    [3, 8, 9],
    [12, 7, 9],
    [12, 8, 9],
    [4, 4, 8],
    [11, 4, 8],
    [4, 11, 8],
    [11, 11, 8],
  ];
  for (const [sx, sz, topY] of spireCoords) {
    for (let y = 6; y <= topY; y++) {
      b.set(sx, y, sz, y === topY ? '#FFFBE0' : '#FFE054');
    }
  }

  // Embedded jewels on front, back, left, and right
  // Front centerpiece emerald/diamond
  b.box(7, 3, 3, 8, 4, 3, '#38F2FF');
  b.set(5, 4, 3, '#FF4769');
  b.set(10, 4, 3, '#FF4769');
  // Back ruby
  b.box(7, 3, 12, 8, 4, 12, '#FF4769');
  // Side emeralds
  b.box(3, 3, 7, 3, 4, 8, '#38F27B');
  b.box(12, 3, 7, 12, 4, 8, '#38F27B');

  return b.build();
}

function buildChampionTrophy(): Voxel[] {
  const b = new VoxelBuilder();
  // Dark obsidian/oak tiered pedestal base (y=0..2)
  b.box(4, 0, 4, 11, 0, 11, '#262B38');
  b.box(5, 1, 5, 10, 2, 10, '#3E2210');
  // Golden front winner plaque
  b.box(6, 1, 5, 9, 2, 5, '#FFE054');

  // Narrow gleaming gold stem (y=3..5)
  b.box(7, 3, 7, 8, 5, 8, '#C6780E');
  b.box(6, 5, 6, 9, 5, 9, '#F7B718');

  // Cup base (y=6..7)
  b.box(5, 6, 5, 10, 7, 10, '#F7B718');

  // Hollow golden chalice bowl (y=8..13)
  for (let y = 8; y <= 13; y++) {
    for (let x = 4; x <= 11; x++) {
      for (let z = 4; z <= 11; z++) {
        const isCorner = (x === 4 || x === 11) && (z === 4 || z === 11);
        if (isCorner) continue;
        const isWall =
          x === 4 ||
          x === 11 ||
          z === 4 ||
          z === 11 ||
          (x === 5 && (z === 5 || z === 10)) ||
          (x === 10 && (z === 5 || z === 10));
        if (isWall) {
          b.set(x, y, z, y === 13 ? '#FFFBE0' : y >= 11 ? '#FFE054' : '#F7B718');
        }
      }
    }
  }

  // Sparkling gems inside the trophy cup (y=8..9)
  b.box(6, 8, 6, 9, 8, 9, '#38F2FF');
  b.set(7, 9, 7, '#E866FF');
  b.set(8, 9, 8, '#38F27B');

  //Symmetric curved side handles (x=2..3 and x=12..13, y=8..12, z=7..8)
  for (let z = 7; z <= 8; z++) {
    b.setSymX(3, 8, z, '#C6780E');
    b.setSymX(2, 9, z, '#FFE054');
    b.setSymX(2, 10, z, '#FFE054');
    b.setSymX(2, 11, z, '#FFF07A');
    b.setSymX(3, 12, z, '#FFF07A');
  }

  // Front #1 star emblem on chalice
  b.box(7, 9, 4, 8, 11, 4, '#FFFBE0');

  return b.build();
}

function buildMagicTotem(): Voxel[] {
  const b = new VoxelBuilder();
  // Carved golden-totem base & feet (y=0..2)
  b.box(6, 0, 6, 9, 1, 9, '#C6780E');
  b.box(5, 2, 6, 10, 5, 9, '#F7B718');

  // Folded arms with emerald talisman in center (y=4..6)
  b.box(5, 4, 5, 10, 6, 5, '#FFE054');
  b.box(7, 5, 5, 8, 6, 5, '#38F27B');

  // Outstretched enchanted wings on -X and +X (y=5..11, z=7..8)
  for (let z = 7; z <= 8; z++) {
    b.setSymX(4, 6, z, '#F7B718');
    b.setSymX(3, 7, z, '#FFE054');
    b.setSymX(2, 8, z, '#5CEEFF');
    b.setSymX(1, 9, z, '#A844FF');
    b.setSymX(2, 10, z, '#E866FF');
    b.setSymX(3, 9, z, '#FFE054');
    b.setSymX(4, 8, z, '#F7B718');
  }

  // Totem head (y=7..12, x=5..10, z=5..10)
  b.box(5, 7, 5, 10, 12, 10, '#FFE054');
  // Hollow arcane heart core inside head (visible with Y-layer slicer!)
  b.box(7, 8, 7, 8, 10, 8, '#E866FF');

  // Glowing emerald eyes & nose on front face (z=5)
  b.setSymX(6, 10, 5, '#38F27B');
  b.setSymX(6, 11, 5, '#12A84E');
  b.box(7, 8, 4, 8, 10, 4, '#C6780E'); // 3D carved nose

  // Floating arcane crystal crest / halo at top (y=13..15)
  b.setSymX(5, 13, 7, '#A844FF');
  b.box(7, 14, 7, 8, 15, 8, '#5CEEFF');

  return b.build();
}

export const VOXEL_PRESETS: readonly VoxelPresetDefinition[] = [
  {
    id: 'empty_plate',
    icon: '⬜',
    defaultName: { ro: 'Creație Voxel 3D', en: 'Custom 3D Voxel' },
    category: 'artifact',
    rarity: 'common',
    stats: {
      attackDamage: 5,
      attackSpeed: 1.6,
      attackSpeedTier: 'normal',
      durability: 400,
      unbreakable: false,
      movementSpeed: 0,
      miningSpeed: 1.0,
      defense: 0,
      enchantability: 15,
      hungerRestored: 4,
      eatStatusEffect: 'none',
    },
    powers: [],
    buildVoxels: () => [],
  },
  {
    id: 'war_hammer',
    icon: '🔨',
    defaultName: { ro: 'Ciocan de Război 3D', en: '3D War Hammer' },
    category: 'weapon',
    rarity: 'legendary',
    stats: {
      attackDamage: 18,
      attackSpeed: 0.8,
      attackSpeedTier: 'slow',
      durability: 2400,
      unbreakable: false,
      movementSpeed: -5,
      miningSpeed: 6.0,
      defense: 2,
      enchantability: 18,
      hungerRestored: 4,
      eatStatusEffect: 'none',
    },
    powers: [
      {
        id: 'on_hit:lightning_bolt',
        trigger: 'on_hit',
        effect: 'lightning_bolt',
        amplifier: 1,
        durationSeconds: 1,
      },
      {
        id: 'on_hit:super_knockback',
        trigger: 'on_hit',
        effect: 'super_knockback',
        amplifier: 2,
        durationSeconds: 1,
      },
    ],
    buildVoxels: buildWarHammer,
  },
  {
    id: 'royal_crown',
    icon: '👑',
    defaultName: { ro: 'Coroană Regală', en: 'Royal Crown' },
    category: 'armor',
    armorSlot: 'helmet',
    rarity: 'legendary',
    stats: {
      attackDamage: 4,
      attackSpeed: 1.6,
      attackSpeedTier: 'normal',
      durability: 1500,
      unbreakable: true,
      movementSpeed: 15,
      miningSpeed: 1.0,
      defense: 8,
      enchantability: 30,
      hungerRestored: 4,
      eatStatusEffect: 'none',
    },
    powers: [
      {
        id: 'passive_held:glowing_aura',
        trigger: 'passive_held',
        effect: 'glowing_aura',
        amplifier: 1,
        durationSeconds: 5,
      },
      {
        id: 'passive_held:night_vision',
        trigger: 'passive_held',
        effect: 'night_vision',
        amplifier: 1,
        durationSeconds: 12,
      },
    ],
    buildVoxels: buildRoyalCrown,
  },
  {
    id: 'champion_trophy',
    icon: '🏆',
    defaultName: { ro: 'Trofeul Campionului', en: 'Champion Trophy' },
    category: 'artifact',
    rarity: 'epic',
    stats: {
      attackDamage: 8,
      attackSpeed: 1.6,
      attackSpeedTier: 'normal',
      durability: 2000,
      unbreakable: true,
      movementSpeed: 20,
      miningSpeed: 1.0,
      defense: 4,
      enchantability: 25,
      hungerRestored: 4,
      eatStatusEffect: 'none',
    },
    powers: [
      {
        id: 'passive_held:speed_boost',
        trigger: 'passive_held',
        effect: 'speed_boost',
        amplifier: 1,
        durationSeconds: 2,
      },
      {
        id: 'passive_held:super_jump',
        trigger: 'passive_held',
        effect: 'super_jump',
        amplifier: 2,
        durationSeconds: 2,
      },
    ],
    buildVoxels: buildChampionTrophy,
  },
  {
    id: 'magic_totem',
    icon: '🗿',
    defaultName: { ro: 'Totem Magic', en: 'Magic Totem' },
    category: 'artifact',
    rarity: 'legendary',
    stats: {
      attackDamage: 10,
      attackSpeed: 2.4,
      attackSpeedTier: 'fast',
      durability: 1200,
      unbreakable: false,
      movementSpeed: 10,
      miningSpeed: 1.0,
      defense: 6,
      enchantability: 28,
      hungerRestored: 6,
      eatStatusEffect: 'regeneration',
    },
    powers: [
      {
        id: 'passive_held:fire_resistance',
        trigger: 'passive_held',
        effect: 'fire_resistance',
        amplifier: 1,
        durationSeconds: 5,
      },
      {
        id: 'on_hit:lifesteal',
        trigger: 'on_hit',
        effect: 'lifesteal',
        amplifier: 1,
        durationSeconds: 1,
      },
    ],
    buildVoxels: buildMagicTotem,
  },
];

export function getVoxelPreset(id: VoxelPresetId): VoxelPresetDefinition {
  return VOXEL_PRESETS.find((p) => p.id === id) ?? VOXEL_PRESETS[1]!;
}
