import { defineConfig } from 'vitest/config';
import path from 'path';
import packageJson from './package.json';

export default defineConfig({
  define: {
    'process.env.NEXT_PUBLIC_APP_VERSION': JSON.stringify(packageJson.version),
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/lib/auth/session.test.ts'],
    setupFiles: ['./vitest.setup.node.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage-node',
      include: ['src/lib/auth/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
