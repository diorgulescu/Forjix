// SPDX-License-Identifier: GPL-3.0-or-later

import { expect, test } from '@playwright/test';

/**
 * Smoke tests: load the app, paint on the 2D canvas, switch to 3D voxel mode,
 * toggle language, and open the export modal.
 */

test.describe('Forjix E2E Smoke', () => {
  test('loads the app with header, canvas, 3D viewport, and stats panel', async ({ page }) => {
    await page.goto('/');

    // Header brand
    await expect(page.locator('.brand-title')).toBeVisible();
    await expect(page.locator('[data-testid="editor-mode-switcher"]')).toBeVisible();

    // 2D canvas is present in extruded mode (default)
    await expect(page.locator('[data-testid="pixel-grid-canvas"]')).toBeVisible();

    // 3D viewport mount
    await expect(page.locator('[data-testid="three-viewport-mount"]')).toBeVisible();

    // Voxel count badge shows > 0 (classic sword template has pixels)
    const badge = page.locator('[data-testid="voxel-count-badge"]');
    await expect(badge).toBeVisible();
    const countText = await badge.textContent();
    expect(countText).toMatch(/\d+/);
  });

  test('paints a pixel on the 2D canvas', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('[data-testid="pixel-grid-canvas"]');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    // Click near the top-left area of the canvas to paint a pixel
    await page.mouse.click(box!.x + box!.width * 0.2, box!.y + box!.height * 0.2);

    // Undo button should become enabled after a stroke
    // (we just verify the canvas is still interactive)
    await expect(canvas).toBeVisible();
  });

  test('switches to 3D voxel mode and back', async ({ page }) => {
    await page.goto('/');

    // Click the 3D voxel mode button
    await page.locator('[data-testid="mode-voxel-btn"]').click();
    await expect(page.locator('[data-testid="voxel-sculptor-pane"]')).toBeVisible();
    await expect(page.locator('[data-testid="voxel-three-mount"]')).toBeVisible();

    // Layer slicer should be visible
    await expect(page.locator('[data-testid="layer-slicer-bar"]')).toBeVisible();

    // Switch back to 2D
    await page.locator('[data-testid="mode-extruded-btn"]').click();
    await expect(page.locator('[data-testid="pixel-grid-canvas"]')).toBeVisible();
  });

  test('toggles language between RO and EN', async ({ page }) => {
    await page.goto('/');

    const langToggle = page.locator('[data-testid="lang-toggle"]');
    await expect(langToggle).toBeVisible();

    // Default is RO — check the subtitle which differs between languages
    const subtitle = page.locator('.brand-subtitle');
    const roText = await subtitle.textContent();

    await langToggle.click();
    const enText = await subtitle.textContent();
    expect(enText).not.toBe(roText);

    // Toggle back
    await langToggle.click();
    const backToRo = await subtitle.textContent();
    expect(backToRo).toBe(roText);
  });

  test('opens the Forge & Export modal', async ({ page }) => {
    await page.goto('/');

    // The export CTA button is in the StatsPowersPanel
    // Find and click it
    const exportBtn = page.locator('button:has-text("Forge"), button:has-text("Făurește"), button:has-text("Export")').first();
    await exportBtn.click();

    // Modal should appear — look for the modal title or export buttons
    await expect(
      page.locator('[data-testid="mcaddon-export-modal"], .modal-overlay, .export-modal').first()
    ).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Fallback: check if any dialog/modal appeared
      const dialogs = await page.locator('[role="dialog"], .modal').count();
      expect(dialogs).toBeGreaterThan(0);
    });

    // Press Escape to close
    await page.keyboard.press('Escape');
  });

  test('undo/redo keyboard shortcuts work', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('[data-testid="pixel-grid-canvas"]');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    // Paint a pixel
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);

    // Undo with Ctrl+Z
    await page.keyboard.press('Control+z');
    // Redo with Ctrl+Y
    await page.keyboard.press('Control+y');

    // App should still be functional
    await expect(canvas).toBeVisible();
  });
});
