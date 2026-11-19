// SPDX-License-Identifier: GPL-3.0-or-later

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VOXEL_PRESETS } from '../data/voxelPresets';
import type { Translations } from '../i18n/translations';
import {
  buildBlockyRightArm,
  computeItemGripTransform,
} from '../three/playerArm';
import {
  buildGhostPreview,
  buildVoxelSceneScaffold,
  DEFAULT_CAM_BUILD,
  DEFAULT_CAM_HELD,
} from '../three/voxelSceneHelpers';
import {
  buildSculptedVoxelGeometry,
  type QuadHitMetadata,
} from '../three/voxelMesh';
import {
  type ArmStyle,
  type HexColor,
  type ItemCategory,
  type Language,
  type ToolId,
  type Voxel,
  VOXEL_GRID_SIZE,
  type VoxelPresetId,
} from '../types/project';
import {
  floodPaintVoxels,
  getSymmetricVoxelTargets,
  isInsideVoxelBounds,
  placeVoxelInList,
  removeVoxelFromList,
} from '../utils/voxelOps';
import { HandBlockIcon, MirrorXIcon, ResetCameraIcon } from './Icons';

interface VoxelSculptorPaneProps {
  t: Translations;
  lang: Language;
  voxels: readonly Voxel[];
  category: ItemCategory;
  activeTool: ToolId;
  activeColor: HexColor;
  mirrorX: boolean;
  onToggleMirrorX: () => void;
  onCommitVoxels: (nextVoxels: Voxel[]) => void;
  onSelectPreset: (presetId: VoxelPresetId, lang: Language) => void;
  onPickColor: (hex: HexColor) => void;
}

export const VoxelSculptorPane: React.FC<VoxelSculptorPaneProps> = ({
  t,
  lang,
  voxels,
  category,
  activeTool,
  activeColor,
  mirrorX,
  onToggleMirrorX,
  onCommitVoxels,
  onSelectPreset,
  onPickColor,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [sliceY, setSliceY] = useState<number>(VOXEL_GRID_SIZE - 1); // 0..15
  const [heldInHand, setHeldInHand] = useState(false);
  const [armStyle, setArmStyle] = useState<ArmStyle>('steve');
  const [selectedPreset, setSelectedPreset] = useState<VoxelPresetId | null>(
    null
  );

  const latestPropsRef = useRef({
    voxels,
    activeTool,
    activeColor,
    mirrorX,
    sliceY,
    heldInHand,
    onCommitVoxels,
    onPickColor,
  });
  latestPropsRef.current = {
    voxels,
    activeTool,
    activeColor,
    mirrorX,
    sliceY,
    heldInHand,
    onCommitVoxels,
    onPickColor,
  };

  const quadMetaRef = useRef<QuadHitMetadata[]>([]);

  const sceneRefs = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    voxelPivot: THREE.Group;
    voxelMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    buildPlateGroup: THREE.Group;
    plateCollider: THREE.Mesh;
    symmetryLine: THREE.Line;
    sliceGuideMesh: THREE.LineLoop;
    ghostGroup: THREE.Group;
    armContainer: THREE.Group;
    disposeArm: (() => void) | null;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111624');

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 50);
    camera.position.set(...DEFAULT_CAM_BUILD);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    const domCanvas = renderer.domElement;
    domCanvas.className = 'three-viewport-canvas voxel-sculpt-canvas';
    const preventContext = (ev: MouseEvent) => ev.preventDefault();
    domCanvas.addEventListener('contextmenu', preventContext);
    container.appendChild(domCanvas);

    // Studio Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.92));
    scene.add(new THREE.HemisphereLight(0xf0f6ff, 0x2a233b, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.28);
    keyLight.position.set(2.6, 3.8, 2.9);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x9bd2ff, 0.62);
    rimLight.position.set(-2.5, 1.8, -2.4);
    scene.add(rimLight);

    // 16x16 Build Plate scaffold (plate, grid, cage, symmetry line, slice guide)
    const scaffold = buildVoxelSceneScaffold(latestPropsRef.current.mirrorX);
    const buildPlateGroup = scaffold.group;
    const plateCollider = scaffold.plateCollider;
    const symmetryLine = scaffold.symmetryLine;
    const sliceGuideMesh = scaffold.sliceGuideMesh;
    scene.add(buildPlateGroup);

    // Sculpted Voxel Mesh inside Pivot
    const voxelMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.5,
      metalness: 0.08,
    });
    const voxelMesh = new THREE.Mesh(new THREE.BufferGeometry(), voxelMat);
    const voxelPivot = new THREE.Group();
    voxelPivot.add(voxelMesh);
    scene.add(voxelPivot);

    // Hover Ghost Wireframe Preview Cubes (primary + symmetric)
    const ghost = buildGhostPreview();
    const ghostGroup = ghost.group;
    const ghostPrimary = ghost.primary;
    const ghostMirror = ghost.mirror;
    const ghostMatPrimary = ghost.primaryMat;
    scene.add(ghostGroup);

    // Blocky Steve/Alex Arm Container for Held-in-Hand preview
    const armContainer = new THREE.Group();
    armContainer.visible = false;
    scene.add(armContainer);

    const controls = new OrbitControls(camera, domCanvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.enablePan = false;
    controls.minDistance = 0.9;
    controls.maxDistance = 4.2;
    controls.target.set(0, -0.08, 0);
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const computeHoverOrClickTarget = (
      clientX: number,
      clientY: number,
      isRemoveMode: boolean
    ): {
      voxelHit: QuadHitMetadata | null;
      placeCoord: { x: number; y: number; z: number } | null;
    } => {
      const rect = domCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return { voxelHit: null, placeCoord: null };
      }
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);

      const voxelHits = raycaster.intersectObject(voxelMesh, false);
      if (voxelHits.length > 0) {
        const hit = voxelHits[0]!;
        if (typeof hit.faceIndex === 'number') {
          const quadIdx = Math.floor(hit.faceIndex / 2);
          const meta = quadMetaRef.current[quadIdx] ?? null;
          if (meta) {
            if (isRemoveMode) {
              return {
                voxelHit: meta,
                placeCoord: { x: meta.vx, y: meta.vy, z: meta.vz },
              };
            }
            const tx = meta.vx + meta.nx;
            const ty = meta.vy + meta.ny;
            const tz = meta.vz + meta.nz;
            if (
              isInsideVoxelBounds(tx, ty, tz) &&
              ty <= latestPropsRef.current.sliceY
            ) {
              return { voxelHit: meta, placeCoord: { x: tx, y: ty, z: tz } };
            }
            return { voxelHit: meta, placeCoord: null };
          }
        }
      }

      if (!isRemoveMode) {
        const plateHits = raycaster.intersectObject(plateCollider, false);
        if (plateHits.length > 0) {
          const pt = plateHits[0]!.point;
          const gx = Math.floor((pt.x + 0.5) * VOXEL_GRID_SIZE);
          const gz = Math.floor((pt.z + 0.5) * VOXEL_GRID_SIZE);
          if (isInsideVoxelBounds(gx, 0, gz)) {
            return { voxelHit: null, placeCoord: { x: gx, y: 0, z: gz } };
          }
        }
      }

      return { voxelHit: null, placeCoord: null };
    };

    const setGhostPosition = ghost.setPosition;

    let downPos: { x: number; y: number; button: number } | null = null;
    let movedFar = false;

    const onPointerDown = (ev: PointerEvent) => {
      downPos = { x: ev.clientX, y: ev.clientY, button: ev.button };
      movedFar = false;
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (downPos) {
        const dx = ev.clientX - downPos.x;
        const dy = ev.clientY - downPos.y;
        if (dx * dx + dy * dy > 25) {
          movedFar = true;
          ghostPrimary.visible = false;
          ghostMirror.visible = false;
          return;
        }
      }

      const cur = latestPropsRef.current;
      if (cur.heldInHand) {
        ghostPrimary.visible = false;
        ghostMirror.visible = false;
        return;
      }

      const isRemovePreview = cur.activeTool === 'eraser';
      const { voxelHit, placeCoord } = computeHoverOrClickTarget(
        ev.clientX,
        ev.clientY,
        isRemovePreview
      );

      const target =
        cur.activeTool === 'eyedropper' || cur.activeTool === 'bucket'
          ? voxelHit
            ? { x: voxelHit.vx, y: voxelHit.vy, z: voxelHit.vz }
            : null
          : placeCoord;

      if (!target) {
        ghostPrimary.visible = false;
        ghostMirror.visible = false;
        return;
      }

      ghostMatPrimary.color.setStyle(
        isRemovePreview ? '#FF5266' : cur.activeColor,
        THREE.SRGBColorSpace
      );
      const sym = getSymmetricVoxelTargets(
        target.x,
        target.y,
        target.z,
        cur.mirrorX && cur.activeTool !== 'eyedropper'
      );
      setGhostPosition(ghostPrimary, sym[0]!);
      ghostPrimary.visible = true;

      if (sym.length > 1) {
        setGhostPosition(ghostMirror, sym[1]!);
        ghostMirror.visible = true;
      } else {
        ghostMirror.visible = false;
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      const start = downPos;
      downPos = null;
      if (!start || movedFar) return;

      const cur = latestPropsRef.current;
      if (cur.heldInHand) return;

      // Right-click (button 2): remove voxel
      if (start.button === 2) {
        const { voxelHit } = computeHoverOrClickTarget(
          ev.clientX,
          ev.clientY,
          true
        );
        if (voxelHit) {
          const res = removeVoxelFromList(
            cur.voxels,
            voxelHit.vx,
            voxelHit.vy,
            voxelHit.vz,
            cur.mirrorX
          );
          if (res.changed) {
            cur.onCommitVoxels(res.nextVoxels);
          }
        }
        return;
      }

      if (start.button !== 0) return;

      if (cur.activeTool === 'eraser') {
        const { voxelHit } = computeHoverOrClickTarget(
          ev.clientX,
          ev.clientY,
          true
        );
        if (voxelHit) {
          const res = removeVoxelFromList(
            cur.voxels,
            voxelHit.vx,
            voxelHit.vy,
            voxelHit.vz,
            cur.mirrorX
          );
          if (res.changed) {
            cur.onCommitVoxels(res.nextVoxels);
          }
        }
        return;
      }

      if (cur.activeTool === 'eyedropper') {
        const { voxelHit } = computeHoverOrClickTarget(
          ev.clientX,
          ev.clientY,
          true
        );
        if (voxelHit) {
          cur.onPickColor(voxelHit.color);
        }
        return;
      }

      if (cur.activeTool === 'bucket') {
        const { voxelHit } = computeHoverOrClickTarget(
          ev.clientX,
          ev.clientY,
          true
        );
        if (voxelHit) {
          const res = floodPaintVoxels(
            cur.voxels,
            voxelHit.vx,
            voxelHit.vy,
            voxelHit.vz,
            cur.activeColor,
            cur.mirrorX
          );
          if (res.changed) {
            cur.onCommitVoxels(res.nextVoxels);
          }
        }
        return;
      }

      // Default Pencil: place voxel on hit face or build plate
      const { placeCoord } = computeHoverOrClickTarget(
        ev.clientX,
        ev.clientY,
        false
      );
      if (placeCoord) {
        const res = placeVoxelInList(
          cur.voxels,
          placeCoord.x,
          placeCoord.y,
          placeCoord.z,
          cur.activeColor,
          cur.mirrorX
        );
        if (res.changed) {
          cur.onCommitVoxels(res.nextVoxels);
        }
      }
    };

    const onPointerLeave = () => {
      ghostPrimary.visible = false;
      ghostMirror.visible = false;
    };

    domCanvas.addEventListener('pointerdown', onPointerDown);
    domCanvas.addEventListener('pointermove', onPointerMove);
    domCanvas.addEventListener('pointerup', onPointerUp);
    domCanvas.addEventListener('pointerleave', onPointerLeave);

    sceneRefs.current = {
      renderer,
      camera,
      controls,
      voxelPivot,
      voxelMesh,
      buildPlateGroup,
      plateCollider,
      symmetryLine,
      sliceGuideMesh,
      ghostGroup,
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
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      domCanvas.removeEventListener('contextmenu', preventContext);
      domCanvas.removeEventListener('pointerdown', onPointerDown);
      domCanvas.removeEventListener('pointermove', onPointerMove);
      domCanvas.removeEventListener('pointerup', onPointerUp);
      domCanvas.removeEventListener('pointerleave', onPointerLeave);
      controls.dispose();

      if (sceneRefs.current?.disposeArm) {
        sceneRefs.current.disposeArm();
      }
      voxelMesh.geometry.dispose();
      voxelMat.dispose();
      scaffold.dispose();
      ghost.dispose();
      renderer.dispose();
      if (domCanvas.parentNode === container) {
        container.removeChild(domCanvas);
      }
      sceneRefs.current = null;
    };
  }, []);

  // Rebuild 16x16x16 sculpted geometry whenever voxels or Y-slice filter change
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    const effectiveMaxY = heldInHand ? VOXEL_GRID_SIZE - 1 : sliceY;
    const built = buildSculptedVoxelGeometry(voxels, effectiveMaxY);
    quadMetaRef.current = built.quadMeta;

    const prevGeo = refs.voxelMesh.geometry;
    refs.voxelMesh.geometry = built.geometry;
    prevGeo.dispose();

    // Update horizontal Y-slice guide ring
    if (!heldInHand && sliceY < VOXEL_GRID_SIZE - 1) {
      refs.sliceGuideMesh.position.y = (sliceY + 1) / VOXEL_GRID_SIZE - 0.5;
      refs.sliceGuideMesh.visible = true;
    } else {
      refs.sliceGuideMesh.visible = false;
    }
  }, [voxels, sliceY, heldInHand]);

  // Toggle X-symmetry guide line
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.symmetryLine.visible = mirrorX && !heldInHand;
  }, [mirrorX, heldInHand]);

  // Rebuild blocky Steve/Alex right arm
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

  // Update Build Plate vs Held-in-Hand pose
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    refs.buildPlateGroup.visible = !heldInHand;
    refs.armContainer.visible = heldInHand;

    if (!heldInHand) {
      refs.voxelPivot.position.set(0, 0, 0);
      refs.voxelPivot.rotation.set(0, 0, 0);
      refs.voxelPivot.scale.setScalar(1.0);
      refs.voxelMesh.position.set(0, 0, 0);
    } else {
      const grip = computeItemGripTransform(true, category);
      refs.voxelPivot.position.set(0, -0.08, 0.04);
      refs.voxelPivot.rotation.set(-0.28, 0, 0, 'YXZ');
      refs.voxelPivot.scale.setScalar(grip.pivotScale * 0.9);
      refs.voxelMesh.position.set(0, 0.34, 0);
    }
  }, [heldInHand, category]);

  const handleResetCamera = useCallback(
    (nextHeld?: boolean) => {
      const refs = sceneRefs.current;
      if (!refs) return;
      const isHeld = nextHeld ?? heldInHand;
      refs.camera.position.set(
        ...(isHeld ? DEFAULT_CAM_HELD : DEFAULT_CAM_BUILD)
      );
      refs.controls.target.set(0, isHeld ? 0.14 : -0.08, 0);
      refs.controls.update();
    },
    [heldInHand]
  );

  const layerStatusText = t.voxel3d.layerStatus.replace(
    '{y}',
    String(sliceY + 1)
  );

  return (
    <section
      className="pane voxel-sculptor-pane"
      aria-label={t.voxel3d.paneTitle}
      data-testid="voxel-sculptor-pane"
    >
      <div className="pane-header">
        <div className="pane-title-group">
          <h2 className="pane-title">{t.voxel3d.paneTitle}</h2>
          <span className="voxel-count-badge" data-testid="voxel-count-badge">
            {voxels.length} {t.viewport3d.voxelsCount}
          </span>
        </div>

        <div className="pane-controls">
          <button
            type="button"
            className={`control-pill-btn ${mirrorX ? 'active' : ''}`}
            onClick={onToggleMirrorX}
            aria-pressed={mirrorX}
            data-testid="voxel-mirror-x-btn"
          >
            <MirrorXIcon size={16} />
            <span>{t.voxel3d.symmetryX}</span>
          </button>

          <button
            type="button"
            className={`held-toggle-btn ${heldInHand ? 'active' : ''}`}
            onClick={() => {
              const next = !heldInHand;
              setHeldInHand(next);
              handleResetCamera(next);
            }}
            aria-pressed={heldInHand}
            data-testid="held-in-hand-toggle"
          >
            <HandBlockIcon size={16} />
            <span>{t.viewport3d.heldInHand}</span>
          </button>

          {heldInHand && (
            <div className="arm-style-switch">
              {(['steve', 'alex'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`arm-pill ${armStyle === style ? 'active' : ''}`}
                  onClick={() => setArmStyle(style)}
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
            data-testid="voxel-reset-camera-btn"
          >
            <ResetCameraIcon size={16} />
            <span>{t.viewport3d.resetCamera}</span>
          </button>
        </div>
      </div>

      {/* Starter 3D Presets Strip */}
      <div className="templates-bar">
        <span className="templates-bar-label">{t.voxel3d.presetsLabel}:</span>
        <div className="templates-scroll">
          {VOXEL_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`template-chip ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedPreset(preset.id);
                  setSliceY(VOXEL_GRID_SIZE - 1);
                  onSelectPreset(preset.id, lang);
                }}
                data-testid={`voxel-preset-${preset.id}`}
              >
                <span aria-hidden="true">{preset.icon}</span>
                <span>{t.voxel3d.presets[preset.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Y-Level Layer Slicer Bar */}
      {!heldInHand && (
        <div className="layer-slicer-bar" data-testid="layer-slicer-bar">
          <label className="slicer-label" htmlFor="y-layer-slider">
            {t.voxel3d.layerSlicerLabel}:
          </label>
          <input
            id="y-layer-slider"
            type="range"
            min={1}
            max={16}
            step={1}
            value={sliceY + 1}
            className="forjix-slider slicer-range"
            onChange={(e) => setSliceY(Number(e.target.value) - 1)}
            data-testid="y-layer-slider"
          />
          <span className="slicer-readout">{layerStatusText}</span>
          {sliceY < 15 && (
            <button
              type="button"
              className="slicer-reset-btn"
              onClick={() => setSliceY(15)}
              data-testid="slicer-show-all-btn"
            >
              {t.voxel3d.allLayersBtn}
            </button>
          )}
        </div>
      )}

      <div className="viewport-stage-wrapper">
        <div
          ref={mountRef}
          className="three-mount-container"
          data-testid="voxel-three-mount"
        />

        {voxels.length === 0 && !heldInHand && (
          <div className="empty-viewport-hint">
            <strong>{t.voxel3d.emptyPlateTitle}</strong>
            <p>{t.voxel3d.emptyPlateSubtitle}</p>
          </div>
        )}
      </div>

      <div className="pane-footer">
        <span className="hint-text">{t.voxel3d.sculptHint}</span>
        <span className="coords-readout">16×16×16</span>
      </div>
    </section>
  );
};
