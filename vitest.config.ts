import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import packageJson from './package.json';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NEXT_PUBLIC_APP_VERSION': JSON.stringify(packageJson.version),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
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
        'src/lib/auth/**/*.ts',
        'src/lib/db/**/*.ts',
        'src/lib/sse/**/*.ts',
        'src/proxy.ts',
        'src/instrumentation.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
