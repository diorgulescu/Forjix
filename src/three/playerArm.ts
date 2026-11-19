// SPDX-License-Identifier: GPL-3.0-or-later

import * as THREE from 'three';
import type { ArmStyle, ItemCategory } from '../types/project';

function createPixelTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    draw(ctx, width, height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates a blocky Minecraft-proportioned Right Arm (Steve 4x12x4 or Alex 3x12x4)
 * using crisp procedural pixel-art canvas textures (100% offline).
 */
export function buildBlockyRightArm(style: ArmStyle): {
  group: THREE.Group;
  dispose: () => void;
} {
  const pxWidth = style === 'steve' ? 4 : 3;
  const pxHeight = 12;
  const pxDepth = 4;

  const unit = 1 / 16;
  const w = pxWidth * unit;
  const h = pxHeight * unit;
  const d = pxDepth * unit;

  const palette =
    style === 'steve'
      ? {
          sleeveMain: '#00A8B5',
          sleeveLight: '#22C7D6',
          sleeveDark: '#007C87',
          skinMain: '#B98562',
          skinLight: '#CA9673',
          skinDark: '#9B6948',
          knuckle: '#855538',
        }
      : {
          sleeveMain: '#54963F',
          sleeveLight: '#6EB556',
          sleeveDark: '#3D732C',
          skinMain: '#E6B292',
          skinLight: '#F2C3A5',
          skinDark: '#CC9676',
          knuckle: '#B57D5E',
        };

  const sideTex = createPixelTexture(pxWidth, pxHeight, (ctx, cw, ch) => {
    // Sleeve top 4 rows
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < cw; x++) {
        ctx.fillStyle =
          y === 0
            ? palette.sleeveLight
            : y === 3
              ? palette.sleeveDark
              : x === 0
                ? palette.sleeveLight
                : palette.sleeveMain;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Forearm + hand rows 4..11
    for (let y = 4; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const isCuffShadow = y === 4;
        const isFist = y === ch - 1;
        ctx.fillStyle = isFist
          ? x % 2 === 0
            ? palette.knuckle
            : palette.skinDark
          : isCuffShadow
            ? palette.skinDark
            : (x + y) % 3 === 0
              ? palette.skinLight
              : palette.skinMain;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const depthSideTex = createPixelTexture(pxDepth, pxHeight, (ctx, cw, ch) => {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < cw; x++) {
        ctx.fillStyle =
          y === 3
            ? palette.sleeveDark
            : x === cw - 1
              ? palette.sleeveDark
              : palette.sleeveMain;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    for (let y = 4; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        ctx.fillStyle =
          y === ch - 1
            ? palette.knuckle
            : x === cw - 1
              ? palette.skinDark
              : (x + y) % 4 === 0
                ? palette.skinLight
                : palette.skinMain;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const shoulderTex = createPixelTexture(pxWidth, pxDepth, (ctx, cw, ch) => {
    ctx.fillStyle = palette.sleeveMain;
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = palette.sleeveLight;
    ctx.fillRect(0, 0, cw, 1);
  });

  const fistEndTex = createPixelTexture(pxWidth, pxDepth, (ctx, cw, ch) => {
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        ctx.fillStyle =
          y === 0 || y === ch - 1 ? palette.knuckle : palette.skinDark;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  const textures = [sideTex, depthSideTex, shoulderTex, fistEndTex];

  // BoxGeometry material order: +X, -X, +Y (shoulder), -Y (fist), +Z, -Z
  const materials = [
    new THREE.MeshStandardMaterial({ map: depthSideTex, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ map: depthSideTex, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ map: shoulderTex, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ map: fistEndTex, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.75 }),
  ];

  const armGeo = new THREE.BoxGeometry(w, h, d);
  const armMesh = new THREE.Mesh(armGeo, materials);

  // Subtle 3D outer sleeve cuff layer around upper 4 pixels
  const cuffHeight = 4.1 * unit;
  const cuffGeo = new THREE.BoxGeometry(w * 1.08, cuffHeight, d * 1.08);
  const cuffMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setStyle(palette.sleeveMain, THREE.SRGBColorSpace),
    roughness: 0.7,
  });
  const cuffMesh = new THREE.Mesh(cuffGeo, cuffMat);
  cuffMesh.position.y = h * 0.5 - cuffHeight * 0.5 + 0.002;

  const armBoxGroup = new THREE.Group();
  armBoxGroup.add(armMesh);
  armBoxGroup.add(cuffMesh);

  // Pose right arm extending forward from shoulder (-Z, +Y) to fist (0, -0.12, 0.02)
  armBoxGroup.position.set(0.0, -0.05, -0.24);
  armBoxGroup.rotation.set((-73 * Math.PI) / 180, 0, (-4 * Math.PI) / 180);

  const root = new THREE.Group();
  root.add(armBoxGroup);

  const dispose = () => {
    armGeo.dispose();
    cuffGeo.dispose();
    cuffMat.dispose();
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
  };

  return { group: root, dispose };
}

export interface GripTransform {
  pivotPosition: [number, number, number];
  pivotRotationYxz: [number, number, number];
  pivotScale: number;
  meshLocalOffset: [number, number, number];
}

/**
 * Computes the authentic Minecraft right-hand grip transform for the forged item
 * depending on whether Held-in-Hand mode is enabled and the item's category.
 */
export function computeItemGripTransform(
  heldInHand: boolean,
  category: ItemCategory
): GripTransform {
  if (!heldInHand) {
    return {
      pivotPosition: [0, 0, 0],
      pivotRotationYxz: [0, 0, 0],
      pivotScale: 1.0,
      meshLocalOffset: [0, 0, 0],
    };
  }

  if (category === 'armor') {
    // Shield strapped alongside the right forearm facing forward
    return {
      pivotPosition: [-0.15, -0.04, 0.06],
      pivotRotationYxz: [-0.18, -0.32, 0.04],
      pivotScale: 0.85,
      meshLocalOffset: [0, 0, 0],
    };
  }

  if (category === 'consumable') {
    // Food / Golden Apple held atop the palm/fist
    return {
      pivotPosition: [0.0, 0.06, 0.09],
      pivotRotationYxz: [-0.14, 0.22, 0.0],
      pivotScale: 0.58,
      meshLocalOffset: [0, 0, 0],
    };
  }

  // Classic Minecraft `item/handheld` grip:
  // Hilt sits inside the closed fist; blade/head extends upward and forward at ~67°
  return {
    pivotPosition: [0.0, -0.11, 0.03],
    pivotRotationYxz: [0, -Math.PI / 2, (22 * Math.PI) / 180],
    pivotScale: 0.85,
    meshLocalOffset: [0.3, 0.26, 0],
  };
}
