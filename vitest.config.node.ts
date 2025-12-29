import path from 'path';
import { defineConfig } from 'vitest/config';

import packageJson from './package.json';

export default defineConfig({
  define: {
    'process.env.NEXT_PUBLIC_APP_VERSION': JSON.stringify(packageJson.version),
  },
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/lib/auth/session.test.ts',
      'src/lib/auth/webauthn.test.ts',
      'src/lib/auth/admin-seed.test.ts',
      'src/lib/sse/event-emitter.test.ts',
      'src/lib/api/validation.test.ts',
      'src/lib/api/prophecy-transform.test.ts',
    ],
    setupFiles: ['./vitest.setup.node.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage-node',
      // Only include files that are actually tested in the node environment
      include: [
        'src/lib/auth/session.ts',
        'src/lib/auth/webauthn.ts',
        'src/lib/auth/admin-seed.ts',
        'src/lib/sse/event-emitter.ts',
        'src/lib/api/validation.ts',
        'src/lib/api/prophecy-transform.ts',
      ],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
