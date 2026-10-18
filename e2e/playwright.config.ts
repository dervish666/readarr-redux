import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { baseUrl, outputRoot, password, storageStatePath, username } from './env';

// Browser smoke run over the key pages. Points at any running Readarr:
//   READARR_URL=http://host:port READARR_API_KEY=... yarn smoke
// See e2e/README.md for the variables and the staging recipe.
export default defineConfig({
  testDir: '.',
  outputDir: path.join(outputRoot, 'results'),
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(outputRoot, 'report'), open: 'never' }]
  ],
  use: {
    baseURL: baseUrl,
    storageState: storageStatePath,
    // Covers instances on basic auth; forms login is handled in global-setup.
    httpCredentials: username && password ? { username, password } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    }
  ]
});
