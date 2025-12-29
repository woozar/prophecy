import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAdminSession } from './admin-validation';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

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

const mockAdmin = { userId: 'admin-1', username: 'admin', role: 'ADMIN' as const, iat: Date.now() };
const mockUser = { userId: 'user-1', username: 'testuser', role: 'USER' as const, iat: Date.now() };

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
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const result = await validateAdminSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns error for blocked admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'BLOCKED' } as never);

    const result = await validateAdminSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Dein Account ist gesperrt');
  });

  it('returns error for pending admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'PENDING' } as never);

    const result = await validateAdminSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(403);
  });

  it('returns session for approved admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);

    const result = await validateAdminSession();

    expect(result.error).toBeUndefined();
    expect(result.session).toBeDefined();
    expect(result.session!.userId).toBe('admin-1');
    expect(result.session!.role).toBe('ADMIN');
  });

  it('returns error when user not found in database', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await validateAdminSession();

    expect(result.error).toBeDefined();
    const response = result.error!;
    expect(response.status).toBe(403);
  });
});
