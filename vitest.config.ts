import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

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
    // Server-side tests run separately in node env (see vitest.config.node.ts)
    exclude: [
      'src/lib/auth/session.test.ts',
      'src/lib/auth/webauthn.test.ts',
      'src/lib/auth/admin-seed.test.ts',
      'src/lib/sse/event-emitter.test.ts',
      'src/lib/api/validation.test.ts',
      'src/lib/api/prophecy-transform.test.ts',
    ],
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
        'src/lib/db/prisma.ts',
        'src/lib/api-client/**',
        'src/lib/openapi/**',
        // Files tested in node environment (see vitest.config.node.ts)
        'src/lib/auth/session.ts',
        'src/lib/auth/webauthn.ts',
        'src/lib/auth/admin-seed.ts',
        'src/lib/api/validation.ts',
        'src/lib/api/prophecy-transform.ts',
        'src/lib/sse/event-emitter.ts',
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
