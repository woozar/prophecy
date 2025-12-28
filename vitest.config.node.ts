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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
