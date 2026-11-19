// SPDX-License-Identifier: GPL-3.0-or-later

import type {
  ArmorSlot,
  GridSize,
  HexColor,
  ItemCategory,
  ItemPower,
  ItemRarity,
  ItemStats,
  Language,
  StarterTemplateId,
} from '../types/project';
import { createEmptyPixels, resizePixelGrid } from '../utils/pixelOps';

export interface StarterTemplateDefinition {
  id: StarterTemplateId;
  defaultName: Record<Language, string>;
  category: ItemCategory;
  armorSlot?: ArmorSlot;
  rarity: ItemRarity;
  stats: ItemStats;
  powers: ItemPower[];
  palette: Record<string, HexColor>;
  rows16: readonly string[];
}

function decodeTemplate16(
  rows: readonly string[],
  palette: Record<string, HexColor>
): (HexColor | null)[] {
  const out = createEmptyPixels(16);
  for (let y = 0; y < 16; y++) {
    const row = rows[y] ?? '................';
    for (let x = 0; x < 16; x++) {
      const ch = row[x] ?? '.';
      if (ch !== '.' && palette[ch] !== undefined) {
        out[y * 16 + x] = palette[ch]!;
      }
    }
  }
  return out;
}

export const STARTER_TEMPLATES: readonly StarterTemplateDefinition[] = [
  {
    id: 'blank',
    defaultName: { ro: 'Obiect Nou', en: 'New Custom Item' },
    category: 'artifact',
    rarity: 'common',
    stats: {
      attackDamage: 4,
      attackSpeed: 1.6,
      attackSpeedTier: 'normal',
      durability: 250,
      unbreakable: false,
      movementSpeed: 0,
      miningSpeed: 1,
      defense: 0,
      enchantability: 12,
      hungerRestored: 4,
      eatStatusEffect: 'none',
    },
    powers: [],
    palette: {},
    rows16: Array.from({ length: 16 }, () => '................'),
  },
  {
    id: 'classic_sword',
    defaultName: { ro: 'Sabie Clasică', en: 'Classic Sword' },
    category: 'weapon',
    rarity: 'rare',
    stats: {
      attackDamage: 8,
      attackSpeed: 1.6,
      attackSpeedTier: 'normal',
      durability: 850,
      unbreakable: false,
      movementSpeed: 5,
      miningSpeed: 1.5,
      defense: 0,
      enchantability: 16,
      hungerRestored: 4,
      eatStatusEffect: 'none',
    },
    powers: [
      {
        id: 'on_hit:super_knockback',
        trigger: 'on_hit',
        effect: 'super_knockback',
        amplifier: 2,
        durationSeconds: 1,
      },
    ],
    palette: {
      D: '#39465B',
      S: '#9BB0CC',
      L: '#EAF4FF',
      G: '#B86F14',
      Y: '#FFE054',
      W: '#8F5630',
      B: '#4A2812',
    },
    rows16: [
      '.............DSS',
      '............DLSS',
      '...........DLLSD',
      '..........DLLSD.',
      '.........DLLSD..',
      '........DLLSD...',
      '.......DLLSD....',
      '...GG.DLLSD.....',
      '...GYGLLSD......',
      '....GYYGD.......',
      '....BYYG........',
      '...BWWGYG.......',
      '..BWWB.GG.......',
      '.GWWB...........',
      'GYYG............',
      'GG..............',
    ],
  },
  {
    id: 'battle_axe',
    defaultName: { ro: 'Topor de Luptă', en: 'Battle Axe' },
    category: 'weapon',
    rarity: 'epic',
    stats: {
      attackDamage: 14,
      attackSpeed: 0.8,
      attackSpeedTier: 'slow',
      durability: 1200,
      unbreakable: false,
      movementSpeed: -5,
      miningSpeed: 6.0,
      defense: 0,
      enchantability: 14,
      hungerRestored: 4,
      eatStatusEffect: 'none',
    },
    powers: [
      {
        id: 'on_hit:set_fire',
        trigger: 'on_hit',
        effect: 'set_fire',
        amplifier: 1,
        durationSeconds: 5,
      },
    ],
    palette: {
      D: '#2F384A',
      S: '#95A9C4',
      L: '#F0F7FF',
      G: '#C6780E',
      Y: '#FFE159',
      W: '#9A6230',
      B: '#462612',
    },
    rows16: [
      '.........DDDD...',
      '........DSSSSD..',
      '........DSLLLSSD',
      '........DSLLGSSD',
      '.........DSGYLLD',
      '........BWGGYLSD',
      '.......BWWBDSLSD',
      '......BWWB..DSSD',
      '.....BWWB....DD.',
      '....BWWB........',
      '...BWWB.........',
      '..BWWB..........',
      '.BWWB...........',
      'GYYB............',
      'GYG.............',
      '................',
    ],
  },
  {
    id: 'pickaxe',
    defaultName: { ro: 'Târnăcop de Cristal', en: 'Crystal Pickaxe' },
    category: 'tool',
    rarity: 'rare',
    stats: {
      attackDamage: 6,
      attackSpeed: 1.6,
      attackSpeedTier: 'normal',
      durability: 1560,
      unbreakable: false,
      movementSpeed: 10,
      miningSpeed: 8.5,
      defense: 0,
      enchantability: 15,
      hungerRestored: 4,
      eatStatusEffect: 'none',
    },
    powers: [
      {
        id: 'passive_held:night_vision',
        trigger: 'passive_held',
        effect: 'night_vision',
        amplifier: 1,
        durationSeconds: 12,
      },
    ],
    palette: {
      D: '#0E5B6B',
      C: '#24C8D6',
      E: '#A8FFF9',
      G: '#C6780E',
      Y: '#FFE159',
      W: '#9A6230',
      B: '#4A2812',
    },
    rows16: [
      '.......DDDDDD...',
      '......DCCCCCCDD.',
      '.....DCCEEECCCCD',
      '.....DCE.GGEECCD',
      '......D.BWWGECDD',
      '.......BWWB.DCD.',
      '......BWWB..DCD.',
      '.....BWWB...DCD.',
      '....BWWB.....DD.',
      '...BWWB.........',
      '..BWWB..........',
      '.BWWB...........',
      'BWWB............',
      'GYB.............',
      'GG..............',
      '................',
    ],
  },
  {
    id: 'shield',
    defaultName: { ro: 'Scut Regal', en: 'Royal Shield' },
    category: 'armor',
    armorSlot: 'shield',
    rarity: 'epic',
    stats: {
      attackDamage: 4,
      attackSpeed: 0.8,
      attackSpeedTier: 'slow',
      durability: 1800,
      unbreakable: false,
      movementSpeed: -5,
      miningSpeed: 1.0,
      defense: 8.0,
      enchantability: 12,
      hungerRestored: 4,
      eatStatusEffect: 'none',
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
    palette: {
      D: '#364052',
      S: '#BFCFE3',
      W: '#8D542C',
      G: '#B86E14',
      Y: '#FFE45E',
    },
    rows16: [
      '..DDDDDDDDDDDD..',
      '.DSSSSSSSSSSSSD.',
      '.DSWWWWGGWWWWSD.',
      '.DSWWWWYYWWWWSD.',
      '.DSWWGGGGGGWWSD.',
      '.DSWWGYYYYGWWSD.',
      '.DSWWWWYYWWWWSD.',
      '.DSWWWWYYWWWWSD.',
      '.DSWWWWGGWWWWSD.',
      '..DSWWWWWWWWSD..',
      '..DSWWWWWWWWSD..',
      '...DSWWWWWWSD...',
      '....DSWWWWSD....',
      '.....DSSSSD.....',
      '......DDDD......',
      '................',
    ],
  },
  {
    id: 'magic_wand',
    defaultName: { ro: 'Baghetă Magică', en: 'Magic Wand' },
    category: 'artifact',
    rarity: 'legendary',
    stats: {
      attackDamage: 12,
      attackSpeed: 4.0,
      attackSpeedTier: 'lightning',
      durability: 750,
      unbreakable: true,
      movementSpeed: 15,
      miningSpeed: 1.0,
      defense: 1.0,
      enchantability: 25,
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
        id: 'passive_held:glowing_aura',
        trigger: 'passive_held',
        effect: 'glowing_aura',
        amplifier: 1,
        durationSeconds: 5,
      },
    ],
    palette: {
      A: '#6924C7',
      Q: '#5CEEFF',
      P: '#E866FF',
      W: '#FFFBE8',
      G: '#C6780E',
      Y: '#FFE159',
      M: '#5A2D82',
      B: '#2A1245',
    },
    rows16: [
      '...........A.Q..',
      '.........AAQQQA.',
      '........AQPPWWQA',
      '........AQPWWWQA',
      '.........AQPPQA.',
      '........GGAQQA..',
      '.......GYYGAA..Q',
      '......BMYYG.....',
      '.....BMMBG......',
      '....GMMB........',
      '...BYYG.........',
      '..BMMB..........',
      '.BMMB...........',
      'GYYB............',
      'GG..............',
      '................',
    ],
  },
  {
    id: 'golden_apple',
    defaultName: { ro: 'Măr de Aur', en: 'Golden Apple' },
    category: 'consumable',
    rarity: 'legendary',
    stats: {
      attackDamage: 2,
      attackSpeed: 1.6,
      attackSpeedTier: 'normal',
      durability: 50,
      unbreakable: false,
      movementSpeed: 10,
      miningSpeed: 1.0,
      defense: 0,
      enchantability: 20,
      hungerRestored: 8,
      eatStatusEffect: 'regeneration',
    },
    powers: [
      {
        id: 'passive_held:glowing_aura',
        trigger: 'passive_held',
        effect: 'glowing_aura',
        amplifier: 1,
        durationSeconds: 5,
      },
    ],
    palette: {
      B: '#5C3416',
      N: '#178C3B',
      L: '#59E84F',
      G: '#A65B08',
      O: '#E89510',
      Y: '#FFD83B',
      W: '#FFFBE0',
    },
    rows16: [
      '.......BB.NN....',
      '.......B.NLLN...',
      '........BNNLN...',
      '....GGGGGGGG....',
      '..GGYYYYYYYYGG..',
      '.GYYWWWWYYYYYYG.',
      '.GYWWYYYYYYYYOG.',
      '.GYWYYYYYYYYOOG.',
      '.GYYYYYYYYYYOOG.',
      '.GYYYYYYYYYOOGG.',
      '.GGYYYYYYYYOOGG.',
      '..GGYYYYYYOOGG..',
      '...GGYYYYOOGG...',
      '....GGGGGGGG....',
      '.....GG..GG.....',
      '................',
    ],
  },
];

export function getTemplateDefinition(
  id: StarterTemplateId
): StarterTemplateDefinition {
  return (
    STARTER_TEMPLATES.find((t) => t.id === id) ?? STARTER_TEMPLATES[1]!
  );
}

export function buildTemplatePixels(
  id: StarterTemplateId,
  gridSize: GridSize
): (HexColor | null)[] {
  const def = getTemplateDefinition(id);
  const px16 = decodeTemplate16(def.rows16, def.palette);
  return gridSize === 16 ? px16 : resizePixelGrid(px16, 16, 32);
}
