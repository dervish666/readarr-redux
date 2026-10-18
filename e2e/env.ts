import path from 'path';

const repoRoot = path.resolve(__dirname, '..');

// Everything the smoke run needs to know about its target comes from the environment,
// so the same suite runs against a local build and the staging container on Tower.

function trimSlash(value: string) {
  return value.replace(/\/+$/, '');
}

// Full URL including any URL base, for example http://tower:8789 or http://host/readarr
export const baseUrl = trimSlash(process.env.READARR_URL ?? 'http://localhost:8787');

export const apiKey = process.env.READARR_API_KEY ?? '';

// Only needed when the instance uses forms login.
export const username = process.env.READARR_USERNAME ?? '';
export const password = process.env.READARR_PASSWORD ?? '';

// Optional: the author the detail checks open. Defaults to the first author in the library.
export const authorSlug = process.env.READARR_AUTHOR_SLUG ?? '';

// Where baseline screenshots go. Defaults under _output so they never get committed.
export const screenshotDir = path.resolve(
  repoRoot,
  process.env.READARR_SCREENSHOT_DIR ?? '_output/e2e/screenshots'
);

// Set to 1 to ignore 404s on /MediaCover/ images, for a database copy without its cover cache.
export const allowMissingCovers = process.env.READARR_ALLOW_MISSING_COVERS === '1';

// Optional Playwright channel, e.g. chrome. macOS Local Network privacy blocks the bundled Chromium from LAN hosts.
export const browserChannel = process.env.READARR_BROWSER_CHANNEL || undefined;

export const outputRoot = path.join(repoRoot, '_output', 'e2e');
export const storageStatePath = path.join(outputRoot, 'storage-state.json');
