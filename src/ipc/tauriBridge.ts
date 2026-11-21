// SPDX-License-Identifier: GPL-3.0-or-later

import { invoke, isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type {
  ArmorSlot,
  ItemCategory,
  ItemProject,
  ItemRarity,
  Voxel,
} from '../types/project';
import {
  normalizeHex,
  pixelsToExtrudedVoxels,
  slugifyItemName,
} from '../utils/pixelOps';
import {
  clampItemStats,
  isInsideVoxelBounds,
  voxelKey,
} from '../utils/voxelOps';

export interface ProjectFilePayload {
  path: string;
  project: ItemProject;
}

export interface JavaExportResult {
  resourcePackPath: string;
  dataPackPath: string;
  giveCommand: string;
  functionCommand: string;
}

export interface CombinedExportResult {
  mcaddonPath: string;
  javaResult: JavaExportResult;
}

export function isTauriRuntime(): boolean {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

export function rarityColorCode(rarity: ItemRarity): string {
  switch (rarity) {
    case 'common':
    case 'uncommon':
      return '§f';
    case 'rare':
      return '§b';
    case 'epic':
      return '§d';
    case 'legendary':
      return '§6';
  }
}

function javaRarityColorName(rarity: ItemRarity): string {
  switch (rarity) {
    case 'common':
    case 'uncommon':
      return 'white';
    case 'rare':
      return 'aqua';
    case 'epic':
      return 'light_purple';
    case 'legendary':
      return 'gold';
  }
}

function javaBaseItemId(category: ItemCategory, armorSlot: ArmorSlot = 'chestplate'): string {
  switch (category) {
    case 'weapon':
      return 'minecraft:diamond_sword';
    case 'tool':
      return 'minecraft:diamond_pickaxe';
    case 'consumable':
      return 'minecraft:golden_apple';
    case 'armor':
      switch (armorSlot) {
        case 'helmet':
          return 'minecraft:iron_helmet';
        case 'chestplate':
          return 'minecraft:iron_chestplate';
        case 'leggings':
          return 'minecraft:iron_leggings';
        case 'boots':
          return 'minecraft:iron_boots';
        case 'shield':
          return 'minecraft:shield';
      }
      return 'minecraft:iron_chestplate';
    case 'wand':
    case 'artifact':
      return 'minecraft:blaze_rod';
  }
}

/**
 * Mirrors Rust `build_java_121_give_command` so the UI can preview & copy
 * the exact Java 1.21+ `/give @p ...` command immediately and in dev mode.
 */
export function buildJava121GiveCommandClient(project: ItemProject): string {
  const normalized = normalizeProjectLocally(project);
  const slug = normalized.slug;
  const baseItem = javaBaseItemId(normalized.category, normalized.armorSlot ?? 'chestplate');
  const isFood = normalized.category === 'consumable';
  const displayName = normalized.name.trim() || 'Forjix Item';

  const customNameJson = JSON.stringify({
    text: displayName,
    color: javaRarityColorName(normalized.rarity),
    italic: false,
  })
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");

  const comps: string[] = [
    `minecraft:item_model="forjix:${slug}"`,
    `minecraft:custom_name='${customNameJson}'`,
    `minecraft:custom_data={forjix_item:"${slug}"}`,
  ];

  if (!isFood) {
    if (normalized.stats.unbreakable) {
      comps.push('minecraft:unbreakable={}');
    } else {
      comps.push(`minecraft:max_damage=${normalized.stats.durability}`);
    }

    const atkBonus = Math.max(0, normalized.stats.attackDamage - 1).toFixed(1);
    const spdDelta = (normalized.stats.attackSpeed - 4.0).toFixed(2);
    const mods: string[] = [
      `{id:"forjix:attack_damage",type:"minecraft:generic.attack_damage",amount:${atkBonus},operation:"add_value",slot:"mainhand"}`,
      `{id:"forjix:attack_speed",type:"minecraft:generic.attack_speed",amount:${spdDelta},operation:"add_value",slot:"mainhand"}`,
    ];
    if (normalized.stats.movementSpeed !== 0) {
      const moveFrac = (normalized.stats.movementSpeed / 100).toFixed(2);
      mods.push(
        `{id:"forjix:movement_speed",type:"minecraft:generic.movement_speed",amount:${moveFrac},operation:"add_multiplied_base",slot:"mainhand"}`
      );
    }
    comps.push(`minecraft:attribute_modifiers=[${mods.join(',')}]`);

    const anyRightClick = normalized.powers.some(
      (p) => p.trigger === 'on_right_click'
    );
    const isShield =
      normalized.category === 'armor' && normalized.armorSlot === 'shield';
    if (anyRightClick && !isShield) {
      comps.push(
        'minecraft:food={nutrition:0,saturation:0.0,can_always_eat:true,eat_seconds:3600.0}'
      );
    }
  } else {
    const nutrition = normalized.stats.hungerRestored * 2;
    const saturation = (nutrition * 0.6).toFixed(1);
    if (normalized.stats.eatStatusEffect !== 'none') {
      const eatEffectMap: Record<
        Exclude<typeof normalized.stats.eatStatusEffect, 'none'>,
        { id: string; ticks: number; amp: number }
      > = {
        regeneration: { id: 'minecraft:regeneration', ticks: 200, amp: 1 },
        absorption: { id: 'minecraft:absorption', ticks: 1200, amp: 1 },
        speed: { id: 'minecraft:speed', ticks: 300, amp: 1 },
        fire_resistance: { id: 'minecraft:fire_resistance', ticks: 600, amp: 0 },
        night_vision: { id: 'minecraft:night_vision', ticks: 600, amp: 0 },
      };
      const eff = eatEffectMap[normalized.stats.eatStatusEffect];
      comps.push(
        `minecraft:food={nutrition:${nutrition},saturation:${saturation},can_always_eat:true,effects:[{effect:{id:"${eff.id}",amplifier:${eff.amp},duration:${eff.ticks}},probability:1.0f}]}`
      );
    } else {
      comps.push(
        `minecraft:food={nutrition:${nutrition},saturation:${saturation},can_always_eat:true}`
      );
    }
  }

  const hasFireRes = normalized.powers.some(
    (p) => p.trigger === 'passive_held' && p.effect === 'fire_resistance'
  );
  if (hasFireRes || normalized.rarity === 'legendary') {
    comps.push('minecraft:fire_resistant={}');
  }

  if (normalized.rarity === 'epic' || normalized.rarity === 'legendary') {
    comps.push('minecraft:enchantment_glint_override=true');
  }

  return `/give @p ${baseItem}[${comps.join(',')}] 1`;
}

export function normalizeProjectLocally(project: ItemProject): ItemProject {
  const normalizedPixels = project.pixels.map((cell) =>
    cell !== null ? normalizeHex(cell) : null
  );
  const slug = slugifyItemName(project.name);

  let voxels: Voxel[];
  if (project.mode === 'extruded') {
    voxels = pixelsToExtrudedVoxels(normalizedPixels, project.gridSize);
  } else {
    const map = new Map<string, Voxel>();
    for (const v of project.voxels ?? []) {
      if (isInsideVoxelBounds(v.x, v.y, v.z)) {
        map.set(voxelKey(v.x, v.y, v.z), {
          x: Math.trunc(v.x),
          y: Math.trunc(v.y),
          z: Math.trunc(v.z),
          color: normalizeHex(v.color),
        });
      }
    }
    voxels = Array.from(map.values());
  }

  return {
    ...project,
    slug,
    armorSlot: project.armorSlot ?? 'chestplate',
    pixels: normalizedPixels,
    voxels,
    stats: clampItemStats({
      attackDamage: project.stats?.attackDamage ?? 7,
      attackSpeed: project.stats?.attackSpeed ?? 1.6,
      attackSpeedTier: project.stats?.attackSpeedTier ?? 'normal',
      durability: project.stats?.durability ?? 500,
      unbreakable: project.stats?.unbreakable ?? false,
      movementSpeed: project.stats?.movementSpeed ?? 0,
      miningSpeed: project.stats?.miningSpeed ?? 1.0,
      defense: project.stats?.defense ?? 0,
      enchantability: project.stats?.enchantability ?? 15,
      hungerRestored: project.stats?.hungerRestored ?? 4,
      eatStatusEffect: project.stats?.eatStatusEffect ?? 'none',
    }),
    powers: Array.isArray(project.powers) ? project.powers : [],
  };
}

export async function syncProjectIpc(
  project: ItemProject
): Promise<ItemProject> {
  if (isTauriRuntime()) {
    return invoke<ItemProject>('sync_project', { project });
  }
  return normalizeProjectLocally(project);
}

function triggerBrowserBlobDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/zip',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function saveForjixProject(
  project: ItemProject,
  explicitPath?: string
): Promise<ProjectFilePayload | null> {
  if (isTauriRuntime()) {
    return invoke<ProjectFilePayload | null>('save_forjix_project', {
      project,
      path: explicitPath ?? null,
    });
  }

  const normalized = normalizeProjectLocally(project);
  const json = JSON.stringify(normalized, null, 2);
  const fileName = `${normalized.slug || 'forjix_item'}.forjix.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return {
    path: fileName,
    project: normalized,
  };
}

export async function loadForjixProject(
  explicitPath?: string
): Promise<ProjectFilePayload | null> {
  if (isTauriRuntime()) {
    return invoke<ProjectFilePayload | null>('load_forjix_project', {
      path: explicitPath ?? null,
    });
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.forjix.json,.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const raw = await file.text();
        const parsed = parseProjectJsonString(raw);
        resolve({ path: file.name, project: parsed });
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

function crc32Bytes(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i]!;
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildStoreZip(
  entries: Array<{ name: string; data: Uint8Array }>
): Uint8Array {
  const enc = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const crc = crc32Bytes(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + nameBytes.length + size);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(entry.data, 30 + nameBytes.length);
    localChunks.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralChunks.push(central);

    offset += local.length;
  }

  let centralSize = 0;
  for (const c of centralChunks) centralSize += c.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = new Uint8Array(offset + centralSize + 22);
  let cursor = 0;
  for (const l of localChunks) {
    total.set(l, cursor);
    cursor += l.length;
  }
  for (const c of centralChunks) {
    total.set(c, cursor);
    cursor += c.length;
  }
  total.set(eocd, cursor);
  return total;
}

export async function exportBedrockMcaddon(
  project: ItemProject,
  explicitOutputPath?: string
): Promise<string | null> {
  const normalized = normalizeProjectLocally(project);
  const defaultFile = `${normalized.slug || 'forjix_item'}.mcaddon`;

  if (isTauriRuntime()) {
    const chosen =
      explicitOutputPath ??
      (await save({
        title: 'Forjix — Export Minecraft (.mcaddon)',
        defaultPath: defaultFile,
        filters: [
          {
            name: 'Minecraft Add-On (.mcaddon)',
            extensions: ['mcaddon'],
          },
        ],
      }));

    if (!chosen) {
      return null;
    }

    return invoke<string>('export_bedrock_mcaddon', {
      project: normalized,
      output_path: chosen,
    });
  }

  const enc = new TextEncoder();
  const slug = normalized.slug;
  const langLine = `item.forjix:${slug}.name=${rarityColorCode(normalized.rarity)}${normalized.name}\n`;
  const zipBytes = buildStoreZip([
    { name: 'RP/texts/en_US.lang', data: enc.encode(langLine) },
    { name: 'RP/texts/ro_RO.lang', data: enc.encode(langLine) },
    {
      name: `BP/items/${slug}.json`,
      data: enc.encode(
        JSON.stringify(
          {
            format_version: '1.20.80',
            'minecraft:item': {
              description: { identifier: `forjix:${slug}` },
            },
          },
          null,
          2
        )
      ),
    },
  ]);

  triggerBrowserBlobDownload(zipBytes, defaultFile);
  return defaultFile;
}

export async function exportJavaPacks(
  project: ItemProject,
  explicitOutputDir?: string
): Promise<JavaExportResult | null> {
  const normalized = normalizeProjectLocally(project);
  const slug = normalized.slug || 'forjix_item';

  if (isTauriRuntime()) {
    const chosenDir =
      explicitOutputDir ??
      (await open({
        title: 'Forjix — Choose Folder for Java Edition 1.21+ Packs',
        directory: true,
        multiple: false,
      }));

    if (!chosenDir || Array.isArray(chosenDir)) {
      return null;
    }

    return invoke<JavaExportResult>('export_java_packs', {
      project: normalized,
      output_dir: chosenDir,
    });
  }

  // Browser dev preview fallback
  const enc = new TextEncoder();
  const rpName = `${slug}_java_resourcepack.zip`;
  const dpName = `${slug}_java_datapack.zip`;
  const giveCommand = buildJava121GiveCommandClient(normalized);

  const rpBytes = buildStoreZip([
    {
      name: 'pack.mcmeta',
      data: enc.encode(
        JSON.stringify(
          {
            pack: {
              pack_format: 34,
              description: `Forjix Resource Pack — ${normalized.name}`,
            },
          },
          null,
          2
        )
      ),
    },
  ]);
  const dpBytes = buildStoreZip([
    {
      name: 'pack.mcmeta',
      data: enc.encode(
        JSON.stringify(
          {
            pack: {
              pack_format: 48,
              description: `Forjix Data Pack — ${normalized.name}`,
            },
          },
          null,
          2
        )
      ),
    },
    {
      name: `data/forjix/function/give_${slug}.mcfunction`,
      data: enc.encode(`${giveCommand.replace(/^\//, '')}\n`),
    },
  ]);

  triggerBrowserBlobDownload(rpBytes, rpName);
  triggerBrowserBlobDownload(dpBytes, dpName);

  return {
    resourcePackPath: rpName,
    dataPackPath: dpName,
    giveCommand,
    functionCommand: `/function forjix:give_${slug}`,
  };
}

export async function exportBothEditions(
  project: ItemProject
): Promise<CombinedExportResult | null> {
  const normalized = normalizeProjectLocally(project);
  const slug = normalized.slug || 'forjix_item';

  if (isTauriRuntime()) {
    const chosenDir = await open({
      title: 'Forjix — Choose Export Folder (Bedrock .mcaddon + Java 1.21+)',
      directory: true,
      multiple: false,
    });

    if (!chosenDir || Array.isArray(chosenDir)) {
      return null;
    }

    const sep = chosenDir.includes('\\') ? '\\' : '/';
    const mcaddonTarget = `${chosenDir.replace(/[\\/]+$/, '')}${sep}${slug}.mcaddon`;

    const mcaddonPath = await invoke<string>('export_bedrock_mcaddon', {
      project: normalized,
      output_path: mcaddonTarget,
    });
    const javaResult = await invoke<JavaExportResult>('export_java_packs', {
      project: normalized,
      output_dir: chosenDir,
    });

    return { mcaddonPath, javaResult };
  }

  const mcaddonPath = await exportBedrockMcaddon(normalized);
  const javaResult = await exportJavaPacks(normalized);
  if (!mcaddonPath || !javaResult) return null;
  return { mcaddonPath, javaResult };
}

export function parseProjectJsonString(rawJson: string): ItemProject {
  const parsed = JSON.parse(rawJson) as ItemProject;
  if (parsed.gridSize !== 16 && parsed.gridSize !== 32) {
    throw new Error('Invalid gridSize in .forjix.json');
  }
  if (
    !Array.isArray(parsed.pixels) ||
    parsed.pixels.length !== parsed.gridSize * parsed.gridSize
  ) {
    throw new Error('Invalid pixels array in .forjix.json');
  }
  return normalizeProjectLocally(parsed);
}
