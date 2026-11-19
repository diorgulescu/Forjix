// SPDX-License-Identifier: GPL-3.0-or-later

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildTemplatePixels,
  STARTER_TEMPLATES,
} from '../data/templates';
import type { Translations } from '../i18n/translations';
import type {
  GridSize,
  HexColor,
  Language,
  MirrorAxisState,
  StarterTemplateId,
  ToolId,
} from '../types/project';
import {
  floodFill,
  getMirroredPoints,
  type GridPoint,
  paintStrokeSegment,
} from '../utils/pixelOps';
import { GridIcon } from './Icons';

interface TemplateThumbProps {
  templateId: StarterTemplateId;
}

const TemplateThumb: React.FC<TemplateThumbProps> = React.memo(
  ({ templateId }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 16, 16);

      if (templateId === 'blank') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.strokeRect(2.5, 2.5, 11, 11);
        return;
      }

      const px = buildTemplatePixels(templateId, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const color = px[y * 16 + x];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }, [templateId]);

    return (
      <canvas
        ref={canvasRef}
        width={16}
        height={16}
        className="template-thumb-canvas"
        aria-hidden="true"
      />
    );
  }
);

interface PixelCanvasPaneProps {
  t: Translations;
  lang: Language;
  gridSize: GridSize;
  pixels: readonly (HexColor | null)[];
  activeTool: ToolId;
  activeColor: HexColor;
  mirror: MirrorAxisState;
  isPainting: boolean;
  onPaintingStateChange: (painting: boolean) => void;
  onBeginStroke: () => void;
  onUpdatePixelsLive: (nextPixels: (HexColor | null)[]) => void;
  onEndStroke: () => void;
  onCommitPixelsAction: (nextPixels: (HexColor | null)[]) => void;
  onPickColorFromCanvas: (hex: HexColor) => void;
  onSelectTemplate: (templateId: StarterTemplateId, lang: Language) => void;
  onClearCanvas: () => void;
}

const INTERNAL_CANVAS_PX = 512; // Exact multiple of both 16 (32px/cell) and 32 (16px/cell)

export const PixelCanvasPane: React.FC<PixelCanvasPaneProps> = ({
  t,
  lang,
  gridSize,
  pixels,
  activeTool,
  activeColor,
  mirror,
  isPainting,
  onPaintingStateChange,
  onBeginStroke,
  onUpdatePixelsLive,
  onEndStroke,
  onCommitPixelsAction,
  onPickColorFromCanvas,
  onSelectTemplate,
  onClearCanvas,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showGridLines, setShowGridLines] = useState(true);
  const [hoverCell, setHoverCell] = useState<GridPoint | null>(null);
  const [activeTemplateId, setActiveTemplateId] =
    useState<StarterTemplateId>('classic_sword');

  const drawingModeRef = useRef<'paint' | 'erase' | null>(null);
  const lastCellRef = useRef<GridPoint | null>(null);
  const livePixelsRef = useRef<readonly (HexColor | null)[]>(pixels);
  livePixelsRef.current = pixels;

  const getCellFromPointerEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): GridPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const gx = Math.floor(relX * gridSize);
      const gy = Math.floor(relY * gridSize);

      if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) {
        return null;
      }
      return { x: gx, y: gy };
    },
    [gridSize]
  );

  const clampedCellFromPointerEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): GridPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const relX = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(0.9999, (e.clientY - rect.top) / rect.height));
      return {
        x: Math.floor(relX * gridSize),
        y: Math.floor(relY * gridSize),
      };
    },
    [gridSize]
  );

  // Render crisp 2D canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    const cellPx = INTERNAL_CANVAS_PX / gridSize;

    // 1. High-contrast checkerboard transparency background
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#181D2C' : '#22293D';
        ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
      }
    }

    // 2. Painted pixels
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const hex = pixels[y * gridSize + x] ?? null;
        if (hex !== null) {
          ctx.fillStyle = hex;
          ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
        }
      }
    }

    // 3. Hover ghost preview (including symmetry preview!)
    if (hoverCell !== null) {
      const previewTargets =
        activeTool === 'eyedropper'
          ? [hoverCell]
          : getMirroredPoints(hoverCell.x, hoverCell.y, gridSize, mirror);

      for (const pt of previewTargets) {
        const px = pt.x * cellPx;
        const py = pt.y * cellPx;

        if (activeTool === 'eraser') {
          ctx.fillStyle = 'rgba(255, 82, 102, 0.28)';
          ctx.fillRect(px, py, cellPx, cellPx);
          ctx.strokeStyle = '#FF5266';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cellPx - 2, cellPx - 2);
        } else if (activeTool === 'eyedropper') {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cellPx - 2, cellPx - 2);
        } else {
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = activeColor;
          ctx.fillRect(px, py, cellPx, cellPx);
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cellPx - 2, cellPx - 2);
        }
      }
    }

    // 4. Toggleable crisp pixel grid lines
    if (showGridLines) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < gridSize; i++) {
        const pos = i * cellPx + 0.5;
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, INTERNAL_CANVAS_PX);
        ctx.moveTo(0, pos);
        ctx.lineTo(INTERNAL_CANVAS_PX, pos);
      }
      ctx.stroke();
    }

    // 5. Mirror X / Mirror Y symmetry axis guides
    const center = INTERNAL_CANVAS_PX / 2;
    if (mirror.x) {
      ctx.save();
      ctx.strokeStyle = '#38F2FF';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(center, 0);
      ctx.lineTo(center, INTERNAL_CANVAS_PX);
      ctx.stroke();
      ctx.restore();
    }
    if (mirror.y) {
      ctx.save();
      ctx.strokeStyle = '#FFD83B';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, center);
      ctx.lineTo(INTERNAL_CANVAS_PX, center);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    pixels,
    gridSize,
    showGridLines,
    mirror,
    hoverCell,
    activeTool,
    activeColor,
  ]);

  const finishStroke = useCallback(() => {
    if (drawingModeRef.current !== null) {
      drawingModeRef.current = null;
      lastCellRef.current = null;
      onEndStroke();
      onPaintingStateChange(false);
    }
  }, [onEndStroke, onPaintingStateChange]);

  useEffect(() => {
    const handleWindowBlur = () => finishStroke();
    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [finishStroke]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = getCellFromPointerEvent(e);
    if (!cell) return;

    // Right-click = quick erase stroke
    if (e.button === 2) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onPaintingStateChange(true);
      onBeginStroke();
      drawingModeRef.current = 'erase';
      lastCellRef.current = cell;
      const { nextPixels, changed } = paintStrokeSegment(
        livePixelsRef.current,
        gridSize,
        cell,
        cell,
        null,
        mirror
      );
      if (changed) {
        livePixelsRef.current = nextPixels;
        onUpdatePixelsLive(nextPixels);
      }
      return;
    }

    if (e.button !== 0) return;

    if (activeTool === 'eyedropper') {
      const picked = livePixelsRef.current[cell.y * gridSize + cell.x] ?? null;
      if (picked !== null) {
        onPickColorFromCanvas(picked);
      }
      return;
    }

    if (activeTool === 'bucket') {
      onPaintingStateChange(true);
      const { nextPixels, changed } = floodFill(
        livePixelsRef.current,
        gridSize,
        cell.x,
        cell.y,
        activeColor,
        mirror
      );
      if (changed) {
        onCommitPixelsAction(nextPixels);
      }
      window.setTimeout(() => onPaintingStateChange(false), 60);
      return;
    }

    // Pencil or Eraser continuous stroke
    e.currentTarget.setPointerCapture(e.pointerId);
    onPaintingStateChange(true);
    onBeginStroke();
    const mode = activeTool === 'eraser' ? 'erase' : 'paint';
    drawingModeRef.current = mode;
    lastCellRef.current = cell;

    const strokeVal = mode === 'erase' ? null : activeColor;
    const { nextPixels, changed } = paintStrokeSegment(
      livePixelsRef.current,
      gridSize,
      cell,
      cell,
      strokeVal,
      mirror
    );
    if (changed) {
      livePixelsRef.current = nextPixels;
      onUpdatePixelsLive(nextPixels);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const insideCell = getCellFromPointerEvent(e);
    setHoverCell(insideCell);

    if (drawingModeRef.current === null) return;

    const targetCell = insideCell ?? clampedCellFromPointerEvent(e);
    if (!targetCell) return;

    const from = lastCellRef.current ?? targetCell;
    lastCellRef.current = targetCell;

    const strokeVal =
      drawingModeRef.current === 'erase' ? null : activeColor;
    const { nextPixels, changed } = paintStrokeSegment(
      livePixelsRef.current,
      gridSize,
      from,
      targetCell,
      strokeVal,
      mirror
    );
    if (changed) {
      livePixelsRef.current = nextPixels;
      onUpdatePixelsLive(nextPixels);
    }
  };

  const handlePointerUpOrCancel = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    finishStroke();
  };

  return (
    <section className="pane canvas-pane" aria-label={t.canvas2d.paneTitle}>
      <div className="pane-header">
        <div className="pane-title-group">
          <h2 className="pane-title">{t.canvas2d.paneTitle}</h2>
          <span className="dimension-badge">
            {gridSize}×{gridSize}
          </span>
          {isPainting && (
            <span className="live-status-pill">{t.canvas2d.paintingStatus}</span>
          )}
        </div>

        <div className="pane-controls">
          <button
            type="button"
            className={`control-pill-btn ${showGridLines ? 'active' : ''}`}
            onClick={() => setShowGridLines((v) => !v)}
            aria-pressed={showGridLines}
            data-testid="toggle-grid-lines"
          >
            <GridIcon size={16} />
            <span>{t.canvas2d.gridLines}</span>
          </button>
          <button
            type="button"
            className="control-pill-btn danger-hover"
            onClick={onClearCanvas}
            data-testid="clear-canvas-btn"
          >
            <span>{t.canvas2d.clearCanvas}</span>
          </button>
        </div>
      </div>

      {/* Starter Templates Strip */}
      <div className="templates-bar">
        <span className="templates-bar-label">{t.canvas2d.templatesLabel}:</span>
        <div className="templates-scroll">
          {STARTER_TEMPLATES.map((tpl) => {
            const isSelected = activeTemplateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                className={`template-chip ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setActiveTemplateId(tpl.id);
                  onSelectTemplate(tpl.id, lang);
                }}
                data-testid={`template-${tpl.id}`}
              >
                <TemplateThumb templateId={tpl.id} />
                <span>{t.canvas2d.templates[tpl.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Crisp Square Pixel Art Stage */}
      <div className="canvas-stage">
        <div className="canvas-frame">
          <canvas
            ref={canvasRef}
            width={INTERNAL_CANVAS_PX}
            height={INTERNAL_CANVAS_PX}
            className={`pixel-canvas tool-cursor-${activeTool}`}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onPointerLeave={() => {
              if (drawingModeRef.current === null) {
                setHoverCell(null);
              }
            }}
            data-testid="pixel-grid-canvas"
          />
        </div>
      </div>

      <div className="pane-footer">
        <span className="hint-text">{t.canvas2d.canvasHint}</span>
        <span className="coords-readout">
          {hoverCell
            ? `${t.canvas2d.pixelCoords}: (${hoverCell.x + 1}, ${hoverCell.y + 1})`
            : `${gridSize}×${gridSize}`}
        </span>
      </div>
    </section>
  );
};
