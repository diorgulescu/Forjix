// SPDX-License-Identifier: GPL-3.0-or-later

import * as THREE from 'three';
import { type HexColor, type Voxel, VOXEL_GRID_SIZE } from '../types/project';
import { voxelKey } from '../utils/voxelOps';

export interface QuadHitMetadata {
  vx: number;
  vy: number;
  vz: number;
  nx: number;
  ny: number;
  nz: number;
  color: HexColor;
}

export interface BuiltVoxelGeometry {
  geometry: THREE.BufferGeometry;
  quadMeta: QuadHitMetadata[];
  visibleCount: number;
}

/**
 * Builds an internal-face-culled 3D voxel mesh from a 16x16x16 Voxel array,
 * filtered up to `maxLayerY` (0..15) for layer slicing, and returns a per-quad
 * metadata table for O(1) raycast voxel picking & placement.
 */
export function buildSculptedVoxelGeometry(
  voxels: readonly Voxel[],
  maxLayerY: number = VOXEL_GRID_SIZE - 1
): BuiltVoxelGeometry {
  const visibleMap = new Map<string, Voxel>();
  for (const v of voxels) {
    if (
      v.x >= 0 &&
      v.x < VOXEL_GRID_SIZE &&
      v.y >= 0 &&
      v.y <= maxLayerY &&
      v.y < VOXEL_GRID_SIZE &&
      v.z >= 0 &&
      v.z < VOXEL_GRID_SIZE
    ) {
      visibleMap.set(voxelKey(v.x, v.y, v.z), v);
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const quadMeta: QuadHitMetadata[] = [];

  const step = 1 / VOXEL_GRID_SIZE;
  const tempColor = new THREE.Color();
  let vertexCount = 0;

  const hasVisibleNeighbor = (x: number, y: number, z: number): boolean =>
    visibleMap.has(voxelKey(x, y, z));

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
    b: number,
    meta: QuadHitMetadata
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
    quadMeta.push(meta);
  };

  for (const v of visibleMap.values()) {
    tempColor.setStyle(v.color, THREE.SRGBColorSpace);
    const r = tempColor.r;
    const g = tempColor.g;
    const b = tempColor.b;

    const x0 = v.x * step - 0.5;
    const x1 = x0 + step;
    const y0 = v.y * step - 0.5;
    const y1 = y0 + step;
    const z0 = v.z * step - 0.5;
    const z1 = z0 + step;

    // +Z Front
    if (!hasVisibleNeighbor(v.x, v.y, v.z + 1)) {
      pushQuad(
        x0, y0, z1,
        x1, y0, z1,
        x1, y1, z1,
        x0, y1, z1,
        0, 0, 1,
        r, g, b,
        { vx: v.x, vy: v.y, vz: v.z, nx: 0, ny: 0, nz: 1, color: v.color }
      );
    }

    // -Z Back
    if (!hasVisibleNeighbor(v.x, v.y, v.z - 1)) {
      pushQuad(
        x1, y0, z0,
        x0, y0, z0,
        x0, y1, z0,
        x1, y1, z0,
        0, 0, -1,
        r * 0.92, g * 0.92, b * 0.92,
        { vx: v.x, vy: v.y, vz: v.z, nx: 0, ny: 0, nz: -1, color: v.color }
      );
    }

    // +X Right
    if (!hasVisibleNeighbor(v.x + 1, v.y, v.z)) {
      pushQuad(
        x1, y0, z1,
        x1, y0, z0,
        x1, y1, z0,
        x1, y1, z1,
        1, 0, 0,
        r * 0.86, g * 0.86, b * 0.86,
        { vx: v.x, vy: v.y, vz: v.z, nx: 1, ny: 0, nz: 0, color: v.color }
      );
    }

    // -X Left
    if (!hasVisibleNeighbor(v.x - 1, v.y, v.z)) {
      pushQuad(
        x0, y0, z0,
        x0, y0, z1,
        x0, y1, z1,
        x0, y1, z0,
        -1, 0, 0,
        r * 0.86, g * 0.86, b * 0.86,
        { vx: v.x, vy: v.y, vz: v.z, nx: -1, ny: 0, nz: 0, color: v.color }
      );
    }

    // +Y Top
    if (!hasVisibleNeighbor(v.x, v.y + 1, v.z)) {
      pushQuad(
        x0, y1, z1,
        x1, y1, z1,
        x1, y1, z0,
        x0, y1, z0,
        0, 1, 0,
        Math.min(1, r * 1.05), Math.min(1, g * 1.05), Math.min(1, b * 1.05),
        { vx: v.x, vy: v.y, vz: v.z, nx: 0, ny: 1, nz: 0, color: v.color }
      );
    }

    // -Y Bottom
    if (!hasVisibleNeighbor(v.x, v.y - 1, v.z)) {
      pushQuad(
        x0, y0, z0,
        x1, y0, z0,
        x1, y0, z1,
        x0, y0, z1,
        0, -1, 0,
        r * 0.74, g * 0.74, b * 0.74,
        { vx: v.x, vy: v.y, vz: v.z, nx: 0, ny: -1, nz: 0, color: v.color }
      );
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

  return {
    geometry,
    quadMeta,
    visibleCount: visibleMap.size,
  };
}
