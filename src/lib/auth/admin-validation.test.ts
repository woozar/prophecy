import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

// Reset the global mock so we can test the real implementation
vi.unmock('@/lib/auth/admin-validation');

// Re-import after unmocking to get the real implementation
const { validateSession, validateAdminSession } = await import('./admin-validation');

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const mockSessionData = {
  userId: 'user-1',
  username: 'testuser',
  role: 'USER' as const,
  iat: Date.now(),
};

describe('validateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const result = await validateSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns error when user not found in database', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await validateSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  it('returns error for blocked user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'USER',
      status: 'BLOCKED',
    } as never);

    const result = await validateSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Dein Account ist gesperrt');
  });

  it('returns error for pending user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'USER',
      status: 'PENDING',
    } as never);

    const result = await validateSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(403);
  });

  it('returns session with role from database for approved user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'USER',
      status: 'APPROVED',
    } as never);

    const result = await validateSession();

    expect(result.error).toBeUndefined();
    expect(result.session).toBeDefined();
    expect(result.session!.userId).toBe('user-1');
    expect(result.session!.role).toBe('USER');
    expect(result.session!.status).toBe('APPROVED');
  });

  it('returns current role from database even if session has different role', async () => {
    // Session says USER, but DB says ADMIN - DB should win
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'ADMIN',
      status: 'APPROVED',
    } as never);

    const result = await validateSession();

    expect(result.error).toBeUndefined();
    expect(result.session!.role).toBe('ADMIN');
  });
});

describe('validateAdminSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const result = await validateAdminSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns error for non-admin user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'USER',
      status: 'APPROVED',
    } as never);

    const result = await validateAdminSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns error for blocked admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'ADMIN',
      status: 'BLOCKED',
    } as never);

    const result = await validateAdminSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Dein Account ist gesperrt');
  });

  it('returns error for pending admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'ADMIN',
      status: 'PENDING',
    } as never);

    const result = await validateAdminSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(403);
  });

  it('returns session for approved admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'ADMIN',
      status: 'APPROVED',
    } as never);

    const result = await validateAdminSession();

    expect(result.error).toBeUndefined();
    expect(result.session).toBeDefined();
    expect(result.session!.userId).toBe('user-1');
    expect(result.session!.role).toBe('ADMIN');
  });

  it('returns error when user not found in database', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSessionData);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await validateAdminSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(401);
  });

  it('allows user promoted to admin without re-login', async () => {
    // User logged in as USER, then was promoted to ADMIN in DB
    vi.mocked(getSession).mockResolvedValue(mockSessionData); // session says USER
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'ADMIN',
      status: 'APPROVED',
    } as never);

    const result = await validateAdminSession();

    expect(result.error).toBeUndefined();
    expect(result.session!.role).toBe('ADMIN'); // Should work because role comes from DB
  });
});
