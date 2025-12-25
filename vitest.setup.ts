import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Fix jsdom "Not implemented: navigation" error
// See: https://github.com/vitest-dev/vitest/issues/4450
// jsdom doesn't support navigation, so we replace window.location entirely
const locationMock = {
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

// Delete and replace window.location to prevent jsdom navigation errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (window as any).location;
window.location = locationMock as unknown as Location;

// Mock next/link to prevent jsdom navigation errors when clicking links
// See: https://github.com/vercel/next.js/discussions/60125
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent) => void;
    [key: string]: unknown;
  }) => {
    return React.createElement(
      'a',
      {
        ...props,
        href,
        onClick: (e: React.MouseEvent) => {
          e.preventDefault(); // Prevent jsdom navigation
          onClick?.(e);
        },
      },
      children
    );
  },
}));

// Mock Prisma for server tests
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    round: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    prophecy: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    rating: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    authenticator: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((fn) =>
      fn({
        round: {
          findMany: vi.fn(),
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        prophecy: {
          findMany: vi.fn(),
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
      })
    ),
  },
  ensureInitialized: vi.fn(),
}));

// Mock Next.js cookies for server tests
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock session for server tests
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
  setSessionCookie: vi.fn(),
  loginSuccessResponse: vi.fn(),
  loginErrorResponse: vi.fn(),
}));

// Mock SSE for server tests
vi.mock('@/lib/sse/event-emitter', () => ({
  sseEmitter: {
    broadcast: vi.fn(),
  },
}));
