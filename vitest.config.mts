import path from 'path';
import { readdirSync } from 'fs';
import { transformWithOxc } from 'vite';
import { defineConfig } from 'vitest/config';

const src = path.resolve(import.meta.dirname, 'frontend/src');
export default defineConfig({
  plugins: [{
    name: 'test-jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (id.startsWith(src) && id.endsWith('.js')) {
        const result = await transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } });
        return { code: result.code, map: result.map };
      }
    },
  }],
  resolve: {
    alias: Object.fromEntries(readdirSync(src, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => [entry.name, path.join(src, entry.name)])),
  },
  test: {
    environment: 'jsdom',
    include: ['tests/frontend/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/frontend/setup.ts'],
  },
});
