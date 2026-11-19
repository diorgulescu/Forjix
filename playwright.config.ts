// SPDX-License-Identifier: GPL-3.0-or-later

import { defineConfig } from '@playwright/test';

/**
 * E2E smoke tests run against the Vite dev server (browser fallback mode).
 * The app works fully in the browser thanks to tauriBridge fallbacks.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:1420',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
