// SPDX-License-Identifier: GPL-3.0-or-later

import type { PaletteCategoryId } from '../i18n/translations';
import type { HexColor, Language } from '../types/project';

export interface ColorSwatch {
  hex: HexColor;
  label: Record<Language, string>;
}

export interface ColorPaletteGroup {
  id: PaletteCategoryId;
  accentHex: HexColor;
  swatches: ColorSwatch[];
}

export const CURATED_PALETTES: ColorPaletteGroup[] = [
  {
    id: 'metals',
    accentHex: '#D8E3F0',
    swatches: [
      { hex: '#F4F8FF', label: { ro: 'Oțel Strălucitor', en: 'Gleaming Steel' } },
      { hex: '#C7D5E8', label: { ro: 'Fier Forjat', en: 'Forged Iron' } },
      { hex: '#8B9BB4', label: { ro: 'Fier Umbră', en: 'Shadow Iron' } },
      { hex: '#4B5668', label: { ro: 'Nicovală Întunecată', en: 'Dark Anvil' } },
      { hex: '#262B38', label: { ro: 'Netherit Negru', en: 'Netherite Dark' } },
      { hex: '#FFF07A', label: { ro: 'Aur Luminos', en: 'Bright Gold' } },
      { hex: '#F7B718', label: { ro: 'Aur Regal', en: 'Royal Gold' } },
      { hex: '#C6780E', label: { ro: 'Bronz Antic', en: 'Ancient Bronze' } },
      { hex: '#EE7B44', label: { ro: 'Cupru Aprins', en: 'Bright Copper' } },
      { hex: '#9E472A', label: { ro: 'Cupru Oxidat', en: 'Aged Copper' } },
    ],
  },
  {
    id: 'gems',
    accentHex: '#3CE8D8',
    swatches: [
      { hex: '#A8FFF9', label: { ro: 'Sclipire Diamant', en: 'Diamond Glint' } },
      { hex: '#34E5DB', label: { ro: 'Diamant Pur', en: 'Pure Diamond' } },
      { hex: '#149CA8', label: { ro: 'Safir Adânc', en: 'Deep Teal Gem' } },
      { hex: '#38F27B', label: { ro: 'Smarald Viu', en: 'Vivid Emerald' } },
      { hex: '#12A84E', label: { ro: 'Smarald Regal', en: 'Royal Emerald' } },
      { hex: '#FF4769', label: { ro: 'Rubin Aprins', en: 'Blazing Ruby' } },
      { hex: '#B5193E', label: { ro: 'Rubin Sângeriu', en: 'Crimson Ruby' } },
      { hex: '#C66BFF', label: { ro: 'Ametist Cristal', en: 'Crystal Amethyst' } },
      { hex: '#497DFF', label: { ro: 'Safir Celest', en: 'Celestial Sapphire' } },
      { hex: '#FFE159', label: { ro: 'Topaz Solar', en: 'Solar Topaz' } },
    ],
  },
  {
    id: 'wood',
    accentHex: '#C2834B',
    swatches: [
      { hex: '#F0D09C', label: { ro: 'Mesteacăn Deschis', en: 'Light Birch' } },
      { hex: '#C98E4E', label: { ro: 'Lemn de Stejar', en: 'Oak Plank' } },
      { hex: '#9A6230', label: { ro: 'Lemn de Molid', en: 'Spruce Wood' } },
      { hex: '#6B3F1D', label: { ro: 'Stejar Întunecat', en: 'Dark Oak' } },
      { hex: '#3E2210', label: { ro: 'Scoarță Veche', en: 'Ancient Bark' } },
      { hex: '#E09963', label: { ro: 'Piele Tăbăcită', en: 'Tan Leather' } },
      { hex: '#B35D33', label: { ro: 'Mâner de Piele', en: 'Leather Grip' } },
      { hex: '#7D351E', label: { ro: 'Mahon Roșiatic', en: 'Red Mahogany' } },
      { hex: '#D9C2A3', label: { ro: 'Sfoară Cânepă', en: 'Hemp Cord' } },
      { hex: '#29150A', label: { ro: 'Contur Lemn', en: 'Wood Outline' } },
    ],
  },
  {
    id: 'fire',
    accentHex: '#FF6B1A',
    swatches: [
      { hex: '#FFFBE0', label: { ro: 'Miez Incandescent', en: 'White-Hot Core' } },
      { hex: '#FFE436', label: { ro: 'Flacără Galbenă', en: 'Solar Flame' } },
      { hex: '#FFA214', label: { ro: 'Foc Portocaliu', en: 'Blaze Orange' } },
      { hex: '#FF5917', label: { ro: 'Lavă Topită', en: 'Molten Lava' } },
      { hex: '#E01E2B', label: { ro: 'Jar Aprins', en: 'Glowing Ember' } },
      { hex: '#991124', label: { ro: 'Magmă Adâncă', en: 'Deep Magma' } },
      { hex: '#541322', label: { ro: 'Cărbune Încins', en: 'Scorched Coal' } },
      { hex: '#2B162C', label: { ro: 'Obsidian Vulcanic', en: 'Volcanic Obsidian' } },
      { hex: '#FF8247', label: { ro: 'Scânteie Caldă', en: 'Warm Spark' } },
      { hex: '#42393B', label: { ro: 'Cenușă Forjă', en: 'Forge Ash' } },
    ],
  },
  {
    id: 'magic',
    accentHex: '#B85CFF',
    swatches: [
      { hex: '#F8D4FF', label: { ro: 'Lumină Astrală', en: 'Astral Glow' } },
      { hex: '#E866FF', label: { ro: 'Magie Încântată', en: 'Enchanted Pink' } },
      { hex: '#A844FF', label: { ro: 'Violet Arcan', en: 'Arcane Violet' } },
      { hex: '#6924C7', label: { ro: 'Rună Mistică', en: 'Mystic Rune' } },
      { hex: '#331269', label: { ro: 'Abis Cosmic', en: 'Cosmic Void' } },
      { hex: '#5CEEFF', label: { ro: 'Fulger Eteric', en: 'Aether Bolt' } },
      { hex: '#2499FF', label: { ro: 'Mana Albastră', en: 'Mana Blue' } },
      { hex: '#7DFCA8', label: { ro: 'Foc Fericit / Spirit', en: 'Spirit Wisp' } },
      { hex: '#FF6EC7', label: { ro: 'Praf de Zâne', en: 'Pixie Spark' } },
      { hex: '#1B0B3B', label: { ro: 'Umbră Vrăjită', en: 'Spell Shadow' } },
    ],
  },
  {
    id: 'nature',
    accentHex: '#4CD964',
    swatches: [
      { hex: '#B8FF66', label: { ro: 'Mugur Tânăr', en: 'Spring Sprout' } },
      { hex: '#56E349', label: { ro: 'Frunză Verde', en: 'Bright Leaf' } },
      { hex: '#22A83B', label: { ro: 'Mușchi de Pădure', en: 'Forest Moss' } },
      { hex: '#146E30', label: { ro: 'Liană Junglă', en: 'Jungle Vine' } },
      { hex: '#0C3D20', label: { ro: 'Brad Întunecat', en: 'Deep Pine' } },
      { hex: '#6BE6C7', label: { ro: 'Lagună Clară', en: 'Clear Lagoon' } },
      { hex: '#FF6B9D', label: { ro: 'Floare de Cireș', en: 'Blossom Petal' } },
      { hex: '#FFD23F', label: { ro: 'Polen Însorit', en: 'Sunlit Pollen' } },
      { hex: '#8F563B', label: { ro: 'Pământ Roditor', en: 'Rich Earth' } },
      { hex: '#A2B5A6', label: { ro: 'Piatră de Râu', en: 'River Stone' } },
    ],
  },
];
