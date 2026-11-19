// SPDX-License-Identifier: GPL-3.0-or-later

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Translations } from '../i18n/translations';
import { buildExtrudedItemGeometry } from '../three/extrudeMesh';
import {
  buildBlockyRightArm,
  computeItemGripTransform,
} from '../three/playerArm';
import type {
  ArmStyle,
  GridSize,
  HexColor,
  ItemCategory,
} from '../types/project';
import { HandBlockIcon, ResetCameraIcon } from './Icons';

interface Viewport3DPaneProps {
  t: Translations;
  gridSize: GridSize;
  pixels: readonly (HexColor | null)[];
  voxelCount: number;
  category: ItemCategory;
  isPainting: boolean;
}

const DEFAULT_CAMERA_STANDALONE: [number, number, number] = [0.48, 0.22, 1.92];
const DEFAULT_CAMERA_HELD: [number, number, number] = [1.42, 0.64, 1.72];

export const Viewport3DPane: React.FC<Viewport3DPaneProps> = ({
  t,
  gridSize,
  pixels,
  voxelCount,
  category,
  isPainting,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [heldInHand, setHeldInHand] = useState(false);
  const [armStyle, setArmStyle] = useState<ArmStyle>('steve');

  const sceneRefs = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    itemPivot: THREE.Group;
    itemMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    armContainer: THREE.Group;
    disposeArm: (() => void) | null;
  } | null>(null);

  const isPaintingRef = useRef(isPainting);
  isPaintingRef.current = isPainting;

  // Initialize Three.js Scene, Studio Lighting, and OrbitControls once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 300);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#131724');

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 50);
    camera.position.set(...DEFAULT_CAMERA_STANDALONE);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    const domCanvas = renderer.domElement;
    domCanvas.className = 'three-viewport-canvas';
    const preventContext = (ev: MouseEvent) => ev.preventDefault();
    domCanvas.addEventListener('contextmenu', preventContext);
    container.appendChild(domCanvas);

    // Ambient + Studio Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xf0f6ff, 0x2d243b, 0.55);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(2.4, 3.4, 2.8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x9bd2ff, 0.65);
    rimLight.position.set(-2.4, 1.5, -2.5);
    scene.add(rimLight);

    const warmFill = new THREE.DirectionalLight(0xffcb8c, 0.35);
    warmFill.position.set(1.2, -2.0, 1.4);
    scene.add(warmFill);

    // Subtle Forge Floor Reference Ring & Grid
    const polarGrid = new THREE.PolarGridHelper(
      0.95,
      12,
      4,
      48,
      0x2f3b59,
      0x20283d
    );
    polarGrid.position.y = -0.68;
    scene.add(polarGrid);

    // Arm container + Extruded Item Pivot & Mesh
    const armContainer = new THREE.Group();
    armContainer.visible = false;
    scene.add(armContainer);

    const itemMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.52,
      metalness: 0.08,
    });
    const initialGeometry = new THREE.BufferGeometry();
    const itemMesh = new THREE.Mesh(initialGeometry, itemMaterial);

    const itemPivot = new THREE.Group();
    itemPivot.add(itemMesh);
    scene.add(itemPivot);

    // Smooth OrbitControls: BOTH background left-drag and right-click drag rotate
    const controls = new OrbitControls(camera, domCanvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.085;
    controls.enablePan = false;
    controls.minDistance = 0.85;
    controls.maxDistance = 4.2;
    controls.target.set(0, 0, 0);
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.enabled = !isPaintingRef.current;

    sceneRefs.current = {
      renderer,
      camera,
      controls,
      itemPivot,
      itemMesh,
      armContainer,
      disposeArm: null,
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(Math.floor(entry.contentRect.width), 100);
      const h = Math.max(Math.floor(entry.contentRect.height), 100);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      if (controls.enabled) {
        controls.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      domCanvas.removeEventListener('contextmenu', preventContext);
      controls.dispose();

      if (sceneRefs.current?.disposeArm) {
        sceneRefs.current.disposeArm();
      }
      itemMesh.geometry.dispose();
      itemMaterial.dispose();
      polarGrid.geometry.dispose();
      if (Array.isArray(polarGrid.material)) {
        polarGrid.material.forEach((m) => m.dispose());
      } else {
        polarGrid.material.dispose();
      }
      renderer.dispose();
      if (domCanvas.parentNode === container) {
        container.removeChild(domCanvas);
      }
      sceneRefs.current = null;
    };
  }, []);

  // Auto-freeze camera orbit while actively painting on the 2D canvas
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.controls.enabled = !isPainting;
  }, [isPainting]);

  // Rebuild 1-voxel-thick extruded mesh in real time whenever pixels or gridSize change
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    const nextGeo = buildExtrudedItemGeometry(pixels, gridSize);
    const oldGeo = refs.itemMesh.geometry;
    refs.itemMesh.geometry = nextGeo;
    oldGeo.dispose();
  }, [pixels, gridSize]);

  // Rebuild Steve / Alex blocky right arm when armStyle changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    if (refs.disposeArm) {
      refs.disposeArm();
      refs.disposeArm = null;
    }
    refs.armContainer.clear();

    const { group, dispose } = buildBlockyRightArm(armStyle);
    refs.armContainer.add(group);
    refs.disposeArm = dispose;
  }, [armStyle]);

  // Update Held-in-Hand visibility & Minecraft grip angle
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    refs.armContainer.visible = heldInHand;
    const grip = computeItemGripTransform(heldInHand, category);

    refs.itemPivot.position.set(...grip.pivotPosition);
    refs.itemPivot.rotation.set(
      grip.pivotRotationYxz[0],
      grip.pivotRotationYxz[1],
      grip.pivotRotationYxz[2],
      'YXZ'
    );
    refs.itemPivot.scale.setScalar(grip.pivotScale);
    refs.itemMesh.position.set(...grip.meshLocalOffset);
  }, [heldInHand, category]);

  const handleResetCamera = useCallback(
    (nextHeldState?: boolean) => {
      const refs = sceneRefs.current;
      if (!refs) return;
      const isHeld = nextHeldState ?? heldInHand;
      const targetPos = isHeld
        ? DEFAULT_CAMERA_HELD
        : DEFAULT_CAMERA_STANDALONE;
      refs.camera.position.set(...targetPos);
      refs.controls.target.set(0, isHeld ? 0.18 : 0, 0);
      refs.controls.update();
    },
    [heldInHand]
  );

  const handleToggleHeldInHand = () => {
    const next = !heldInHand;
    setHeldInHand(next);
    handleResetCamera(next);
  };

  return (
    <section className="pane viewport-pane" aria-label={t.viewport3d.paneTitle}>
      <div className="pane-header">
        <div className="pane-title-group">
          <h2 className="pane-title">{t.viewport3d.paneTitle}</h2>
          <span className="voxel-count-badge" data-testid="voxel-count-badge">
            {voxelCount} {t.viewport3d.voxelsCount}
          </span>
        </div>

        <div className="pane-controls">
          <button
            type="button"
            className={`held-toggle-btn ${heldInHand ? 'active' : ''}`}
            onClick={handleToggleHeldInHand}
            aria-pressed={heldInHand}
            data-testid="held-in-hand-toggle"
          >
            <HandBlockIcon size={17} />
            <span>{t.viewport3d.heldInHand}</span>
          </button>

          {heldInHand && (
            <div
              className="arm-style-switch"
              role="group"
              aria-label={t.viewport3d.armStyleLabel}
            >
              {(['steve', 'alex'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`arm-pill ${armStyle === style ? 'active' : ''}`}
                  onClick={() => setArmStyle(style)}
                  data-testid={`arm-style-${style}`}
                >
                  {t.viewport3d.armStyles[style]}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="control-pill-btn"
            onClick={() => handleResetCamera()}
            title={t.viewport3d.resetCamera}
            data-testid="reset-camera-btn"
          >
            <ResetCameraIcon size={16} />
            <span>{t.viewport3d.resetCamera}</span>
          </button>
        </div>
      </div>

      <div className="viewport-stage-wrapper">
        <div
          ref={mountRef}
          className="three-mount-container"
          data-testid="three-viewport-mount"
        />

        {isPainting && (
          <div
            className="camera-frozen-overlay"
            data-testid="camera-frozen-badge"
          >
            {t.viewport3d.cameraFrozenBadge}
          </div>
        )}

        {voxelCount === 0 && !heldInHand && (
          <div className="empty-viewport-hint">
            <strong>{t.viewport3d.emptyCanvasTitle}</strong>
            <p>{t.viewport3d.emptyCanvasSubtitle}</p>
          </div>
        )}
      </div>

      <div className="pane-footer">
        <span className="hint-text">{t.viewport3d.orbitHint}</span>
      </div>
    </section>
  );
};
