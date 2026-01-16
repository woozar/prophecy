import React from 'react';

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Suppress jsdom "Not implemented: navigation" errors
// This is a known limitation of jsdom - it doesn't support full navigation
// Also suppress Next.js Image warnings about fill and position in jsdom
// jsdom doesn't compute CSS classes, so position checks always fail
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = String(args[0]);
  if (
    message.includes('Not implemented: navigation') ||
    message.includes('"fill" and parent element') ||
    message.includes('"fill" and a height value of 0')
  ) {
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = String(args[0]);
  if (
    message.includes('"fill" and parent element') ||
    message.includes('"fill" and a height value of 0')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Also suppress via window error handler (jsdom sometimes throws these as unhandled)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('Not implemented: navigation')) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  });
}

// Mock HTMLAnchorElement.click to prevent jsdom "Not implemented: navigation" errors
// This prevents errors when code creates an anchor and clicks it (e.g., file downloads)
HTMLAnchorElement.prototype.click = vi.fn();

// Mock window.matchMedia for Mantine components
// See: https://mantine.dev/guides/jest/
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Fix jsdom "Not implemented: navigation" error
// See: https://github.com/vitest-dev/vitest/issues/4450
// jsdom doesn't support navigation, so we replace window.location entirely
let currentHref = 'http://localhost:3000/';
const locationMock = {
  get href() {
    return currentHref;
  },
  set href(value: string) {
    // Mock setter - just update the internal value without triggering navigation
    currentHref = value;
  },
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn((url: string) => {
    currentHref = url;
  }),
  replace: vi.fn((url: string) => {
    currentHref = url;
  }),
  reload: vi.fn(),
};

// Delete and replace window.location to prevent jsdom navigation errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (window as any).location;
window.location = locationMock as unknown as string & Location;

// Also mock globalThis.location (some code uses globalThis instead of window)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).location = locationMock;

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
      findUnique: vi.fn(),
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
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    badge: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    userBadge: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
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

// Mock admin validation for server tests
vi.mock('@/lib/auth/admin-validation', () => ({
  validateSession: vi.fn(),
  validateAdminSession: vi.fn(),
}));

// Mock SSE for server tests
vi.mock('@/lib/sse/event-emitter', () => ({
  sseEmitter: {
    broadcast: vi.fn(),
  },
}));

// Mock badge service for server tests
vi.mock('@/lib/badges/badge-service', () => ({
  checkAndAwardBadges: vi.fn().mockResolvedValue([]), // Returns AwardedUserBadge[]
  awardBadge: vi.fn().mockResolvedValue(null),
  awardContentCategoryBadges: vi.fn().mockResolvedValue({ badges: [], analysis: null }),
  awardLeaderboardBadges: vi.fn().mockResolvedValue([]),
  awardRoundCompletionBadges: vi.fn().mockResolvedValue([]),
  isFirstProphecyOfRound: vi.fn().mockResolvedValue(false),
  getBadgeHolders: vi.fn().mockResolvedValue([]),
  getUserBadges: vi.fn().mockResolvedValue([]),
  getUserStats: vi.fn().mockResolvedValue({
    propheciesCreated: 0,
    propheciesFulfilled: 0,
    accuracyRate: 0,
    ratingsGiven: 0,
    raterAccuracy: 0,
    roundsParticipated: 0,
    leaderboardWins: 0,
    leaderboardSecond: 0,
    leaderboardThird: 0,
    averageRatingGiven: 0,
    maxRatingsGiven: 0,
    minRatingsGiven: 0,
  }),
}));
