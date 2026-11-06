import { defineConfig } from 'vitest/config';

export default defineConfig({
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
});
