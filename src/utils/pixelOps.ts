// SPDX-License-Identifier: GPL-3.0-or-later

import type {
  GridSize,
  HexColor,
  MirrorAxisState,
  Voxel,
} from '../types/project';

export interface GridPoint {
  x: number;
  y: number;
}

export function normalizeHex(color: string): HexColor {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1]!;
    const g = trimmed[2]!;
    const b = trimmed[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return '#FFAA00';
}

export function slugifyItemName(name: string): string {
  const diacriticMap: Record<string, string> = {
    ă: 'a',
    Ă: 'a',
    â: 'a',
    Â: 'a',
    î: 'i',
    Î: 'i',
    ș: 's',
    Ș: 's',
    ş: 's',
    Ş: 's',
    ț: 't',
    Ț: 't',
    ţ: 't',
    Ţ: 't',
  };

  let out = '';
  let prevUnderscore = false;

  for (const ch of name) {
    const mapped =
      diacriticMap[ch] ??
      (/^[a-zA-Z0-9]$/.test(ch) ? ch.toLowerCase() : undefined);

    if (mapped !== undefined) {
      out += mapped;
      prevUnderscore = false;
    } else if (out.length > 0 && !prevUnderscore) {
      out += '_';
      prevUnderscore = true;
    }
  }

  out = out.replace(/_+$/, '');
  return out.length > 0 ? out : 'custom_item';
}

export function createEmptyPixels(gridSize: GridSize): (HexColor | null)[] {
  return new Array<HexColor | null>(gridSize * gridSize).fill(null);
}

export function pixelsEqual(
  a: readonly (HexColor | null)[],
  b: readonly (HexColor | null)[]
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function getMirroredPoints(
  x: number,
  y: number,
  gridSize: GridSize,
  mirror: MirrorAxisState
): GridPoint[] {
  const points: GridPoint[] = [{ x, y }];
  const mx = gridSize - 1 - x;
  const my = gridSize - 1 - y;

  if (mirror.x && mx !== x) {
    points.push({ x: mx, y });
  }
  if (mirror.y && my !== y) {
    points.push({ x, y: my });
  }
  if (mirror.x && mirror.y && mx !== x && my !== y) {
    points.push({ x: mx, y: my });
  }

  return points;
}

export function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): GridPoint[] {
  const points: GridPoint[] = [];
  let cx = x0;
  let cy = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }

  return points;
}

export function paintStrokeSegment(
  pixels: readonly (HexColor | null)[],
  gridSize: GridSize,
  from: GridPoint,
  to: GridPoint,
  value: HexColor | null,
  mirror: MirrorAxisState
): { nextPixels: (HexColor | null)[]; changed: boolean } {
  const normalizedValue = value !== null ? normalizeHex(value) : null;
  const line = bresenhamLine(from.x, from.y, to.x, to.y);
  let next: (HexColor | null)[] | null = null;

  for (const pt of line) {
    if (pt.x < 0 || pt.x >= gridSize || pt.y < 0 || pt.y >= gridSize) {
      continue;
    }
    const targets = getMirroredPoints(pt.x, pt.y, gridSize, mirror);
    for (const t of targets) {
      const idx = t.y * gridSize + t.x;
      if (pixels[idx] !== normalizedValue && (next === null || next[idx] !== normalizedValue)) {
        if (next === null) {
          next = pixels.slice();
        }
        next[idx] = normalizedValue;
      }
    }
  }

  if (next === null) {
    return { nextPixels: pixels as (HexColor | null)[], changed: false };
  }
  return { nextPixels: next, changed: true };
}

function floodFillSingle(
  working: (HexColor | null)[],
  gridSize: GridSize,
  startX: number,
  startY: number,
  replacement: HexColor | null
): boolean {
  if (startX < 0 || startX >= gridSize || startY < 0 || startY >= gridSize) {
    return false;
  }
  const startIdx = startY * gridSize + startX;
  const target = working[startIdx] ?? null;
  if (target === replacement) {
    return false;
  }

  const queueX: number[] = [startX];
  const queueY: number[] = [startY];
  working[startIdx] = replacement;
  let head = 0;

  while (head < queueX.length) {
    const cx = queueX[head]!;
    const cy = queueY[head]!;
    head++;

    const neighbors: [number, number][] = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
      const nIdx = ny * gridSize + nx;
      if ((working[nIdx] ?? null) === target) {
        working[nIdx] = replacement;
        queueX.push(nx);
        queueY.push(ny);
      }
    }
  }

  return true;
}

export function floodFill(
  pixels: readonly (HexColor | null)[],
  gridSize: GridSize,
  startX: number,
  startY: number,
  fillColor: HexColor,
  mirror: MirrorAxisState
): { nextPixels: (HexColor | null)[]; changed: boolean } {
  const normalized = normalizeHex(fillColor);
  const working = pixels.slice();
  const seeds = getMirroredPoints(startX, startY, gridSize, mirror);
  let changed = false;

  for (const seed of seeds) {
    if (floodFillSingle(working, gridSize, seed.x, seed.y, normalized)) {
      changed = true;
    }
  }

  return {
    nextPixels: changed ? working : (pixels as (HexColor | null)[]),
    changed,
  };
}

export function resizePixelGrid(
  pixels: readonly (HexColor | null)[],
  fromSize: GridSize,
  toSize: GridSize
): (HexColor | null)[] {
  if (fromSize === toSize) {
    return pixels.slice();
  }

  const out = createEmptyPixels(toSize);

  if (fromSize === 16 && toSize === 32) {
    // Crisp 2x2 pixel-art nearest-neighbor upscale
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const color = pixels[y * 16 + x] ?? null;
        if (color !== null) {
          const bx = x * 2;
          const by = y * 2;
          out[by * 32 + bx] = color;
          out[by * 32 + (bx + 1)] = color;
          out[(by + 1) * 32 + bx] = color;
          out[(by + 1) * 32 + (bx + 1)] = color;
        }
      }
    }
    return out;
  }

  // Downscale 32 -> 16 preserving thin strokes by picking dominant opaque color per 2x2 block
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const bx = x * 2;
      const by = y * 2;
      const candidates = [
        pixels[by * 32 + bx] ?? null,
        pixels[by * 32 + (bx + 1)] ?? null,
        pixels[(by + 1) * 32 + bx] ?? null,
        pixels[(by + 1) * 32 + (bx + 1)] ?? null,
      ];

      let chosen: HexColor | null = null;
      let bestCount = 0;
      for (const c of candidates) {
        if (c === null) continue;
        let count = 0;
        for (const other of candidates) {
          if (other === c) count++;
        }
        if (count > bestCount) {
          bestCount = count;
          chosen = c;
        }
      }
      out[y * 16 + x] = chosen;
    }
  }

  return out;
}

export function pixelsToExtrudedVoxels(
  pixels: readonly (HexColor | null)[],
  gridSize: GridSize
): Voxel[] {
  const voxels: Voxel[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const color = pixels[y * gridSize + x] ?? null;
      if (color !== null) {
        voxels.push({
          x,
          y: gridSize - 1 - y,
          z: 0,
          color,
        });
      }
    }
  }
  return voxels;
}
