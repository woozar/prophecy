import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    environmentMatchGlobs: [
      ['src/app/api/**/*.test.ts', 'node'],
      ['src/lib/auth/**/*.test.ts', 'node'],
      ['src/lib/db/**/*.test.ts', 'node'],
      ['src/lib/sse/**/*.test.ts', 'node'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/app/layout.tsx',
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
        'src/app/api/**/*.ts',
        'src/lib/auth/**/*.ts',
        'src/lib/db/**/*.ts',
        'src/lib/sse/**/*.ts',
        'src/proxy.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
