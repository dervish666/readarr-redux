import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { createHash } from 'crypto';
import { cpSync, mkdirSync, readdirSync } from 'fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, transformWithOxc } from 'vite';
import { patchCssModules } from 'vite-css-modules';

const src = path.resolve(import.meta.dirname, 'frontend/src');
const outDir = path.resolve(import.meta.dirname, '_output/UI');

const contentDir = path.join(src, 'Content');

function htmlFiles() {
  return readdirSync(src).filter((name) => name.endsWith('.html'));
}

function copyStaticContent(): Plugin {
  function copyAll() {
    mkdirSync(outDir, { recursive: true });

    cpSync(contentDir, path.join(outDir, 'Content'), { recursive: true });

    for (const file of htmlFiles()) {
      cpSync(path.join(src, file), path.join(outDir, file));
    }
  }

  function owns(file: string) {
    return (
      file.startsWith(contentDir) ||
      (path.dirname(file) === src && file.endsWith('.html'))
    );
  }

  return {
    name: 'copy-static-content',

    buildStart() {
      for (const file of htmlFiles()) {
        this.addWatchFile(path.join(src, file));
      }

      this.addWatchFile(contentDir);
    },

    closeBundle() {
      copyAll();
    },

    configureServer(server) {
      copyAll();

      server.watcher.add([contentDir, path.join(src, '*.html')]);

      server.watcher.on('add', (file) => owns(file) && copyAll());
      server.watcher.on('change', (file) => owns(file) && copyAll());
    },
  };
}

// Readarr still has JavaScript components that contain JSX in .js files.
// Vite only parses JSX in .jsx and .tsx, so compile those files as JSX
// before the React plugin and the bundler see them.
function jsxInJs(): Plugin {
  let development = false;

  return {
    name: 'jsx-in-js',
    enforce: 'pre',

    configResolved(config) {
      development = !config.isProduction;
    },

    async transform(code, id) {
      const file = id.split('?')[0];

      if (!file.startsWith(src) || !file.endsWith('.js')) {
        return null;
      }

      const result = await transformWithOxc(code, file, {
        lang: 'jsx',
        jsx: { runtime: 'automatic', development },
      });

      return { code: result.code, map: result.map };
    },
  };
}

// react-virtualized 9.21's ES build imports a flow prop type that its
// WindowScroller never exports. Webpack let the dead import through; Rolldown
// rejects it, so drop the line. The dev server's dependency pre-bundling runs
// it too.
function reactVirtualizedFix() {
  return {
    name: 'react-virtualized-fix',
    enforce: 'pre' as const,

    transform(code: string, id: string) {
      if (!id.includes('react-virtualized/dist/es/WindowScroller/utils/onScroll.js')) {
        return null;
      }

      return {
        code: code.replace(
          "import { bpfrpt_proptype_WindowScroller } from '../WindowScroller.js';",
          ''
        ),
        map: null,
      };
    },
  };
}

function cssModuleTypes(): Plugin {
  let child: ChildProcess | undefined;

  function stop() {
    child?.kill();
    child = undefined;
  }

  return {
    name: 'css-module-types',
    apply: 'serve',

    configureServer(server) {
      const bin = process.platform === 'win32' ? 'tcm.cmd' : 'tcm';

      child = spawn(
        path.join(import.meta.dirname, 'node_modules', '.bin', bin),
        ['frontend/src', '--camelCase', '--pattern', '**/*.module.css', '--watch'],
        { cwd: import.meta.dirname, stdio: 'inherit' }
      );

      server.httpServer?.on('close', stop);
      process.on('exit', stop);
    },
  };
}

const srcAliases = Object.fromEntries(
  readdirSync(src, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [entry.name, path.join(src, entry.name)])
);

// Class names read File-class-hash, the shape webpack produced, because the
// e2e suite selects on [class*="File-class"].
function generateScopedName(name: string, filename: string) {
  const file = path.basename(filename.split('?')[0]).replace(/(\.module)?\.css$/, '');
  const relative = path.relative(src, filename.split('?')[0]).replace(/\\/g, '/');
  const hash = createHash('md5')
    .update(`${relative}:${name}`)
    .digest('base64url')
    .slice(0, 5);

  return `${file}-${name}-${hash}`;
}

const devServerPort = Number(process.env.READARR_VITE_PORT ?? 8757);

export default defineConfig({
  plugins: [
    jsxInJs(),
    reactVirtualizedFix(),
    patchCssModules({ exportMode: 'default' }),
    react(),
    copyStaticContent(),
    cssModuleTypes(),
  ],

  base: '/',

  optimizeDeps: {
    rolldownOptions: {
      plugins: [reactVirtualizedFix()],
    },
  },

  server: {
    port: devServerPort,
    strictPort: true,
    hmr: {
      clientPort: devServerPort,
    },
  },

  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },

  build: {
    outDir,
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: true,
  },

  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'html') {
        return `/${filename}`;
      }

      return { relative: true };
    },
  },

  resolve: {
    alias: {
      ...srcAliases,
      jquery: 'jquery/dist/jquery.min.js',
      'react-middle-truncate': 'react-middle-truncate/lib/react-middle-truncate',
    },
  },

  css: {
    postcss: path.resolve(import.meta.dirname, 'frontend'),
    modules: {
      generateScopedName,
    },
  },
});
