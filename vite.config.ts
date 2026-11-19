import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** The canonical address written in index.html and guide.html (Vercel). */
const CANONICAL = 'https://htmlincanvas.vercel.app';

/** Points the pages' canonical and share URLs at the host they are built for. */
function siteOrigin(url: string): Plugin {
  return {
    name: 'site-origin',
    transformIndexHtml: (html) => html.replaceAll(CANONICAL, url),
  };
}

/**
 * Where the build is served. Vercel serves it at the domain root (the defaults). Under a path,
 * build with BASE_PATH=/name, and SITE_ORIGIN=https://host for the canonical and share URLs,
 * e.g. BASE_PATH=/learn-html-in-canvas SITE_ORIGIN=https://ionloft.com pnpm build.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['BASE_PATH', 'SITE_ORIGIN']);
  const basePath = (env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '');
  const base = basePath ? `/${basePath}/` : '/';
  const origin = env.SITE_ORIGIN?.replace(/\/+$/, '');

  return {
    base,
    plugins: origin ? [siteOrigin(`${origin}${base.slice(0, -1)}`)] : [],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        // Two pages: the darkroom adventure and the one-page guide.
        input: {
          index: 'index.html',
          guide: 'guide.html',
        },
        output: {
          // Both pages share three.js and the app's kit (tokens, components,
          // HTML-in-Canvas helpers): give each one stable, cacheable chunk.
          advancedChunks: {
            groups: [
              { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 2 },
              { name: 'shared', minShareCount: 2, priority: 1 },
            ],
          },
        },
      },
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
