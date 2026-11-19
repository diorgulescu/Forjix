// SPDX-License-Identifier: GPL-3.0-or-later

import * as THREE from 'three';
import type { GridSize, HexColor } from '../types/project';

/**
 * Builds a crisp, manifold, internal-face-culled 1-voxel-thick BufferGeometry
 * from a 2D pixel grid (16x16 or 32x32), matching Minecraft's held-item extrusion.
 */
export function buildExtrudedItemGeometry(
  pixels: readonly (HexColor | null)[],
  gridSize: GridSize
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const step = 1 / gridSize;
  const halfDepth = step * 0.5;
  const z0 = -halfDepth;
  const z1 = halfDepth;

  const tempColor = new THREE.Color();
  let vertexCount = 0;

  const pushQuad = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    dx: number,
    dy: number,
    dz: number,
    nx: number,
    ny: number,
    nz: number,
    r: number,
    g: number,
    b: number
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
    colors.push(r, g, b, r, g, b, r, g, b, r, g, b);
    indices.push(
      vertexCount,
      vertexCount + 1,
      vertexCount + 2,
      vertexCount,
      vertexCount + 2,
      vertexCount + 3
    );
    vertexCount += 4;
  };

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return false;
    return (pixels[y * gridSize + x] ?? null) !== null;
  };

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const hex = pixels[gy * gridSize + gx] ?? null;
      if (hex === null) continue;

      tempColor.setStyle(hex, THREE.SRGBColorSpace);
      const r = tempColor.r;
      const g = tempColor.g;
      const b = tempColor.b;

      const x0 = gx * step - 0.5;
      const x1 = x0 + step;
      const y1 = 0.5 - gy * step;
      const y0 = y1 - step;

      // Front face (+Z)
      pushQuad(
        x0, y0, z1,
        x1, y0, z1,
        x1, y1, z1,
        x0, y1, z1,
        0, 0, 1,
        r, g, b
      );

      // Back face (-Z)
      pushQuad(
        x1, y0, z0,
        x0, y0, z0,
        x0, y1, z0,
        x1, y1, z0,
        0, 0, -1,
        r * 0.94, g * 0.94, b * 0.94
      );

      // Right face (+X) — only if neighbor is transparent
      if (!isOpaque(gx + 1, gy)) {
        pushQuad(
          x1, y0, z1,
          x1, y0, z0,
          x1, y1, z0,
          x1, y1, z1,
          1, 0, 0,
          r * 0.86, g * 0.86, b * 0.86
        );
      }

      // Left face (-X)
      if (!isOpaque(gx - 1, gy)) {
        pushQuad(
          x0, y0, z0,
          x0, y0, z1,
          x0, y1, z1,
          x0, y1, z0,
          -1, 0, 0,
          r * 0.86, g * 0.86, b * 0.86
        );
      }

      // Top face (+Y)
      if (!isOpaque(gx, gy - 1)) {
        pushQuad(
          x0, y1, z1,
          x1, y1, z1,
          x1, y1, z0,
          x0, y1, z0,
          0, 1, 0,
          Math.min(1, r * 1.04), Math.min(1, g * 1.04), Math.min(1, b * 1.04)
        );
      }

      // Bottom face (-Y)
      if (!isOpaque(gx, gy + 1)) {
        pushQuad(
          x0, y0, z0,
          x1, y0, z0,
          x1, y0, z1,
          x0, y0, z1,
          0, -1, 0,
          r * 0.74, g * 0.74, b * 0.74
        );
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}
