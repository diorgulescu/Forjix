// SPDX-License-Identifier: GPL-3.0-or-later

export type GridSize = 16 | 32;

export const VOXEL_GRID_SIZE = 16 as const;

export type EditorMode = 'extruded' | 'voxel';

export type ItemCategory =
  | 'weapon'
  | 'tool'
  | 'consumable'
  | 'artifact'
  | 'armor'
  | 'wand';

export type PrimaryItemCategory =
  | 'weapon'
  | 'tool'
  | 'consumable'
  | 'artifact';

export type ItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export type PrimaryItemRarity =
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary';

export type ArmorSlot =
  | 'helmet'
  | 'chestplate'
  | 'leggings'
  | 'boots'
  | 'shield';

export type AttackSpeedTier = 'slow' | 'normal' | 'fast' | 'lightning';

export type EatStatusEffect =
  | 'none'
  | 'regeneration'
  | 'absorption'
  | 'speed'
  | 'fire_resistance'
  | 'night_vision';

export type PowerTrigger =
  | 'on_hit'
  | 'on_right_click'
  | 'passive_held'
  | 'on_consume';

export type OnHitEffectId =
  | 'set_fire'
  | 'lightning_bolt'
  | 'freeze_slowness'
  | 'super_knockback'
  | 'poison'
  | 'lifesteal';

export type PassiveHeldEffectId =
  | 'speed_boost'
  | 'super_jump'
  | 'night_vision'
  | 'fire_resistance'
  | 'glowing_aura';

export type OnRightClickEffectId =
  | 'launch_fireball'
  | 'teleport_forward'
  | 'heal_aura';

export type SpecialPowerEffectId =
  | OnHitEffectId
  | PassiveHeldEffectId
  | OnRightClickEffectId;

/**
 * Hex color string formatted as #RRGGBB.
 */
export type HexColor = string;

/**
 * Single 3D voxel coordinate (0..15 in 16x16x16 Voxel Forge) and color.
 */
export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: HexColor;
}

/**
 * Clamped kid-friendly gameplay attributes of the forged Minecraft item.
 */
export interface ItemStats {
  /** Clamped 1..50 (1 heart = 2 damage) */
  attackDamage: number;
  /** Numeric attack speed synced with attackSpeedTier */
  attackSpeed: number;
  /** Kid-friendly speed preset: Slow, Normal, Fast, Lightning */
  attackSpeedTier: AttackSpeedTier;
  /** Clamped 50..5000 */
  durability: number;
  /** True when item never breaks */
  unbreakable: boolean;
  /** Clamped -20..+50 (%) */
  movementSpeed: number;
  miningSpeed: number;
  defense: number;
  enchantability: number;
  /** Clamped 1..10 drumsticks (for Food/Consumable) */
  hungerRestored: number;
  /** Status effect granted when eaten (for Food/Consumable) */
  eatStatusEffect: EatStatusEffect;
}

/**
 * Special ability / enchantment-like power bound to the forged item.
 */
export interface ItemPower {
  id: string;
  trigger: PowerTrigger;
  effect: string;
  amplifier: number;
  durationSeconds: number;
}

/**
 * Central serializable project state shared between TypeScript UI and Rust Tauri IPC.
 */
export interface ItemProject {
  id: string;
  name: string;
  slug: string;
  mode: EditorMode;
  gridSize: GridSize;
  pixels: (HexColor | null)[];
  voxels: Voxel[];
  category: ItemCategory;
  rarity: ItemRarity;
  /** Armor slot — only relevant when category is 'armor' */
  armorSlot: ArmorSlot;
  stats: ItemStats;
  powers: ItemPower[];
}

export type ToolId = 'pencil' | 'eraser' | 'bucket' | 'eyedropper';

export interface MirrorAxisState {
  x: boolean;
  y: boolean;
}

export type Language = 'ro' | 'en';

export type ArmStyle = 'steve' | 'alex';

export type StarterTemplateId =
  | 'blank'
  | 'classic_sword'
  | 'battle_axe'
  | 'pickaxe'
  | 'shield'
  | 'magic_wand'
  | 'golden_apple';

export type VoxelPresetId =
  | 'empty_plate'
  | 'war_hammer'
  | 'royal_crown'
  | 'champion_trophy'
  | 'magic_totem';
