// SPDX-License-Identifier: GPL-3.0-or-later

import {
  type AttackSpeedTier,
  type GridSize,
  type HexColor,
  type ItemStats,
  type Voxel,
  VOXEL_GRID_SIZE,
} from '../types/project';
import { normalizeHex, resizePixelGrid } from './pixelOps';

export function clampAttackDamage(value: number): number {
  if (!Number.isFinite(value)) return 7;
  return Math.min(50, Math.max(1, Math.round(value)));
}

export function clampDurability(value: number): number {
  if (!Number.isFinite(value)) return 500;
  return Math.min(5000, Math.max(50, Math.round(value)));
}

export function clampMovementSpeed(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(50, Math.max(-20, Math.round(value)));
}

export function clampHungerRestored(value: number): number {
  if (!Number.isFinite(value)) return 4;
  return Math.min(10, Math.max(1, Math.round(value)));
}

export function attackSpeedForTier(tier: AttackSpeedTier): number {
  switch (tier) {
    case 'slow':
      return 0.8;
    case 'normal':
      return 1.6;
    case 'fast':
      return 2.4;
    case 'lightning':
      return 4.0;
  }
}

export function clampItemStats(stats: ItemStats): ItemStats {
  const tier = stats.attackSpeedTier ?? 'normal';
  return {
    ...stats,
    attackDamage: clampAttackDamage(stats.attackDamage),
    attackSpeedTier: tier,
    attackSpeed: attackSpeedForTier(tier),
    durability: clampDurability(stats.durability),
    unbreakable: Boolean(stats.unbreakable),
    movementSpeed: clampMovementSpeed(stats.movementSpeed),
    hungerRestored: clampHungerRestored(stats.hungerRestored),
    eatStatusEffect: stats.eatStatusEffect ?? 'regeneration',
  };
}

export function isInsideVoxelBounds(x: number, y: number, z: number): boolean {
  return (
    x >= 0 &&
    x < VOXEL_GRID_SIZE &&
    y >= 0 &&
    y < VOXEL_GRID_SIZE &&
    z >= 0 &&
    z < VOXEL_GRID_SIZE
  );
}

export function voxelKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function getSymmetricVoxelTargets(
  x: number,
  y: number,
  z: number,
  mirrorX: boolean
): Array<{ x: number; y: number; z: number }> {
  const list = [{ x, y, z }];
  const mx = VOXEL_GRID_SIZE - 1 - x;
  if (mirrorX && mx !== x) {
    list.push({ x: mx, y, z });
  }
  return list;
}

export function placeVoxelInList(
  voxels: readonly Voxel[],
  x: number,
  y: number,
  z: number,
  color: HexColor,
  mirrorX: boolean
): { nextVoxels: Voxel[]; changed: boolean } {
  if (!isInsideVoxelBounds(x, y, z)) {
    return { nextVoxels: voxels as Voxel[], changed: false };
  }
  const normalized = normalizeHex(color);
  const targets = getSymmetricVoxelTargets(x, y, z, mirrorX);

  const map = new Map<string, Voxel>();
  for (const v of voxels) {
    map.set(voxelKey(v.x, v.y, v.z), v);
  }

  let changed = false;
  for (const t of targets) {
    if (!isInsideVoxelBounds(t.x, t.y, t.z)) continue;
    const key = voxelKey(t.x, t.y, t.z);
    const existing = map.get(key);
    if (!existing || existing.color !== normalized) {
      map.set(key, { x: t.x, y: t.y, z: t.z, color: normalized });
      changed = true;
    }
  }

  return {
    nextVoxels: changed ? Array.from(map.values()) : (voxels as Voxel[]),
    changed,
  };
}

export function removeVoxelFromList(
  voxels: readonly Voxel[],
  x: number,
  y: number,
  z: number,
  mirrorX: boolean
): { nextVoxels: Voxel[]; changed: boolean } {
  const targets = getSymmetricVoxelTargets(x, y, z, mirrorX);
  const removeKeys = new Set(targets.map((t) => voxelKey(t.x, t.y, t.z)));

  const next = voxels.filter((v) => !removeKeys.has(voxelKey(v.x, v.y, v.z)));
  if (next.length === voxels.length) {
    return { nextVoxels: voxels as Voxel[], changed: false };
  }
  return { nextVoxels: next, changed: true };
}

export function floodPaintVoxels(
  voxels: readonly Voxel[],
  startX: number,
  startY: number,
  startZ: number,
  fillColor: HexColor,
  mirrorX: boolean
): { nextVoxels: Voxel[]; changed: boolean } {
  const normalized = normalizeHex(fillColor);
  const map = new Map<string, Voxel>();
  for (const v of voxels) {
    map.set(voxelKey(v.x, v.y, v.z), { ...v });
  }

  const seeds = getSymmetricVoxelTargets(startX, startY, startZ, mirrorX);
  let changed = false;

  for (const seed of seeds) {
    const startVoxel = map.get(voxelKey(seed.x, seed.y, seed.z));
    if (!startVoxel || startVoxel.color === normalized) continue;

    const targetColor = startVoxel.color;
    const queue: Array<[number, number, number]> = [[seed.x, seed.y, seed.z]];
    startVoxel.color = normalized;
    changed = true;

    let head = 0;
    while (head < queue.length) {
      const [cx, cy, cz] = queue[head]!;
      head++;
      const neighbors: Array<[number, number, number]> = [
        [cx + 1, cy, cz],
        [cx - 1, cy, cz],
        [cx, cy + 1, cz],
        [cx, cy - 1, cz],
        [cx, cy, cz + 1],
        [cx, cy, cz - 1],
      ];
      for (const [nx, ny, nz] of neighbors) {
        const nv = map.get(voxelKey(nx, ny, nz));
        if (nv && nv.color === targetColor) {
          nv.color = normalized;
          queue.push([nx, ny, nz]);
        }
      }
    }
  }

  return {
    nextVoxels: changed ? Array.from(map.values()) : (voxels as Voxel[]),
    changed,
  };
}

/**
 * Converts a 2D pixel canvas (16x16 or 32x32) into a centered z=7 slice
 * on the 16x16x16 3D Voxel Forge build plate.
 */
export function extrudedPixelsToCenteredVoxels(
  pixels: readonly (HexColor | null)[],
  gridSize: GridSize
): Voxel[] {
  const px16 = gridSize === 16 ? pixels : resizePixelGrid(pixels, gridSize, 16);
  const out: Voxel[] = [];
  const centerZ = 7;

  for (let gy = 0; gy < 16; gy++) {
    for (let gx = 0; gx < 16; gx++) {
      const color = px16[gy * 16 + gx] ?? null;
      if (color !== null) {
        out.push({
          x: gx,
          y: 15 - gy,
          z: centerZ,
          color: normalizeHex(color),
        });
      }
    }
  }
  return out;
}
