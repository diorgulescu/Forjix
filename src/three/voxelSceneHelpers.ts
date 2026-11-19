// SPDX-License-Identifier: GPL-3.0-or-later

import * as THREE from 'three';
import { VOXEL_GRID_SIZE } from '../types/project';

/** Default camera positions for the Voxel Sculptor (build vs held-in-hand). */
export const DEFAULT_CAM_BUILD: [number, number, number] = [1.25, 1.05, 1.45];
export const DEFAULT_CAM_HELD: [number, number, number] = [1.45, 0.68, 1.75];

/**
 * Creates a crisp 16×16 checkerboard CanvasTexture for the build plate.
 */
export function createBuildPlateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let z = 0; z < 16; z++) {
      for (let x = 0; x < 16; x++) {
        ctx.fillStyle = (x + z) % 2 === 0 ? '#1B2236' : '#232C45';
        ctx.fillRect(x, z, 1, 1);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds the static scene scaffolding (build plate, grid, cage, symmetry line,
 * slice guide) as a single THREE.Group. Returns the group plus references to
 * the individual elements that need to be toggled at runtime.
 */
export interface VoxelSceneScaffold {
  group: THREE.Group;
  plateCollider: THREE.Mesh;
  symmetryLine: THREE.Line;
  sliceGuideMesh: THREE.LineLoop;
  dispose: () => void;
}

export function buildVoxelSceneScaffold(mirrorXVisible: boolean): VoxelSceneScaffold {
  const group = new THREE.Group();

  // Build plate
  const plateTex = createBuildPlateTexture();
  const plateGeo = new THREE.PlaneGeometry(1.0, 1.0);
  plateGeo.rotateX(-Math.PI / 2);
  const plateMat = new THREE.MeshBasicMaterial({
    map: plateTex,
    side: THREE.DoubleSide,
  });
  const plateCollider = new THREE.Mesh(plateGeo, plateMat);
  plateCollider.position.y = -0.5005;
  group.add(plateCollider);

  // Grid helper
  const gridHelper = new THREE.GridHelper(1.0, 16, 0x45588a, 0x2f3c61);
  gridHelper.position.y = -0.5;
  group.add(gridHelper);

  // Bounding cage
  const cageGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  const cageEdges = new THREE.EdgesGeometry(cageGeo);
  const cageLine = new THREE.LineSegments(
    cageEdges,
    new THREE.LineBasicMaterial({
      color: 0x2d3a5e,
      transparent: true,
      opacity: 0.45,
    })
  );
  group.add(cageLine);

  // X-symmetry line
  const symPoints = [
    new THREE.Vector3(0, -0.498, -0.52),
    new THREE.Vector3(0, -0.498, 0.52),
  ];
  const symGeo = new THREE.BufferGeometry().setFromPoints(symPoints);
  const symmetryLine = new THREE.Line(
    symGeo,
    new THREE.LineBasicMaterial({ color: 0x38f2ff })
  );
  symmetryLine.visible = mirrorXVisible;
  group.add(symmetryLine);

  // Slice guide
  const slicePts = [
    new THREE.Vector3(-0.505, 0, -0.505),
    new THREE.Vector3(0.505, 0, -0.505),
    new THREE.Vector3(0.505, 0, 0.505),
    new THREE.Vector3(-0.505, 0, 0.505),
  ];
  const sliceGeo = new THREE.BufferGeometry().setFromPoints(slicePts);
  const sliceGuideMesh = new THREE.LineLoop(
    sliceGeo,
    new THREE.LineBasicMaterial({ color: 0xffd43b })
  );
  sliceGuideMesh.visible = false;
  group.add(sliceGuideMesh);

  const dispose = () => {
    plateGeo.dispose();
    plateMat.dispose();
    plateTex.dispose();
    gridHelper.geometry.dispose();
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((m) => m.dispose());
    } else {
      gridHelper.material.dispose();
    }
    cageGeo.dispose();
    cageEdges.dispose();
    (cageLine.material as THREE.Material).dispose();
    symGeo.dispose();
    (symmetryLine.material as THREE.Material).dispose();
    sliceGeo.dispose();
    (sliceGuideMesh.material as THREE.Material).dispose();
  };

  return { group, plateCollider, symmetryLine, sliceGuideMesh, dispose };
}

/**
 * Creates the ghost wireframe preview cubes (primary + mirrored).
 */
export interface GhostPreview {
  group: THREE.Group;
  primary: THREE.LineSegments;
  mirror: THREE.LineSegments;
  primaryMat: THREE.LineBasicMaterial;
  mirrorMat: THREE.LineBasicMaterial;
  setPosition: (mesh: THREE.Object3D, coord: { x: number; y: number; z: number }) => void;
  dispose: () => void;
}

export function buildGhostPreview(): GhostPreview {
  const group = new THREE.Group();
  const step = 1 / VOXEL_GRID_SIZE;
  const unitCubeEdges = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(step * 1.03, step * 1.03, step * 1.03)
  );
  const primaryMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const mirrorMat = new THREE.LineBasicMaterial({ color: 0x38f2ff });
  const primary = new THREE.LineSegments(unitCubeEdges, primaryMat);
  const mirror = new THREE.LineSegments(unitCubeEdges, mirrorMat);
  primary.visible = false;
  mirror.visible = false;
  group.add(primary, mirror);

  const setPosition = (mesh: THREE.Object3D, coord: { x: number; y: number; z: number }) => {
    mesh.position.set(
      (coord.x + 0.5) * step - 0.5,
      (coord.y + 0.5) * step - 0.5,
      (coord.z + 0.5) * step - 0.5
    );
  };

  const dispose = () => {
    unitCubeEdges.dispose();
    primaryMat.dispose();
    mirrorMat.dispose();
  };

  return { group, primary, mirror, primaryMat, mirrorMat, setPosition, dispose };
}
