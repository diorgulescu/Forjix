// SPDX-License-Identifier: GPL-3.0-or-later

import React, { useState } from 'react';
import { CURATED_PALETTES } from '../data/palettes';
import type { PaletteCategoryId, Translations } from '../i18n/translations';
import type {
  EditorMode,
  GridSize,
  HexColor,
  Language,
  MirrorAxisState,
  ToolId,
} from '../types/project';
import {
  BucketIcon,
  EraserIcon,
  EyedropperIcon,
  MirrorXIcon,
  MirrorYIcon,
  PencilIcon,
  RedoIcon,
  UndoIcon,
} from './Icons';

interface LeftToolbarProps {
  t: Translations;
  lang: Language;
  editorMode: EditorMode;
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  mirror: MirrorAxisState;
  onToggleMirror: (axis: 'x' | 'y') => void;
  canUndo: boolean;
  canRedo: boolean;
  undoSteps: number;
  redoSteps: number;
  onUndo: () => void;
  onRedo: () => void;
  gridSize: GridSize;
  onChangeGridSize: (size: GridSize) => void;
  activeColor: HexColor;
  recentCustomColors: HexColor[];
  onSelectColor: (color: HexColor, isCustom?: boolean) => void;
}

const TOOL_LIST: ReadonlyArray<{
  id: ToolId;
  shortcut: string;
  Icon: React.FC<{ size?: number }>;
}> = [
  { id: 'pencil', shortcut: 'P', Icon: PencilIcon },
  { id: 'eraser', shortcut: 'E', Icon: EraserIcon },
  { id: 'bucket', shortcut: 'G', Icon: BucketIcon },
  { id: 'eyedropper', shortcut: 'I', Icon: EyedropperIcon },
];

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  t,
  lang,
  editorMode,
  activeTool,
  onSelectTool,
  mirror,
  onToggleMirror,
  canUndo,
  canRedo,
  undoSteps,
  redoSteps,
  onUndo,
  onRedo,
  gridSize,
  onChangeGridSize,
  activeColor,
  recentCustomColors,
  onSelectColor,
}) => {
  const [selectedPaletteId, setSelectedPaletteId] =
    useState<PaletteCategoryId>('metals');

  const activePalette =
    CURATED_PALETTES.find((p) => p.id === selectedPaletteId) ??
    CURATED_PALETTES[0]!;

  return (
    <aside className="left-toolbar" aria-label={t.toolbar.toolsHeading}>
      {/* Drawing / Sculpting Tools */}
      <section className="toolbar-section">
        <h2 className="section-heading">{t.toolbar.toolsHeading}</h2>
        <div className="tools-grid">
          {TOOL_LIST.map(({ id, shortcut, Icon }) => {
            const info = t.toolbar.tools[id];
            const isSelected = activeTool === id;
            return (
              <button
                key={id}
                type="button"
                className={`tool-btn ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectTool(id)}
                title={info.hint}
                aria-pressed={isSelected}
                data-testid={`tool-${id}`}
              >
                <Icon size={18} />
                <span className="tool-btn-label">{info.name}</span>
                <kbd className="tool-kbd">{shortcut}</kbd>
              </button>
            );
          })}
        </div>
      </section>

      {/* Symmetry Controls */}
      <section className="toolbar-section">
        <h2 className="section-heading">{t.toolbar.symmetryHeading}</h2>
        <div className={editorMode === 'extruded' ? 'duo-row' : 'single-row'}>
          <button
            type="button"
            className={`toggle-chip-btn ${mirror.x ? 'active-cyan' : ''}`}
            onClick={() => onToggleMirror('x')}
            aria-pressed={mirror.x}
            data-testid="mirror-x-btn"
          >
            <MirrorXIcon size={17} />
            <span>{t.toolbar.mirrorX}</span>
          </button>

          {editorMode === 'extruded' && (
            <button
              type="button"
              className={`toggle-chip-btn ${mirror.y ? 'active-gold' : ''}`}
              onClick={() => onToggleMirror('y')}
              aria-pressed={mirror.y}
              data-testid="mirror-y-btn"
            >
              <MirrorYIcon size={17} />
              <span>{t.toolbar.mirrorY}</span>
            </button>
          )}
        </div>
      </section>

      {/* Undo / Redo (50 steps) */}
      <section className="toolbar-section">
        <h2 className="section-heading">{t.toolbar.historyHeading}</h2>
        <div className="duo-row">
          <button
            type="button"
            className="history-btn"
            disabled={!canUndo}
            onClick={onUndo}
            title={`${t.toolbar.undo} (Ctrl+Z)`}
            data-testid="undo-btn"
          >
            <UndoIcon size={16} />
            <span>{t.toolbar.undo}</span>
            <span className="step-badge">{undoSteps}</span>
          </button>
          <button
            type="button"
            className="history-btn"
            disabled={!canRedo}
            onClick={onRedo}
            title={`${t.toolbar.redo} (Ctrl+Y)`}
            data-testid="redo-btn"
          >
            <RedoIcon size={16} />
            <span>{t.toolbar.redo}</span>
            <span className="step-badge">{redoSteps}</span>
          </button>
        </div>
      </section>

      {/* 2D Grid Size Selector (shown in 2D Extruded mode) */}
      {editorMode === 'extruded' && (
        <section className="toolbar-section">
          <h2 className="section-heading">{t.toolbar.gridSizeHeading}</h2>
          <div className="duo-row">
            {([16, 32] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                className={`grid-size-btn ${gridSize === sz ? 'active' : ''}`}
                onClick={() => onChangeGridSize(sz)}
                aria-pressed={gridSize === sz}
                data-testid={`grid-size-${sz}`}
              >
                {sz}×{sz}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Curated Vibrant Color Palettes + Custom Color Picker */}
      <section className="toolbar-section palettes-section">
        <h2 className="section-heading">{t.toolbar.palettesHeading}</h2>

        <div className="palette-tabs" role="tablist">
          {CURATED_PALETTES.map((group) => {
            const isSelected = group.id === selectedPaletteId;
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`palette-tab ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedPaletteId(group.id)}
                title={t.toolbar.paletteNames[group.id]}
                data-testid={`palette-tab-${group.id}`}
              >
                <span
                  className="palette-dot"
                  style={{ backgroundColor: group.accentHex }}
                />
                <span className="palette-tab-name">
                  {t.toolbar.paletteNames[group.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="swatches-grid">
          {activePalette.swatches.map((swatch) => {
            const isCurrent =
              activeColor.toUpperCase() === swatch.hex.toUpperCase();
            return (
              <button
                key={swatch.hex}
                type="button"
                className={`swatch-btn ${isCurrent ? 'selected' : ''}`}
                style={{ backgroundColor: swatch.hex }}
                title={`${swatch.label[lang]} (${swatch.hex})`}
                aria-label={`${swatch.label[lang]} ${swatch.hex}`}
                onClick={() => onSelectColor(swatch.hex, false)}
              />
            );
          })}
        </div>

        {/* Custom Color Picker + Active Color Preview */}
        <div className="custom-color-card">
          <div className="active-color-row">
            <label
              className="color-picker-label"
              title={t.toolbar.pickCustomColor}
            >
              <span
                className="active-color-well"
                style={{ backgroundColor: activeColor }}
              />
              <input
                type="color"
                className="native-color-input"
                value={activeColor}
                onChange={(e) => onSelectColor(e.target.value, true)}
                aria-label={t.toolbar.customColor}
                data-testid="custom-color-input"
              />
              <span className="color-picker-text">
                <strong>{t.toolbar.customColor}</strong>
                <code>{activeColor.toUpperCase()}</code>
              </span>
            </label>
          </div>

          {recentCustomColors.length > 0 && (
            <div className="recent-swatches-row">
              <span className="recent-label">{t.toolbar.recentColors}:</span>
              <div className="recent-swatches-list">
                {recentCustomColors.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`mini-swatch ${
                      activeColor.toUpperCase() === hex.toUpperCase()
                        ? 'selected'
                        : ''
                    }`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                    onClick={() => onSelectColor(hex, false)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
};
