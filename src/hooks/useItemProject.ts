// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useRef, useState } from 'react';
import type { SpecialPowerOption } from '../data/powersCatalog';
import { togglePowerInList } from '../data/powersCatalog';
import {
  buildTemplatePixels,
  getTemplateDefinition,
} from '../data/templates';
import { getVoxelPreset } from '../data/voxelPresets';
import type {
  ArmorSlot,
  EditorMode,
  GridSize,
  HexColor,
  ItemCategory,
  ItemPower,
  ItemProject,
  ItemRarity,
  ItemStats,
  Language,
  StarterTemplateId,
  Voxel,
  VoxelPresetId,
} from '../types/project';
import {
  createEmptyPixels,
  pixelsEqual,
  pixelsToExtrudedVoxels,
  resizePixelGrid,
  slugifyItemName,
} from '../utils/pixelOps';
import {
  clampItemStats,
  extrudedPixelsToCenteredVoxels,
} from '../utils/voxelOps';

export const MAX_UNDO_STEPS = 50;

interface HistorySnapshot {
  mode: EditorMode;
  gridSize: GridSize;
  pixels: (HexColor | null)[];
  voxels: Voxel[];
  category: ItemCategory;
  rarity: ItemRarity;
  armorSlot: ArmorSlot;
  name: string;
  slug: string;
  stats: ItemStats;
  powers: ItemPower[];
}

function makeProjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `forjix-${Date.now().toString(36)}`;
}

export function createInitialProject(
  templateId: StarterTemplateId = 'classic_sword',
  lang: Language = 'ro'
): ItemProject {
  const def = getTemplateDefinition(templateId);
  const gridSize: GridSize = 16;
  const pixels = buildTemplatePixels(templateId, gridSize);
  const name = def.defaultName[lang];

  return {
    id: makeProjectId(),
    name,
    slug: slugifyItemName(name),
    mode: 'extruded',
    gridSize,
    pixels,
    voxels: pixelsToExtrudedVoxels(pixels, gridSize),
    category: def.category,
    rarity: def.rarity,
    armorSlot: 'chestplate',
    stats: clampItemStats({ ...def.stats }),
    powers: def.powers.map((p) => ({ ...p })),
  };
}

function snapshotOf(project: ItemProject): HistorySnapshot {
  return {
    mode: project.mode,
    gridSize: project.gridSize,
    pixels: project.pixels.slice(),
    voxels: project.voxels.map((v) => ({ ...v })),
    category: project.category,
    rarity: project.rarity,
    armorSlot: project.armorSlot,
    name: project.name,
    slug: project.slug,
    stats: { ...project.stats },
    powers: project.powers.map((p) => ({ ...p })),
  };
}

export function useItemProject(initialLang: Language = 'ro') {
  const [project, setProject] = useState<ItemProject>(() =>
    createInitialProject('classic_sword', initialLang)
  );
  // Undo/redo stacks live in refs to avoid nested setState calls inside
  // updater functions (React anti-pattern). State mirrors only hold the
  // counts so the UI can render undo/redo button badges.
  const undoStackRef = useRef<HistorySnapshot[]>([]);
  const redoStackRef = useRef<HistorySnapshot[]>([]);
  const [undoSteps, setUndoSteps] = useState(0);
  const [redoSteps, setRedoSteps] = useState(0);

  const strokeStartRef = useRef<HistorySnapshot | null>(null);
  const sculptedCacheRef = useRef<Voxel[] | null>(null);
  const latestProjectRef = useRef<ItemProject>(project);
  latestProjectRef.current = project;

  const syncHistoryCounts = useCallback(() => {
    setUndoSteps(undoStackRef.current.length);
    setRedoSteps(redoStackRef.current.length);
  }, []);

  const pushUndoSnapshot = useCallback(
    (snap: HistorySnapshot) => {
      undoStackRef.current = [...undoStackRef.current, snap];
      if (undoStackRef.current.length > MAX_UNDO_STEPS) {
        undoStackRef.current = undoStackRef.current.slice(
          undoStackRef.current.length - MAX_UNDO_STEPS
        );
      }
      redoStackRef.current = [];
      syncHistoryCounts();
    },
    [syncHistoryCounts]
  );

  const setEditorMode = useCallback(
    (nextMode: EditorMode) => {
      const current = latestProjectRef.current;
      if (current.mode === nextMode) return;

      pushUndoSnapshot(snapshotOf(current));

      if (nextMode === 'voxel') {
        const nextVoxels =
          sculptedCacheRef.current !== null
            ? sculptedCacheRef.current.map((v) => ({ ...v }))
            : extrudedPixelsToCenteredVoxels(current.pixels, current.gridSize);
        sculptedCacheRef.current = nextVoxels;

        setProject((prev) => ({
          ...prev,
          mode: 'voxel',
          voxels: nextVoxels,
        }));
      } else {
        sculptedCacheRef.current = current.voxels.map((v) => ({ ...v }));
        setProject((prev) => ({
          ...prev,
          mode: 'extruded',
          voxels: pixelsToExtrudedVoxels(prev.pixels, prev.gridSize),
        }));
      }
    },
    [pushUndoSnapshot]
  );

  const beginStroke = useCallback(() => {
    if (strokeStartRef.current === null) {
      strokeStartRef.current = snapshotOf(latestProjectRef.current);
    }
  }, []);

  const updatePixelsLive = useCallback((nextPixels: (HexColor | null)[]) => {
    setProject((prev) => {
      if (pixelsEqual(prev.pixels, nextPixels)) {
        return prev;
      }
      return {
        ...prev,
        pixels: nextPixels,
        voxels:
          prev.mode === 'extruded'
            ? pixelsToExtrudedVoxels(nextPixels, prev.gridSize)
            : prev.voxels,
      };
    });
  }, []);

  const endStroke = useCallback(() => {
    const startSnap = strokeStartRef.current;
    strokeStartRef.current = null;
    if (!startSnap) return;

    const current = latestProjectRef.current;
    if (!pixelsEqual(startSnap.pixels, current.pixels)) {
      pushUndoSnapshot(startSnap);
    }
  }, [pushUndoSnapshot]);

  const commitPixelsAction = useCallback(
    (nextPixels: (HexColor | null)[]) => {
      const current = latestProjectRef.current;
      if (pixelsEqual(current.pixels, nextPixels)) {
        return;
      }
      pushUndoSnapshot(snapshotOf(current));
      setProject((prev) => ({
        ...prev,
        pixels: nextPixels,
        voxels:
          prev.mode === 'extruded'
            ? pixelsToExtrudedVoxels(nextPixels, prev.gridSize)
            : prev.voxels,
      }));
    },
    [pushUndoSnapshot]
  );

  const commitVoxelsAction = useCallback(
    (nextVoxels: Voxel[]) => {
      const current = latestProjectRef.current;
      pushUndoSnapshot(snapshotOf(current));
      sculptedCacheRef.current = nextVoxels.map((v) => ({ ...v }));
      setProject((prev) => ({
        ...prev,
        mode: 'voxel',
        voxels: nextVoxels,
      }));
    },
    [pushUndoSnapshot]
  );

  const applyVoxelPreset = useCallback(
    (presetId: VoxelPresetId, lang: Language) => {
      const current = latestProjectRef.current;
      pushUndoSnapshot(snapshotOf(current));
      const def = getVoxelPreset(presetId);
      const nextVoxels = def.buildVoxels();
      const nextName = def.defaultName[lang];
      sculptedCacheRef.current = nextVoxels.map((v) => ({ ...v }));

      setProject((prev) => ({
        ...prev,
        mode: 'voxel',
        name: nextName,
        slug: slugifyItemName(nextName),
        category: def.category,
        rarity: def.rarity,
        armorSlot: def.armorSlot ?? 'chestplate',
        stats: clampItemStats({ ...def.stats }),
        powers: def.powers.map((p) => ({ ...p })),
        voxels: nextVoxels,
      }));
    },
    [pushUndoSnapshot]
  );

  const changeGridSize = useCallback(
    (nextSize: GridSize) => {
      const current = latestProjectRef.current;
      if (current.gridSize === nextSize) return;

      pushUndoSnapshot(snapshotOf(current));
      const resized = resizePixelGrid(current.pixels, current.gridSize, nextSize);
      setProject((prev) => ({
        ...prev,
        gridSize: nextSize,
        pixels: resized,
        voxels:
          prev.mode === 'extruded'
            ? pixelsToExtrudedVoxels(resized, nextSize)
            : prev.voxels,
      }));
    },
    [pushUndoSnapshot]
  );

  const applyStarterTemplate = useCallback(
    (templateId: StarterTemplateId, lang: Language) => {
      const current = latestProjectRef.current;
      pushUndoSnapshot(snapshotOf(current));
      const def = getTemplateDefinition(templateId);
      const nextPixels = buildTemplatePixels(templateId, current.gridSize);
      const nextName = def.defaultName[lang];

      setProject((prev) => ({
        ...prev,
        mode: 'extruded',
        name: nextName,
        slug: slugifyItemName(nextName),
        category: def.category,
        rarity: def.rarity,
        armorSlot: def.armorSlot ?? 'chestplate',
        stats: clampItemStats({ ...def.stats }),
        powers: def.powers.map((p) => ({ ...p })),
        pixels: nextPixels,
        voxels: pixelsToExtrudedVoxels(nextPixels, prev.gridSize),
      }));
    },
    [pushUndoSnapshot]
  );

  const clearCanvas = useCallback(() => {
    const current = latestProjectRef.current;
    if (current.mode === 'voxel') {
      if (current.voxels.length === 0) return;
      pushUndoSnapshot(snapshotOf(current));
      sculptedCacheRef.current = [];
      setProject((prev) => ({ ...prev, voxels: [] }));
      return;
    }

    const blank = createEmptyPixels(current.gridSize);
    if (pixelsEqual(current.pixels, blank)) return;

    pushUndoSnapshot(snapshotOf(current));
    setProject((prev) => ({
      ...prev,
      pixels: blank,
      voxels: [],
    }));
  }, [pushUndoSnapshot]);

  const restoreSnapshot = (target: HistorySnapshot) => {
    if (target.mode === 'voxel') {
      sculptedCacheRef.current = target.voxels.map((v) => ({ ...v }));
    }
    setProject((prev) => ({
      ...prev,
      mode: target.mode,
      gridSize: target.gridSize,
      pixels: target.pixels.slice(),
      voxels: target.voxels.map((v) => ({ ...v })),
      category: target.category,
      rarity: target.rarity,
      armorSlot: target.armorSlot,
      name: target.name,
      slug: target.slug,
      stats: { ...target.stats },
      powers: target.powers.map((p) => ({ ...p })),
    }));
  };

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const target = undoStackRef.current[undoStackRef.current.length - 1]!;
    const currentSnap = snapshotOf(latestProjectRef.current);

    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, currentSnap];
    if (redoStackRef.current.length > MAX_UNDO_STEPS) {
      redoStackRef.current = redoStackRef.current.slice(
        redoStackRef.current.length - MAX_UNDO_STEPS
      );
    }
    syncHistoryCounts();

    restoreSnapshot(target);
  }, [syncHistoryCounts]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const target = redoStackRef.current[redoStackRef.current.length - 1]!;
    const currentSnap = snapshotOf(latestProjectRef.current);

    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, currentSnap];
    if (undoStackRef.current.length > MAX_UNDO_STEPS) {
      undoStackRef.current = undoStackRef.current.slice(
        undoStackRef.current.length - MAX_UNDO_STEPS
      );
    }
    syncHistoryCounts();

    restoreSnapshot(target);
  }, [syncHistoryCounts]);

  const setItemName = useCallback((name: string) => {
    setProject((prev) => ({
      ...prev,
      name,
      slug: slugifyItemName(name),
    }));
  }, []);

  const setItemCategory = useCallback((category: ItemCategory) => {
    setProject((prev) => ({ ...prev, category }));
  }, []);

  const setItemRarity = useCallback((rarity: ItemRarity) => {
    setProject((prev) => ({ ...prev, rarity }));
  }, []);

  const setArmorSlot = useCallback((armorSlot: ArmorSlot) => {
    setProject((prev) => ({ ...prev, armorSlot }));
  }, []);

  const updateItemStats = useCallback((patch: Partial<ItemStats>) => {
    setProject((prev) => ({
      ...prev,
      stats: clampItemStats({
        ...prev.stats,
        ...patch,
      }),
    }));
  }, []);

  const toggleSpecialPower = useCallback((option: SpecialPowerOption) => {
    setProject((prev) => ({
      ...prev,
      powers: togglePowerInList(prev.powers, option),
    }));
  }, []);

  const replaceProject = useCallback(
    (incoming: ItemProject) => {
      pushUndoSnapshot(snapshotOf(latestProjectRef.current));
      if (incoming.mode === 'voxel') {
        sculptedCacheRef.current = incoming.voxels.map((v) => ({ ...v }));
      }
      setProject(incoming);
    },
    [pushUndoSnapshot]
  );

  return {
    project,
    undoSteps,
    redoSteps,
    canUndo: undoSteps > 0,
    canRedo: redoSteps > 0,
    setEditorMode,
    beginStroke,
    updatePixelsLive,
    endStroke,
    commitPixelsAction,
    commitVoxelsAction,
    applyVoxelPreset,
    changeGridSize,
    applyStarterTemplate,
    clearCanvas,
    undo,
    redo,
    setItemName,
    setItemCategory,
    setItemRarity,
    setArmorSlot,
    updateItemStats,
    toggleSpecialPower,
    replaceProject,
  };
}
