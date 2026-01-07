import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    environmentMatchGlobs: [['convex/__tests__/**', 'edge-runtime']],
    setupFiles: ['./src/__tests__/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/__tests__/**/*.test.ts',
      'convex/__tests__/**/*.test.ts',
    ],
    server: {
      deps: {
        inline: ['convex-test'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.output/',
        'convex/_generated/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/__tests__/**',
        'src/routeTree.gen.ts',
        '**/*.config.ts',
        'src/types/**',
        'src/env.ts',
        'src/**/*.tsx',
        '**.mjs**',
        'scripts/**',
      ],
    },
  },
});
