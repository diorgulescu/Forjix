// SPDX-License-Identifier: GPL-3.0-or-later

import React, { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { LeftToolbar } from './components/LeftToolbar';
import { McaddonExportModal } from './components/McaddonExportModal';
import { PixelCanvasPane } from './components/PixelCanvasPane';
import { StatsPowersPanel } from './components/StatsPowersPanel';
import { Viewport3DPane } from './components/Viewport3DPane';
import { VoxelSculptorPane } from './components/VoxelSculptorPane';
import { useItemProject } from './hooks/useItemProject';
import { TRANSLATIONS } from './i18n/translations';
import { isTauriRuntime, syncProjectIpc } from './ipc/tauriBridge';
import type {
  HexColor,
  ItemProject,
  Language,
  MirrorAxisState,
  ToolId,
  Voxel,
} from './types/project';
import { normalizeHex } from './utils/pixelOps';
import {
  playEraseTick,
  playFillChime,
  playForgeCelebration,
  playPaintPop,
} from './utils/soundFx';

export const App: React.FC = () => {
  // Default Romanian ('ro') interface with 1-click RO/EN toggle
  const [lang, setLang] = useState<Language>('ro');
  const t = TRANSLATIONS[lang];

  const {
    project,
    undoSteps,
    redoSteps,
    canUndo,
    canRedo,
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
  } = useItemProject('ro');

  const [activeTool, setActiveTool] = useState<ToolId>('pencil');
  const [activeColor, setActiveColor] = useState<HexColor>('#FFE054');
  const [recentCustomColors, setRecentCustomColors] = useState<HexColor[]>([
    '#FF5917',
    '#34E5DB',
    '#E866FF',
  ]);
  const [mirror, setMirror] = useState<MirrorAxisState>({ x: false, y: false });
  const [isPainting, setIsPainting] = useState(false);
  const [lastFilePath, setLastFilePath] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [soundMuted, setSoundMuted] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('forjix_sound_muted') === '1';
    } catch {
      return false;
    }
  });

  const handleToggleSoundMute = useCallback(() => {
    setSoundMuted((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('forjix_sound_muted', next ? '1' : '0');
      } catch {
        // Ignore storage restrictions
      }
      if (!next) {
        playPaintPop(false);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${t.appName} — ${t.appSubtitle}`;
  }, [lang, t.appName, t.appSubtitle]);

  // Debounced background validation/sync with Rust Tauri IPC when running in desktop shell
  useEffect(() => {
    if (!isTauriRuntime()) return;
    const timer = window.setTimeout(() => {
      void syncProjectIpc(project).catch((err) => {
        console.warn('IPC sync warning:', err);
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [project]);

  const handleToggleLanguage = useCallback(() => {
    setLang((prev) => (prev === 'ro' ? 'en' : 'ro'));
  }, []);

  const handleToggleMirror = useCallback((axis: 'x' | 'y') => {
    setMirror((prev) => ({
      ...prev,
      [axis]: !prev[axis],
    }));
  }, []);

  const handleSelectColor = useCallback(
    (rawHex: HexColor, isCustom = false) => {
      const normalized = normalizeHex(rawHex);
      setActiveColor(normalized);

      if (activeTool === 'eraser' || activeTool === 'eyedropper') {
        setActiveTool('pencil');
      }

      if (isCustom) {
        setRecentCustomColors((prev) => {
          const filtered = prev.filter(
            (c) => c.toUpperCase() !== normalized.toUpperCase()
          );
          return [normalized, ...filtered].slice(0, 7);
        });
      }
    },
    [activeTool]
  );

  const handlePickColorFromModel = useCallback(
    (hex: HexColor) => {
      setActiveColor(normalizeHex(hex));
      setActiveTool('pencil');
      playPaintPop(soundMuted);
    },
    [soundMuted]
  );

  // Sound-enhanced 2D & 3D pixel/voxel actions
  const handleUpdatePixelsWithSound = useCallback(
    (nextPixels: (HexColor | null)[]) => {
      if (activeTool === 'eraser') {
        playEraseTick(soundMuted);
      } else {
        playPaintPop(soundMuted);
      }
      updatePixelsLive(nextPixels);
    },
    [activeTool, soundMuted, updatePixelsLive]
  );

  const handleCommitPixelsWithSound = useCallback(
    (nextPixels: (HexColor | null)[]) => {
      playFillChime(soundMuted);
      commitPixelsAction(nextPixels);
    },
    [soundMuted, commitPixelsAction]
  );

  const handleCommitVoxelsWithSound = useCallback(
    (nextVoxels: Voxel[]) => {
      if (nextVoxels.length < project.voxels.length) {
        playEraseTick(soundMuted);
      } else if (activeTool === 'bucket') {
        playFillChime(soundMuted);
      } else {
        playPaintPop(soundMuted);
      }
      commitVoxelsAction(nextVoxels);
    },
    [activeTool, commitVoxelsAction, project.voxels.length, soundMuted]
  );

  const handleExportSuccess = useCallback(
    (savedPath: string) => {
      setLastFilePath(savedPath);
      playForgeCelebration(soundMuted);
    },
    [soundMuted]
  );

  const handleProjectLoaded = useCallback(
    (incoming: ItemProject, filePath: string) => {
      replaceProject(incoming);
      setLastFilePath(filePath);
    },
    [replaceProject]
  );

  // Kid-friendly keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (mod) return;

      switch (e.key.toLowerCase()) {
        case 'p':
          setActiveTool('pencil');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'g':
        case 'b':
          setActiveTool('bucket');
          break;
        case 'i':
          setActiveTool('eyedropper');
          break;
        case 'x':
          handleToggleMirror('x');
          break;
        case 'm':
          handleToggleMirror('y');
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, handleToggleMirror]);

  const durDisplay = project.stats.unbreakable
    ? `∞ ${t.statsPanel.unbreakableToggle}`
    : `${t.statsPanel.durabilityLabel} ${project.stats.durability}`;

  const statsSummary = t.footer.statsSummary
    .replace('{atk}', String(project.stats.attackDamage))
    .replace('{dur}', durDisplay)
    .replace('{pwr}', String(project.powers.length));

  const shortFileName = lastFilePath
    ? lastFilePath.split(/[\\/]/).pop() ?? lastFilePath
    : `${project.slug}.forjix.json`;

  return (
    <div className="app-shell">
      <Header
        project={project}
        lang={lang}
        t={t}
        soundMuted={soundMuted}
        onToggleSoundMute={handleToggleSoundMute}
        onSelectMode={setEditorMode}
        onToggleLanguage={handleToggleLanguage}
        onProjectSaved={setLastFilePath}
        onProjectLoaded={handleProjectLoaded}
      />

      <main className="workspace-layout">
        <LeftToolbar
          t={t}
          lang={lang}
          editorMode={project.mode}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          mirror={mirror}
          onToggleMirror={handleToggleMirror}
          canUndo={canUndo}
          canRedo={canRedo}
          undoSteps={undoSteps}
          redoSteps={redoSteps}
          onUndo={undo}
          onRedo={redo}
          gridSize={project.gridSize}
          onChangeGridSize={changeGridSize}
          activeColor={activeColor}
          recentCustomColors={recentCustomColors}
          onSelectColor={handleSelectColor}
        />

        {project.mode === 'extruded' ? (
          <div className="center-split-extruded">
            <ErrorBoundary name="2D Canvas">
              <PixelCanvasPane
                t={t}
                lang={lang}
                gridSize={project.gridSize}
                pixels={project.pixels}
                activeTool={activeTool}
                activeColor={activeColor}
                mirror={mirror}
                isPainting={isPainting}
                onPaintingStateChange={setIsPainting}
                onBeginStroke={beginStroke}
                onUpdatePixelsLive={handleUpdatePixelsWithSound}
                onEndStroke={endStroke}
                onCommitPixelsAction={handleCommitPixelsWithSound}
                onPickColorFromCanvas={handlePickColorFromModel}
                onSelectTemplate={applyStarterTemplate}
                onClearCanvas={clearCanvas}
              />
            </ErrorBoundary>

            <ErrorBoundary name="3D Viewport">
              <Viewport3DPane
                t={t}
                gridSize={project.gridSize}
                pixels={project.pixels}
                voxelCount={project.voxels.length}
                category={project.category}
                isPainting={isPainting}
              />
            </ErrorBoundary>
          </div>
        ) : (
          <ErrorBoundary name="3D Voxel Forge">
            <VoxelSculptorPane
              t={t}
              lang={lang}
              voxels={project.voxels}
              category={project.category}
              activeTool={activeTool}
              activeColor={activeColor}
              mirrorX={mirror.x}
              onToggleMirrorX={() => handleToggleMirror('x')}
              onCommitVoxels={handleCommitVoxelsWithSound}
              onSelectPreset={applyVoxelPreset}
              onPickColor={handlePickColorFromModel}
            />
          </ErrorBoundary>
        )}

        <ErrorBoundary name="Stats & Powers">
          <StatsPowersPanel
            project={project}
            lang={lang}
            t={t}
            onChangeName={setItemName}
            onChangeRarity={setItemRarity}
            onChangeCategory={setItemCategory}
            onChangeArmorSlot={setArmorSlot}
            onUpdateStats={updateItemStats}
            onTogglePower={toggleSpecialPower}
            onOpenMcaddonExport={() => setIsExportModalOpen(true)}
          />
        </ErrorBoundary>
      </main>

      {isExportModalOpen && (
        <McaddonExportModal
          project={project}
          t={t}
          onClose={() => setIsExportModalOpen(false)}
          onExportSuccess={handleExportSuccess}
        />
      )}

      <footer className="app-footer">
        <div className="footer-left">
          <span className="license-tag">{t.footer.licenseNotice}</span>
          <span className="footer-sep">•</span>
          <span>
            {t.footer.activeFileLabel}: <code>{shortFileName}</code>
          </span>
        </div>
        <div className="footer-right">
          <span className="stats-pill">{statsSummary}</span>
        </div>
      </footer>
    </div>
  );
};
